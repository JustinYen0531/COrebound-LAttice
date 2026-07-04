/**
 * @file weapon-drawer.ts
 * @description 左滑抽屜:技能列。
 *              對應「玩家介面_戰鬷HUD與操作骨架.md」§3.4、§4.3、§7.2。
 *
 *              職責:
 *              - 武器群組圖示放大(略小於主動技能)
 *              - 可點擊「單獨關閉」某個武器群組(節省能量) — 規格 §4.3
 *              - 顯示每個技能冷卻
 *              - 由 controller 控制開合進度(0~1),本類只負責呈現與抽屜寬度
 */

import {
  FAMILY_LABEL,
  type WeaponFamily,
  type WeaponGroupState,
} from "./types";
import { familyGlyphSvg, lockGlyphSvg } from "./glyphs";

export class WeaponDrawer {
  readonly el: HTMLElement;
  private list: HTMLElement;

  /** 目前抽屜展開比例 0~1(由 controller 推入) */
  private openRatio = 0;
  private weapons: WeaponGroupState[] = [];
  private renderKey = "";

  constructor() {
    this.el = document.createElement("div");
    this.el.className = "drawer weapon-drawer";
    this.el.innerHTML = `
      <div class="drawer-title">技能列(左滑)</div>
      <div class="weapon-list"></div>
      <div class="drawer-hint">點擊圖示可單獨關閉武器群組</div>
    `;
    this.list = this.el.querySelector(".weapon-list") as HTMLElement;
  }

  setOpenRatio(r: number): void {
    this.openRatio = Math.max(0, Math.min(1, r));
    // 抽屜從核心左側向外推開,用 transform 控制可見度
    this.el.style.transform = `translateX(${-100 + this.openRatio * 100}%)`;
    this.el.style.opacity = `${this.openRatio}`;
    this.el.style.pointerEvents = this.openRatio > 0.5 ? "auto" : "none";
  }

  render(weapons: WeaponGroupState[]): void {
    const nextKey = weapons
      .map((w) => `${w.family}:${w.star}:${w.active ? 1 : 0}:${w.disabledByRoster ? 1 : 0}:${Math.round(w.cooldownRatio * 100)}`)
      .join("|");
    if (nextKey === this.renderKey) return;
    this.renderKey = nextKey;
    this.weapons = weapons;
    this.list.innerHTML = "";
    for (const w of weapons) {
      this.list.appendChild(this.buildItem(w));
    }
  }

  /** 切換武器群組(點擊 → 切換 active) — 規格 §4.3 */
  onToggle(handler: (family: WeaponFamily) => void): void {
    this.list.addEventListener("click", (e) => {
      const item = (e.target as Element).closest("[data-family]") as HTMLElement | null;
      if (!item) return;
      const family = item.dataset.family as WeaponFamily;
      // 被家族人數鎖定的不可切 — 規格 §4.3
      const w = this.weapons.find((x) => x.family === family);
      if (w?.disabledByRoster) return;
      handler(family);
      e.stopPropagation();
    });
  }

  private buildItem(w: WeaponGroupState): HTMLElement {
    const node = document.createElement("div");
    node.className = "weapon-item";
    node.dataset.family = w.family;
    if (!w.active) node.classList.add("off");
    if (w.disabledByRoster) node.classList.add("locked");
    const cdPct = Math.round(w.cooldownRatio * 100);
    node.innerHTML = `
      <div class="wi-glyph">${familyGlyphSvg(w.family)}</div>
      <div class="wi-meta">
        <div class="wi-name">${FAMILY_LABEL[w.family]} <span class="wi-star">${w.star}★</span></div>
        <div class="wi-cd">冷卻 ${cdPct}%</div>
      </div>
      <div class="wi-state">${
        w.disabledByRoster ? `${lockGlyphSvg()}人數不足` : w.active ? "啟用中" : "已關閉"
      }</div>
    `;
    return node;
  }
}
