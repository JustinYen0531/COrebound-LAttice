/**
 * @file item-drawer.ts
 * @description 右滑抽屜:物品欄(左)+ 隊員狀態條(右)。
 *              對應「玩家介面_戰鬷HUD與操作骨架.md」§5、§6.5。
 *
 *              核心:拖曳藥水到隊員身上 = 喝藥。
 *
 *              防呆(規格 §6.5):
 *              - 小藥水:拖曳放下即生效
 *              - 大藥水:放下後該隊員出現「確認使用?」按鈕,3s 內確認才生效
 *              - 拖曳時只有可生效隊員高亮;死亡隊員灰階且放上去無反應
 *              - 拖曳放空:藥水回到物品欄,不消耗
 *              - 雙擊藥水:對生命最低的隊員使用(智能補給) — 規格 §5.4
 *              - 點擊藥水:對隊長使用(預設目標) — 規格 §5.4
 */

import {
  ROLE_COLOR,
  type HudSnapshot,
  type PotionItem,
  type RosterMember,
  type Role,
} from "./types";
import { potionGlyphSvg } from "./glyphs";
import { 應用程式狀態 } from "../ui/應用程式狀態";
import { 選文 } from "../ui/語系";

function 雙語(中文: string, 英文: string): string {
  return 選文(應用程式狀態.額外.語言, 中文, 英文);
}

function 職責顯示名(role: Role): string {
  return {
    protect: 雙語("保護", "Protect"),
    firepower: 雙語("火力", "Firepower"),
    supply: 雙語("補給", "Supply"),
  }[role];
}

function 層級顯示名(layer: RosterMember["layer"]): string {
  return layer === "inner" ? 雙語("內", "Inner") : layer === "middle" ? 雙語("中", "Middle") : 雙語("外", "Outer");
}

/** 大藥水確認時限(ms) — 規格 §6.5 */
const BIG_CONFIRM_MS = 3000;

export class ItemDrawer {
  readonly el: HTMLElement;
  private readonly potionList: HTMLElement;
  private readonly rosterList: HTMLElement;

  private openRatio = 0;
  private potions: PotionItem[] = [];
  private roster: RosterMember[] = [];
  private renderKey = "";
  private dragging: { potion: PotionItem; ghost: HTMLElement } | null = null;
  /** 大藥水待確認狀態 */
  private pendingBig:
    | { potion: PotionItem; memberId: string | null; deadline: number; timer: number }
    | null = null;

  constructor() {
    this.el = document.createElement("div");
    this.el.className = "drawer item-drawer";
    this.el.innerHTML = `
      <div class="drawer-title">${雙語("補給(右滑)", "Supplies (Swipe Right)")}</div>
      <div class="id-row">
        <div class="potion-list" data-zone="potions"></div>
        <div class="roster-list" data-zone="roster"></div>
      </div>
      <div class="drawer-hint">${雙語("拖曳藥水到隊員身上使用 · 雙擊=對最虛弱隊員 · 單擊=對隊長", "Drag a potion onto a member to use it · Double-click = weakest member · Single-click = captain")}</div>
    `;
    this.potionList = this.el.querySelector(".potion-list") as HTMLElement;
    this.rosterList = this.el.querySelector(".roster-list") as HTMLElement;
  }

  setOpenRatio(r: number): void {
    this.openRatio = Math.max(0, Math.min(1, r));
    this.el.style.transform = `translateX(${100 - this.openRatio * 100}%)`;
    this.el.style.opacity = `${this.openRatio}`;
    this.el.style.pointerEvents = this.openRatio > 0.5 ? "auto" : "none";
  }

  render(snap: HudSnapshot): void {
    const nextKey = this.snapshotKey(snap);
    if (nextKey === this.renderKey) {
      this.tickPendingBig(Date.now());
      return;
    }
    this.renderKey = nextKey;
    this.potions = snap.potions;
    this.roster = snap.roster;
    this.renderPotions();
    this.renderRoster();
    // 清掉過期的大藥水確認
    this.tickPendingBig(Date.now());
  }

