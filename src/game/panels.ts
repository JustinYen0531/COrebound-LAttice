/**
 * @file panels.ts
 * @description 互動面板(開啟時暫停):雕像解鎖、工坊(熔煉+升星)、
 *              流浪商店、祭壇召喚、COLA 裝配儀、小隊管理(Tab)。
 */

import type { Family, World } from "../legacy/data/成員型別";
import { FAMILY_LABEL, WORLD_LABEL } from "../legacy/data/成員型別";
import { findMember, memberStatsAtStar, membersByWorld, STAR_RECIPE } from "../legacy/data/成員資料庫";
import { MATERIALS, describeMaterial, sellPriceOfMaterial } from "../legacy/data/素材資料庫";
import { PLAYABLE_FAMILIES } from "../legacy/data/戰鬥原語";
import { MATERIAL_RARITY_LABEL } from "../legacy/data/戰鬥原語";
import { MONSTERS } from "../legacy/data/怪物資料庫";
import { POTION_DEFS, QUOTA_T1, QUOTA_T2, type PotionKind, type RunState } from "./state";
import type { Sim } from "./sim";
import { CX, CY, PLAZA_R, WORLD_NAME, worldAt, type Facility, type FacilityKind } from "./world";
import { 掛載舊管理介面 } from "./legacyManagementAdapter";

export type PanelKind =
  | { kind: "statue"; memberId: string }
  | { kind: "workshop"; world: World }
  | { kind: "shop"; world: World }
  | { kind: "altar"; world: World }
  | { kind: "cola" }
  | { kind: "squad" };

type ManagementTab = "squad" | "bag" | "interact" | "codex" | "map";
type BagTab = "materials" | "potions" | "quest" | "tracked";
type CodexTab = "members" | "enemies" | "materials" | "systems";

