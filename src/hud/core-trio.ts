/**
 * @file core-trio.ts
 * @description 底部核心三件組:生命條 / 隊長頭像(含主動技能冷卻環) / 能量條。
 */

import {
  FAMILY_LABEL,
  HEALTH_STAGE,
  SIZE,
  type ActiveSkillState,
  type HudSnapshot,
  type PartyVital,
} from "./types";
import { 應用程式狀態 } from "../ui/應用程式狀態";
import { 選文 } from "../ui/語系";

function 雙語(中文: string, 英文: string): string {
  return 選文(應用程式狀態.額外.語言, 中文, 英文);
}

function 家族顯示名(family: keyof typeof FAMILY_LABEL): string {
  return {
    shield: 雙語("護盾", "Shield"),
    multishot: 雙語("多發", "Multishot"),
    straight: 雙語("直線", "Straight"),
    mine: 雙語("地雷", "Mine"),
    laser: 雙語("激光", "Laser"),
  }[family];
}

function healthColorVar(ratio: number): string {
  if (ratio > HEALTH_STAGE.WARN) return "var(--c-hp-full)";
  if (ratio > HEALTH_STAGE.DANGER) return "var(--c-hp-warn)";
  return "var(--c-hp-danger)";
}

function arcDash(ratio: number, circumference: number): string {
  const filled = circumference * Math.max(0, Math.min(1, ratio));
  return `${filled} ${circumference - filled}`;
}

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

export class CoreTrio {
  readonly el: HTMLElement;

  private readonly healthFill: SVGPathElement;
  private readonly healthShield: SVGRectElement;
  private readonly healthRoot: SVGSVGElement;
  private readonly healthText: SVGTextElement;
  private readonly healthValue: HTMLDivElement;
  private readonly healthMeta: HTMLDivElement;
  private readonly healthDetails: HTMLDivElement;
  private readonly cooldownRing: SVGCircleElement;
  private readonly cooldownTrack: SVGCircleElement;
  private readonly avatarFace: HTMLDivElement;
  private readonly avatarImg: HTMLImageElement;
  private readonly avatarFallback: HTMLSpanElement;
  private readonly avatarBtn: HTMLDivElement;
  private readonly captainStarBadge: HTMLDivElement;
  private readonly tickMiniFill: HTMLDivElement;
  private readonly energyFill: SVGPathElement;
  private readonly energyRoot: SVGSVGElement;
  private readonly energyText: SVGTextElement;
  private readonly energyValue: HTMLDivElement;
  private readonly energyMeta: HTMLDivElement;
  private readonly activeSummary: HTMLDivElement;
  private readonly periodicSummary: HTMLDivElement;
  private readonly weaponSummary: HTMLDivElement;
  private readonly energyReadyDot: HTMLDivElement;

  private readonly cooldownCircumference: number;
  private snapshot: HudSnapshot | null = null;

