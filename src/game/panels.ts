/**
 * @file panels.ts
 * @description 互動面板(開啟時暫停):雕像解鎖、工坊(熔煉+升星)、
 *              流浪商店、祭壇召喚、COLA 裝配儀、小隊管理(Tab)。
 */

import type { Family, World } from "../legacy/data/成員型別";
import { FAMILY_LABEL, WORLD_LABEL } from "../legacy/data/成員型別";
import { findMember, memberStatsAtStar, STAR_RECIPE } from "../legacy/data/成員資料庫";
import { MATERIALS, describeMaterial, sellPriceOfMaterial } from "../legacy/data/素材資料庫";
import { PLAYABLE_FAMILIES } from "../legacy/data/戰鬥原語";
import { POTION_DEFS, QUOTA_T1, QUOTA_T2, type PotionKind, type RunState } from "./state";
import type { Sim } from "./sim";
import { WORLD_NAME, worldAt } from "./world";

export type PanelKind =
  | { kind: "statue"; memberId: string }
  | { kind: "workshop"; world: World }
  | { kind: "shop"; world: World }
  | { kind: "altar"; world: World }
  | { kind: "cola" }
  | { kind: "squad" };

export class Panels {
  private overlay: HTMLElement;
  private onCloseCb: (() => void) | null = null;
  current: PanelKind | null = null;

  constructor(parent: HTMLElement) {
    this.overlay = document.createElement("div");
    this.overlay.className = "panel-overlay hidden";
    parent.appendChild(this.overlay);
    this.overlay.addEventListener("click", (ev) => {
      if (ev.target === this.overlay) this.close();
    });
  }

  destroy(): void {
    this.overlay.remove();
  }

  isOpen(): boolean {
    return this.current !== null;
  }

  open(panel: PanelKind, sim: Sim, state: RunState, onClose: () => void): void {
    this.current = panel;
    this.onCloseCb = onClose;
    this.overlay.classList.remove("hidden");
    this.renderCurrent(sim, state);
  }

  close(): void {
    this.current = null;
    this.overlay.classList.add("hidden");
    this.overlay.innerHTML = "";
    this.onCloseCb?.();
    this.onCloseCb = null;
  }

  /** 重新渲染目前面板(操作後刷新) */
  renderCurrent(sim: Sim, state: RunState): void {
    if (!this.current) return;
    const p = this.current;
    switch (p.kind) {
      case "statue": this.renderStatue(p.memberId, sim, state); break;
      case "workshop": this.renderWorkshop(p.world, sim, state); break;
      case "shop": this.renderShop(p.world, sim, state); break;
      case "altar": this.renderAltar(p.world, sim, state); break;
      case "cola": this.renderCola(sim, state); break;
      case "squad": this.renderSquad(sim, state); break;
    }
  }

  private frame(title: string, bodyHtml: string, subtitle = ""): HTMLElement {
    this.overlay.innerHTML = `
      <div class="panel">
        <div class="panel-head"><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ""}<button class="panel-close">✕</button></div>
        <div class="panel-body">${bodyHtml}</div>
      </div>`;
    this.overlay.querySelector(".panel-close")!.addEventListener("click", () => this.close());
    return this.overlay.querySelector(".panel-body")!;
  }

  // ---------- 雕像 ----------

  private renderStatue(memberId: string, sim: Sim, state: RunState): void {
    const def = findMember(memberId);
    if (!def) return this.close();
    const stats = memberStatsAtStar(def, 1);
    const r = STAR_RECIPE[1];
    const check = state.canUnlock(memberId);
    const haveC = state.materialCount(def.world, 1, "common");
    const haveF = state.materialCount(def.world, 1, "fine");
    const unlocked = state.members.some((m) => m.def.id === memberId);
    const body = this.frame(
      `成員雕像 — ${def.nameZh} (${def.nameEn})`,
      `
      <div class="statue-grid">
        <img class="statue-portrait" src="assets/avatars/${def.id}_s1.png" alt="">
        <div>
          <p class="muted">${WORLD_LABEL[def.world]} · ${FAMILY_LABEL[def.family]}家族 · 專屬附魔「${def.enchant}」</p>
          <p>${def.role}</p>
          <p class="soul">${def.soulConcept}</p>
          <p>1★ 數值:HP ${stats.hp} / ATK ${stats.atk} / 重量 ${stats.weight}</p>
          <hr>
          <p>供奉需求:${WORLD_LABEL[def.world]} 1★ 普通 ×${r.commonCurrent}(持有 ${haveC})、1★ 高級 ×${r.fineCurrent}(持有 ${haveF})</p>
          ${unlocked
            ? `<p class="ok">已在小隊中。</p>`
            : check.ok
              ? `<button class="btn primary" id="unlock-btn">供奉並解鎖(加入小隊)</button>`
              : `<p class="bad">${check.reason}</p>`}
        </div>
      </div>`,
      "在雕像旁供奉材料,完成 0→1★ 初始化(遊戲設計文件 §9.2)",
    );
    body.querySelector("#unlock-btn")?.addEventListener("click", () => {
      if (state.unlockMember(memberId)) {
        sim.toast(`🎉 ${def.nameZh} 加入小隊!(${FAMILY_LABEL[def.family]}家族)`);
        this.renderCurrent(sim, state);
      }
    });
  }

