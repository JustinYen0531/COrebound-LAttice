import "../hud/hud.css";
import { HudController } from "../hud/hud-controller";
import { MockSnapshotSource } from "../hud/mock-snapshot";
import type { HudEvent } from "../hud/types";
import { TickScheduler } from "../core/Tick排程器";
import { 應用程式狀態 } from "./應用程式狀態";

class 戰鬥HUD接線器 {
  private readonly hud = new HudController();
  private readonly source = new MockSnapshotSource();
  private readonly scheduler = new TickScheduler();
  private mountedHost: HTMLElement | null = null;
  private rafId = 0;
  private started = false;

  constructor() {
    this.hud.onEvent((event) => this.handleEvent(event));
    this.scheduler.subscribe((frame) => {
      this.source.tick(frame.dt);
      this.hud.update(this.source.snapshot());
    });
  }

  掛載(host: HTMLElement): void {
    if (this.mountedHost !== host) {
      host.innerHTML = "";
      host.appendChild(this.hud.el);
      this.mountedHost = host;
    }

    this.syncFromState();
    this.hud.update(this.source.snapshot());

    if (!this.started) {
      this.started = true;
      this.scheduler.start();
      this.loop();
    }
  }

  同步狀態(): void {
    this.syncFromState();
    this.hud.update(this.source.snapshot());
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

  private handleEvent(event: HudEvent): void {
    switch (event.type) {
      case "cast_active":
        this.source.castActive();
        break;
      case "toggle_weapon":
        this.source.toggleWeapon(event.family);
        break;
      case "use_potion":
        this.source.usePotion(event.potionId);
        break;
      case "open_management":
        應用程式狀態.進入管理介面("小隊");
        break;
      case "interact_prompt":
        應用程式狀態.點擊驚嘆號提示();
        break;
    }
    this.hud.update(this.source.snapshot());
  }
}

export const 戰鬥HUD接線 = new 戰鬥HUD接線器();
