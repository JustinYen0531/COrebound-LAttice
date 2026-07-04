/**
 * @file 互動面板.ts
 * @description 管理介面「互動分頁」的實際操作面板。
 *              對應 5 種設施 (對應 共用型別.互動設施):
 *              - 合成 (工作台): 成員合成/升星/技能升級的確認面板
 *              - 熔爐: 材料 → 家族碎片的熔煉面板 (含 +20% 地緣加成)
 *              - 雕像: 0→1★ 成員解鎖面板
 *              - 商店: 藥水購買 + 材料販售面板
 *              - 召喚: 守護者召喚 (進度檢查) / COLA 裝配 (印記檢查)
 *
 *              交易與升星直接寫入正式背包/養成狀態，讓世界戰鬥掉落能接回管理介面。
 */

import { 應用程式狀態 } from "../應用程式狀態";
import type { 互動設施 } from "../共用型別";
import { FAMILY_LABEL, type Family } from "../../data/成員型別";
import { STAR_RECIPE, MEMBERS } from "../../data/成員資料庫";
import { MATERIALS, sellPriceOfMaterial, shardFromMaterial } from "../../data/素材資料庫";
import { MATERIAL_RARITY_LABEL, SHARD_YIELD, type MaterialStar } from "../../data/戰鬥原語";
import type { World } from "../../data/成員型別";
import {
  可召喚COLA,
  可召喚守護者,
  對局進度摘要,
  標記COLA已召喚,
  標記守護者已召喚,
} from "../對局進度狀態";
import { 排入Boss召喚 } from "../Boss召喚佇列";
import { MAP_OBJECTS } from "../../data/地圖物件資料";
import { smelt } from "../../economy/熔爐熔煉";
import * as 背包 from "../../economy/背包狀態";
import { buyPotion, POTIONS, type PotionId } from "../../economy/流浪商店";
import { 取得上陣養成, 升星上陣隊員 } from "../../progression/養成狀態";

// ============================================================
// 共享沙盒玩家背包狀態 (全局持久，操作會即時扣減顯示)
// ============================================================
interface 沙盒背包 {
  unlockedMembers: Set<number>;
  skills: Record<string, number>; // 紀錄技能等級
}

const sandboxInv: 沙盒背包 = {
  unlockedMembers: new Set([1, 2, 3, 6, 11, 16]), // 預設解鎖幾位
  skills: { shield: 1, multishot: 1, straight: 1, mine: 1, laser: 1 },
};

// ============================================================
// 推斷玩家目前所在世界(供地緣 +20% 加成提示用)
// 正式版應由地圖層寫入狀態;沙盒模式預設 geometry,讓玩家可完整操作。
function regionNearby(): import("../../data/成員型別").World {
  const object = MAP_OBJECTS.find((entry) => entry.id === 應用程式狀態.額外.靠近的地圖物件ID);
  return object && object.region !== "plaza" ? object.region : "geometry";
}

// 離線模擬警示 Banner
// ============================================================
function 建立狀態警示條(設施: 互動設施): HTMLElement {
  const near = 應用程式狀態.額外.靠近的互動設施;
  const div = document.createElement("div");
  
  if (near === 設施) {
    div.className = "互動狀態條 狀態-在線";
    div.innerHTML = `
      <div style="background: rgba(77, 141, 255, 0.15); border: 1px solid #4d8dff; padding: 10px; border-radius: 6px; margin-bottom: 16px; font-size: 0.85rem; color: #a3c5ff; display: flex; align-items: center; gap: 8px;">
        <span>📡 已連接到現場設施：<b>${設施}</b></span>
        <span style="margin-left: auto; background: #4d8dff; color: #05060b; padding: 1px 6px; border-radius: 3px; font-size: 0.72rem; font-weight: bold;">現場操作模式</span>
      </div>
    `;
  } else {
    div.className = "互動狀態條 狀態-離線";
    div.innerHTML = `
      <div style="background: rgba(216, 180, 106, 0.12); border: 1px solid rgba(216, 180, 106, 0.35); padding: 10px; border-radius: 6px; margin-bottom: 16px; font-size: 0.85rem; color: #e5cd9c; display: flex; flex-direction: column; gap: 4px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>⚠️ 偵測到離線：你目前未靠近戰場中的 <b>${設施}</b> 設施。</span>
          <span style="margin-left: auto; background: #d8b46a; color: #05060b; padding: 1px 6px; border-radius: 3px; font-size: 0.72rem; font-weight: bold;">沙盒模擬預覽</span>
        </div>
        <div style="font-size: 0.75rem; color: #8d93ad;">你仍然可以直接在此進行點擊與模擬操作，資源將會正常扣減與刷新！</div>
      </div>
    `;
  }
  return div;
}

