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
  FAMILY_LABEL,
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
  private readonly healthValue: HTMLDivElement;
  private readonly healthMeta: HTMLDivElement;
  private readonly cooldownRing: SVGCircleElement;
  private readonly cooldownTrack: SVGCircleElement;
  private readonly avatarFace: HTMLDivElement;
  private readonly avatarImg: HTMLImageElement;
  private readonly avatarFallback: HTMLSpanElement;
  private readonly avatarBtn: HTMLDivElement;
  private readonly energyFill: SVGPathElement;
  private readonly energyRoot: SVGSVGElement;
  private readonly energyText: SVGTextElement;
  private readonly energyValue: HTMLDivElement;
  private readonly energyMeta: HTMLDivElement;
  private readonly activeSummary: HTMLDivElement;
  private readonly periodicSummary: HTMLDivElement;
  private readonly weaponSummary: HTMLDivElement;
  private readonly energyReadyDot: HTMLDivElement;
  private readonly tickDial: HTMLDivElement;
  private readonly tickHand: HTMLDivElement;
  private readonly tickLabel: HTMLDivElement;

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
    this.healthValue = this.el.querySelector(".health-value") as HTMLDivElement;
    this.healthMeta = this.el.querySelector(".health-meta") as HTMLDivElement;
    this.cooldownTrack = this.el.querySelector(".cooldown-track") as SVGCircleElement;
    this.cooldownRing = this.el.querySelector(".cooldown-ring") as SVGCircleElement;
    this.avatarFace = this.el.querySelector(".avatar-face") as HTMLDivElement;
    this.avatarImg = this.el.querySelector(".avatar-face-img") as HTMLImageElement;
    this.avatarFallback = this.el.querySelector(".avatar-face-fallback") as HTMLSpanElement;
    this.avatarBtn = this.el.querySelector(".avatar") as HTMLDivElement;
    this.energyRoot = this.el.querySelector(".energy-bar") as SVGSVGElement;
    this.energyFill = this.energyRoot.querySelector(".bar-fill") as SVGPathElement;
    this.energyText = this.energyRoot.querySelector(".bar-text") as SVGTextElement;
    this.energyValue = this.el.querySelector(".energy-value") as HTMLDivElement;
    this.energyMeta = this.el.querySelector(".energy-meta") as HTMLDivElement;
    this.activeSummary = this.el.querySelector(".summary-active") as HTMLDivElement;
    this.periodicSummary = this.el.querySelector(".summary-periodic") as HTMLDivElement;
    this.weaponSummary = this.el.querySelector(".summary-weapons") as HTMLDivElement;
    this.energyReadyDot = this.el.querySelector(".energy-ready-dot") as HTMLDivElement;
    this.tickDial = this.el.querySelector(".tick-dial") as HTMLDivElement;
    this.tickHand = this.el.querySelector(".tick-dial-hand") as HTMLDivElement;
    this.tickLabel = this.el.querySelector(".tick-dial-label") as HTMLDivElement;

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
    this.renderAvatar(snap.active, snap.captainColor, snap.captainPortraitUrl, snap.captainId);
    this.renderCooldownSummary(snap);
    this.renderTick(snap.tickProgress, snap.tickPulseAt);
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
    this.healthText.textContent = `${Math.round(ratio * 100)}%`;
    this.healthValue.textContent = `${Math.round(snap.hpCurrent)} / ${Math.round(snap.hpMax)}`;
    this.healthMeta.textContent = `目前 ${Math.round(ratio * 100)}%${snap.shieldRatio > 0 ? ` · 護盾 ${Math.round(snap.shieldRatio * 100)}%` : ""}`;
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
    this.energyValue.textContent = `${Math.round(snap.energyCurrent)} / ${Math.round(snap.energyMax)}`;
    this.energyMeta.textContent = `目前 ${Math.round(ratio * 100)}% · 主動耗能 ${snap.active.energyCost}`;
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

  private renderAvatar(active: ActiveSkillState, captainColor: string, portraitUrl: string | undefined, captainId: string): void {
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
    this.avatarFace.style.backgroundColor = portraitUrl ? "transparent" : captainColor;
    this.avatarImg.src = portraitUrl ?? "";
    this.avatarImg.alt = `${captainId} portrait`;
    this.avatarImg.style.display = portraitUrl ? "block" : "none";
    this.avatarFallback.textContent = captainId.slice(0, 1).toUpperCase();
    this.avatarFallback.style.display = portraitUrl ? "none" : "block";
  }

  private renderCooldownSummary(snap: HudSnapshot): void {
    this.activeSummary.textContent = `隊長主動 ${snap.active.label}：${this.formatCooldown(snap.active.cooldownRemaining, snap.active.energyEnough)}`;
    this.periodicSummary.textContent = `週期蓄能：${this.formatPeriodics(snap)}`;
    this.weaponSummary.textContent = `武器冷卻：${this.formatWeapons(snap)}`;
  }

  private renderTick(progress: number, pulseAt: number): void {
    const clamped = Math.max(0, Math.min(1, progress));
    this.tickHand.style.transform = `translateX(-50%) rotate(${clamped * 360}deg)`;
    this.tickLabel.textContent = `${Math.ceil((1 - clamped) * 10) / 10}s`;
    this.tickDial.classList.toggle("pulse", Date.now() - pulseAt < 180);
  }

  /** 切換生命/能量條文字顯示(滑鼠停留 0.5s 用)— 規格 §1.3、§1.4 */
  showBarText(show: boolean): void {
    this.healthText.style.opacity = "1";
    this.energyText.style.opacity = "1";
    this.el.classList.toggle("drawer-open", show);
  }

  // ----------------------------------------------------------
  // DOM 建構
  // ----------------------------------------------------------
  private build(): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "core-trio";
    wrap.innerHTML = `
      <section class="hud-stat-panel hud-stat-panel-health">
        <div class="stat-heading"><span>生命值</span><strong class="health-value">0 / 0</strong></div>
        ${this.buildBarSvg("health-bar", SIZE.HEALTH_BAR_W, SIZE.HEALTH_BAR_H, true)}
        <div class="stat-meta health-meta">目前 0%</div>
      </section>
      <div class="avatar" role="button" aria-label="隊長頭像(點擊施放主動技能)">
        <svg class="cooldown-ring-svg" viewBox="0 0 110 110" width="110" height="110">
          <circle class="cooldown-track" cx="55" cy="55" r="51"
            fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="4" />
          <circle class="cooldown-ring" cx="55" cy="55" r="51"
            fill="none" stroke="var(--c-active)" stroke-width="4" stroke-linecap="round" />
        </svg>
        <div class="avatar-face"><img class="avatar-face-img" alt="" draggable="false"><span class="avatar-face-fallback">C</span></div>
        <div class="energy-ready-dot"></div>
      </div>
      <section class="hud-energy-stack">
        <div class="hud-summary-panel">
          <div class="summary-row summary-active">隊長主動：待命</div>
          <div class="summary-row summary-periodic">週期蓄能：待命</div>
          <div class="summary-row summary-weapons">武器冷卻：待命</div>
        </div>
        <section class="hud-stat-panel hud-stat-panel-energy">
          <div class="stat-heading"><span>能量</span><strong class="energy-value">0 / 0</strong></div>
          ${this.buildBarSvg("energy-bar", SIZE.ENERGY_BAR_W, SIZE.ENERGY_BAR_H, false)}
          <div class="stat-meta energy-meta">目前 0%</div>
        </section>
      </section>
      <div class="tick-dial" aria-label="每秒傷害 Tick 指針"><div class="tick-dial-face"><div class="tick-dial-ring"></div><div class="tick-dial-hand"></div><div class="tick-dial-cap"></div></div><div class="tick-dial-label">1.0s</div></div>
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

  private formatCooldown(remaining: number, energyEnough: boolean): string {
    if (remaining > 0.05) return `${remaining.toFixed(1)}s`;
    return energyEnough ? "可施放" : "能量不足";
  }

  private formatPeriodics(snap: HudSnapshot): string {
    if (!snap.periodics.length) return "無";
    return snap.periodics
      .slice(0, 2)
      .map((periodic) => `${periodic.label} ${Math.round(periodic.chargeRatio * 100)}%`)
      .join(" · ");
  }

  private formatWeapons(snap: HudSnapshot): string {
    const visible = snap.weapons.filter((weapon) => !weapon.disabledByRoster).slice(0, 3);
    if (!visible.length) return "無";
    return visible
      .map((weapon) => {
        const remaining = Math.max(0, (1 - weapon.cooldownRatio) * 100);
        return `${FAMILY_LABEL[weapon.family]} ${Math.round(remaining)}%`;
      })
      .join(" · ");
  }
}
