/**
 * @file skill-strips.ts
 * @description 第二層(武器群組)與第三層(週期/自動施法)技能小圖示列。
 *              對應「玩家介面_戰鬷HUD與操作骨架.md」§4.3、§4.4。
 *
 *              位置:武器群組在能量條「上方」,週期/自動在能量條「下方」。
 *              兩者上下分開,避免混淆 — 規格 §4.4。
 *
 *              - 武器群組:外圈是冷卻進度環,圖示左下角標星級
 *              - 週期/自動:外圈是充能累積環,滿了脈動
 *              - 平常「只能看,不能關」;放大可關閉的能力在左滑抽屜(weapon-drawer.ts)
 */

import {
  FAMILY_LABEL,
  SIZE,
  type PeriodicSkillState,
  type WeaponGroupState,
} from "./types";
import { familyGlyphSvg, lockGlyphSvg, periodicGlyphSvg } from "./glyphs";

const ICON_R = 18; // 圖示半徑(用於環)

/**
 * 技能圖示列容器:包含武器群組 strip 與週期 strip 兩條。
 *
 * <div class="skill-strips">
 *   <div class="weapon-strip"></div>
 *   <div class="periodic-strip"></div>
 * </div>
 */
export class SkillStrips {
  readonly el: HTMLElement;
  private readonly weaponStrip: HTMLElement;
  private readonly periodicStrip: HTMLElement;
  private readonly weaponNodes = new Map<string, HTMLElement>();
  private readonly periodicNodes = new Map<string, HTMLElement>();

  constructor() {
    this.el = document.createElement("div");
    this.el.className = "skill-strips";
    this.weaponStrip = document.createElement("div");
    this.weaponStrip.className = "weapon-strip";
    this.periodicStrip = document.createElement("div");
    this.periodicStrip.className = "periodic-strip";
    this.el.append(this.weaponStrip, this.periodicStrip);
  }

  /** 渲染武器群組(第二層) — 規格 §4.3 */
  renderWeapons(weapons: WeaponGroupState[]): void {
    const seen = new Set<string>();
    for (const w of weapons) {
      seen.add(w.family);
      const existing = this.weaponNodes.get(w.family);
      if (existing) {
        this.updateWeaponIcon(existing, w);
      } else {
        const node = this.buildWeaponIcon(w);
        this.weaponNodes.set(w.family, node);
        this.weaponStrip.appendChild(node);
      }
    }
    this.pruneMissing(this.weaponNodes, seen);
  }

  /** 渲染週期/自動施法(第三層) — 規格 §4.4 */
  renderPeriodics(periodics: PeriodicSkillState[]): void {
    const seen = new Set<string>();
    for (const p of periodics) {
      seen.add(p.id);
      const existing = this.periodicNodes.get(p.id);
      if (existing) {
        this.updatePeriodicIcon(existing, p);
      } else {
        const node = this.buildPeriodicIcon(p);
        this.periodicNodes.set(p.id, node);
        this.periodicStrip.appendChild(node);
      }
    }
    this.pruneMissing(this.periodicNodes, seen);
  }

  // ----------------------------------------------------------
  // 內部建構
  // ----------------------------------------------------------

  private buildWeaponIcon(w: WeaponGroupState): HTMLElement {
    const node = document.createElement("div");
    node.className = "weapon-icon";
    node.dataset.family = w.family;
    node.style.width = `${SIZE.WEAPON_ICON}px`;
    node.style.height = `${SIZE.WEAPON_ICON}px`;

    // 狀態 class
    if (!w.active) node.classList.add("off");
    if (w.disabledByRoster) node.classList.add("locked");
    if (w.active && w.cooldownRatio < 1) node.classList.add("firing");

    // 冷卻環(SVG circle dasharray)
    const circ = 2 * Math.PI * ICON_R;
    const filled = circ * w.cooldownRatio;
    node.innerHTML = `
      <svg viewBox="0 0 ${SIZE.WEAPON_ICON} ${SIZE.WEAPON_ICON}">
        <circle class="track" cx="50%" cy="50%" r="${ICON_R}"
          fill="rgba(4,5,9,0.7)" stroke="rgba(233,236,248,0.16)" stroke-width="1.5" />
        <circle class="cooldown" cx="50%" cy="50%" r="${ICON_R}"
          fill="none" stroke="var(--c-weapon)" stroke-width="2" stroke-linecap="round"
          stroke-dasharray="${filled} ${circ - filled}"
          transform="rotate(-90 ${SIZE.WEAPON_ICON / 2} ${SIZE.WEAPON_ICON / 2})" />
      </svg>
      <span class="glyph-inline">${familyGlyphSvg(w.family)}</span>
      <span class="star">${w.star}★</span>
      ${w.disabledByRoster ? `<span class="lock">${lockGlyphSvg()}</span>` : ""}
    `;
    node.title = `${FAMILY_LABEL[w.family]} ${w.star}★`;
    return node;
  }