// ============================================================
// 1. 合成面板 (工作台)
// ============================================================
function 合成面板(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "互動面板 互動面板-合成";
  wrap.appendChild(建立狀態警示條("合成"));
  const inventory = 背包.背包快照();
  const squad = 取得上陣養成();

  const container = document.createElement("div");
  container.className = "面板內部區塊";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "16px";

  container.innerHTML = `
    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 16px; border-radius: 8px;">
      <h4 style="margin: 0 0 12px; color: #ff8a3b; display: flex; align-items: center; gap: 8px;">
        🛠️ 裝備工作台 — 成員星級進化配方 (5-3-1)
      </h4>
      <p style="font-size: 0.8rem; color: #8d93ad; margin: 0 0 12px;">成員升級需要消耗怪物生物材料與該世界特有的家族碎片。</p>
      
      <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.82rem;">
        <thead>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); color: #ff8a3b;">
            <th style="padding: 6px 0;">目標星級</th>
            <th>高級材料</th>
            <th>普通材料</th>
            <th>前置星等</th>
            <th>所需碎片</th>
          </tr>
        </thead>
        <tbody>
          ${[1, 2, 3].map((s) => {
            const r = STAR_RECIPE[s as 1 | 2 | 3];
            return `
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 8px 0; font-weight: bold; color: #ffd24d;">${s}★</td>
                <td>${r.fineCurrent} 個</td>
                <td>${r.commonCurrent} 個</td>
                <td>${r.finePrev ? `${s - 1}★ 成員` : "0★ 雕像解鎖"}</td>
                <td style="color: #4d8dff;">${r.shards} 碎片</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
      <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 14px; border-radius: 8px;">
        <h4 style="margin: 0 0 8px; color: #ff8a3b;">🔮 技能武器升級 (不需怪物材料)</h4>
        <p style="font-size: 0.75rem; color: #8d93ad; margin-bottom: 10px;">直接消耗對應的家族碎片與原石提升局內威力。</p>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          ${(Object.keys(inventory.碎片) as Family[]).map((f) => {
            const currentLvl = sandboxInv.skills[f] ?? 1;
            const isMax = currentLvl >= 3;
            const nextCost = currentLvl === 1 ? 10 : currentLvl === 2 ? 30 : 90;
            const gemsCost = currentLvl === 1 ? 100 : currentLvl === 2 ? 400 : 1200;
            return `
              <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; background: rgba(0,0,0,0.2); padding: 6px 10px; border-radius: 4px;">
                <span>${FAMILY_LABEL[f]}技能 (Lv.${currentLvl})</span>
                ${isMax 
                  ? `<span style="color: #ffd24d; font-size: 0.75rem;">MAX</span>` 
                  : `<button class="三級按鈕" data-upgrade-skill="${f}" style="font-size: 0.7rem; padding: 2px 6px;">升級 (需:${nextCost}碎片/${gemsCost}原石)</button>`
                }
              </div>
            `;
          }).join("")}
        </div>
      </div>

      <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 14px; border-radius: 8px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
        <h4 style="margin: 0 0 8px; color: #ff8a3b;">📦 資源庫儲備</h4>
          <div style="font-size: 0.82rem; line-height: 1.6;">
            <div>持有原石：<span style="color: #ffd24d; font-weight: bold;">${inventory.原石}</span> 顆</div>
            <div style="margin-top: 4px; color: #8d93ad;">家族碎片存量：</div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; font-size: 0.75rem; margin-top: 4px;">
              ${(Object.keys(inventory.碎片) as Family[]).map((f) => {
                return `<div>${FAMILY_LABEL[f]}碎片: <b style="color:#fff;">${inventory.碎片[f]}</b></div>`;
              }).join("")}
            </div>
            <div style="margin-top: 8px; color: #8d93ad;">上陣隊員：</div>
            <div style="display: flex; flex-direction: column; gap: 4px; max-height: 122px; overflow-y: auto; padding-right: 4px;">
              ${squad.map((m, index) => {
                const canUpgrade = m.star < 3;
                return `
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; background: rgba(0,0,0,0.16); padding: 4px 6px; border-radius: 4px;">
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${m.nameZh} <b style="color:#ffd24d;">${m.star}★</b></span>
                    <button class="三級按鈕 上陣升星-btn" data-squad-index="${index}" style="font-size: 0.68rem; padding: 1px 6px;" ${canUpgrade ? "" : "disabled"}>${canUpgrade ? "升星" : "MAX"}</button>
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 12px;">
          <button class="一級按鈕 刷新合成-btn" style="flex: 1; font-size: 0.8rem; padding: 8px 0;">刷新資源狀態</button>
          <button class="三級按鈕 返回戰場-btn" style="padding: 0 12px; font-size: 0.8rem;">離開</button>
        </div>
      </div>
    </div>
  `;

  // 綁定事件
  container.querySelectorAll("[data-upgrade-skill]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const f = (e.currentTarget as HTMLElement).dataset.upgradeSkill as Family;
      const currentLvl = sandboxInv.skills[f] ?? 1;
      const cost = currentLvl === 1 ? 10 : currentLvl === 2 ? 30 : 90;
      const gemsCost = currentLvl === 1 ? 100 : currentLvl === 2 ? 400 : 1200;

      if (背包.取碎片(f) < cost || 背包.取原石() < gemsCost) {
        alert(`升級失敗！材料不足。\n需要 ${cost} ${FAMILY_LABEL[f]}碎片 及 ${gemsCost} 原石。\n當前僅有：${背包.取碎片(f)} 碎片 / ${背包.取原石()} 原石。`);
        return;
      }

      背包.花費碎片(f, cost);
      背包.花費原石(gemsCost);
      sandboxInv.skills[f] = currentLvl + 1;
      alert(`🎉 升級成功！${FAMILY_LABEL[f]}技能已提升至 Lv.${currentLvl + 1}。`);
      應用程式狀態.進入管理介面("互動");
    });
  });

  container.querySelectorAll(".上陣升星-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const index = Number((e.currentTarget as HTMLElement).dataset.squadIndex);
      const result = 升星上陣隊員(index);
      if (!result.ok) {
        alert(`升星失敗：${result.reason ?? "資源不足"}`);
        return;
      }
      const member = 取得上陣養成()[index];
      alert(`升星成功：${member.nameZh} 已提升到 ${result.newStar}★。`);
      應用程式狀態.進入管理介面("互動");
    });
  });

  container.querySelector(".刷新合成-btn")!.addEventListener("click", () => {
    應用程式狀態.進入管理介面("互動");
  });

  container.querySelector(".返回戰場-btn")!.addEventListener("click", () => {
    應用程式狀態.返回戰場();
  });

  wrap.appendChild(container);
  return wrap;
}