  /** 藥水使用事件(隊長=memberId null) */
  onUsePotion(handler: (potionId: string, memberId: string | null) => void): void {
    this._useHandler = handler;
  }
  private _useHandler: ((potionId: string, memberId: string | null) => void) | null = null;

  // ----------------------------------------------------------
  // 渲染
  // ----------------------------------------------------------
  private renderPotions(): void {
    this.potionList.innerHTML = "";
    if (this.potions.length === 0) {
      this.potionList.innerHTML = `<div class="empty-hint">${雙語("無可使用補給", "No usable supplies")}</div>`;
      return;
    }
    for (const p of this.potions) {
      this.potionList.appendChild(this.buildPotionNode(p));
    }
  }

  private renderRoster(): void {
    this.rosterList.innerHTML = "";
    if (this.roster.length === 0) {
      this.rosterList.innerHTML = `<div class="empty-hint">${雙語("無隊員", "No members")}</div>`;
      return;
    }
    // 受傷/護盾優先置頂 — 規格 §5.2
    const sorted = [...this.roster].sort((a, b) => {
      if (a.dead !== b.dead) return a.dead ? 1 : -1;
      return a.hpRatio - b.hpRatio;
    });
    // 只先顯示前 5 名,其餘捲動 — 規格 §5.2
    const visible = sorted.slice(0, 5);
    if (sorted.length > 5) {
      const more = document.createElement("div");
      more.className = "roster-more";
      more.textContent = 雙語(`↓ 還有 ${sorted.length - 5} 名(捲動查看)`, `↓ ${sorted.length - 5} more (scroll to view)`);
      this.rosterList.appendChild(more);
    }
    for (const m of visible) {
      this.rosterList.appendChild(this.buildRosterNode(m));
    }
  }