  private updateWeaponIcon(node: HTMLElement, w: WeaponGroupState): void {
    node.classList.toggle("off", !w.active);
    node.classList.toggle("locked", w.disabledByRoster);
    node.classList.toggle("firing", w.active && w.cooldownRatio < 1);
    const circ = 2 * Math.PI * ICON_R;
    const filled = circ * w.cooldownRatio;
    const cooldown = node.querySelector<SVGCircleElement>(".cooldown");
    if (cooldown) cooldown.setAttribute("stroke-dasharray", `${filled} ${circ - filled}`);
    const star = node.querySelector<HTMLElement>(".star");
    if (star) star.textContent = `${w.star}★`;
    const lock = node.querySelector<HTMLElement>(".lock");
    if (w.disabledByRoster && !lock) {
      const lockNode = document.createElement("span");
      lockNode.className = "lock";
      lockNode.innerHTML = lockGlyphSvg();
      node.appendChild(lockNode);
    } else if (!w.disabledByRoster && lock) {
      lock.remove();
    }
    node.title = `${FAMILY_LABEL[w.family]} ${w.star}★`;
  }

  private buildPeriodicIcon(p: PeriodicSkillState): HTMLElement {
    const node = document.createElement("div");
    node.className = "periodic-icon";
    node.dataset.kind = p.kind;
    node.dataset.id = p.id;
    node.style.width = `${SIZE.PERIODIC_ICON}px`;
    node.style.height = `${SIZE.PERIODIC_ICON}px`;

    // 充能滿 → 脈動 — 規格 §4.4
    if (p.chargeRatio >= 1) node.classList.add("ready");

    const circ = 2 * Math.PI * (ICON_R - 2);
    const filled = circ * p.chargeRatio;
    const ringColor = p.kind === "periodic" ? "var(--c-periodic)" : "var(--c-auto)";
    node.innerHTML = `
      <svg viewBox="0 0 ${SIZE.PERIODIC_ICON} ${SIZE.PERIODIC_ICON}">
        <circle class="track" cx="50%" cy="50%" r="${ICON_R - 2}"
          fill="rgba(4,5,9,0.7)" stroke="rgba(233,236,248,0.14)" stroke-width="1.5" />
        <circle class="charge" cx="50%" cy="50%" r="${ICON_R - 2}"
          fill="none" stroke="${ringColor}" stroke-width="2" stroke-linecap="round"
          stroke-dasharray="${filled} ${circ - filled}"
          transform="rotate(-90 ${SIZE.PERIODIC_ICON / 2} ${SIZE.PERIODIC_ICON / 2})" />
      </svg>
      <span class="glyph-inline">${periodicGlyphSvg(p.kind)}</span>
    `;
    node.title = `${p.label} (${p.kind === "periodic" ? "週期" : "自動"})`;
    return node;
  }

  private updatePeriodicIcon(node: HTMLElement, p: PeriodicSkillState): void {
    node.dataset.kind = p.kind;
    node.classList.toggle("ready", p.chargeRatio >= 1);
    const circ = 2 * Math.PI * (ICON_R - 2);
    const filled = circ * p.chargeRatio;
    const charge = node.querySelector<SVGCircleElement>(".charge");
    if (charge) {
      charge.setAttribute("stroke", p.kind === "periodic" ? "var(--c-periodic)" : "var(--c-auto)");
      charge.setAttribute("stroke-dasharray", `${filled} ${circ - filled}`);
    }
    node.title = `${p.label} (${p.kind === "periodic" ? "週期" : "自動"})`;
  }

  private pruneMissing(nodes: Map<string, HTMLElement>, seen: Set<string>): void {
    for (const [id, node] of nodes) {
      if (seen.has(id)) continue;
      node.remove();
      nodes.delete(id);
    }
  }
}
