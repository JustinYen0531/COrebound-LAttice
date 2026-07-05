/**
 * @file game.ts
 * @description 遊戲主控:迴圈、鍵盤輸入、設施互動偵測、面板開關、音樂分期、勝敗回報。
 */

import type { World } from "../legacy/data/成員型別";
import type { CaptainId } from "../legacy/data/戰鬥原語";
import { music } from "./assets";
import { generateLayout } from "./world";
import { RunState, type PotionKind } from "./state";
import { Sim, type Chest } from "./sim";
import { Renderer } from "./render";
import { Hud } from "./hud";
import { Panels, type PanelKind } from "./panels";
import { PLAZA_R, CX, CY, worldAt } from "./world";

export interface RunResult {
  result: "victory" | "defeat";
  state: RunState;
}

export class Game {
  private root: HTMLElement;
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private hud: Hud;
  private panels: Panels;
  private sim: Sim;
  state: RunState;

  private keys = new Set<string>();
  private rafId = 0;
  private lastTs = 0;
  private paused = false;
  private ended = false;
  private onEnd: (r: RunResult) => void;
  private interactTarget: { label: string; action: () => void } | null = null;
  private resizeHandler = () => this.renderer.resize();
  private keydownHandler = (e: KeyboardEvent) => this.onKeyDown(e);
  private keyupHandler = (e: KeyboardEvent) => this.keys.delete(e.code);

  constructor(root: HTMLElement, captainId: CaptainId, onEnd: (r: RunResult) => void) {
    this.root = root;
    this.onEnd = onEnd;
    root.innerHTML = "";
    this.canvas = document.createElement("canvas");
    this.canvas.className = "game-canvas";
    root.appendChild(this.canvas);

    this.state = new RunState(captainId);
    const seed = (Math.random() * 0xffffffff) >>> 0;
    this.sim = new Sim(this.state, generateLayout(seed), seed);
    this.renderer = new Renderer(this.canvas);
    this.renderer.resize();
    this.hud = new Hud(root);
    this.panels = new Panels(root);

    window.addEventListener("resize", this.resizeHandler);
    window.addEventListener("keydown", this.keydownHandler);
    window.addEventListener("keyup", this.keyupHandler);

    music.play("early");
    this.hud.pushToast("歡迎來到 COrebound LAttence。目標:達成擊殺指標 → 召喚並擊敗四世界守護者 → 集齊印記 → 在中央廣場擊敗 COLA!");
    this.hud.pushToast("先去找雕像解鎖第一位隊員(打 T0/T1 怪收集材料)。");

    this.lastTs = performance.now();
    this.rafId = requestAnimationFrame((ts) => this.frame(ts));
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    window.removeEventListener("resize", this.resizeHandler);
    window.removeEventListener("keydown", this.keydownHandler);
    window.removeEventListener("keyup", this.keyupHandler);
    this.hud.destroy();
    this.panels.destroy();
    this.root.innerHTML = "";
  }

  // ---------- 輸入 ----------

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === "Tab") {
      e.preventDefault();
      if (this.panels.isOpen()) this.panels.close();
      else this.openPanel({ kind: "squad" });
      return;
    }
    if (e.code === "Escape") {
      if (this.panels.isOpen()) this.panels.close();
      return;
    }
    if (this.panels.isOpen()) return;
    this.keys.add(e.code);
    if (e.code === "Space") {
      e.preventDefault();
      if (!this.sim.castActiveSkill()) {
        // 能量或冷卻不足時的輕提示(不刷 toast)
      }
    }
    if (e.code === "KeyE") {
      this.interactTarget?.action();
    }
    const potMap: Record<string, PotionKind> = { Digit1: "hpS", Digit2: "hpL", Digit3: "enS", Digit4: "enL" };
    if (potMap[e.code]) {
      const k = potMap[e.code];
      if (this.state.usePotion(k)) this.hud.pushToast(`使用了${{ hpS: "小生命", hpL: "大生命", enS: "小能量", enL: "大能量" }[k]}藥水`);
    }
  }

  private openPanel(kind: PanelKind): void {
    this.paused = true;
    this.panels.open(kind, this.sim, this.state, () => {
      this.paused = false;
    });
  }

  // ---------- 互動偵測 ----------

  private detectInteraction(): void {
    this.interactTarget = null;
    const px = this.sim.px, py = this.sim.py;
    const near = (x: number, y: number, r: number) => Math.hypot(x - px, y - py) < r + this.sim.squadR + 40;

    // 寶箱優先
    let bestChest: Chest | null = null;
    for (const c of this.sim.chests) {
      if (!c.opened && near(c.x, c.y, 60)) { bestChest = c; break; }
    }
    if (bestChest) {
      const chest = bestChest;
      this.interactTarget = {
        label: "按 E 開啟禪繞寶箱(消耗 50% 最大能量)",
        action: () => this.sim.openChest(chest),
      };
      return;
    }

    for (const f of this.sim.layout.facilities) {
      if (!near(f.x, f.y, f.r)) continue;
      switch (f.kind) {
        case "statue":
          if (f.memberId) {
            this.interactTarget = { label: "按 E 檢視雕像(解鎖成員)", action: () => this.openPanel({ kind: "statue", memberId: f.memberId! }) };
          }
          break;
        case "workshop":
          this.interactTarget = { label: "按 E 開啟工坊(熔煉/升星)", action: () => this.openPanel({ kind: "workshop", world: f.world as World }) };
          break;
        case "shop":
          this.interactTarget = { label: "按 E 開啟流浪商店", action: () => this.openPanel({ kind: "shop", world: f.world as World }) };
          break;
        case "altar":
          this.interactTarget = { label: "按 E 檢視守護者祭壇", action: () => this.openPanel({ kind: "altar", world: f.world as World }) };
          break;
        case "cola":
          this.interactTarget = { label: "按 E 檢視 COLA 裝配儀", action: () => this.openPanel({ kind: "cola" }) };
          break;
      }
      if (this.interactTarget) return;
    }
  }

  // ---------- 主迴圈 ----------

  private frame(ts: number): void {
    if (this.ended) return;
    const dt = Math.min(0.05, (ts - this.lastTs) / 1000);
    this.lastTs = ts;

    if (!this.paused) {
      const input = {
        moveX: (this.keys.has("KeyD") || this.keys.has("ArrowRight") ? 1 : 0) - (this.keys.has("KeyA") || this.keys.has("ArrowLeft") ? 1 : 0),
        moveY: (this.keys.has("KeyS") || this.keys.has("ArrowDown") ? 1 : 0) - (this.keys.has("KeyW") || this.keys.has("ArrowUp") ? 1 : 0),
      };
      this.sim.update(dt, input);

      // 吐司搬運
      for (const t of this.sim.toasts) this.hud.pushToast(t);
      this.sim.toasts.length = 0;

      // 音樂分期
      music.play(this.sim.phase());

      this.detectInteraction();
      this.hud.showPrompt(this.interactTarget?.label ?? null);

      // 勝敗
      if (this.sim.outcome) {
        this.finish(this.sim.outcome.result);
        return;
      }
    }

    this.renderer.render(this.sim, this.state);
    this.renderer.renderMinimap(this.hud.getMinimap(), this.sim, this.state);
    this.hud.update(this.sim, this.state);

    this.rafId = requestAnimationFrame((t) => this.frame(t));
  }

  private finish(result: "victory" | "defeat"): void {
    this.ended = true;
    music.stop();
    const state = this.state;
    // 給結算畫面一點時間感
    setTimeout(() => {
      this.destroy();
      this.onEnd({ result, state });
    }, 600);
  }
}