// ============================================================
// 2. 熔爐面板
// ============================================================
function 熔爐面板(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "互動面板 互動面板-熔爐";
  wrap.appendChild(建立狀態警示條("熔爐"));

  const container = document.createElement("div");
  container.className = "面板內部區塊";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "14px";

  const nearbyFurnace = MAP_OBJECTS.find(
    (entry) => entry.id === 應用程式狀態.額外.靠近的地圖物件ID && entry.kind === "熔爐" && entry.family,
  );
  const localWorld = regionNearby();
  const realInventory = 背包.背包快照();
  const worldLabel = {
    geometry: "幾何世界",
    organic: "有機世界",
    fractal: "分形世界",
    mechanical: "機械世界",
  }[localWorld ?? "geometry"];

  container.innerHTML = `
    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 12px; border-radius: 8px;">
      <p style="font-size: 0.8rem; margin: 0; line-height: 1.5;">
        🔥 <b>地緣共鳴熔煉</b>：將生物材料投入熔爐提煉為<b>家族碎片</b>。<br/>
        當前熔爐所在地緣：<span style="color: #ffd24d; font-weight: bold;">${worldLabel}</span>。投入該世界的生物材料可享 <span style="color: #4d8dff; font-weight: bold;">+20% 產出加成</span>！
      </p>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 220px; gap: 16px;">
      <!-- 左側材料清單 -->
      <div style="background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.05); padding: 12px; border-radius: 8px;">
        <h4 style="margin: 0 0 10px; color: #ff8a3b; font-size: 0.85rem;">🎒 背包中可熔煉的生物材料</h4>
        <div class="材料列表-滾動區" style="max-height: 240px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-right: 4px;">
          <!-- 動態渲染項目 -->
        </div>
      </div>

      <!-- 右側碎片狀態 -->
      <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 12px; border-radius: 8px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <h4 style="margin: 0 0 8px; color: #ff8a3b; font-size: 0.85rem;">🛡️ 持有碎片庫</h4>
          <div style="display: flex; flex-direction: column; gap: 5px; font-size: 0.8rem;">
            ${(Object.keys(realInventory.碎片) as Family[]).map((f) => {
              return `
                <div style="display: flex; justify-content: space-between; background: rgba(0,0,0,0.2); padding: 4px 8px; border-radius: 4px;">
                  <span>${FAMILY_LABEL[f]}</span>
                  <span style="color: #4d8dff; font-weight: bold;">${realInventory.碎片[f]} 個</span>
                </div>
              `;
            }).join("")}
          </div>
        </div>
        <button class="三級按鈕 熔爐-返回" style="width: 100%; margin-top: 12px; font-size: 0.8rem; padding: 6px 0;">返回戰場</button>
      </div>
    </div>
  `;

  // 渲染可熔煉材料
  const scrollArea = container.querySelector(".材料列表-滾動區") as HTMLElement;
  const ownedMaterials = MATERIALS.filter((m) => 背包.取材料(m.no) > 0 && m.world !== "core");

  if (ownedMaterials.length === 0) {
    scrollArea.innerHTML = `<p class="占位說明" style="text-align: center; padding: 40px 0;">背包中已無生物材料。</p>`;
  } else {
    for (const m of ownedMaterials) {
      const count = 背包.取材料(m.no);
      const isLocal = m.world === localWorld;
      const yield_ = shardFromMaterial(m, isLocal);
      const baseYield = shardFromMaterial(m, false);

      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.justifyContent = "space-between";
      row.style.background = "rgba(255,255,255,0.02)";
      row.style.border = "1px solid rgba(255,255,255,0.05)";
      row.style.padding = "6px 10px";
      row.style.borderRadius = "6px";
      row.style.fontSize = "0.78rem";

      row.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <span style="font-weight: bold; color: #fff;">${m.nameZh} <small style="color: #8d93ad; font-weight: normal;">${m.star}★${MATERIAL_RARITY_LABEL[m.rarity]}</small></span>
          <span style="font-size: 0.7rem; color: ${isLocal ? "#4d8dff" : "#8d93ad"};">
            預估產出: <b>${yield_}</b> 碎片 ${isLocal ? "(已享地緣 +20%)" : ""}
          </span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: #ffd24d; font-weight: bold;">×${count}</span>
          <button class="三級按鈕 熔化-單個" style="padding: 2px 8px; font-size: 0.72rem;" ${nearbyFurnace ? "" : "disabled"}>熔化 1 個</button>
        </div>
      `;

      row.querySelector(".熔化-單個")!.addEventListener("click", () => {
        if (!nearbyFurnace?.family || nearbyFurnace.region === "plaza" || 背包.取材料(m.no) <= 0) return;
        if (!背包.花費材料(m.no, 1)) return;
        const result = smelt({
          furnace: { family: nearbyFurnace.family, world: nearbyFurnace.region },
          inputs: [{ materialNo: m.no, count: 1 }],
        });
        背包.加入碎片(result.family, result.shards);
        alert(`熔煉成功：${m.nameZh} → ${result.shards} 個 ${FAMILY_LABEL[result.family]}碎片。`);
        應用程式狀態.進入管理介面("互動");
      });

      scrollArea.appendChild(row);
    }
  }

  container.querySelector(".熔爐-返回")!.addEventListener("click", () => {
    應用程式狀態.返回戰場();
  });

  wrap.appendChild(container);
  return wrap;
}

// ============================================================
// 3. 雕像面板 (0→1★ 初始化解鎖)
// ============================================================
function 雕像面板(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "互動面板 互動面板-雕像";
  wrap.appendChild(建立狀態警示條("雕像"));

  const container = document.createElement("div");
  container.className = "面板內部區塊";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "14px";

  container.innerHTML = `
    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 12px; border-radius: 8px; font-size: 0.8rem; line-height: 1.5;">
      🗿 <b>成員解鎖雕像 (Initialization Statue)</b><br/>
      玩家必須在四大世界中親自尋找 20 名成員對應的雕像進行儀式解鎖。<br/>
      <span style="color: #ff4d5e; font-weight: bold;">一次性限制</span>：解鎖 0➔1★ 後，該雕像會化為光芒消散。
      解鎖配方：<span style="color: #ffd24d;">1★ 高級材料 1 個</span> + <span style="color: #ffd24d;">1★ 普通材料 3 個</span> + <span style="color: #4d8dff;">對應家族碎片 10 個</span>。
    </div>

    <div style="background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.05); padding: 12px; border-radius: 8px;">
      <h4 style="margin: 0 0 10px; color: #ff8a3b; font-size: 0.85rem;">📜 全體 20 名成員儀式解鎖狀態</h4>
      <div class="雕像成員列表-滾動" style="max-height: 230px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-right: 4px;">
        <!-- 成員雕像項目 -->
      </div>
    </div>
  `;

  const scrollArea = container.querySelector(".雕像成員列表-滾動") as HTMLElement;

  for (const m of MEMBERS) {
    const isUnlocked = sandboxInv.unlockedMembers.has(m.no);
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.justifyContent = "space-between";
    row.style.background = isUnlocked ? "rgba(77, 141, 255, 0.04)" : "rgba(255, 255, 255, 0.02)";
    row.style.border = isUnlocked ? "1px solid rgba(77, 141, 255, 0.2)" : "1px solid rgba(255, 255, 255, 0.05)";
    row.style.padding = "6px 12px";
    row.style.borderRadius = "6px";
    row.style.fontSize = "0.8rem";

    row.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="color: #ffd24d; font-family: monospace; font-weight: bold;">#${m.no.toString().padStart(2, "0")}</span>
        <span style="font-weight: bold; color: #fff;">${m.nameZh}</span>
        <span style="font-size: 0.72rem; background: rgba(255,255,255,0.08); padding: 1px 6px; border-radius: 3px; color: #8d93ad;">
          ${FAMILY_LABEL[m.family]}
        </span>
      </div>
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 0.75rem; color: ${isUnlocked ? "#4d8dff" : "#ff4d5e"}; font-weight: bold;">
          ${isUnlocked ? "✅ 已初始化 (1★)" : "🔒 沉睡中 (0★)"}
        </span>
        ${isUnlocked 
          ? "" 
          : `<button class="三級按鈕 雕像-解鎖鈕" style="padding: 2px 8px; font-size: 0.72rem;">進行解鎖</button>`
        }
      </div>
    `;

    if (!isUnlocked) {
      row.querySelector(".雕像-解鎖鈕")!.addEventListener("click", () => {
        // 檢查碎片是否滿 10 個
        if (背包.取碎片(m.family) < 10) {
          alert(`解鎖失敗！需要 10 個 ${FAMILY_LABEL[m.family]}碎片。當前僅有：${背包.取碎片(m.family)} 個。`);
          return;
        }

        背包.花費碎片(m.family, 10);
        sandboxInv.unlockedMembers.add(m.no);
        alert(`🗿 儀式完成！[${m.nameZh}] 雕像破繭而化為純白光芒！\n小隊已成功解鎖該角色 (0 ➔ 1★)！`);
        應用程式狀態.進入管理介面("互動");
      });
    }

    scrollArea.appendChild(row);
  }

  wrap.appendChild(container);
  return wrap;
}

// ============================================================
// 4. 商店面板
// ============================================================
function 商店面板(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "互動面板 互動面板-商店";
  wrap.appendChild(建立狀態警示條("商店"));
  const inventory = 背包.背包快照();

  const container = document.createElement("div");
  container.className = "面板內部區塊";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "14px";

  const localWorld = regionNearby();
  const worldLabel = {
    geometry: "幾何世界",
    organic: "有機世界",
    fractal: "分形世界",
    mechanical: "機械世界",
  }[localWorld ?? "geometry"];

  container.innerHTML = `
    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 10px; border-radius: 8px; font-size: 0.8rem; line-height: 1.4;">
      🛒 <b>流浪商店 (Wandering Merchant)</b>：向流浪商人購買藥水或出售收集的生物材料換取原石。<br/>
      當前商店地緣：<span style="color: #ffd24d; font-weight: bold;">${worldLabel}</span>。出售該世界的生物材料可獲得 <span style="color: #4d8dff; font-weight: bold;">+20% 溢價回收</span>！
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
      <!-- 購買藥水 -->
      <div style="background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.05); padding: 12px; border-radius: 8px;">
        <h4 style="margin: 0 0 8px; color: #ff8a3b; font-size: 0.85rem;">🧪 補給藥水交易</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.78rem; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); color: #ffd24d;">
              <th style="padding: 4px 0;">品名</th>
              <th>效果</th>
              <th>售價</th>
              <th>購買</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">生命藥水 (小)</td>
              <td>HP +20%</td>
              <td style="color:#ffd24d;">${POTIONS.hp_small.price}</td>
              <td><button class="三級按鈕 商店-買" data-potion-id="hp_small" data-name="生命藥水 (小)">買</button></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">生命藥水 (大)</td>
              <td>HP +50%</td>
              <td style="color:#ffd24d;">${POTIONS.hp_big.price}</td>
              <td><button class="三級按鈕 商店-買" data-potion-id="hp_big" data-name="生命藥水 (大)">買</button></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">能量藥水 (小)</td>
              <td>能量 +30%</td>
              <td style="color:#ffd24d;">${POTIONS.energy_small.price}</td>
              <td><button class="三級按鈕 商店-買" data-potion-id="energy_small" data-name="能量藥水 (小)">買</button></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">能量藥水 (大)</td>
              <td>能量 +75%</td>
              <td style="color:#ffd24d;">${POTIONS.energy_big.price}</td>
              <td><button class="三級按鈕 商店-買" data-potion-id="energy_big" data-name="能量藥水 (大)">買</button></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 出售材料 -->
      <div style="background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <h4 style="margin: 0 0 8px; color: #ff8a3b; font-size: 0.85rem;">💰 出售材料換原石</h4>
          <div class="商店材料滾動" style="max-height: 140px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;">
            <!-- 材料出售項 -->
          </div>
        </div>
        
        <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px; margin-top: 10px; display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 0.82rem;">當前原石餘額: <b style="color: #ffd24d;">${inventory.原石}</b> 顆</span>
          <button class="三級按鈕 商店-返回" style="font-size: 0.75rem; padding: 4px 12px;">離開</button>
        </div>
      </div>
    </div>
  `;

  // 購買藥水綁定
  container.querySelectorAll(".商店-買").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const potionId = (e.currentTarget as HTMLElement).dataset.potionId as PotionId;
      const name = (e.currentTarget as HTMLElement).dataset.name;
      const result = buyPotion(potionId, 背包.取原石());

      if (!result.ok) {
        alert(`購買失敗！${result.reason ?? "原石不足"}。\n當前僅有 ${背包.取原石()} 原石。`);
        return;
      }

      背包.花費原石(result.gemsSpent);
      背包.加入藥水(potionId, 1);
      alert(`🛒 購買成功！\n花費 ${result.gemsSpent} 原石，獲得 1 個 [${name}]。`);
      應用程式狀態.進入管理介面("互動");
    });
  });

  // 渲染材料出售
  const sellScroll = container.querySelector(".商店材料滾動") as HTMLElement;
  const ownedMaterials = MATERIALS.filter((m) => 背包.取材料(m.no) > 0 && m.world !== "core");

  if (ownedMaterials.length === 0) {
    sellScroll.innerHTML = `<p class="占位說明" style="padding: 20px 0; text-align: center;">無可出售材料。</p>`;
  } else {
    for (const m of ownedMaterials) {
      const count = 背包.取材料(m.no);
      const isLocal = m.world === localWorld;
      const price = sellPriceOfMaterial(m, isLocal);

      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.justifyContent = "space-between";
      row.style.background = "rgba(0,0,0,0.15)";
      row.style.padding = "4px 8px";
      row.style.borderRadius = "4px";
      row.style.fontSize = "0.75rem";

      row.innerHTML = `
        <span>${m.nameZh} (×${count})</span>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: #ffd24d;">+${price} 原石</span>
          <button class="三級按鈕 出售鈕" style="padding: 1px 6px; font-size: 0.65rem;">出售</button>
        </div>
      `;

      row.querySelector(".出售鈕")!.addEventListener("click", () => {
        if (!背包.花費材料(m.no, 1)) return;
        背包.加入原石(price);
        alert(`💰 出售成功！\n將 1 個 [${m.nameZh}] 出售，換得 ${price} 原石。`);
        應用程式狀態.進入管理介面("互動");
      });

      sellScroll.appendChild(row);
    }
  }

  container.querySelector(".商店-返回")!.addEventListener("click", () => {
    應用程式狀態.返回戰場();
  });

  wrap.appendChild(container);
  return wrap;
}