  constructor() {
    const ringR = SIZE.AVATAR_DIAMETER / 2 + 3;
    this.cooldownCircumference = 2 * Math.PI * ringR;

    this.el = this.build();
    this.healthRoot = this.el.querySelector(".health-bar") as SVGSVGElement;
    this.healthFill = this.healthRoot.querySelector(".bar-fill") as SVGPathElement;
    this.healthShield = this.healthRoot.querySelector(".bar-shield") as SVGRectElement;
    this.healthText = this.healthRoot.querySelector(".bar-text") as SVGTextElement;
    this.healthValue = this.el.querySelector(".health-value") as HTMLDivElement;
    this.healthMeta = this.el.querySelector(".health-meta") as HTMLDivElement;
    this.healthDetails = this.el.querySelector(".hud-health-detail-panel") as HTMLDivElement;
    this.cooldownTrack = this.el.querySelector(".cooldown-track") as SVGCircleElement;
    this.cooldownRing = this.el.querySelector(".cooldown-ring") as SVGCircleElement;
    this.avatarFace = this.el.querySelector(".avatar-face") as HTMLDivElement;
    this.avatarImg = this.el.querySelector(".avatar-face-img") as HTMLImageElement;
    this.avatarFallback = this.el.querySelector(".avatar-face-fallback") as HTMLSpanElement;
    this.avatarBtn = this.el.querySelector(".avatar") as HTMLDivElement;
    this.captainStarBadge = this.el.querySelector(".captain-star-badge") as HTMLDivElement;
    this.tickMiniFill = this.el.querySelector(".captain-tick-fill") as HTMLDivElement;
    this.energyRoot = this.el.querySelector(".energy-bar") as SVGSVGElement;
    this.energyFill = this.energyRoot.querySelector(".bar-fill") as SVGPathElement;
    this.energyText = this.energyRoot.querySelector(".bar-text") as SVGTextElement;
    this.energyValue = this.el.querySelector(".energy-value") as HTMLDivElement;
    this.energyMeta = this.el.querySelector(".energy-meta") as HTMLDivElement;
    this.activeSummary = this.el.querySelector(".summary-active") as HTMLDivElement;
    this.periodicSummary = this.el.querySelector(".summary-periodic") as HTMLDivElement;
    this.weaponSummary = this.el.querySelector(".summary-weapons") as HTMLDivElement;
    this.energyReadyDot = this.el.querySelector(".energy-ready-dot") as HTMLDivElement;

    this.cooldownTrack.setAttribute("stroke-dasharray", `${this.cooldownCircumference}`);
    this.cooldownRing.setAttribute("stroke-dasharray", `${this.cooldownCircumference}`);
  }

