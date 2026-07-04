/**
 * @file core-trio.ts
 * @description 底部核心三件組:生命條 / 隊長頭像(含主動技能冷卻環) / 能量條。
 *              對應「玩家介面_戰鬷HUD與操作骨架.md」§1.2 ~ §1.5、§4.2。
 *
 *              - 用 SVG 構建,精準控制冷卻環掃描與條狀填充。
 *              - 純檢視層:只接收 HudSnapshot,不自行改變狀態。
 *              - 對外發出 cast_active(點擊頭像)事件。
 */

import {
  SIZE,
  HEALTH_STAGE,
  type ActiveSkillState,
  type HudSnapshot,
} from "./types";

/** 根據生命比例回傳對應 CSS 顏色變數名 — 規格 §1.3 */
function healthColorVar(ratio: number): string {
  if (ratio > HEALTH_STAGE.WARN) return "var(--c-hp-full)";
  if (ratio > HEALTH_STAGE.DANGER) return "var(--c-hp-warn)";
  return "var(--c-hp-danger)";
}

/** 將 SVG 圓周依比例轉成 stroke-dasharray 段(用於冷卻環掃描) */
function arcDash(ratio: number, circumference: number): string {
  const filled = circumference * Math.max(0, Math.min(1, ratio));
  return `${filled} ${circumference - filled}`;
}

/** 切角矩形 path：取代圓角矩形，呼應世界地板／按鈕的切角線稿語言 */
function chamferPath(x: number, y: number, w: number, h: number, cut: number): string {
  const c = Math.max(0, Math.min(cut, w / 2, h / 2));
  if (w <= 0 || h <= 0) return "";
  return [
    `M${x + c},${y}`,
    `L${x + w - c},${y}`,
    `L${x + w},${y + c}`,
    `L${x + w},${y + h - c}`,
    `L${x + w - c},${y + h}`,
    `L${x + c},${y + h}`,
    `L${x},${y + h - c}`,
    `L${x},${y + c}`,
    "Z",
  ].join(" ");
}

/**
 * 核心三件組檢視。
 *
 * 內部 DOM 結構:
 *   <div class="core-trio">
 *     <svg class="health-bar">...</svg>
 *     <div class="avatar">
 *       <svg class="cooldown-ring">...</svg>
 *       <div class="avatar-face">C</div>
 *     </div>
 *     <svg class="energy-bar">...</svg>
 *   </div>
 */
export class CoreTrio {
  readonly el: HTMLElement;

  private readonly healthFill: SVGPathElement;
  private readonly healthShield: SVGRectElement;
  private readonly healthRoot: SVGSVGElement;
  private readonly healthText: SVGTextElement;
  private readonly cooldownRing: SVGCircleElement;
  private readonly cooldownTrack: SVGCircleElement;
  private readonly avatarFace: HTMLDivElement;
  private readonly avatarBtn: HTMLDivElement;
  private readonly energyFill: SVGPathElement;
  private readonly energyRoot: SVGSVGElement;
  private readonly energyText: SVGTextElement;
  private readonly energyReadyDot: HTMLDivElement;

  private readonly cooldownCircumference: number;
  private snapshot: HudSnapshot | null = null;

  constructor() {
    // 冷卻環圓周 = 2πr,r 約為頭像半徑
    const ringR = SIZE.AVATAR_DIAMETER / 2 + 3;
    this.cooldownCircumference = 2 * Math.PI * ringR;

    this.el = this.build();
    // 綁定後再取出關鍵節點
    this.healthRoot = this.el.querySelector(".health-bar") as SVGSVGElement;
    this.healthFill = this.healthRoot.querySelector(".bar-fill") as SVGPathElement;
    this.healthShield = this.healthRoot.querySelector(".bar-shield") as SVGRectElement;
    this.healthText = this.healthRoot.querySelector(".bar-text") as SVGTextElement;
    this.cooldownTrack = this.el.querySelector(".cooldown-track") as SVGCircleElement;
    this.cooldownRing = this.el.querySelector(".cooldown-ring") as SVGCircleElement;
    this.avatarFace = this.el.querySelector(".avatar-face") as HTMLDivElement;
    this.avatarBtn = this.el.querySelector(".avatar") as HTMLDivElement;
    this.energyRoot = this.el.querySelector(".energy-bar") as SVGSVGElement;
    this.energyFill = this.energyRoot.querySelector(".bar-fill") as SVGPathElement;
    this.energyText = this.energyRoot.querySelector(".bar-text") as SVGTextElement;
    this.energyReadyDot = this.el.querySelector(".energy-ready-dot") as HTMLDivElement;

    // 初始化冷卻環幾何
    this.cooldownTrack.setAttribute("stroke-dasharray", `${this.cooldownCircumference}`);
    this.cooldownRing.setAttribute("stroke-dasharray", `${this.cooldownCircumference}`);
  }