// ============================================================
// 5. 召喚面板 (守護者祭壇 / COLA 最終裝配)
// ============================================================
function 召喚面板(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "互動面板 互動面板-召喚";
  wrap.appendChild(建立狀態警示條("召喚"));

  const container = document.createElement("div");
  container.className = "面板內部區塊";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "14px";

  const progress = 對局進度摘要("formal");
  const online = 應用程式狀態.額外.靠近的互動設施 === "召喚";
  const labels: Record<World, string> = {
    geometry: "幾何世界",
    organic: "有機世界",
    fractal: "分形世界",
    mechanical: "機械世界",
  };

  container.innerHTML = `
    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 12px; border-radius: 8px;">
      <h4 style="margin: 0 0 6px; color: #ff8a3b; font-size: 0.85rem;">世界守護者召喚與 Boss 進度</h4>
      <p style="font-size: 0.76rem; color: #8d93ad; margin: 0; line-height: 1.4;">
        玩家必須擊敗四大世界的 T3 守護者來奪取四枚「世界晶核印記」。當四印記集齊後，可前往地圖中央廣場的裝配儀召喚最終 Boss COLA。
      </p>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 200px; gap: 16px;">
      <!-- 守護者進度 -->
      <div style="background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; font-size: 0.78rem;">
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); color: #ff8a3b;">
              <th style="padding: 4px 0;">世界</th>
              <th>守護者狀態</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${progress.守護者.map((guardian) => {
              const status = guardian.defeated
                ? "已擊敗，印記已取得"
                : guardian.spawned
                  ? "已召喚，正在戰場"
                  : guardian.ready
                    ? "條件完成，可召喚"
                    : `T1 ${guardian.readiness.minionTypesDone}/${guardian.readiness.minionTypesNeeded}｜T2 ${guardian.readiness.eliteKills}/${guardian.readiness.eliteNeeded}`;
              return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                  <td style="padding: 8px 0; font-weight: bold;">${labels[guardian.world]}</td>
                  <td style="color: ${guardian.defeated ? "#4d8dff" : guardian.ready ? "#ffd24d" : "#8d93ad"};">${status}</td>
                  <td>
                    <button class="三級按鈕 召喚-守護者" data-world="${guardian.world}" ${online && guardian.ready ? "" : "disabled"}>召喚</button>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>

      <!-- 右側 COLA 裝配儀 -->
      <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 12px; border-radius: 8px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <h4 style="margin: 0 0 8px; color: #ff8a3b; font-size: 0.82rem;">COLA 裝配狀態</h4>
          <div style="display: flex; flex-direction: column; gap: 4px; font-size: 0.72rem; color: #8d93ad; margin-bottom: 12px;">
            <div>世界印記：${progress.印記數} / 4</div>
            <div>全世界狂暴：${progress.全守護者已倒 ? "是" : "否"}</div>
            <div>場上狀態：${progress.COLA已召喚 ? "COLA 已在場" : "尚未召喚"}</div>
          </div>
          <button class="危險按鈕 最終召喚" style="width: 100%; padding: 8px 0; font-size: 0.8rem;" ${online && progress.可召喚COLA ? "" : "disabled"}>
            召喚 COLA Boss
          </button>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 12px;">
          <button class="三級按鈕 召喚-離開" style="font-size: 0.75rem; padding: 4px 0;">離開</button>
        </div>
      </div>
    </div>
  `;

  // 綁定事件
  container.querySelectorAll(".召喚-守護者").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const w = (e.currentTarget as HTMLElement).dataset.world as World;
      if (!online || !可召喚守護者(w, "formal")) return;
      標記守護者已召喚(w, "formal");
      排入Boss召喚({ kind: "guardian", world: w });
      應用程式狀態.返回戰場();
    });
  });

  container.querySelector(".最終召喚")!.addEventListener("click", () => {
    if (!online || !可召喚COLA("formal")) return;
    標記COLA已召喚("formal");
    排入Boss召喚({ kind: "cola" });
    應用程式狀態.返回戰場();
  });

  container.querySelector(".召喚-離開")!.addEventListener("click", () => {
    應用程式狀態.返回戰場();
  });

  wrap.appendChild(container);
  return wrap;
}

// ============================================================
// 主入口: 依設施種類分派
// ============================================================
export function 建立互動面板(設施: 互動設施): HTMLElement {
  switch (設施) {
    case "合成":
      return 合成面板();
    case "熔爐":
      return 熔爐面板();
    case "雕像":
      return 雕像面板();
    case "商店":
      return 商店面板();
    case "召喚":
      return 召喚面板();
  }
}
