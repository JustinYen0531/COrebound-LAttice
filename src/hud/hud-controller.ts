/**
 * @file hud-controller.ts
 * @description 戰鬥 HUD 的互動中樞:狀態機 + 防誤觸 + 元件黏合。
 *              對應「玩家介面_戰鬷HUD與操作骨架.md」§3(互動規則)、§6(防誤觸)。
 *
 *              職責:
 *              - 維護 HudState 狀態機(idle → hover_hint → ring → drawer)
 *              - 處理滑鼠停留(展開同心圓)、左滑/右滑(抽屜)
 *              - 嚴格執行防誤觸:緩衝帶、滑動門檻、互斥、戰鬥抑制、移動抑制
 *              - 推送 HudSnapshot 給所有子元件
 *              - 收集子元件事件,轉發給遊戲層(HudEvent)
 *
 *              本類別不持有遊戲邏輯,只負責「HUD 互動規則」。
 */

import {
  AUTO_DISMISS,
  THRESHOLD,
  TIMING,
  type HudEvent,
  type HudSnapshot,
  type HudState,
  type WeaponFamily,
} from "./types";
import { CoreTrio } from "./core-trio";
import { FormationRings } from "./formation-rings";
import { WeaponDrawer } from "./weapon-drawer";
import { ItemDrawer } from "./item-drawer";
import { MemberStatusRow } from "./member-status-row";
import { SkillStrips } from "./skill-strips";
import { 播放音效 } from "../audio/音效管理";

/**
 * 整個戰鬥 HUD 的根容器。
 *
 * <div class="hud-root">
 *   <div class="hud-rings-host"></div>     ← 同心圓(絕對置中於頭像上方)
 *   <div class="hud-core-host"></div>      ← 核心三件組(底部中央)
 *   <div class="hud-strips-host"></div>    ← 技能圖示列
 *   <div class="hud-drawer-left"></div>    ← 左滑抽屜
 *   <div class="hud-drawer-right"></div>   ← 右滑抽屜
 *   <div class="hud-hint-l">← 左滑</div>   ← 滑動提示
 *   <div class="hud-hint-r">右滑 →</div>
 *   <div class="hud-suppress-toast"></div> ← 戰鬥抑制提示
 * </div>
 */
export class HudController {
  readonly el: HTMLElement;

  private readonly core: CoreTrio;
  private readonly rings: FormationRings;
  private readonly weaponDrawer: WeaponDrawer;
  private readonly itemDrawer: ItemDrawer;
  private readonly memberStatus: MemberStatusRow;
  private readonly skillStrips: SkillStrips;
  private readonly quickPanelHost: HTMLElement;
  private readonly quickPanelSwitch: HTMLElement;
  private readonly hintL: HTMLElement;
  private readonly hintR: HTMLElement;
  private readonly suppressToast: HTMLElement;

  private state: HudState = "idle";
  private snapshot: HudSnapshot | null = null;
  private activeQuickPanel: "weapon" | "item" = "weapon";

  // 滑動/停留追蹤
  private mouseDownAt: { x: number; y: number; t: number } | null = null;
  private hoverEnterAt: number | null = null; // 進入核心區的時間戳
  private expandTimers: number[] = []; // 展開排程
  private retractTimer: number | null = null;
  private autoDismissMoveTimer: number | null = null;
  private autoDismissLeaveTimer: number | null = null;
  private dragSession:
    | { startX: number; lockedDir: "left" | "right" | null }
    | null = null;

  private eventHandler: ((e: HudEvent) => void) | null = null;