  onAvatarClick(handler: () => void): void {
    this.avatarBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      handler();
    });
  }

  onCoreEnter(handler: () => void): void {
    this.el.addEventListener("mouseenter", handler);
  }

  onCoreLeave(handler: () => void): void {
    this.el.addEventListener("mouseleave", handler);
  }

  onCoreMouseDown(handler: (x: number, y: number) => void): void {
    this.el.addEventListener("mousedown", (e) => handler(e.clientX, e.clientY));
  }

  render(snap: HudSnapshot): void {
    this.snapshot = snap;
    this.renderHealth(snap);
    this.renderEnergy(snap);
    this.renderAvatar(snap);
    this.renderCooldownSummary(snap);
  }

  private renderHealth(snap: HudSnapshot): void {
    const ratio = Math.max(0, Math.min(1, snap.hpRatio));
    const w = SIZE.HEALTH_BAR_W;
    const h = SIZE.HEALTH_BAR_H;
    this.healthFill.setAttribute("d", chamferPath(2, 8, Math.max(0, w * ratio - 4), h - 10, 3));
    this.healthFill.setAttribute("fill", healthColorVar(ratio));
    this.healthShield.setAttribute("width", `${w * Math.max(0, Math.min(1, snap.shieldRatio))}`);
    this.healthText.textContent = `${Math.round(ratio * 100)}%`;
    this.healthValue.textContent = `${Math.round(snap.hpCurrent)} / ${Math.round(snap.hpMax)}`;
    this.healthMeta.textContent = 雙語("目前", "Current") + ` ${Math.round(ratio * 100)}%${snap.shieldRatio > 0 ? ` · ${雙語("護盾", "Shield")} ${Math.round(snap.shieldRatio * 100)}%` : ""}`;
    this.healthDetails.innerHTML = snap.partyVitals.map((vital) => this.renderVitalRow(vital)).join("");
    this.healthRoot.classList.toggle("pulse-danger", ratio <= HEALTH_STAGE.DANGER);
  }

  private renderEnergy(snap: HudSnapshot): void {
    const ratio = Math.max(0, Math.min(1, snap.energyRatio));
    const w = SIZE.ENERGY_BAR_W;
    const h = SIZE.ENERGY_BAR_H;
    this.energyFill.setAttribute("d", chamferPath(2, 2, Math.max(0, w * ratio - 4), h - 4, 3));
    this.energyText.textContent = `${Math.round(ratio * 100)}%`;
    this.energyValue.textContent = `${Math.round(snap.energyCurrent)} / ${Math.round(snap.energyMax)}`;
    this.energyMeta.textContent = `${雙語("目前", "Current")} ${Math.round(ratio * 100)}% · ${雙語("主動耗能", "Active Cost")} ${snap.active.energyCost}`;
    this.energyReadyDot.classList.toggle("on", snap.active.energyEnough && snap.active.cooldownRatio >= 1);
    this.energyRoot.classList.toggle("dim", !snap.active.energyEnough);
  }

  private renderAvatar(snap: HudSnapshot): void {
    const { cooldownRatio, energyEnough, castLatency } = snap.active;
    this.cooldownRing.setAttribute("stroke-dasharray", arcDash(cooldownRatio, this.cooldownCircumference));
    this.cooldownRing.style.transform = "rotate(-90deg)";
    this.cooldownRing.style.transformOrigin = "center";

    const ready = cooldownRatio >= 1 && energyEnough && !castLatency;
    const hpLow = snap.hpRatio < HEALTH_STAGE.DANGER;
    const tickPulse = Date.now() - snap.tickPulseAt < 240;
    this.avatarBtn.classList.toggle("ready", ready);
    this.avatarBtn.classList.toggle("dim", !energyEnough);
    this.avatarBtn.classList.toggle("latency", castLatency);
    this.avatarBtn.classList.toggle("lethal", hpLow);
    this.avatarBtn.classList.toggle("tick-hit", tickPulse);

    this.avatarFace.style.backgroundColor = snap.captainPortraitUrl ? "transparent" : snap.captainColor;
    this.avatarImg.src = snap.captainPortraitUrl ?? "";
    this.avatarImg.alt = `${snap.captainId} portrait`;
    this.avatarImg.style.display = snap.captainPortraitUrl ? "block" : "none";
    this.avatarFallback.textContent = snap.captainId.slice(0, 1).toUpperCase();
    this.avatarFallback.style.display = snap.captainPortraitUrl ? "none" : "block";

    this.captainStarBadge.textContent = `★${snap.captainStar}`;
    this.tickMiniFill.style.width = `${Math.round(Math.max(0, Math.min(1, snap.tickProgress)) * 100)}%`;
    this.tickMiniFill.parentElement?.classList.toggle("is-pulsing", tickPulse);
  }

  private renderCooldownSummary(snap: HudSnapshot): void {
    this.activeSummary.textContent = `${雙語("Captain Active", "Captain Active")} ${snap.active.label}: ${this.formatCooldown(snap.active.cooldownRemaining, snap.active.energyEnough)}`;
    this.periodicSummary.textContent = `${雙語("Periodic Charge", "Periodic Charge")}: ${this.formatPeriodics(snap)}`;
    this.weaponSummary.textContent = `${雙語("Weapon Cooldown", "Weapon Cooldown")}: ${this.formatWeapons(snap)}`;
  }

  showBarText(show: boolean): void {
    this.healthText.style.opacity = "1";
    this.energyText.style.opacity = "1";
    this.el.classList.toggle("drawer-open", show);
  }

  private build(): HTMLElement {
    const wrap = document.createElement("div");
    wrap.className = "core-trio";
    wrap.innerHTML = `
      <section class="hud-stat-panel hud-stat-panel-health">
        <div class="stat-heading"><span>${雙語("生命值", "HP")}</span><strong class="health-value">0 / 0</strong></div>
        ${this.buildBarSvg("health-bar", SIZE.HEALTH_BAR_W, SIZE.HEALTH_BAR_H, true)}
        <div class="stat-meta health-meta">${雙語("目前", "Current")} 0%</div>
        <div class="hud-health-detail-panel"></div>
      </section>
      <div class="avatar" role="button" aria-label="${雙語("隊長頭像(點擊施放主動技能)", "Captain portrait (click to cast the active skill)")}">
        <svg class="cooldown-ring-svg" viewBox="0 0 110 110" width="110" height="110">
          <circle class="cooldown-track" cx="55" cy="55" r="51" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="4" />
          <circle class="cooldown-ring" cx="55" cy="55" r="51" fill="none" stroke="var(--c-active)" stroke-width="4" stroke-linecap="round" />
        </svg>
        <div class="captain-star-badge">★1</div>
        <div class="avatar-face"><img class="avatar-face-img" alt="" draggable="false"><span class="avatar-face-fallback">C</span></div>
        <div class="captain-tick-track"><div class="captain-tick-fill"></div></div>
        <div class="energy-ready-dot"></div>
      </div>
      <section class="hud-energy-stack">
        <div class="hud-summary-panel">
          <div class="summary-row summary-active">${雙語("Captain Active", "Captain Active")}: ${雙語("待命", "Standby")}</div>
          <div class="summary-row summary-periodic">${雙語("Periodic Charge", "Periodic Charge")}: ${雙語("待命", "Standby")}</div>
          <div class="summary-row summary-weapons">${雙語("Weapon Cooldown", "Weapon Cooldown")}: ${雙語("待命", "Standby")}</div>
        </div>
        <section class="hud-stat-panel hud-stat-panel-energy">
          <div class="stat-heading"><span>${雙語("能量", "Energy")}</span><strong class="energy-value">0 / 0</strong></div>
          ${this.buildBarSvg("energy-bar", SIZE.ENERGY_BAR_W, SIZE.ENERGY_BAR_H, false)}
          <div class="stat-meta energy-meta">${雙語("目前", "Current")} 0%</div>
        </section>
      </section>
    `;
    return wrap;
  }

  private buildBarSvg(cls: "health-bar" | "energy-bar", w: number, h: number, withShield: boolean): string {
    const fillVar = cls === "health-bar" ? "var(--c-hp-full)" : "var(--c-energy)";
    const shield = withShield
      ? `<rect class="bar-shield" x="0" y="0" width="0" height="6" fill="var(--c-shield)" opacity="0.9" />`
      : "";
    return `
      <svg class="${cls}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
        <path class="bar-frame" d="${chamferPath(0, 0, w, h, 6)}" />
        ${shield}
        <path class="bar-fill" d="" fill="${fillVar}" />
        <text class="bar-text" x="${w - 12}" y="${h / 2 + 5}" text-anchor="end" font-size="14" fill="#fff" style="opacity:0; transition: opacity .15s;">0%</text>
      </svg>
    `;
  }

  private renderVitalRow(vital: PartyVital): string {
    const ratio = Math.max(0, Math.min(1, vital.ratio));
    const star = vital.isCaptain ? `${雙語("隊長", "Captain")} ★${vital.star}` : `${this.layerLabel(vital.layer)} ★${vital.star}`;
    return `
      <div class="hud-health-detail-row${vital.isCaptain ? " is-captain" : ""}">
        <div class="hud-health-detail-head">
          <strong>${vital.label}</strong>
          <span>${star}</span>
          <em>${Math.round(vital.current)} / ${Math.round(vital.max)}</em>
        </div>
        <div class="hud-health-detail-bar">
          <div class="hud-health-detail-fill" style="width:${Math.round(ratio * 100)}%"></div>
        </div>
      </div>
    `;
  }

  private layerLabel(layer: PartyVital["layer"]): string {
    if (layer === "inner") return 雙語("最內層", "Inner");
    if (layer === "middle") return 雙語("中層", "Middle");
    if (layer === "outer") return 雙語("最外層", "Outer");
    return 雙語("隊員", "Member");
  }

  private formatCooldown(remaining: number, energyEnough: boolean): string {
    if (remaining > 0.05) return `${remaining.toFixed(1)}s`;
    return energyEnough ? 雙語("可施放", "Ready") : 雙語("能量不足", "Low Energy");
  }

  private formatPeriodics(snap: HudSnapshot): string {
    if (!snap.periodics.length) return 雙語("無", "None");
    return snap.periodics.slice(0, 2).map((periodic) => `${periodic.label} ${Math.round(periodic.chargeRatio * 100)}%`).join(" · ");
  }

  private formatWeapons(snap: HudSnapshot): string {
    const visible = snap.weapons.filter((weapon) => !weapon.disabledByRoster).slice(0, 3);
    if (!visible.length) return 雙語("無", "None");
    return visible.map((weapon) => `${家族顯示名(weapon.family)} ${Math.round(Math.max(0, (1 - weapon.cooldownRatio) * 100))}%`).join(" · ");
  }
}