  private buildPotionNode(p: PotionItem): HTMLElement {
    const node = document.createElement("div");
    node.className = "potion-item";
    node.dataset.potionId = p.id;
    node.draggable = false; // 我們用自製拖曳(更可控)
    node.innerHTML = `
      <div class="pi-glyph">${this.potionGlyph(p)}</div>
      <div class="pi-name">${p.label}${p.size === "big" ? ` <span class="big-tag">${雙語("大", "L")}</span>` : ""}</div>
      <div class="pi-count">×${p.count}</div>
    `;
    // 點擊 = 對隊長使用 — 規格 §5.4
    node.addEventListener("click", (e) => {
      e.stopPropagation();
      // 雙擊偵測 → 對最虛弱隊員 — 規格 §5.4
      const now = Date.now();
      const last = (node as any)._lastClick as number;
      if (last && now - last < 350) {
        this.useOnWeakest(p);
        (node as any)._lastClick = 0;
        return;
      }
      (node as any)._lastClick = now;
      this.requestUse(p, null);
    });
    // 自製拖曳起始 — 規格 §5.4
    node.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this.beginDrag(p, e.clientX, e.clientY);
    });
    return node;
  }

  private buildRosterNode(m: RosterMember): HTMLElement {
    const node = document.createElement("div");
    node.className = "roster-item";
    node.dataset.memberId = m.id;
    if (m.dead) node.classList.add("dead");
    if (m.hpRatio < 0.3) node.classList.add("lethal");
    if (m.shielded) node.classList.add("shielded");

    const roleColor = ROLE_COLOR[m.role as Role];
    const ailments = m.ailments.map((a) => `<span class="ail">${a}</span>`).join("") || "—";
    const hpPct = Math.round(m.hpRatio * 100);
    node.innerHTML = `
      <div class="ri-head">
        <span class="ri-face" style="border-color:${roleColor};">${m.label}</span>
        <span class="ri-role" style="color:${roleColor};">${職責顯示名(m.role as Role)}</span>
      </div>
      <div class="ri-bar">
        <div class="ri-fill" style="width:${hpPct}%; background:${this.hpColor(m.hpRatio)};"></div>
      </div>
      <div class="ri-foot">
        <span class="ri-layer">${層級顯示名(m.layer)}</span>
        <span class="ri-ail">${ailments}</span>
      </div>
    `;
    return node;
  }

  // ----------------------------------------------------------
  // 拖曳(自製,因為要精準控制可放置目標與確認流程)
  // ----------------------------------------------------------
  private beginDrag(potion: PotionItem, x: number, y: number): void {
    if (this.dragging) return;
    const ghost = document.createElement("div");
    ghost.className = "drag-ghost";
    ghost.innerHTML = this.potionGlyph(potion);
    ghost.style.left = `${x}px`;
    ghost.style.top = `${y}px`;
    document.body.appendChild(ghost);
    this.dragging = { potion, ghost };
    // 高亮可生效隊員 — 規格 §6.5
    this.highlightDropTargets(potion);

    const onMove = (ev: MouseEvent) => this.onDragMove(ev);
    const onUp = (ev: MouseEvent) => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      this.endDrag(ev.clientX, ev.clientY);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  private onDragMove(ev: MouseEvent): void {
    if (!this.dragging) return;
    this.dragging.ghost.style.left = `${ev.clientX}px`;
    this.dragging.ghost.style.top = `${ev.clientY}px`;
    // 偵測目前懸停的隊員,加 hover 樣式
    const target = this.findRosterAt(ev.clientX, ev.clientY);
    this.rosterList.querySelectorAll(".roster-item.drop-hover").forEach((n) =>
      n.classList.remove("drop-hover"),
    );
    if (target && this.canAccept(target)) {
      target.classList.add("drop-hover");
    }
  }

  private endDrag(x: number, y: number): void {
    if (!this.dragging) return;
    const { potion, ghost } = this.dragging;
    ghost.remove();
    this.dragging = null;
    this.clearHighlight();
    this.rosterList.querySelectorAll(".roster-item.drop-hover").forEach((n) =>
      n.classList.remove("drop-hover"),
    );
    const target = this.findRosterAt(x, y);
    if (!target) {
      // 放空 → 藥水回到物品欄,不消耗 — 規格 §6.5
      return;
    }
    if (!this.canAccept(target)) {
      // 不可生效(死亡/已滿血) → 無反應 — 規格 §6.5
      return;
    }
    const memberId = target.dataset.memberId as string;
    this.requestUse(potion, memberId);
  }

  private findRosterAt(x: number, y: number): HTMLElement | null {
    const el = document.elementFromPoint(x, y) as Element | null;
    if (!el) return null;
    const item = el.closest(".roster-item") as HTMLElement | null;
    return item;
  }

  /** 是否可接受該藥水 — 規格 §6.5(死亡=不可;生命滿對生命藥水=不可) */
  private canAccept(node: HTMLElement): boolean {
    if (node.classList.contains("dead")) return false;
    const memberId = node.dataset.memberId as string;
    const m = this.roster.find((r) => r.id === memberId);
    if (!m) return false;
    // 此處簡化:只要活著就可接受;精確的「生命滿對生命藥水無效」由遊戲層判定
    return true;
  }

  private highlightDropTargets(_potion: PotionItem): void {
    this.rosterList.querySelectorAll(".roster-item").forEach((n) => {
      const node = n as HTMLElement;
      if (this.canAccept(node)) node.classList.add("droppable");
      else node.classList.add("undroppable");
    });
  }

  private clearHighlight(): void {
    this.rosterList
      .querySelectorAll(".droppable,.undroppable")
      .forEach((n) => n.classList.remove("droppable", "undroppable"));
  }

  // ----------------------------------------------------------
  // 使用請求 + 大藥水確認流程 — 規格 §6.5
  // ----------------------------------------------------------
  private requestUse(potion: PotionItem, memberId: string | null): void {
    // 大藥水需確認
    if (potion.size === "big") {
      this.beginBigConfirm(potion, memberId);
      return;
    }
    // 小藥水直接生效
    this.commitUse(potion, memberId);
  }

  private beginBigConfirm(potion: PotionItem, memberId: string | null): void {
    // 取消前一個待確認
    this.cancelPendingBig();
    const deadline = Date.now() + BIG_CONFIRM_MS;
    const timer = window.setTimeout(() => {
      this.cancelPendingBig(); // 3s 過期 → 取消,藥水退回 — 規格 §6.5
    }, BIG_CONFIRM_MS);
    this.pendingBig = { potion, memberId, deadline, timer };
    this.renderBigConfirmBanner();
  }

  private commitUse(potion: PotionItem, memberId: string | null): void {
    this._useHandler?.(potion.id, memberId);
  }

  /** 對生命最低的活著隊員使用(智能補給) — 規格 §5.4 */
  private useOnWeakest(potion: PotionItem): void {
    const alive = this.roster.filter((r) => !r.dead);
    if (alive.length === 0) return;
    alive.sort((a, b) => a.hpRatio - b.hpRatio);
    this.requestUse(potion, alive[0].id);
  }

  // ----------------------------------------------------------
  // 大藥水確認橫幅
  // ----------------------------------------------------------
  private renderBigConfirmBanner(): void {
    this.clearBigConfirmBanner();
    if (!this.pendingBig) return;
    const { potion, memberId, deadline } = this.pendingBig;
    const member = memberId ? this.roster.find((r) => r.id === memberId) : null;
    const targetName = member ? member.label : 雙語("隊長", "Captain");
    const remain = Math.max(0, deadline - Date.now());
    const banner = document.createElement("div");
    banner.className = "big-confirm-banner";
    banner.innerHTML = `
      <span>${雙語("確認對", "Use")} <b>${targetName}</b> ${雙語("使用", "with")} <b>${potion.label}</b>?</span>
      <button class="confirm-btn">${雙語("確認", "Confirm")}</button>
      <button class="cancel-btn">${雙語("取消", "Cancel")}</button>
      <span class="countdown">${(remain / 1000).toFixed(1)}s</span>
    `;
    this.el.appendChild(banner);
    banner.querySelector(".confirm-btn")!.addEventListener("click", (e) => {
      e.stopPropagation();
      const p = this.pendingBig;
      this.cancelPendingBig();
      if (p) this.commitUse(p.potion, p.memberId);
    });
    banner.querySelector(".cancel-btn")!.addEventListener("click", (e) => {
      e.stopPropagation();
      this.cancelPendingBig();
    });
    // 倒數動畫
    const tick = () => {
      if (!this.pendingBig) return;
      const left = Math.max(0, this.pendingBig.deadline - Date.now());
      const cd = banner.querySelector(".countdown");
      if (cd) cd.textContent = `${(left / 1000).toFixed(1)}s`;
      if (left <= 0) return;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  private clearBigConfirmBanner(): void {
    this.el.querySelectorAll(".big-confirm-banner").forEach((n) => n.remove());
  }

  private cancelPendingBig(): void {
    if (this.pendingBig) {
      clearTimeout(this.pendingBig.timer);
      this.pendingBig = null;
    }
    this.clearBigConfirmBanner();
  }

  /** 由 controller 定期呼叫,清理過期確認 */
  tickPendingBig(now: number): void {
    if (this.pendingBig && this.pendingBig.deadline <= now) {
      this.cancelPendingBig();
    }
  }

  // ----------------------------------------------------------
  // 工具
  // ----------------------------------------------------------
  private potionGlyph(p: PotionItem): string {
    if (p.effect === "hp") return potionGlyphSvg(p.size === "big" ? "hp-big" : "hp-small");
    if (p.effect === "energy") return potionGlyphSvg(p.size === "big" ? "energy-big" : "energy-small");
    return potionGlyphSvg("hybrid");
  }

  private hpColor(ratio: number): string {
    if (ratio > 0.7) return "var(--c-hp-full)";
    if (ratio > 0.3) return "var(--c-hp-warn)";
    return "var(--c-hp-danger)";
  }

  private snapshotKey(snap: HudSnapshot): string {
    const potions = snap.potions
      .map((potion) => `${potion.id}:${potion.count}:${potion.size}:${potion.effect}`)
      .join("|");
    const roster = snap.roster
      .map((member) =>
        [
          member.id,
          Math.round(member.hpRatio * 100),
          member.shielded ? 1 : 0,
          member.dead ? 1 : 0,
          member.ailments.join(","),
        ].join(":"),
      )
      .join("|");
    return `${potions}::${roster}`;
  }
}