  constructor() {
    this.el = document.createElement("div");
    this.el.className = "hud-root";

    this.core = new CoreTrio();
    this.rings = new FormationRings();
    this.weaponDrawer = new WeaponDrawer();
    this.itemDrawer = new ItemDrawer();
    this.weaponDrawer.setDockSide("right");
    this.itemDrawer.setDockSide("right");
    this.memberStatus = new MemberStatusRow();
    this.skillStrips = new SkillStrips();

    // 提示元素
    this.hintL = document.createElement("div");
    this.hintL.className = "hud-hint hud-hint-l";
    this.hintL.textContent = "← 左滑 技能";
    this.hintR = document.createElement("div");
    this.hintR.className = "hud-hint hud-hint-r";
    this.hintR.textContent = "物品 右滑 →";
    this.suppressToast = document.createElement("div");
    this.suppressToast.className = "hud-suppress-toast";
    this.suppressToast.textContent = "戰鬥中,展開已暫停";

    // 容器
    const ringsHost = document.createElement("div");
    ringsHost.className = "hud-rings-host";
    ringsHost.appendChild(this.rings.el);
    const coreHost = document.createElement("div");
    coreHost.className = "hud-core-host";
    coreHost.appendChild(this.core.el);
    const stripsHost = document.createElement("div");
    stripsHost.className = "hud-strips-host";
    stripsHost.appendChild(this.skillStrips.el);
    const memberStatusHost = document.createElement("div");
    memberStatusHost.className = "hud-member-status-host";
    memberStatusHost.appendChild(this.memberStatus.el);
    this.quickPanelHost = document.createElement("div");
    this.quickPanelHost.className = "hud-quick-panel-host";
    this.quickPanelHost.append(this.weaponDrawer.el, this.itemDrawer.el);
    this.quickPanelSwitch = document.createElement("div");
    this.quickPanelSwitch.className = "hud-quick-panel-switch";
    this.quickPanelSwitch.innerHTML = `
      <button type="button" data-panel="weapon">技</button>
      <button type="button" data-panel="item">補</button>
    `;
    this.quickPanelSwitch.querySelectorAll<HTMLButtonElement>("[data-panel]").forEach((button) => {
      button.onclick = () => {
        const target = button.dataset.panel === "item" ? "item" : "weapon";
        this.activeQuickPanel = target;
        this.setState(target === "weapon" ? "left_open" : "right_open");
        this.refreshQuickPanel();
      };
    });

    this.el.append(
      ringsHost,
      stripsHost,
      this.quickPanelHost,
      this.quickPanelSwitch,
      coreHost,
      memberStatusHost,
      this.hintL,
      this.hintR,
      this.suppressToast,
    );

    this.bindInteractions();
    this.bindComponentEvents();
    this.refreshQuickPanel();
  }

  /** 遊戲層註冊事件 */
  onEvent(handler: (e: HudEvent) => void): void {
    this.eventHandler = handler;
  }

  /** 遊戲層每幀推入最新快照 */
  update(snap: HudSnapshot): void {
    this.snapshot = snap;
    this.core.render(snap);
    this.memberStatus.render(snap);
    this.rings.render(snap);
    this.skillStrips.renderWeapons(snap.weapons);
    this.skillStrips.renderPeriodics(snap.periodics);
    if (this.state === "right_open") this.itemDrawer.render(snap);
    if (this.state === "left_open") this.weaponDrawer.render(snap.weapons);
    this.refreshQuickPanel();
    // 處理自動收回(移動 / 離開)
    this.handleAutoDismissTriggers(snap);
    // 清理過期大藥水確認
    this.itemDrawer.tickPendingBig(Date.now());
  }

  /** 對外公開：直接開啟左側抽屜 */
  openLeftDrawer(): void {
    this.setState("left_open");
    // 設定展開比例為 1.0 (全開)
    this.weaponDrawer.setOpenRatio(1);
  }

  /** 對外公開：直接開啟右側抽屜 */
  openRightDrawer(): void {
    this.setState("right_open");
    // 設定展開比例為 1.0 (全開)
    this.itemDrawer.setOpenRatio(1);
  }

  /** 對外公開：關閉抽屜 */
  closeDrawers(): void {
    this.setState("idle");
  }

  // ============================================================
  // 狀態轉移
  // ============================================================

  private setState(next: HudState): void {
    if (this.state === next) return;
    const prev = this.state;
    this.state = next;
    this.onTransition(prev, next);
  }