export class Panels {
  private overlay: HTMLElement;
  private onCloseCb: (() => void) | null = null;
  current: PanelKind | null = null;
  private managementTab: ManagementTab = "squad";
  private bagTab: BagTab = "materials";
  private codexTab: CodexTab = "members";

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
    if (panel.kind === "squad") this.managementTab = "squad";
    this.overlay.classList.remove("hidden");
    this.renderCurrent(sim, state);
  }

  close(): void {
    this.current = null;
    this.overlay.classList.remove("legacy-management-overlay");
    this.overlay.style.position = "";
    this.overlay.style.inset = "";
    this.overlay.style.zIndex = "";
    this.overlay.style.display = "";
    this.overlay.style.overflow = "";
    this.overlay.style.background = "";
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
      case "squad": this.renderManagement(sim, state); break;
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

  private setManagementTab(tab: ManagementTab, sim: Sim, state: RunState): void {
    this.managementTab = tab;
    this.renderManagement(sim, state);
  }

  private currentWorld(sim: Sim): World | "core" {
    return Math.hypot(sim.px - CX, sim.py - CY) <= PLAZA_R ? "core" : worldAt(sim.px, sim.py);
  }

  private isFacilityNearby(sim: Sim, facility: Facility): boolean {
    return Math.hypot(facility.x - sim.px, facility.y - sim.py) < facility.r + sim.squadR + 40;
  }

  private nearestFacility(sim: Sim, predicate: (facility: Facility) => boolean): Facility | null {
    let best: Facility | null = null;
    let bestDist = Infinity;
    for (const facility of sim.layout.facilities) {
      if (!predicate(facility)) continue;
      const d = Math.hypot(facility.x - sim.px, facility.y - sim.py);
      if (d < bestDist) {
        bestDist = d;
        best = facility;
      }
    }
    return best;
  }

  private managementTabLabel(tab: ManagementTab): string {
    return ({
      squad: "小隊",
      bag: "背包",
      interact: "互動",
      codex: "圖鑑",
      map: "地圖",
    })[tab];
  }

  private renderManagement(sim: Sim, state: RunState): void {
    this.overlay.classList.add("legacy-management-overlay");
    this.overlay.style.position = "fixed";
    this.overlay.style.inset = "0";
    this.overlay.style.zIndex = "30000";
    this.overlay.style.display = "block";
    this.overlay.style.overflow = "auto";
    this.overlay.style.background = "#d3d0c7";
    this.overlay.innerHTML = `<div class="legacy-management-host"></div>`;
    const host = this.overlay.querySelector<HTMLElement>(".legacy-management-host");
    if (!host) return;
    host.style.width = "100%";
    host.style.minHeight = "100%";
    host.style.display = "flex";
    host.style.justifyContent = "center";
    掛載舊管理介面(host, sim, state, () => this.close());
  }

  private renderManagementContent(sim: Sim, state: RunState): string {
    switch (this.managementTab) {
      case "squad":
        return this.renderSquadTab(state);
      case "bag":
        return this.renderBagTab(state);
      case "interact":
        return this.renderInteractTab(sim, state);
      case "codex":
        return this.renderCodexTab(state);
      case "map":
        return this.renderMapTab(sim, state);
      default:
        return "";
    }
  }

  private renderSquadTab(state: RunState): string {
    const cap = state.captainStats();
    const ctrl = state.captainControl();
    const memberRows = state.members.map((m) => {
      const s = memberStatsAtStar(m.def, m.star);
      return `<tr>
        <td><img class="mini" src="assets/avatars/${m.def.id}_s${m.star}.png">${m.def.nameZh} ${"★".repeat(m.star)}</td>
        <td>${FAMILY_LABEL[m.def.family]}</td>
        <td>${WORLD_LABEL[m.def.world]}</td>
        <td>HP ${s.hp} / ATK ${s.atk}</td>
        <td class="muted">${m.def.starNodes[m.star]?.name ?? ""}</td>
      </tr>`;
    }).join("");
    const shardLine = PLAYABLE_FAMILIES.map((f) => `${FAMILY_LABEL[f]} ${state.shards.get(f) ?? 0}`).join(" · ");
    const weaponRows = PLAYABLE_FAMILIES.map((family) => {
      const active = state.weaponStar(family);
      const enchant = state.activeEnchant(family);
      return `<tr>
        <td>${FAMILY_LABEL[family]}</td>
        <td>${active > 0 ? `${active}★ 啟用` : "未啟用"}</td>
        <td class="muted">${enchant ? `${enchant.id} (${enchant.star}★)` : "尚無生效附魔"}</td>
      </tr>`;
    }).join("");
    return `
      <div class="mgmt-grid two-col">
        <section class="mgmt-card">
          <h3>隊長與小隊總覽</h3>
          <div class="mgmt-stat-grid">
            <div><span>隊長</span><strong>${state.captainId.toUpperCase()} ${"★".repeat(state.captainStar)}</strong></div>
            <div><span>總生命</span><strong>${state.hp.toFixed(0)} / ${state.maxHp}</strong></div>
            <div><span>隊長貢獻</span><strong>HP ${cap.hp} / ATK ${cap.atk}</strong></div>
            <div><span>移速</span><strong>${Math.round(state.moveSpeed())}</strong></div>
            <div><span>小隊總星</span><strong>${state.totalMemberStars()}</strong></div>
            <div><span>控制引擎</span><strong>${ctrl ? ctrl.kind : "尚未解鎖"}</strong></div>
          </div>
          <p class="muted">${ctrl ? `所有子彈附帶「${ctrl.kind}」控制效果。` : "隊長 2★ 後，所有子彈才會附帶控制效果。"}</p>
        </section>
        <section class="mgmt-card">
          <h3>家族武器與碎片</h3>
          <p>${shardLine}</p>
          <table class="tbl"><tr><th>家族</th><th>武器星級</th><th>當前附魔</th></tr>${weaponRows}</table>
        </section>
      </div>
      <section class="mgmt-card">
        <h3>成員 (${state.members.length}/8)</h3>
        ${state.members.length ? `<table class="tbl"><tr><th>成員</th><th>家族</th><th>世界</th><th>數值</th><th>星級節點</th></tr>${memberRows}</table>` : `<p class="muted">尚無成員，先去雕像供奉解鎖。</p>`}
      </section>
    `;
  }

  private renderBagTab(state: RunState): string {
    const bagTabs: Array<{ id: BagTab; label: string }> = [
      { id: "materials", label: "材料" },
      { id: "potions", label: "消耗品" },
      { id: "quest", label: "任務物" },
      { id: "tracked", label: "追蹤中" },
    ];
    const materials = MATERIALS.filter((material) => (state.materials.get(material.id) ?? 0) > 0);
    const materialRows = materials
      .map((material) => `<tr><td>${material.nameZh}</td><td>${WORLD_NAME[material.world as World]}</td><td>${material.star}★ ${MATERIAL_RARITY_LABEL[material.rarity]}</td><td>×${state.materials.get(material.id) ?? 0}</td></tr>`)
      .join("");
    const potionRows = (Object.keys(POTION_DEFS) as PotionKind[])
      .map((kind) => {
        const def = POTION_DEFS[kind];
        const effect = `${def.hpRatio > 0 ? `HP +${Math.round(def.hpRatio * 100)}%` : ""}${def.hpRatio > 0 && def.enRatio > 0 ? " / " : ""}${def.enRatio > 0 ? `能量 +${Math.round(def.enRatio * 100)}%` : ""}`;
        return `<tr><td>${def.name}</td><td>${effect}</td><td>💎 ${def.price}</td><td>${state.potions[kind]}</td></tr>`;
      })
      .join("");
    const trackedRows = (Object.entries(state.progress) as Array<[World, RunState["progress"][World]]>)
      .map(([world, progress]) => `<tr><td>${WORLD_NAME[world]}</td><td>${Math.min(progress.t1Kills, QUOTA_T1)} / ${QUOTA_T1}</td><td>${Math.min(progress.t2Kills, QUOTA_T2)} / ${QUOTA_T2}</td><td>${progress.guardianDefeated ? "已擊敗" : progress.guardianSummoned ? "已召喚" : "未召喚"}</td></tr>`)
      .join("");
    let content = "";
    if (this.bagTab === "materials") {
      content = materials.length
        ? `<table class="tbl"><tr><th>材料</th><th>世界</th><th>星級</th><th>持有</th></tr>${materialRows}</table>`
        : `<p class="muted">目前沒有材料庫存。</p>`;
    } else if (this.bagTab === "potions") {
      content = `<table class="tbl"><tr><th>藥水</th><th>效果</th><th>價格</th><th>持有</th></tr>${potionRows}</table>`;
    } else if (this.bagTab === "quest") {
      content = `
        <div class="mgmt-stat-grid">
          <div><span>世界印記</span><strong>${state.sigils} / 4</strong></div>
          <div><span>COLA 狀態</span><strong>${state.colaDefeated ? "已擊敗" : state.colaSummoned ? "已召喚" : "未召喚"}</strong></div>
          <div><span>死亡次數</span><strong>${state.deaths} / 3</strong></div>
          <div><span>開箱次數</span><strong>${state.stats.chestsOpened}</strong></div>
        </div>
        <p class="muted">四枚世界印記集齊後，回中央廣場即可啟動 COLA 裝配儀。</p>
      `;
    } else {
      content = `
        <table class="tbl"><tr><th>世界</th><th>T1 進度</th><th>T2 進度</th><th>守護者</th></tr>${trackedRows}</table>
        <div class="mgmt-stat-grid compact">
          <div><span>原石</span><strong>${state.gems}</strong></div>
          <div><span>擊殺</span><strong>${state.stats.kills}</strong></div>
          <div><span>Boss 擊殺</span><strong>${state.stats.bossKills}</strong></div>
          <div><span>升星次數</span><strong>${state.stats.starUps}</strong></div>
        </div>
      `;
    }
    return `
      <section class="mgmt-card">
        <div class="mgmt-subtabs">
          ${bagTabs.map((tab) => `<button class="mgmt-bag-tab ${this.bagTab === tab.id ? "active" : ""}" data-tab="${tab.id}">${tab.label}</button>`).join("")}
        </div>
        ${content}
      </section>
    `;
  }

  private renderInteractTab(sim: Sim, state: RunState): string {
    const currentWorld = this.currentWorld(sim);
    const currentWorldName = currentWorld === "core" ? "中央廣場" : WORLD_NAME[currentWorld];
    const nearestStatue = this.nearestFacility(sim, (facility) => facility.kind === "statue");
    const nearestWorkShop = currentWorld === "core" ? null : this.nearestFacility(sim, (facility) => facility.kind === "workshop" && facility.world === currentWorld);
    const nearestShop = currentWorld === "core" ? null : this.nearestFacility(sim, (facility) => facility.kind === "shop" && facility.world === currentWorld);
    const nearestAltar = currentWorld === "core" ? null : this.nearestFacility(sim, (facility) => facility.kind === "altar" && facility.world === currentWorld);
    const colaPlatform = this.nearestFacility(sim, (facility) => facility.kind === "cola");
    const entries = [
      nearestWorkShop ? {
        title: `${WORLD_NAME[nearestWorkShop.world as World]}工坊`,
        desc: "熔煉材料、轉家族碎片、升成員星級。",
        near: this.isFacilityNearby(sim, nearestWorkShop),
        kind: "workshop" as const,
        world: nearestWorkShop.world as World,
      } : null,
      nearestShop ? {
        title: `${WORLD_NAME[nearestShop.world as World]}商店`,
        desc: "購買藥水、回收材料換原石。",
        near: this.isFacilityNearby(sim, nearestShop),
        kind: "shop" as const,
        world: nearestShop.world as World,
      } : null,
      nearestAltar ? {
        title: `${WORLD_NAME[nearestAltar.world as World]}祭壇`,
        desc: "達標後召喚世界守護者。",
        near: this.isFacilityNearby(sim, nearestAltar),
        kind: "altar" as const,
        world: nearestAltar.world as World,
      } : null,
      nearestStatue ? {
        title: `最近雕像 · ${findMember(nearestStatue.memberId ?? "")?.nameZh ?? "未知成員"}`,
        desc: "供奉材料後可把成員加入小隊。",
        near: this.isFacilityNearby(sim, nearestStatue),
        kind: "statue" as const,
        memberId: nearestStatue.memberId ?? "",
      } : null,
      colaPlatform ? {
        title: "COLA 裝配儀",
        desc: "四印記到齊後，在中央廣場召喚最終 Boss。",
        near: this.isFacilityNearby(sim, colaPlatform),
        kind: "cola" as const,
      } : null,
    ].filter((entry) => entry !== null);

    return `
      <div class="mgmt-grid two-col">
        <section class="mgmt-card">
          <h3>現場互動狀態</h3>
          <div class="mgmt-stat-grid">
            <div><span>目前區域</span><strong>${currentWorldName}</strong></div>
            <div><span>玩家座標</span><strong>X ${Math.round(sim.px)} / Y ${Math.round(sim.py)}</strong></div>
            <div><span>靠近設施</span><strong>${entries.filter((entry) => entry.near).map((entry) => entry.title).join(" / ") || "無"}</strong></div>
            <div><span>說明</span><strong>只有靠近時才可進入現場操作</strong></div>
          </div>
          <p class="muted">管理介面保留舊版的「遠端看資料、靠近後再正式操作」邏輯。</p>
        </section>
        <section class="mgmt-card">
          <h3>守護者與終局進度</h3>
          <table class="tbl"><tr><th>世界</th><th>T1</th><th>T2</th><th>狀態</th></tr>
            ${(Object.entries(state.progress) as Array<[World, RunState["progress"][World]]>)
              .map(([world, progress]) => `<tr><td>${WORLD_NAME[world]}</td><td>${Math.min(progress.t1Kills, QUOTA_T1)} / ${QUOTA_T1}</td><td>${Math.min(progress.t2Kills, QUOTA_T2)} / ${QUOTA_T2}</td><td>${progress.guardianDefeated ? "已擊敗" : progress.guardianSummoned ? "戰鬥中" : "未召喚"}</td></tr>`)
              .join("")}
          </table>
        </section>
      </div>
      <section class="mgmt-card">
        <h3>互動樞紐</h3>
        <div class="mgmt-action-list">
          ${entries.map((entry) => `
            <div class="mgmt-action-card ${entry.near ? "is-live" : ""}">
              <div>
                <strong>${entry.title}</strong>
                <p class="muted">${entry.desc}</p>
              </div>
              <div class="mgmt-action-meta">
                <span class="${entry.near ? "ok" : "bad"}">${entry.near ? "現場可操作" : "尚未靠近"}</span>
                <button class="btn tiny ${entry.near ? "primary" : "off"} mgmt-open-panel"
                  data-kind="${entry.kind}"
                  ${"world" in entry ? `data-world="${entry.world}"` : ""}
                  ${"memberId" in entry ? `data-member-id="${entry.memberId}"` : ""}
                  ${entry.near ? "" : "disabled"}>
                  ${entry.near ? "開啟" : "需靠近"}
                </button>
              </div>
            </div>
          `).join("")}
        </div>
      </section>
    `;
  }

  private renderCodexTab(state: RunState): string {
    const codexTabs: Array<{ id: CodexTab; label: string }> = [
      { id: "members", label: "成員圖鑑" },
      { id: "enemies", label: "怪物圖鑑" },
      { id: "materials", label: "材料圖鑑" },
      { id: "systems", label: "機制圖鑑" },
    ];
    let content = "";
    if (this.codexTab === "members") {
      content = `
        <div class="mgmt-grid two-col">
          ${(["geometry", "organic", "fractal", "mechanical"] as World[]).map((world) => {
            const defs = membersByWorld(world);
            return `<div class="mgmt-card inset">
              <h3>${WORLD_NAME[world]}</h3>
              <p class="muted">已解鎖 ${defs.filter((def) => state.members.some((member) => member.def.id === def.id)).length} / ${defs.length}</p>
              <div class="mgmt-chip-list">
                ${defs.map((def) => `<span class="mgmt-chip ${state.members.some((member) => member.def.id === def.id) ? "owned" : ""}">${def.nameZh}</span>`).join("")}
              </div>
            </div>`;
          }).join("")}
        </div>
      `;
    } else if (this.codexTab === "enemies") {
      content = `
        <table class="tbl"><tr><th>世界</th><th>T0</th><th>T1</th><th>T2</th><th>T3/T4</th></tr>
        ${(["geometry", "organic", "fractal", "mechanical"] as World[]).map((world) => {
          const defs = MONSTERS.filter((monster) => monster.world === world);
          return `<tr>
            <td>${WORLD_NAME[world]}</td>
            <td>${defs.filter((monster) => monster.tier === 0).map((monster) => monster.nameZh).join(" / ")}</td>
            <td>${defs.filter((monster) => monster.tier === 1).map((monster) => monster.nameZh).join(" / ")}</td>
            <td>${defs.filter((monster) => monster.tier === 2).map((monster) => monster.nameZh).join(" / ")}</td>
            <td>${defs.filter((monster) => monster.tier >= 3).map((monster) => monster.nameZh).join(" / ")}</td>
          </tr>`;
        }).join("")}
        <tr><td>中央</td><td colspan="3" class="muted">最終區域</td><td>${MONSTERS.filter((monster) => monster.world === "core").map((monster) => monster.nameZh).join(" / ")}</td></tr>
        </table>
      `;
    } else if (this.codexTab === "materials") {
      content = `
        <table class="tbl"><tr><th>世界</th><th>1★ 普通 / 高級</th><th>2★ 普通 / 高級</th><th>3★ 普通 / 高級</th></tr>
        ${(["geometry", "organic", "fractal", "mechanical"] as World[]).map((world) => {
          const worldMaterials = MATERIALS.filter((material) => material.world === world);
          const cell = (star: 1 | 2 | 3) => {
            const common = worldMaterials.find((material) => material.star === star && material.rarity === "common");
            const fine = worldMaterials.find((material) => material.star === star && material.rarity === "fine");
            return `${common?.nameZh ?? "-"} / ${fine?.nameZh ?? "-"}`;
          };
          return `<tr><td>${WORLD_NAME[world]}</td><td>${cell(1)}</td><td>${cell(2)}</td><td>${cell(3)}</td></tr>`;
        }).join("")}
        </table>
      `;
    } else {
      content = `
        <div class="mgmt-grid two-col">
          <div class="mgmt-card inset">
            <h3>主循環</h3>
            <ol class="mgmt-list">
              <li>打 T0/T1 怪，收材料與原石。</li>
              <li>靠近雕像解鎖成員，靠近工坊熔煉與升星。</li>
              <li>各世界完成 T1/T2 擊殺指標後召喚守護者。</li>
              <li>集齊四印記，回中央廣場召喚 COLA。</li>
            </ol>
          </div>
          <div class="mgmt-card inset">
            <h3>目前隊長控制</h3>
            <p>${state.captainId.toUpperCase()} / ${state.captainControl()?.kind ?? "尚未啟用控制引擎"}</p>
            <p class="muted">Space 消耗 40 能量施放主動技能；隊長 2★ 後全隊武器附帶控制。</p>
          </div>
        </div>
      `;
    }
    return `
      <section class="mgmt-card">
        <div class="mgmt-subtabs">
          ${codexTabs.map((tab) => `<button class="mgmt-codex-tab ${this.codexTab === tab.id ? "active" : ""}" data-tab="${tab.id}">${tab.label}</button>`).join("")}
        </div>
        ${content}
      </section>
    `;
  }

  private renderMapTab(sim: Sim, state: RunState): string {
    const currentWorld = this.currentWorld(sim);
    const visibleFacilities = sim.layout.facilities.filter((facility) => {
      if (currentWorld === "core") return facility.kind === "cola";
      return facility.world === currentWorld || facility.kind === "cola";
    });
    return `
      <div class="mgmt-grid two-col">
        <section class="mgmt-card">
          <h3>即時位置</h3>
          <div class="mgmt-stat-grid">
            <div><span>座標</span><strong>X ${Math.round(sim.px)} / Y ${Math.round(sim.py)}</strong></div>
            <div><span>所在區域</span><strong>${currentWorld === "core" ? "中央廣場" : WORLD_NAME[currentWorld]}</strong></div>
            <div><span>侵蝕開始</span><strong>${Math.ceil(sim.erosionStartsIn())} 秒後</strong></div>
            <div><span>未開寶箱</span><strong>${sim.chests.filter((chest) => !chest.opened).length}</strong></div>
          </div>
          <div class="mgmt-world-grid">
            ${(["geometry", "organic", "fractal", "mechanical"] as World[]).map((world) => {
              const progress = state.progress[world];
              return `<div class="mgmt-world-card ${currentWorld === world ? "active" : ""}">
                <strong>${WORLD_NAME[world]}</strong>
                <span>T1 ${Math.min(progress.t1Kills, QUOTA_T1)} / ${QUOTA_T1}</span>
                <span>T2 ${Math.min(progress.t2Kills, QUOTA_T2)} / ${QUOTA_T2}</span>
                <span>${progress.guardianDefeated ? "守護者已倒" : progress.guardianSummoned ? "守護者戰鬥中" : "尚未召喚"}</span>
              </div>`;
            }).join("")}
          </div>
        </section>
        <section class="mgmt-card">
          <h3>目前可關注地標</h3>
          <table class="tbl"><tr><th>設施</th><th>座標</th><th>狀態</th></tr>
            ${visibleFacilities.map((facility) => `<tr>
              <td>${facility.kind === "workshop" ? "工坊" : facility.kind === "shop" ? "商店" : facility.kind === "altar" ? "祭壇" : facility.kind === "statue" ? `雕像 · ${findMember(facility.memberId ?? "")?.nameZh ?? "未知"}` : "COLA 裝配儀"}</td>
              <td>${Math.round(facility.x)}, ${Math.round(facility.y)}</td>
              <td>${this.isFacilityNearby(sim, facility) ? "就在附近" : "尚未靠近"}</td>
            </tr>`).join("")}
          </table>
        </section>
      </div>
    `;
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

}