  /** 點擊頭像時觸發(由 controller 綁定) */
  onAvatarClick(handler: () => void): void {
    this.avatarBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      handler();
    });
  }

  /** 滑鼠進入核心區(由 controller 用於停留/滑動判定) */
  onCoreEnter(handler: () => void): void {
    this.el.addEventListener("mouseenter", handler);
  }
  onCoreLeave(handler: () => void): void {
    this.el.addEventListener("mouseleave", handler);
  }

  /** 提供拖曳起始錨點(滑鼠按下時記錄,供 controller 判定滑動) */
  onCoreMouseDown(handler: (x: number, y: number) => void): void {
    this.el.addEventListener("mousedown", (e) => handler(e.clientX, e.clientY));
  }

  /** 更新檢視 */
  render(snap: HudSnapshot): void {
    this.snapshot = snap;
    this.renderHealth(snap);
    this.renderEnergy(snap);
    this.renderAvatar(snap.active, snap.captainColor);
  }

  private renderHealth(snap: HudSnapshot): void {
    const ratio = Math.max(0, Math.min(1, snap.hpRatio));
    const w = SIZE.HEALTH_BAR_W;
    const h = SIZE.HEALTH_BAR_H;
    // 填充寬度(切角矩形，端頭跟外框一致)
    this.healthFill.setAttribute("d", chamferPath(2, 8, Math.max(0, w * ratio - 4), h - 10, 3));
    this.healthFill.setAttribute("fill", healthColorVar(ratio));
    // 護盾覆蓋(外側上方獨立條) — 規格 §1.3
    const shieldW = w * Math.max(0, Math.min(1, snap.shieldRatio));
    this.healthShield.setAttribute("width", `${shieldW}`);
    // 文字(預設隱藏,由 hover controller 顯示)
    this.healthText.textContent = `${Math.round(ratio * 100)}%`;
    // 危險脈動
    if (ratio <= HEALTH_STAGE.DANGER) {
      this.healthRoot.classList.add("pulse-danger");
    } else {
      this.healthRoot.classList.remove("pulse-danger");
    }
  }

  private renderEnergy(snap: HudSnapshot): void {
    const ratio = Math.max(0, Math.min(1, snap.energyRatio));
    const w = SIZE.ENERGY_BAR_W;
    const h = SIZE.ENERGY_BAR_H;
    this.energyFill.setAttribute("d", chamferPath(2, 2, Math.max(0, w * ratio - 4), h - 4, 3));
    this.energyText.textContent = `${Math.round(ratio * 100)}%`;
    // 能量足夠施放主動技能 → 右端亮點 — 規格 §1.4
    if (snap.active.energyEnough && snap.active.cooldownRatio >= 1) {
      this.energyReadyDot.classList.add("on");
    } else {
      this.energyReadyDot.classList.remove("on");
    }
    // 不足時整條變暗 — 規格 §1.4
    if (!snap.active.energyEnough) {
      this.energyRoot.classList.add("dim");
    } else {
      this.energyRoot.classList.remove("dim");
    }
  }

  private renderAvatar(active: ActiveSkillState, captainColor: string): void {
    const { cooldownRatio, energyEnough, castLatency } = active;
    // 冷卻環掃描 — 規格 §1.5(順時針掃過已冷卻部分)
    this.cooldownRing.setAttribute(
      "stroke-dasharray",
      arcDash(cooldownRatio, this.cooldownCircumference),
    );
    // 旋轉讓掃描從頂端 12 點鐘開始
    this.cooldownRing.style.transform = "rotate(-90deg)";
    this.cooldownRing.style.transformOrigin = "center";

    const ready = cooldownRatio >= 1 && energyEnough && !castLatency;
    this.avatarBtn.classList.toggle("ready", ready);
    this.avatarBtn.classList.toggle("dim", !energyEnough);
    this.avatarBtn.classList.toggle("latency", castLatency);
    // 致命傷警示環 — 規格 §1.5(生命<30%)
    const hpLow = this.snapshot ? this.snapshot.hpRatio < HEALTH_STAGE.DANGER : false;
    this.avatarBtn.classList.toggle("lethal", hpLow);
    // 隊長代表色應用到頭像底色
    this.avatarFace.style.backgroundColor = captainColor;
  }

  /** 切換生命/能量條文字顯示(滑鼠停留 0.5s 用)— 規格 §1.3、§1.4 */
  showBarText(show: boolean): void {
    this.healthText.style.opacity = show ? "1" : "0";
    this.energyText.style.opacity = show ? "1" : "0";
  }

  // ----------------------------------------------------------
  // DOM 建構
  // ----------------------------------------------------------
  private build(): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "core-trio";
    wrap.innerHTML = `
      ${this.buildBarSvg("health-bar", SIZE.HEALTH_BAR_W, SIZE.HEALTH_BAR_H, true)}
      <div class="avatar" role="button" aria-label="隊長頭像(點擊施放主動技能)">
        <svg class="cooldown-ring-svg" viewBox="0 0 110 110" width="110" height="110">
          <circle class="cooldown-track" cx="55" cy="55" r="51"
            fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="4" />
          <circle class="cooldown-ring" cx="55" cy="55" r="51"
            fill="none" stroke="var(--c-active)" stroke-width="4" stroke-linecap="round" />
        </svg>
        <div class="avatar-face">C</div>
        <div class="energy-ready-dot"></div>
      </div>
      ${this.buildBarSvg("energy-bar", SIZE.ENERGY_BAR_W, SIZE.ENERGY_BAR_H, false)}
    `;
    return wrap;
  }

  /**
   * 建構條狀 SVG。
   * 生命條護盾覆蓋在外側上方(獨立條),能量條無護盾。
   */
  private buildBarSvg(
    cls: "health-bar" | "energy-bar",
    w: number,
    h: number,
    withShield: boolean,
  ): string {
    const fillVar = cls === "health-bar" ? "var(--c-hp-full)" : "var(--c-energy)";
    const shield = withShield
      ? `<rect class="bar-shield" x="0" y="0" width="0" height="6"
            fill="var(--c-shield)" opacity="0.9" />`
      : "";
    return `
      <svg class="${cls}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
        <path class="bar-frame" d="${chamferPath(0, 0, w, h, 6)}" />
        ${shield}
        <path class="bar-fill" d="" fill="${fillVar}" />
        <text class="bar-text" x="${w / 2}" y="${h / 2 + 5}"
          text-anchor="middle" font-size="14" fill="#fff"
          style="opacity:0; transition: opacity .15s;">0%</text>
      </svg>
    `;
  }
}