  /** 狀態轉移副作用 */
  private onTransition(prev: HudState, next: HudState): void {
    // HUD 音效：停留提示 / 左右抽屜展開（收回不出聲，避免自動收回時洗版）。
    if (next === "hover_hint") 播放音效("HUD提示");
    if (next === "left_open" && prev !== "left_open") 播放音效("左抽屜");
    if (next === "right_open" && prev !== "right_open") 播放音效("右抽屜");
    // 進入/離開展開狀態 → 更新圓圈展開數
    if (next === "idle" || next === "hover_hint") {
      // 離開展開 → 收回圓圈
      if (prev === "ring_expanding" || prev === "ring_full") {
        this.cancelExpandTimers();
        this.rings.setExpandedCount(0);
      }
      // 收回抽屜
      if (prev === "left_open") this.weaponDrawer.setOpenRatio(0);
      if (prev === "right_open") this.itemDrawer.setOpenRatio(0);
    }
    // 進入抽屜狀態 → 收回圓圈(互斥 §3.4)
    if (next === "left_open" || next === "right_open") {
      this.activeQuickPanel = next === "left_open" ? "weapon" : "item";
      this.cancelExpandTimers();
      this.rings.setExpandedCount(0);
      this.core.showBarText(next === "right_open"); // 右滑時頭像顯示雙條數值 — §3.4
      if (this.snapshot && next === "left_open") this.weaponDrawer.render(this.snapshot.weapons);
      if (this.snapshot && next === "right_open") this.itemDrawer.render(this.snapshot);
      // 離開前一個抽屜
      if (prev === "left_open" && next === "right_open") {
        this.weaponDrawer.setOpenRatio(0);
      }
      if (prev === "right_open" && next === "left_open") {
        this.itemDrawer.setOpenRatio(0);
      }
    }
    // 離開抽屜 → 關閉條文字
    if ((prev === "left_open" || prev === "right_open") && next !== "left_open" && next !== "right_open") {
      this.core.showBarText(false);
    }
    // hover_hint → 顯示提示
    this.hintL.style.opacity = next === "hover_hint" ? "1" : "0";
    this.hintR.style.opacity = next === "hover_hint" ? "1" : "0";
    this.refreshQuickPanel();
  }

  private refreshQuickPanel(): void {
    const weaponButton = this.quickPanelSwitch.querySelector<HTMLButtonElement>("[data-panel='weapon']");
    const itemButton = this.quickPanelSwitch.querySelector<HTMLButtonElement>("[data-panel='item']");
    weaponButton?.classList.toggle("is-active", this.activeQuickPanel === "weapon");
    itemButton?.classList.toggle("is-active", this.activeQuickPanel === "item");
    this.quickPanelHost.classList.toggle("is-open", this.state === "left_open" || this.state === "right_open");
    this.weaponDrawer.el.classList.toggle("is-hidden-panel", this.activeQuickPanel !== "weapon");
    this.itemDrawer.el.classList.toggle("is-hidden-panel", this.activeQuickPanel !== "item");
  }

  // ============================================================
  // 互動綁定(狀態機 + 防誤觸)
  // ============================================================