  // ---------- 工坊(熔煉 + 升星) ----------

  private renderWorkshop(world: World, sim: Sim, state: RunState): void {
    const owned = MATERIALS.filter((m) => (state.materials.get(m.id) ?? 0) > 0);
    const meltRows = owned.map((m) => {
      const n = state.materials.get(m.id) ?? 0;
      const local = m.world === world;
      return `<tr>
        <td>${describeMaterial(m)}${local ? ` <span class="ok">地緣+20%</span>` : ""}</td>
        <td>×${n}</td>
        <td>${PLAYABLE_FAMILIES.map((f) => `<button class="btn tiny melt" data-mat="${m.id}" data-fam="${f}">${FAMILY_LABEL[f]}</button>`).join("")}</td>
      </tr>`;
    }).join("");

    const upRows = state.members.map((m, i) => {
      const cost = state.upgradeCost(m);
      if (!cost) return `<tr><td>${m.def.nameZh} ${"★".repeat(m.star)}</td><td colspan="2" class="ok">已達 3★ 質變</td></tr>`;
      const check = state.canUpgrade(m);
      const rc = cost.recipe;
      const w = m.def.world;
      const need = `${cost.nextStar}★高級×${rc.fineCurrent} + ${cost.nextStar}★普通×${rc.commonCurrent}` +
        (rc.finePrev ? ` + ${cost.nextStar - 1}★高級×${rc.finePrev}` : "") +
        ` + ${FAMILY_LABEL[m.def.family]}碎片×${rc.shards}`;
      return `<tr>
        <td><img class="mini" src="assets/avatars/${m.def.id}_s${m.star}.png">${m.def.nameZh} ${"★".repeat(m.star)}</td>
        <td class="muted">${WORLD_LABEL[w]}材料:${need}</td>
        <td>${check.ok ? `<button class="btn tiny primary up" data-i="${i}">升星</button>` : `<span class="bad">${check.reason}</span>`}</td>
      </tr>`;
    }).join("");

    const shardLine = PLAYABLE_FAMILIES.map((f) => `${FAMILY_LABEL[f]} ${state.shards.get(f) ?? 0}`).join(" · ");
    const body = this.frame(
      `${WORLD_NAME[world]}工坊`,
      `
      <h3>家族碎片:${shardLine}</h3>
      <h3>① 熔煉材料 → 家族碎片(機制指南 §5)</h3>
      ${owned.length ? `<table class="tbl"><tr><th>材料</th><th>持有</th><th>熔煉為</th></tr>${meltRows}</table>` : `<p class="muted">背包沒有材料。去打怪吧。</p>`}
      <h3>② 成員升星(5-3-1 配方,機制指南 §1.1)</h3>
      ${state.members.length ? `<table class="tbl">${upRows}</table>` : `<p class="muted">還沒有隊員。先去雕像解鎖成員。</p>`}
      `,
      "熔爐與合成台合併設施 — 熔多餘材料、升成員星級。地緣材料熔煉 +20%。",
    );
    body.querySelectorAll<HTMLButtonElement>(".melt").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mat = MATERIALS.find((m) => m.id === btn.dataset.mat);
        const fam = btn.dataset.fam as Family;
        if (mat && state.meltMaterial(mat, fam, mat.world === world)) this.renderCurrent(sim, state);
      });
    });
    body.querySelectorAll<HTMLButtonElement>(".up").forEach((btn) => {
      btn.addEventListener("click", () => {
        const m = state.members[Number(btn.dataset.i)];
        if (m && state.upgradeMember(m)) {
          sim.toast(`⭐ ${m.def.nameZh} 升至 ${m.star}★!小隊總星 ${state.totalMemberStars()},隊長 ${state.captainStar}★`);
          this.renderCurrent(sim, state);
        }
      });
    });
  }

  // ---------- 商店 ----------

  private renderShop(world: World, sim: Sim, state: RunState): void {
    const potKeys: PotionKind[] = ["hpS", "hpL", "enS", "enL"];
    const potRows = potKeys.map((k) => {
      const d = POTION_DEFS[k];
      return `<tr><td>${d.name}</td><td>${d.hpRatio ? `HP +${d.hpRatio * 100}%` : ""}${d.enRatio ? `能量 +${d.enRatio * 100}%` : ""}</td>
      <td>💎 ${d.price}</td><td>持有 ${state.potions[k]}</td>
      <td><button class="btn tiny buy ${state.gems < d.price ? "off" : "primary"}" data-k="${k}">購買</button></td></tr>`;
    }).join("");
    const owned = MATERIALS.filter((m) => (state.materials.get(m.id) ?? 0) > 0);
    const sellRows = owned.map((m) => {
      const n = state.materials.get(m.id) ?? 0;
      const local = m.world === world;
      return `<tr><td>${describeMaterial(m)}${local ? ` <span class="ok">地緣+20%</span>` : ""}</td><td>×${n}</td>
        <td>💎 ${sellPriceOfMaterial(m, local)}</td>
        <td><button class="btn tiny sell" data-mat="${m.id}">賣 1 份</button></td></tr>`;
    }).join("");
    const body = this.frame(
      `${WORLD_NAME[world]}流浪商店`,
      `
      <h3>💎 原石:${state.gems}</h3>
      <h3>① 藥水(戰鬥中按 1~4 使用)</h3>
      <table class="tbl"><tr><th>藥水</th><th>效果</th><th>價格</th><th></th><th></th></tr>${potRows}</table>
      <h3>② 材料回收(地緣販售 +20%)</h3>
      ${owned.length ? `<table class="tbl">${sellRows}</table>` : `<p class="muted">背包沒有材料可以賣。</p>`}
      `,
      "機制指南 §8:藥水採購與資源回收。",
    );
    body.querySelectorAll<HTMLButtonElement>(".buy").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (state.buyPotion(btn.dataset.k as PotionKind)) this.renderCurrent(sim, state);
      });
    });
    body.querySelectorAll<HTMLButtonElement>(".sell").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mat = MATERIALS.find((m) => m.id === btn.dataset.mat);
        if (mat && state.sellMaterial(mat, mat.world === world)) this.renderCurrent(sim, state);
      });
    });
  }

  // ---------- 祭壇 ----------

  private renderAltar(world: World, sim: Sim, state: RunState): void {
    const p = state.progress[world];
    const ready = p.t1Kills >= QUOTA_T1 && p.t2Kills >= QUOTA_T2;
    let content: string;
    if (p.guardianDefeated) {
      content = `<p class="ok">✅ 本世界守護者已被擊敗,晶核印記已到手。世界處於狂暴狀態(怪物更強、掉 3★ 素材)。</p>`;
    } else if (p.guardianSummoned) {
      content = `<p class="bad">⚔ 守護者已在本世界肆虐 —— 回去戰鬥!</p>`;
    } else if (ready) {
      content = `<p>擊殺指標已達成。召喚 <b>${WORLD_NAME[world]}守護者(T3)</b>?</p>
        <p class="muted">守護者掉落:晶核印記(COLA 召喚必需)+ 大量 3★/2★ 材料。擊敗後本世界狂暴、其他世界怪物 +15% 連動強化。</p>
        <button class="btn primary" id="summon-btn">🔥 開始召喚儀式</button>`;
    } else {
      content = `<p>召喚條件(機制指南 §6.2,重製版節奏):</p>
        <ul><li>雜兵(T1)擊殺:${Math.min(p.t1Kills, QUOTA_T1)} / ${QUOTA_T1}</li>
        <li>精英(T2)擊殺:${Math.min(p.t2Kills, QUOTA_T2)} / ${QUOTA_T2}(只在世界核心區出沒)</li></ul>`;
    }
    const body = this.frame(`${WORLD_NAME[world]}守護者祭壇`, content, "達成擊殺指標後,在此召喚世界守護者。");
    body.querySelector("#summon-btn")?.addEventListener("click", () => {
      if (sim.summonGuardian(world)) this.close();
    });
  }

  // ---------- COLA 裝配儀 ----------

  private renderCola(sim: Sim, state: RunState): void {
    let content: string;
    if (state.colaDefeated) {
      content = `<p class="ok">COLA 已被擊敗。輪迴終結。</p>`;
    } else if (state.colaSummoned) {
      content = `<p class="bad">👁 COLA 已甦醒 —— 沒有退路了。</p>`;
    } else if (state.sigils >= 4) {
      content = `<p>四枚世界晶核印記已集齊。</p>
        <p class="muted">將印記插入裝配儀,解除最終晶格封印,召喚 T4 最終 Boss ——
        <b>COLA(Central Organic Lattice Assembly,中央生命晶格組裝體)</b>。擊敗它即取得終極勝利。</p>
        <p class="bad">警告:COLA 擁有 30000 生命、四家族武器與眷屬召喚。建議升星至小隊總星 15+ 再開戰。</p>
        <button class="btn primary" id="cola-btn">💠 插入印記,召喚 COLA</button>`;
    } else {
      content = `<p>裝配儀沉睡中。印記:${state.sigils} / 4</p>
        <p class="muted">擊敗四個世界的 T3 守護者,取得全部晶核印記後,方可在此召喚最終 Boss(機制指南 §6.4)。</p>`;
    }
    const body = this.frame("COLA 裝配儀 — 中央廣場", content, "一切圍繞中心展開,終局也在中心。");
    body.querySelector("#cola-btn")?.addEventListener("click", () => {
      if (sim.summonCola()) this.close();
    });
  }

  // ---------- 小隊管理(Tab) ----------

  private renderSquad(sim: Sim, state: RunState): void {
    const cap = state.captainStats();
    const ctrl = state.captainControl();
    const memberRows = state.members.map((m) => {
      const s = memberStatsAtStar(m.def, m.star);
      return `<tr>
        <td><img class="mini" src="assets/avatars/${m.def.id}_s${m.star}.png">${m.def.nameZh} ${"★".repeat(m.star)}</td>
        <td>${FAMILY_LABEL[m.def.family]}</td><td>${WORLD_LABEL[m.def.world]}</td>
        <td>HP ${s.hp} / ATK ${s.atk}</td>
        <td class="muted">${m.def.starNodes[m.star]?.name ?? ""}</td>
      </tr>`;
    }).join("");
    const matRows = MATERIALS.filter((m) => (state.materials.get(m.id) ?? 0) > 0)
      .map((m) => `<tr><td>${describeMaterial(m)}</td><td>×${state.materials.get(m.id)}</td></tr>`).join("");
    const shardLine = PLAYABLE_FAMILIES.map((f) => `${FAMILY_LABEL[f]} ${state.shards.get(f) ?? 0}`).join(" · ");
    this.frame(
      "小隊面板",
      `
      <h3>隊長:${state.captainId.toUpperCase()} ${"★".repeat(state.captainStar)} — HP 貢獻 ${cap.hp} / ATK ${cap.atk}</h3>
      <p class="muted">${ctrl ? `控制效果:所有子彈附帶「${{ slow: "減速", knockback: "擊退", stun: "眩暈", silence: "沉默" }[ctrl.kind]}」` : "隊長 2★(小隊總星 5)後,所有子彈將附帶控制效果"}
      · 小隊總星 ${state.totalMemberStars()}(隊長進化門檻 5 / 10 / 15)</p>
      <h3>成員(${state.members.length}/8)</h3>
      ${state.members.length ? `<table class="tbl">${memberRows}</table>` : `<p class="muted">尚無成員 — 找雕像供奉解鎖。</p>`}
      <h3>材料背包</h3>
      ${matRows ? `<table class="tbl">${matRows}</table>` : `<p class="muted">背包空空。</p>`}
      <h3>家族碎片</h3><p>${shardLine}</p>
      `,
      "Tab / Esc 關閉。開啟期間戰場暫停。",
    );
  }
}
