/**
 * @file hud.ts
 * @description 戰鬥 HUD(DOM 覆蓋層):血條、能量、隊長頭像、家族武器狀態、
 *              成員欄、世界進度、Boss 血條、提示與吐司。
 */

import type { Family, World } from "../legacy/data/成員型別";
import { FAMILY_LABEL } from "../legacy/data/成員型別";
import { POTION_DEFS, QUOTA_T1, QUOTA_T2, MAX_DEATHS, type PotionKind, type RunState } from "./state";
import type { Sim } from "./sim";
import { WORLDS, WORLD_NAME, WORLD_TINT } from "./world";

const FAMILY_ICON: Record<string, string> = {
  shield: "🛡", multishot: "💥", straight: "🎯", mine: "💣",
};

export class Hud {
  root: HTMLElement;
  private minimap: HTMLCanvasElement;
  private toastBox: HTMLElement;
  private prompt: HTMLElement;
  private bossBar: HTMLElement;
  private toastQueue: Array<{ el: HTMLElement; until: number }> = [];

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "hud";
    this.root.innerHTML = `
      <div class="hud-topleft">
        <div class="hud-captain"><div class="hud-cap-img"></div><div class="hud-cap-star"></div></div>
        <div class="hud-bars">
          <div class="bar hp"><div class="fill"></div><span class="txt"></span></div>
          <div class="bar en"><div class="fill"></div><span class="txt"></span></div>
          <div class="hud-res"></div>
        </div>
      </div>
      <div class="hud-topcenter">
        <div class="hud-timer"></div>
        <div class="hud-phase"></div>
      </div>
      <div class="hud-topright">
        <canvas class="hud-minimap" width="176" height="176"></canvas>
        <div class="hud-worlds"></div>
      </div>
      <div class="hud-bossbar hidden"><div class="boss-name"></div><div class="bar boss"><div class="fill"></div></div></div>
      <div class="hud-bottom">
        <div class="hud-weapons"></div>
        <div class="hud-squad"></div>
        <div class="hud-potions"></div>
      </div>
      <div class="hud-prompt hidden"></div>
      <div class="hud-toasts"></div>
      <div class="hud-keys">WASD 移動 · Space 隊長技 · E 互動 · Tab 管理介面 · 1~4 藥水</div>
    `;
    parent.appendChild(this.root);
    this.minimap = this.root.querySelector(".hud-minimap")!;
    this.toastBox = this.root.querySelector(".hud-toasts")!;
    this.prompt = this.root.querySelector(".hud-prompt")!;
    this.bossBar = this.root.querySelector(".hud-bossbar")!;
  }

  destroy(): void {
    this.root.remove();
  }

  getMinimap(): HTMLCanvasElement {
    return this.minimap;
  }

  showPrompt(text: string | null): void {
    if (!text) {
      this.prompt.classList.add("hidden");
    } else {
      this.prompt.classList.remove("hidden");
      this.prompt.textContent = text;
    }
  }

  pushToast(msg: string): void {
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    this.toastBox.appendChild(el);
    this.toastQueue.push({ el, until: performance.now() + 5200 });
    if (this.toastQueue.length > 5) {
      const first = this.toastQueue.shift();
      first?.el.remove();
    }
  }

  update(sim: Sim, state: RunState): void {
    const nowMs = performance.now();
    this.toastQueue = this.toastQueue.filter((t) => {
      if (nowMs > t.until) { t.el.remove(); return false; }
      return true;
    });

    // 隊長
    const capImg = this.root.querySelector<HTMLElement>(".hud-cap-img")!;
    capImg.style.backgroundImage = `url(assets/captains/${state.captainId}.png)`;
    this.root.querySelector(".hud-cap-star")!.textContent = "★".repeat(state.captainStar);

    // 血/能量
    const hpBar = this.root.querySelector<HTMLElement>(".bar.hp .fill")!;
    const hpRatio = Math.max(0, state.hp / state.maxHp);
    hpBar.style.width = `${hpRatio * 100}%`;
    hpBar.style.background = hpRatio > 0.5 ? "#7bd88f" : hpRatio > 0.25 ? "#ffd76b" : "#e14646";
    this.root.querySelector(".bar.hp .txt")!.textContent = `${Math.max(0, Math.ceil(state.hp))} / ${state.maxHp}`;
    const en = state.energy.snapshot();
    this.root.querySelector<HTMLElement>(".bar.en .fill")!.style.width = `${en.ratio * 100}%`;
    this.root.querySelector(".bar.en .txt")!.textContent = `⚡ ${Math.floor(en.current)} / ${en.max}${sim.skillCd > 0 ? `(技能 ${sim.skillCd.toFixed(1)}s)` : ""}`;

    // 資源列
    const lives = "♥".repeat(Math.max(0, MAX_DEATHS - state.deaths)) + "♡".repeat(state.deaths);
    this.root.querySelector(".hud-res")!.textContent = `💎 ${state.gems} 　${lives} 　印記 ${state.sigils}/4`;

    // 時間與階段
    const t = Math.floor(state.timeSec);
    const mm = String(Math.floor(t / 60)).padStart(2, "0");
    const ss = String(t % 60).padStart(2, "0");
    this.root.querySelector(".hud-timer")!.textContent = `${mm}:${ss}`;
    const phase = sim.phase();
    const phaseName = { early: "發育期", mid: "推進期", late: "侵蝕期", showdown: "最終決戰" }[phase];
    const erosionIn = sim.erosionStartsIn();
    this.root.querySelector(".hud-phase")!.textContent =
      phase === "early" || phase === "mid"
        ? `${phaseName} · 侵蝕 ${Math.floor(erosionIn / 60)}:${String(Math.floor(erosionIn % 60)).padStart(2, "0")} 後開始`
        : phaseName;

    // 世界進度
    const worldsBox = this.root.querySelector(".hud-worlds")!;
    worldsBox.innerHTML = WORLDS.map((w) => {
      const p = state.progress[w];
      const status = p.guardianDefeated
        ? "✅ 已通關"
        : p.guardianSummoned
          ? "⚔ 守護者戰鬥中"
          : p.t1Kills >= QUOTA_T1 && p.t2Kills >= QUOTA_T2
            ? "🔔 可召喚守護者"
            : `雜兵 ${Math.min(p.t1Kills, QUOTA_T1)}/${QUOTA_T1} · 精英 ${Math.min(p.t2Kills, QUOTA_T2)}/${QUOTA_T2}`;
      return `<div class="hud-world"><i style="background:${WORLD_TINT[w]}"></i>${WORLD_NAME[w].slice(0, 2)} <em>${status}</em></div>`;
    }).join("");

    // 武器
    const wpBox = this.root.querySelector(".hud-weapons")!;
    const fams: Family[] = ["shield", "multishot", "straight", "mine"];
    wpBox.innerHTML = fams.map((f) => {
      const star = state.weaponStar(f);
      const famMembers = state.members.filter((m) => m.def.family === f);
      const cls = star > 0 ? "on" : famMembers.length > 0 ? "half" : "";
      const sub = star > 0 ? "★".repeat(star) : `${famMembers.length}/2人`;
      return `<div class="wp ${cls}" title="${FAMILY_LABEL[f]}">${FAMILY_ICON[f]}<span>${sub}</span></div>`;
    }).join("");

    // 成員欄
    const sqBox = this.root.querySelector(".hud-squad")!;
    const cells: string[] = [];
    for (let i = 0; i < 8; i++) {
      const m = state.members[i];
      if (m) {
        cells.push(`<div class="sq" style="border-color:${{ shield: "#6fb7ff", multishot: "#ff9d5c", straight: "#ffe066", mine: "#ff6b6b", laser: "#c792ea" }[m.def.family]}">
          <img src="assets/avatars/${m.def.id}_s${m.star}.png" alt="">
          <b>${"★".repeat(m.star)}</b></div>`);
      } else {
        cells.push(`<div class="sq empty">+</div>`);
      }
    }
    sqBox.innerHTML = cells.join("");

    // 藥水
    const potBox = this.root.querySelector(".hud-potions")!;
    const potKeys: PotionKind[] = ["hpS", "hpL", "enS", "enL"];
    const potIcon: Record<PotionKind, string> = { hpS: "🧪", hpL: "❤️", enS: "🔋", enL: "⚡" };
    potBox.innerHTML = potKeys.map((k, i) => {
      const n = state.potions[k];
      return `<div class="pot ${n > 0 ? "" : "none"}" title="${POTION_DEFS[k].name}"><span class="key">${i + 1}</span>${potIcon[k]}<b>${n}</b></div>`;
    }).join("");

    // Boss 條
    const boss = sim.enemies.find((e) => e.boss && e.hp > 0);
    if (boss) {
      this.bossBar.classList.remove("hidden");
      this.bossBar.querySelector(".boss-name")!.textContent =
        boss.boss === "cola" ? "COLA — 中央生命晶格組裝體" : `世界守護者 — ${boss.def.nameZh}`;
      this.bossBar.querySelector<HTMLElement>(".bar.boss .fill")!.style.width = `${(boss.hp / boss.maxHp) * 100}%`;
    } else {
      this.bossBar.classList.add("hidden");
    }
  }
}