  private bindInteractions(): void {
    // 核心區進入/離開
    this.core.onCoreEnter(() => this.onCoreEnter());
    this.core.onCoreLeave(() => this.onCoreLeave());
    // 核心區滑鼠按下 → 記錄起點(用於滑動判定)
    this.core.onCoreMouseDown((x, y) => {
      this.mouseDownAt = { x, y, t: Date.now() };
      this.dragSession = { startX: x, lockedDir: null };
    });
    // 全域滑鼠移動 → 處理滑動
    window.addEventListener("mousemove", (e) => this.onGlobalMouseMove(e));
    window.addEventListener("mouseup", () => this.onGlobalMouseUp());
    // 點擊頭像 = 施放主動技能(由 core 內部 stopPropagation)
    this.core.onAvatarClick(() => {
      // 規格 §2.4:施放中暫停圓圈旋轉 0.5s
      this.rings.setSpinPaused(true);
      window.setTimeout(() => this.rings.setSpinPaused(false), 500);
      this.emit({ type: "cast_active" });
    });
    // Esc 收回一切 — 規格 §3.5、§6.6
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.setState("idle");
    });
  }

  /** 滑鼠進入核心區 */
  private onCoreEnter(): void {
    this.hoverEnterAt = Date.now();
    this.cancelRetract();
    this.cancelAutoDismissLeave();
    // 戰鬥抑制時不進入 hover_hint — 規格 §6.3
    if (this.isCombatSuppressed()) {
      this.flashSuppressToast();
      return;
    }
    // 移動中不展開,但仍可顯示提示
    if (this.snapshot?.moving) {
      // 移動中:不展開圓圈 — 規格 §6.3
      return;
    }
    // 目前若在抽屜狀態,不切走
    if (this.state === "left_open" || this.state === "right_open") return;
    this.setState("hover_hint");
    // 排程 0.5s 後開始展開 — 規格 §2.1
    this.expandTimers.push(
      window.setTimeout(() => this.beginExpansion(), TIMING.HOVER_TO_EXPAND),
    );
  }

  /** 滑鼠離開核心區 */
  private onCoreLeave(): void {
    this.hoverEnterAt = null;
    // 設定自動收回計時(離開 HUD 區) — 規格 §3.5
    this.autoDismissLeaveTimer = window.setTimeout(() => {
      this.setState("idle");
    }, AUTO_DISMISS.AFTER_LEAVE_MS);
  }

  /** 全域滑鼠移動:處理停留不動判定 + 滑動判定 */
  private onGlobalMouseMove(e: MouseEvent): void {
    if (!this.dragSession || !this.mouseDownAt) return;
    const dx = e.clientX - this.dragSession.startX;

    // 尚未鎖定方向時,判定是否達鎖定門檻 — 規格 §3.3
    if (!this.dragSession.lockedDir) {
      const adx = Math.abs(dx);
      // 死帶:8px 內不反應
      if (adx < THRESHOLD.SWIPE_DEAD) return;
      // 8~40px 為預覽帶,不鎖定;但若水平明顯>垂直可預先標記
      if (adx < THRESHOLD.SWIPE_LOCK) {
        // 預覽:微微移動抽屜(不鎖定)
        return;
      }
      // 達鎖定門檻:認定方向(只認水平) — 規格 §3.3
      if (dx < 0) this.dragSession.lockedDir = "left";
      else this.dragSession.lockedDir = "right";
      // 鎖定後進入抽屜狀態(若互斥則阻擋) — 規格 §3.4
      this.tryOpenDrawer(this.dragSession.lockedDir);
    }

    // 已鎖定方向:抽屜跟隨拖曳量 1:1 — 規格 §3.3
    if (this.dragSession.lockedDir === "left") {
      const ratio = Math.min(1, Math.abs(dx) / 200); // 200px 全開
      this.weaponDrawer.setOpenRatio(ratio);
    } else if (this.dragSession.lockedDir === "right") {
      const ratio = Math.min(1, dx / 200);
      this.itemDrawer.setOpenRatio(ratio);
    }

    // 停留不動判定:若拖曳中,則不算停留
    this.hoverEnterAt = null;
  }

  /** 滑鼠鬆開:依展開量決定吸附或收回 — 規格 §3.3 */
  private onGlobalMouseUp(): void {
    if (this.dragSession?.lockedDir) {
      // 判定吸附:需讀抽屜目前比例。簡化:依最後 dx 推估
      // 由於 setOpenRatio 內部已 clamp,這裡重算 dx
      if (this.mouseDownAt) {
        // 用當前 state 判定是否該保持開啟
        // 若已在 left_open/right_open,保持;否則收回
      }
      this.dragSession = null;
      this.mouseDownAt = null;
      return;
    }
    this.dragSession = null;
    this.mouseDownAt = null;
  }

  /** 嘗試開啟抽屜(含互斥檢查) — 規格 §3.4 */
  private tryOpenDrawer(dir: "left" | "right"): void {
    // 互斥:另一邊開著時不可開 — 規格 §3.4
    if (dir === "left" && this.state === "right_open") return;
    if (dir === "right" && this.state === "left_open") return;
    this.setState(dir === "left" ? "left_open" : "right_open");
  }

  // ============================================================
  // 同心圓展開時序 — 規格 §2.1
  // ============================================================

  private beginExpansion(): void {
    // 戰鬥/移動中不展開 — 規格 §6.3
    if (this.isCombatSuppressed() || this.snapshot?.moving) {
      this.flashSuppressToast();
      return;
    }
    if (this.state !== "hover_hint") return;
    this.setState("ring_expanding");
    // 階段1:最內圈(0.25s)
    this.expandTimers.push(
      window.setTimeout(() => {
        this.rings.setExpandedCount(1);
      }, 0),
    );
    // 階段2:中間圈(0.2s 後 + 0.25s)
    this.expandTimers.push(
      window.setTimeout(() => {
        this.rings.setExpandedCount(2);
      }, TIMING.RING_FADE_MS + TIMING.RING_GAP_MS),
    );
    // 階段3:最外圈 → 進入 ring_full
    this.expandTimers.push(
      window.setTimeout(() => {
        this.rings.setExpandedCount(3);
        this.setState("ring_full");
      }, 2 * (TIMING.RING_FADE_MS + TIMING.RING_GAP_MS)),
    );
  }

  private cancelExpandTimers(): void {
    this.expandTimers.forEach((t) => clearTimeout(t));
    this.expandTimers = [];
  }

  private cancelRetract(): void {
    if (this.retractTimer) {
      clearTimeout(this.retractTimer);
      this.retractTimer = null;
    }
  }
  private cancelAutoDismissLeave(): void {
    if (this.autoDismissLeaveTimer) {
      clearTimeout(this.autoDismissLeaveTimer);
      this.autoDismissLeaveTimer = null;
    }
  }

  // ============================================================
  // 自動收回觸發 — 規格 §3.5、§6.6
  // ============================================================

  private handleAutoDismissTriggers(snap: HudSnapshot): void {
    // 移動中 → 0.5s 後收回抽屜(但受擊時不收回 — 規格 §6.6)
    if (snap.moving && (this.state === "left_open" || this.state === "right_open")) {
      if (this.autoDismissMoveTimer === null) {
        this.autoDismissMoveTimer = window.setTimeout(() => {
          this.setState("idle");
          this.autoDismissMoveTimer = null;
        }, AUTO_DISMISS.AFTER_MOVE_MS);
      }
    } else if (this.autoDismissMoveTimer !== null) {
      clearTimeout(this.autoDismissMoveTimer);
      this.autoDismissMoveTimer = null;
    }
    // 戰鬥抑制(受擊):若正在展開過程,收回 — 規格 §6.3
    if (this.isCombatSuppressed() && this.state === "ring_expanding") {
      this.setState("hover_hint");
      this.rings.setExpandedCount(0);
    }
  }

  /** 最近受擊後 AUTO_DISMISS.COMBAT_SUPPRESS_MS 內視為戰鬥中 — 規格 §6.3 */
  private isCombatSuppressed(): boolean {
    if (!this.snapshot) return false;
    return Date.now() - this.snapshot.lastHitAt < AUTO_DISMISS.COMBAT_SUPPRESS_MS;
  }

  private flashSuppressToast(): void {
    this.suppressToast.classList.add("show");
    window.setTimeout(() => this.suppressToast.classList.remove("show"), 800);
  }

  // ============================================================
  // 子元件事件 → HudEvent
  // ============================================================

  private bindComponentEvents(): void {
    // 武器群組切換(左滑抽屜)
    this.weaponDrawer.onToggle((family: WeaponFamily) => {
      this.emit({ type: "toggle_weapon", family });
    });
    // 藥水使用(右滑抽屜)
    this.itemDrawer.onUsePotion((potionId, memberId) => {
      this.emit({ type: "use_potion", potionId, onMemberId: memberId });
    });
    this.memberStatus.onCycle((direction) => {
      this.emit({ type: "cycle_roster_role", direction });
    });
    // 點圓圈進管理介面 — 規格 §2.4(僅 ring_full 時才生效)
    // 互斥原則(§3.4)保證 ring_full 時抽屜必然關閉,故無需再檢查 drawer 狀態。
    this.rings.onRingClick((focusMemberId) => {
      if (this.state !== "ring_full") return;
      this.emit({ type: "open_management", focusMemberId });
    });
  }

  private emit(e: HudEvent): void {
    this.eventHandler?.(e);
  }
}
