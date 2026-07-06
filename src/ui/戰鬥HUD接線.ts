import "../hud/hud.css";
import { HudController } from "../hud/hud-controller";
import { GameSnapshotSource } from "../hud/game-snapshot-source";
import type { HudEvent } from "../hud/types";
import { TickScheduler } from "../core/Tick排程器";
import { 應用程式狀態 } from "./應用程式狀態";
import { 讀取玩家移動狀態 } from "./元件/世界地圖層";
import type { ChestOpenResult, ChestState } from "../economy/寶箱系統";

class 戰鬥HUD接線器 {
  private readonly hud = new HudController();
  private readonly source = new GameSnapshotSource();
  private readonly scheduler = new TickScheduler();
  private mountedHost: HTMLElement | null = null;
  private rafId = 0;
  private started = false;

  constructor() {
    this.hud.onEvent((event) => this.handleEvent(event));
    this.scheduler.subscribe((frame) => {
      this.source.setMoving(讀取玩家移動狀態());
      this.source.syncFromGame(this.currentMode());
      this.source.tick(frame.dt);
      this.hud.update(this.source.snapshot(this.currentMode()));
    });
    // 施放請求（Space 鍵 / 驗收控制台按鈕）走事件進來，避免與世界地圖層互相 import 造成環依賴。
    window.addEventListener("request-cast-active", this.onRequestCast);
    window.addEventListener("request-open-world-chest", this.onRequestOpenChest as EventListener);
    window.addEventListener("combat-run-reset", this.onRunReset as EventListener);
    window.addEventListener("combat-tick-progress", this.onCombatTickProgress as EventListener);
    window.addEventListener("combat-tick-pulse", this.onCombatTickPulse as EventListener);
  }

  private onRequestCast = (): void => {
    if (應用程式狀態.畫面.層 !== "操作頁面") return;
    this.source.castActive();
    this.source.syncFromGame(this.currentMode());
    this.hud.update(this.source.snapshot(this.currentMode()));
  };

  private onRequestOpenChest = (raw: Event): void => {
    if (應用程式狀態.畫面.層 !== "操作頁面" || 應用程式狀態.畫面.訓練道場) return;
    const event = raw as CustomEvent<{
      chest?: ChestState;
      resolve?: (result: ChestOpenResult) => void;
    }>;
    if (!event.detail?.chest || !event.detail.resolve) return;
    const result = this.source.openWorldChest(event.detail.chest);
    event.detail.resolve(result);
    this.source.syncFromGame(this.currentMode());
    this.hud.update(this.source.snapshot(this.currentMode()));
  };

  private onRunReset = (): void => {
    this.source.resetForRun();
  };

  private onCombatTickProgress = (raw: Event): void => {
    const detail = (raw as CustomEvent<{ progress?: number }>).detail;
    this.source.setCombatTickProgress(detail?.progress ?? 0);
    this.hud.update(this.source.snapshot(this.currentMode()));
  };

  private onCombatTickPulse = (): void => {
    this.source.pulseCombatTick();
    this.hud.update(this.source.snapshot(this.currentMode()));
  };

  /** 供驗收控制台讀取目前隊長主動技能的能量/冷卻狀態。 */
  主動技能讀數() {
    return this.source.活動技能讀數();
  }

  掛載(host: HTMLElement): void {
    if (this.mountedHost !== host) {
      host.innerHTML = "";
      host.appendChild(this.hud.el);
      this.mountedHost = host;
    }

    this.syncFromState();
    this.source.setMoving(讀取玩家移動狀態());
    this.source.syncFromGame(this.currentMode());
    this.hud.update(this.source.snapshot(this.currentMode()));

    if (!this.started) {
      this.started = true;
      this.scheduler.start();
      this.loop();
    }
  }

  同步狀態(): void {
    this.syncFromState();
    this.source.setMoving(讀取玩家移動狀態());
    this.source.syncFromGame(this.currentMode());
    this.hud.update(this.source.snapshot(this.currentMode()));
  }

  private loop = (): void => {
    this.scheduler.advance();
    this.rafId = window.requestAnimationFrame(this.loop);
  };

  private syncFromState(): void {
    const panel = 應用程式狀態.額外.滑動面板;
    if (panel === "左") this.hud.openLeftDrawer();
    else if (panel === "右") this.hud.openRightDrawer();
    else this.hud.closeDrawers();
  }

  private currentMode(): "dojo" | "formal" {
    const state = 應用程式狀態.畫面;
    if ((state.層 === "操作頁面" || state.層 === "管理介面") && state.訓練道場) {
      return "dojo";
    }
    return "formal";
  }

  private handleEvent(event: HudEvent): void {
    switch (event.type) {
      case "cast_active":
        if (應用程式狀態.畫面.層 === "操作頁面") {
          this.source.castActive();
        }
        break;
      case "toggle_weapon":
        this.source.toggleWeapon(event.family);
        break;
      case "use_potion":
        this.source.usePotion(this.currentMode(), event.potionId);
        break;
      case "cycle_roster_role":
        this.source.cycleRosterRole(this.currentMode(), event.direction);
        break;
      case "open_management":
        應用程式狀態.進入管理介面("小隊");
        break;
      case "interact_prompt":
        應用程式狀態.點擊驚嘆號提示();
        break;
    }
    this.source.syncFromGame(this.currentMode());
    this.hud.update(this.source.snapshot(this.currentMode()));
  }
}

export const 戰鬥HUD接線 = new 戰鬥HUD接線器();
