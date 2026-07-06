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
import type { Family } from "../../data/成員型別";
import { STAR_RECIPE, MEMBERS } from "../../data/成員資料庫";
import { MATERIALS, materialsByWorld, sellPriceOfMaterial, shardFromMaterial } from "../../data/素材資料庫";
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
import {
  取得上陣養成,
  取得全成員初始化狀態,
  取得家族武器升級狀態,
  初始化解鎖成員,
  升星上陣隊員,
  升級家族武器,
} from "../../progression/養成狀態";
import { 刷新正式最大生命 } from "../正式對局小隊狀態";
import { 選文 } from "../語系";
import { 播放音效 } from "../../audio/音效管理";

function 雙語(中文: string, 英文: string): string {
  return 選文(應用程式狀態.額外.語言, 中文, 英文);
}

function 家族顯示名(family: Family): string {
  return {
    shield: 雙語("護盾", "Shield"),
    multishot: 雙語("多發", "Multishot"),
    straight: 雙語("直線", "Straight"),
    mine: 雙語("地雷", "Mine"),
    laser: 雙語("激光", "Laser"),
  }[family];
}

function 世界顯示名(world: World): string {
  return {
    geometry: 雙語("幾何世界", "Geometry"),
    organic: 雙語("有機世界", "Organic"),
    fractal: 雙語("分形世界", "Fractal"),
    mechanical: 雙語("機械世界", "Mechanical"),
  }[world];
}

function 成員顯示名(memberNo: number): string {
  const member = MEMBERS.find((entry) => entry.no === memberNo);
  if (!member) return String(memberNo);
  return 應用程式狀態.額外.語言 === "zh" ? member.nameZh : member.nameEn;
}

function 材料顯示名(materialNo: number): string {
  const material = MATERIALS.find((entry) => entry.no === materialNo);
  if (!material) return String(materialNo);
  return 應用程式狀態.額外.語言 === "zh" ? material.nameZh : material.nameEn;
}

function 藥水顯示名(id: PotionId): string {
  return {
    hp_small: 雙語("生命藥水 (小)", "Life Potion (S)"),
    hp_big: 雙語("生命藥水 (大)", "Life Potion (L)"),
    energy_small: 雙語("能量藥水 (小)", "Energy Potion (S)"),
    energy_big: 雙語("能量藥水 (大)", "Energy Potion (L)"),
    hybrid_small: 雙語("混合藥水 (小)", "Hybrid Potion (S)"),
    hybrid_big: 雙語("混合藥水 (大)", "Hybrid Potion (L)"),
  }[id];
}

function 藥水效果文案(id: PotionId): string {
  const potion = POTIONS[id];
  const parts: string[] = [];
  if (potion.hpRatio > 0) parts.push(`HP +${Math.round(potion.hpRatio * 100)}%`);
  if (potion.energyRatio > 0) parts.push(`${雙語("能量", "Energy")} +${Math.round(potion.energyRatio * 100)}%`);
  return parts.join(" / ");
}

function 稀有度顯示名(star: MaterialStar, rarity: keyof typeof MATERIAL_RARITY_LABEL): string {
  if (應用程式狀態.額外.語言 === "zh") return `${star}★${MATERIAL_RARITY_LABEL[rarity]}`;
  return rarity === "fine" ? `${star}★ Fine` : `${star}★ Common`;
}

// ============================================================
// 推斷玩家目前所在世界(供地緣 +20% 加成提示用)
// 正式版由地圖層寫入狀態；沒有現場物件時，以 geometry 作為預覽地緣。
function regionNearby(): import("../../data/成員型別").World {
  const object = MAP_OBJECTS.find((entry) => entry.id === 應用程式狀態.額外.靠近的地圖物件ID);
  return object && object.region !== "plaza" ? object.region : "geometry";
}

function 設施已連線(設施: 互動設施): boolean {
  return 應用程式狀態.額外.靠近的互動設施 === 設施;
}

// 現場/遠端狀態 Banner
// ============================================================
function 建立狀態警示條(設施: 互動設施): HTMLElement {
  const near = 應用程式狀態.額外.靠近的互動設施;
  const div = document.createElement("div");
  
  if (near === 設施) {
    div.className = "互動狀態條 狀態-在線";
    div.innerHTML = `
      <div style="background: rgba(77, 141, 255, 0.15); border: 1px solid #4d8dff; padding: 10px; border-radius: 6px; margin-bottom: 16px; font-size: 0.85rem; color: #a3c5ff; display: flex; align-items: center; gap: 8px;">
        <span>📡 ${雙語("已連接到現場設施", "Connected to nearby facility")}: <b>${雙語(設施, 設施 === "合成" ? "Craft" : 設施 === "熔爐" ? "Forge" : 設施 === "雕像" ? "Statue" : 設施 === "商店" ? "Shop" : "Summon")}</b></span>
        <span style="margin-left: auto; background: #4d8dff; color: #05060b; padding: 1px 6px; border-radius: 3px; font-size: 0.72rem; font-weight: bold;">${雙語("現場操作模式", "Live Mode")}</span>
      </div>
    `;
  } else {
    div.className = "互動狀態條 狀態-離線";
    div.innerHTML = `
      <div style="background: rgba(216, 180, 106, 0.12); border: 1px solid rgba(216, 180, 106, 0.35); padding: 10px; border-radius: 6px; margin-bottom: 16px; font-size: 0.85rem; color: #e5cd9c; display: flex; flex-direction: column; gap: 4px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>${雙語("你目前未靠近戰場中的", "You are not currently near the battlefield")} <b>${雙語(設施, 設施 === "合成" ? "Craft" : 設施 === "熔爐" ? "Forge" : 設施 === "雕像" ? "Statue" : 設施 === "商店" ? "Shop" : "Summon")}</b> ${雙語("設施。", "facility.")}</span>
          <span style="margin-left: auto; background: #d8b46a; color: #05060b; padding: 1px 6px; border-radius: 3px; font-size: 0.72rem; font-weight: bold;">${雙語("遠端預覽", "Remote Preview")}</span>
        </div>
        <div style="font-size: 0.75rem; color: #8d93ad;">${雙語("可查看配方與庫存；需要現場條件的操作會維持鎖定，交易成功會寫入正式背包。", "You can inspect recipes and inventory here. Actions that require the real station stay locked until you are nearby, and successful trades write into the live inventory.")}</div>
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
  const online = 設施已連線("合成");
  const weaponStatus = 取得家族武器升級狀態();

  const container = document.createElement("div");
  container.className = "面板內部區塊";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "16px";

  container.innerHTML = `
    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 16px; border-radius: 8px;">
      <h4 style="margin: 0 0 12px; color: #ff8a3b; display: flex; align-items: center; gap: 8px;">
        🛠️ ${雙語("裝備工作台 — 成員星級進化配方", "Equipment Workbench - Member Star Upgrade Recipe")} (5-3-1)
      </h4>
      <p style="font-size: 0.8rem; color: #8d93ad; margin: 0 0 12px;">${雙語("成員升級需要消耗怪物生物材料與該世界特有的家族碎片。", "Member upgrades consume monster materials and world-specific family shards.")}</p>
      
      <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.82rem;">
        <thead>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); color: #ff8a3b;">
            <th style="padding: 6px 0;">${雙語("目標星級", "Target Star")}</th>
            <th>${雙語("高級材料", "Fine Material")}</th>
            <th>${雙語("普通材料", "Common Material")}</th>
            <th>${雙語("前置星等", "Prerequisite")}</th>
            <th>${雙語("所需碎片", "Required Shards")}</th>
          </tr>
        </thead>
        <tbody>
          ${[1, 2, 3].map((s) => {
            const r = STAR_RECIPE[s as 1 | 2 | 3];
            return `
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                <td style="padding: 8px 0; font-weight: bold; color: #ffd24d;">${s}★</td>
                <td>${r.fineCurrent} ${雙語("個", "")}</td>
                <td>${r.commonCurrent} ${雙語("個", "")}</td>
                <td>${r.finePrev ? (雙語(`${s - 1}★ 成員`, `${s - 1}★ member`)) : 雙語("0★ 雕像解鎖", "0★ statue unlock")}</td>
                <td style="color: #4d8dff;">${r.shards} ${雙語("碎片", "shards")}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
      <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 14px; border-radius: 8px;">
        <h4 style="margin: 0 0 8px; color: #ff8a3b;">🔮 ${雙語("技能武器升級", "Family Weapon Upgrade")} (${雙語("不需怪物材料", "no monster materials")})</h4>
        <p style="font-size: 0.75rem; color: #8d93ad; margin-bottom: 10px;">${雙語("直接消耗對應的家族碎片與原石提升局內威力。", "Spend matching family shards and gems directly to raise battle power.")}</p>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          ${weaponStatus.map((status) => {
            const currentLvl = status.currentStar;
            const isMax = currentLvl >= 3;
            const nextCost = currentLvl === 0 ? 10 : currentLvl === 1 ? 30 : 90;
            const gemsCost = currentLvl === 0 ? 100 : currentLvl === 1 ? 400 : 1200;
            return `
              <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; background: rgba(0,0,0,0.2); padding: 6px 10px; border-radius: 4px;">
                <span>${家族顯示名(status.family)} ${雙語("技能", "Skill")} (Lv.${currentLvl}) / ${雙語("已解鎖至", "Unlocked to")} ${status.unlockedStar}★</span>
                ${isMax 
                  ? `<span style="color: #ffd24d; font-size: 0.75rem;">MAX</span>` 
                  : `<button class="三級按鈕" data-upgrade-skill="${status.family}" style="font-size: 0.7rem; padding: 2px 6px;" ${online ? "" : "disabled"}>${雙語("升級", "Upgrade")} (${雙語("需", "need")}:${nextCost}${雙語("碎片", " shards")}/${gemsCost}${雙語("原石", " gems")})</button>`
                }
              </div>
            `;
          }).join("")}
        </div>
      </div>

      <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 14px; border-radius: 8px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
        <h4 style="margin: 0 0 8px; color: #ff8a3b;">📦 ${雙語("資源庫儲備", "Stored Resources")}</h4>
          <div style="font-size: 0.82rem; line-height: 1.6;">
            <div>${雙語("持有原石", "Current Gems")}: <span style="color: #ffd24d; font-weight: bold;">${inventory.原石}</span></div>
            <div style="margin-top: 4px; color: #8d93ad;">${雙語("家族碎片存量", "Family Shards")}:</div>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px; font-size: 0.75rem; margin-top: 4px;">
              ${(Object.keys(inventory.碎片) as Family[]).map((f) => {
                return `<div>${家族顯示名(f)} ${雙語("碎片", "Shards")}: <b style="color:#fff;">${inventory.碎片[f]}</b></div>`;
              }).join("")}
            </div>
            <div style="margin-top: 8px; color: #8d93ad;">${雙語("上陣隊員", "Deployed Members")}:</div>
            <div style="display: flex; flex-direction: column; gap: 4px; max-height: 122px; overflow-y: auto; padding-right: 4px;">
              ${squad.map((m, index) => {
                const canUpgrade = m.star < 3;
                return `
                  <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; background: rgba(0,0,0,0.16); padding: 4px 6px; border-radius: 4px;">
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${應用程式狀態.額外.語言 === "zh" ? m.nameZh : m.nameEn} <b style="color:#ffd24d;">${m.star}★</b></span>
                    <button class="三級按鈕 上陣升星-btn" data-squad-index="${index}" style="font-size: 0.68rem; padding: 1px 6px;" ${canUpgrade && online ? "" : "disabled"}>${canUpgrade ? 雙語("升星", "Upgrade") : "MAX"}</button>
                  </div>
                `;
              }).join("")}
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 12px;">
          <button class="一級按鈕 刷新合成-btn" style="flex: 1; font-size: 0.8rem; padding: 8px 0;">${雙語("刷新資源狀態", "Refresh Resources")}</button>
          <button class="三級按鈕 返回戰場-btn" style="padding: 0 12px; font-size: 0.8rem;">${雙語("離開", "Leave")}</button>
        </div>
      </div>
    </div>
  `;

  // 綁定事件
  container.querySelectorAll("[data-upgrade-skill]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const f = (e.currentTarget as HTMLElement).dataset.upgradeSkill as Family;
      if (!online) {
        alert(雙語("需要站在工作台旁邊，才能真正進行升級。", "You need to stand beside the workbench to perform this upgrade."));
        return;
      }
      const result = 升級家族武器(f);
      if (!result.ok) {
        播放音效("交易失敗");
        alert(`${雙語("升級失敗", "Upgrade failed")}: ${result.reason ?? 雙語("資源或家族條件不足", "Not enough resources or family requirements are missing")}`);
        return;
      }
      播放音效("升級完成");
      alert(`🎉 ${雙語("升級成功", "Upgrade successful")}! ${家族顯示名(f)} ${雙語("技能已提升至", "skill is now")} Lv.${result.newStar}.`);
      應用程式狀態.進入管理介面("互動");
    });
  });

  container.querySelectorAll(".上陣升星-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      if (!online) {
        alert(雙語("需要站在工作台旁邊，才能真正替上陣成員升星。", "You need to stand beside the workbench to upgrade a deployed member."));
        return;
      }
      const index = Number((e.currentTarget as HTMLElement).dataset.squadIndex);
      const result = 升星上陣隊員(index);
      if (!result.ok) {
        播放音效("交易失敗");
        alert(`${雙語("升星失敗", "Upgrade failed")}: ${result.reason ?? 雙語("資源不足", "Not enough resources")}`);
        return;
      }
      const member = 取得上陣養成()[index];
      刷新正式最大生命();
      播放音效("升級完成");
      alert(`${雙語("升星成功", "Upgrade successful")}: ${應用程式狀態.額外.語言 === "zh" ? member.nameZh : member.nameEn} ${雙語("已提升到", "is now")} ${result.newStar}★.`);
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
  const worldLabel = 世界顯示名(localWorld ?? "geometry");

  container.innerHTML = `
    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 12px; border-radius: 8px;">
      <p style="font-size: 0.8rem; margin: 0; line-height: 1.5;">
        🔥 <b>${雙語("地緣共鳴熔煉", "Regional Resonance Smelting")}</b>：${雙語("將生物材料投入熔爐提煉為", "Turn creature materials into")} <b>${雙語("家族碎片", "family shards")}</b>。<br/>
        ${雙語("當前熔爐所在地緣", "Current furnace region")}: <span style="color: #ffd24d; font-weight: bold;">${worldLabel}</span>。${雙語("投入該世界的生物材料可享", "Materials from that same world gain")} <span style="color: #4d8dff; font-weight: bold;">+20% ${雙語("產出加成", "yield bonus")}</span>！
      </p>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 220px; gap: 16px;">
      <!-- 左側材料清單 -->
      <div style="background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.05); padding: 12px; border-radius: 8px;">
        <h4 style="margin: 0 0 10px; color: #ff8a3b; font-size: 0.85rem;">🎒 ${雙語("背包中可熔煉的生物材料", "Smeltable Materials in Bag")}</h4>
        <div class="材料列表-滾動區" style="max-height: 240px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-right: 4px;">
          <!-- 動態渲染項目 -->
        </div>
      </div>

      <!-- 右側碎片狀態 -->
      <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 12px; border-radius: 8px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
        <h4 style="margin: 0 0 8px; color: #ff8a3b; font-size: 0.85rem;">🛡️ ${雙語("持有碎片庫", "Stored Shards")}</h4>
          <div style="display: flex; flex-direction: column; gap: 5px; font-size: 0.8rem;">
            ${(Object.keys(realInventory.碎片) as Family[]).map((f) => {
              return `
                <div style="display: flex; justify-content: space-between; background: rgba(0,0,0,0.2); padding: 4px 8px; border-radius: 4px;">
                  <span>${家族顯示名(f)}</span>
                  <span style="color: #4d8dff; font-weight: bold;">${realInventory.碎片[f]}</span>
                </div>
              `;
            }).join("")}
          </div>
        </div>
        <button class="三級按鈕 熔爐-返回" style="width: 100%; margin-top: 12px; font-size: 0.8rem; padding: 6px 0;">${雙語("返回戰場", "Back to Battlefield")}</button>
      </div>
    </div>
  `;

  // 渲染可熔煉材料
  const scrollArea = container.querySelector(".材料列表-滾動區") as HTMLElement;
  const ownedMaterials = MATERIALS.filter((m) => 背包.取材料(m.no) > 0 && m.world !== "core");

  if (ownedMaterials.length === 0) {
    scrollArea.innerHTML = `<p class="占位說明" style="text-align: center; padding: 40px 0;">${雙語("背包中已無生物材料。", "There are no creature materials left in the bag.")}</p>`;
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
          <span style="font-weight: bold; color: #fff;">${材料顯示名(m.no)} <small style="color: #8d93ad; font-weight: normal;">${稀有度顯示名(m.star, m.rarity)}</small></span>
          <span style="font-size: 0.7rem; color: ${isLocal ? "#4d8dff" : "#8d93ad"};">
            ${雙語("預估產出", "Expected Yield")}: <b>${yield_}</b> ${雙語("碎片", "shards")} ${isLocal ? `(${雙語("已享地緣 +20%", "regional +20% applied")})` : ""}
          </span>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: #ffd24d; font-weight: bold;">×${count}</span>
          <button class="三級按鈕 熔化-單個" style="padding: 2px 8px; font-size: 0.72rem;" ${nearbyFurnace ? "" : "disabled"}>${雙語("熔化 1 個", "Smelt 1")}</button>
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
        播放音效("熔煉完成");
        alert(`${雙語("熔煉成功", "Smelt successful")}: ${應用程式狀態.額外.語言 === "zh" ? m.nameZh : m.nameEn} → ${result.shards} ${家族顯示名(result.family)} ${雙語("碎片", "shards")}.`);
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
  const online = 設施已連線("雕像");
  const ownership = new Map(取得全成員初始化狀態().map((entry) => [entry.memberNo, entry]));

  const container = document.createElement("div");
  container.className = "面板內部區塊";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "14px";

  container.innerHTML = `
    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 12px; border-radius: 8px; font-size: 0.8rem; line-height: 1.5;">
      🗿 <b>${雙語("成員解鎖雕像", "Member Unlock Statue")} (Initialization Statue)</b><br/>
      ${雙語("玩家必須在四大世界中親自尋找 20 名成員對應的雕像進行儀式解鎖。", "Players must personally find the 20 matching statues across the four worlds to unlock members.")}<br/>
      <span style="color: #ff4d5e; font-weight: bold;">${雙語("一次性限制", "One-Time Limit")}</span>：${雙語("解鎖 0➔1★ 後，該雕像會化為光芒消散。", "After unlocking 0➔1★, that statue dissolves into light.")}
      ${雙語("解鎖配方", "Unlock Recipe")}: <span style="color: #ffd24d;">1★ ${雙語("高級材料 1 個", "fine material x1")}</span> + <span style="color: #ffd24d;">1★ ${雙語("普通材料 3 個", "common material x3")}</span> + <span style="color: #4d8dff;">${雙語("對應家族碎片 10 個", "matching family shards x10")}</span>。
    </div>

    <div style="background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.05); padding: 12px; border-radius: 8px;">
      <h4 style="margin: 0 0 10px; color: #ff8a3b; font-size: 0.85rem;">📜 ${雙語("全體 20 名成員儀式解鎖狀態", "Ritual Unlock Status for All 20 Members")}</h4>
      <div class="雕像成員列表-滾動" style="max-height: 230px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-right: 4px;">
        <!-- 成員雕像項目 -->
      </div>
    </div>
  `;

  const scrollArea = container.querySelector(".雕像成員列表-滾動") as HTMLElement;

  for (const m of MEMBERS) {
    const isUnlocked = ownership.get(m.no)?.owned ?? false;
    const unlockMaterials = materialsByWorld(m.world).filter((material) => material.use === "unlock_0to1");
    const commonUnlock = unlockMaterials.find((material) => material.rarity === "common");
    const fineUnlock = unlockMaterials.find((material) => material.rarity === "fine");
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
        <span style="font-weight: bold; color: #fff;">${成員顯示名(m.no)}</span>
        <span style="font-size: 0.72rem; background: rgba(255,255,255,0.08); padding: 1px 6px; border-radius: 3px; color: #8d93ad;">
          ${家族顯示名(m.family)}
        </span>
      </div>
      <div style="display: flex; align-items: center; gap: 12px;">
        <span style="font-size: 0.75rem; color: ${isUnlocked ? "#4d8dff" : "#ff4d5e"}; font-weight: bold;">
          ${isUnlocked ? `✅ ${雙語("已初始化", "Initialized")} (1★)` : `🔒 ${雙語("沉睡中", "Dormant")} (0★)`}
        </span>
        ${isUnlocked 
          ? "" 
          : `<button class="三級按鈕 雕像-解鎖鈕" style="padding: 2px 8px; font-size: 0.72rem;" ${online ? "" : "disabled"}>${雙語("進行解鎖", "Unlock")}</button>`
        }
      </div>
    `;

    if (!isUnlocked) {
      row.querySelector(".雕像-解鎖鈕")!.addEventListener("click", () => {
        if (!online) {
          alert(雙語("需要站在對應雕像旁邊，才能真正完成初始化儀式。", "You need to stand beside the matching statue to complete the initialization ritual."));
          return;
        }
        if (!commonUnlock || !fineUnlock) {
          播放音效("交易失敗");
          alert(雙語("解鎖失敗：找不到對應世界的初始化素材定義。", "Unlock failed: the matching world unlock materials could not be found."));
          return;
        }
        if (背包.取碎片(m.family) < 10) {
          播放音效("交易失敗");
          alert(
            雙語(
              `解鎖失敗！需要 10 個 ${家族顯示名(m.family)}碎片。當前僅有：${背包.取碎片(m.family)} 個。`,
              `Unlock failed! You need 10 ${家族顯示名(m.family)} shards. You currently have ${背包.取碎片(m.family)}.`,
            ),
          );
          return;
        }
        if (背包.取材料(commonUnlock.no) < 3) {
          播放音效("交易失敗");
          alert(
            雙語(
              `解鎖失敗！需要 3 個 ${材料顯示名(commonUnlock.no)}。當前僅有：${背包.取材料(commonUnlock.no)} 個。`,
              `Unlock failed! You need 3 ${材料顯示名(commonUnlock.no)}. You currently have ${背包.取材料(commonUnlock.no)}.`,
            ),
          );
          return;
        }
        if (背包.取材料(fineUnlock.no) < 1) {
          播放音效("交易失敗");
          alert(
            雙語(
              `解鎖失敗！需要 1 個 ${材料顯示名(fineUnlock.no)}。當前僅有：${背包.取材料(fineUnlock.no)} 個。`,
              `Unlock failed! You need 1 ${材料顯示名(fineUnlock.no)}. You currently have ${背包.取材料(fineUnlock.no)}.`,
            ),
          );
          return;
        }

        const unlockResult = 初始化解鎖成員(m.no);
        if (!unlockResult.ok) {
          播放音效("交易失敗");
          alert(
            雙語(
              `解鎖失敗：${unlockResult.reason ?? "成員已初始化"}`,
              `Unlock failed: ${unlockResult.reason ?? "This member has already been initialized"}`,
            ),
          );
          return;
        }
        背包.花費材料(commonUnlock.no, 3);
        背包.花費材料(fineUnlock.no, 1);
        背包.花費碎片(m.family, 10);
        播放音效("雕像解鎖");
        alert(
          雙語(
            `🗿 儀式完成！[${成員顯示名(m.no)}] 雕像破繭而化為純白光芒！\n小隊已成功解鎖該角色 (0 ➔ 1★)！`,
            `🗿 Ritual complete! The statue of [${成員顯示名(m.no)}] has broken open and dissolved into white light.\nThat member is now unlocked for the squad (0 ➔ 1★)!`,
          ),
        );
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
  const online = 設施已連線("商店");

  const container = document.createElement("div");
  container.className = "面板內部區塊";
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "14px";

  const localWorld = regionNearby();
  const worldLabel = 世界顯示名(localWorld ?? "geometry");

  container.innerHTML = `
    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 10px; border-radius: 8px; font-size: 0.8rem; line-height: 1.4;">
      🛒 <b>${雙語("流浪商店", "Wandering Merchant")}</b>：${雙語("向流浪商人購買藥水或出售收集的生物材料換取原石。", "Buy potions from the wandering merchant or sell collected creature materials for gems.")}<br/>
      ${雙語("當前商店地緣", "Current shop region")}: <span style="color: #ffd24d; font-weight: bold;">${worldLabel}</span>。${雙語("出售該世界的生物材料可獲得", "Selling materials from that same world grants")} <span style="color: #4d8dff; font-weight: bold;">+20% ${雙語("溢價回收", "bonus resale value")}</span>！
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
      <!-- 購買藥水 -->
      <div style="background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.05); padding: 12px; border-radius: 8px;">
        <h4 style="margin: 0 0 8px; color: #ff8a3b; font-size: 0.85rem;">🧪 ${雙語("補給藥水交易", "Supply Potion Trade")}</h4>
        <table style="width: 100%; border-collapse: collapse; font-size: 0.78rem; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); color: #ffd24d;">
              <th style="padding: 4px 0;">${雙語("品名", "Name")}</th>
              <th>${雙語("效果", "Effect")}</th>
              <th>${雙語("售價", "Price")}</th>
              <th>${雙語("購買", "Buy")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">${藥水顯示名("hp_small")}</td>
              <td>HP +20%</td>
              <td style="color:#ffd24d;">${POTIONS.hp_small.price}</td>
              <td><button class="三級按鈕 商店-買" data-potion-id="hp_small" data-name="${藥水顯示名("hp_small")}" ${online ? "" : "disabled"}>${雙語("買", "Buy")}</button></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">${藥水顯示名("hp_big")}</td>
              <td>HP +50%</td>
              <td style="color:#ffd24d;">${POTIONS.hp_big.price}</td>
              <td><button class="三級按鈕 商店-買" data-potion-id="hp_big" data-name="${藥水顯示名("hp_big")}" ${online ? "" : "disabled"}>${雙語("買", "Buy")}</button></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">${藥水顯示名("energy_small")}</td>
              <td>${藥水效果文案("energy_small")}</td>
              <td style="color:#ffd24d;">${POTIONS.energy_small.price}</td>
              <td><button class="三級按鈕 商店-買" data-potion-id="energy_small" data-name="${藥水顯示名("energy_small")}" ${online ? "" : "disabled"}>${雙語("買", "Buy")}</button></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">${藥水顯示名("energy_big")}</td>
              <td>${藥水效果文案("energy_big")}</td>
              <td style="color:#ffd24d;">${POTIONS.energy_big.price}</td>
              <td><button class="三級按鈕 商店-買" data-potion-id="energy_big" data-name="${藥水顯示名("energy_big")}" ${online ? "" : "disabled"}>${雙語("買", "Buy")}</button></td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 出售材料 -->
      <div style="background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <h4 style="margin: 0 0 8px; color: #ff8a3b; font-size: 0.85rem;">💰 ${雙語("出售材料換原石", "Sell Materials for Gems")}</h4>
          <div class="商店材料滾動" style="max-height: 140px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;">
            <!-- 材料出售項 -->
          </div>
        </div>
        
        <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 10px; margin-top: 10px; display: flex; align-items: center; justify-content: space-between;">
          <span style="font-size: 0.82rem;">${雙語("當前原石餘額", "Current gems")}: <b style="color: #ffd24d;">${inventory.原石}</b></span>
          <button class="三級按鈕 商店-返回" style="font-size: 0.75rem; padding: 4px 12px;">${雙語("離開", "Leave")}</button>
        </div>
      </div>
    </div>
  `;

  // 購買藥水綁定
  container.querySelectorAll(".商店-買").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      if (!online) {
        alert(雙語("需要站在商店旁邊，才能真正完成交易。", "You need to stand beside the shop to complete the trade."));
        return;
      }
      const potionId = (e.currentTarget as HTMLElement).dataset.potionId as PotionId;
      const name = (e.currentTarget as HTMLElement).dataset.name;
      const result = buyPotion(potionId, 背包.取原石());

      if (!result.ok) {
        播放音效("交易失敗");
        alert(
          雙語(
            `購買失敗！${result.reason ?? "原石不足"}。\n當前僅有 ${背包.取原石()} 原石。`,
            `Purchase failed! ${result.reason ?? "Not enough gems"}.\nYou currently have ${背包.取原石()} gems.`,
          ),
        );
        return;
      }

      背包.花費原石(result.gemsSpent);
      背包.加入藥水(potionId, 1);
      播放音效("交易成功");
      alert(
        雙語(
          `🛒 購買成功！\n花費 ${result.gemsSpent} 原石，獲得 1 個 [${name}]。`,
          `🛒 Purchase complete!\nYou spent ${result.gemsSpent} gems and received 1 [${name}].`,
        ),
      );
      應用程式狀態.進入管理介面("互動");
    });
  });

  // 渲染材料出售
  const sellScroll = container.querySelector(".商店材料滾動") as HTMLElement;
  const ownedMaterials = MATERIALS.filter((m) => 背包.取材料(m.no) > 0 && m.world !== "core");

  if (ownedMaterials.length === 0) {
    sellScroll.innerHTML = `<p class="占位說明" style="padding: 20px 0; text-align: center;">${雙語("無可出售材料。", "No materials available for sale.")}</p>`;
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
        <span>${材料顯示名(m.no)} (×${count})</span>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: #ffd24d;">+${price} ${雙語("原石", "gems")}</span>
          <button class="三級按鈕 出售鈕" style="padding: 1px 6px; font-size: 0.65rem;" ${online ? "" : "disabled"}>${雙語("出售", "Sell")}</button>
        </div>
      `;

      row.querySelector(".出售鈕")!.addEventListener("click", () => {
        if (!online) {
          alert(雙語("需要站在商店旁邊，才能真正完成交易。", "You need to stand beside the shop to complete the trade."));
          return;
        }
        if (!背包.花費材料(m.no, 1)) return;
        背包.加入原石(price);
        播放音效("交易成功");
        alert(
          雙語(
            `💰 出售成功！\n將 1 個 [${材料顯示名(m.no)}] 出售，換得 ${price} 原石。`,
            `💰 Sale complete!\nYou sold 1 [${材料顯示名(m.no)}] for ${price} gems.`,
          ),
        );
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
    geometry: 世界顯示名("geometry"),
    organic: 世界顯示名("organic"),
    fractal: 世界顯示名("fractal"),
    mechanical: 世界顯示名("mechanical"),
  };

  container.innerHTML = `
    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 12px; border-radius: 8px;">
      <h4 style="margin: 0 0 6px; color: #ff8a3b; font-size: 0.85rem;">${雙語("世界守護者召喚與 Boss 進度", "World Guardian Summoning and Boss Progress")}</h4>
      <p style="font-size: 0.76rem; color: #8d93ad; margin: 0; line-height: 1.4;">
        ${雙語("玩家必須擊敗四大世界的 T3 守護者來奪取四枚「世界晶核印記」。當四印記集齊後，可前往地圖中央廣場的裝配儀召喚最終 Boss COLA。", "Defeat the four world T3 guardians to claim the four World Core Sigils. Once all four are gathered, head to the central plaza assembler to summon the final boss, COLA.")}
      </p>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 200px; gap: 16px;">
      <!-- 守護者進度 -->
      <div style="background: rgba(255,255,255,0.01); border: 1px solid rgba(255,255,255,0.05); padding: 12px; border-radius: 8px; font-size: 0.78rem;">
        <table style="width: 100%; border-collapse: collapse; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1); color: #ff8a3b;">
              <th style="padding: 4px 0;">${雙語("世界", "World")}</th>
              <th>${雙語("守護者狀態", "Guardian Status")}</th>
              <th>${雙語("操作", "Action")}</th>
            </tr>
          </thead>
          <tbody>
            ${progress.守護者.map((guardian) => {
              const status = guardian.defeated
                ? 雙語("已擊敗，印記已取得", "Defeated, sigil claimed")
                : guardian.spawned
                  ? 雙語("已召喚，正在戰場", "Summoned, active in battle")
                  : guardian.ready
                    ? 雙語("條件完成，可召喚", "Requirements met, ready to summon")
                    : `T1 ${guardian.readiness.minionTypesDone}/${guardian.readiness.minionTypesNeeded} | T2 ${guardian.readiness.eliteKills}/${guardian.readiness.eliteNeeded}`;
              return `
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                  <td style="padding: 8px 0; font-weight: bold;">${labels[guardian.world]}</td>
                  <td style="color: ${guardian.defeated ? "#4d8dff" : guardian.ready ? "#ffd24d" : "#8d93ad"};">${status}</td>
                  <td>
                    <button class="三級按鈕 召喚-守護者" data-world="${guardian.world}" ${online && guardian.ready ? "" : "disabled"}>${雙語("召喚", "Summon")}</button>
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
          <h4 style="margin: 0 0 8px; color: #ff8a3b; font-size: 0.82rem;">${雙語("COLA 裝配狀態", "COLA Assembly Status")}</h4>
          <div style="display: flex; flex-direction: column; gap: 4px; font-size: 0.72rem; color: #8d93ad; margin-bottom: 12px;">
            <div>${雙語("世界印記", "World Sigils")}: ${progress.印記數} / 4</div>
            <div>${雙語("全世界狂暴", "All-World Enrage")}: ${progress.全守護者已倒 ? 雙語("是", "Yes") : 雙語("否", "No")}</div>
            <div>${雙語("場上狀態", "Field Status")}: ${progress.COLA已召喚 ? 雙語("COLA 已在場", "COLA is already active") : 雙語("尚未召喚", "Not summoned yet")}</div>
          </div>
          <button class="危險按鈕 最終召喚" style="width: 100%; padding: 8px 0; font-size: 0.8rem;" ${online && progress.可召喚COLA ? "" : "disabled"}>
            ${雙語("召喚 COLA Boss", "Summon COLA Boss")}
          </button>
        </div>
        
        <div style="display: flex; flex-direction: column; gap: 6px; margin-top: 12px;">
          <button class="三級按鈕 召喚-離開" style="font-size: 0.75rem; padding: 4px 0;">${雙語("離開", "Leave")}</button>
        </div>
      </div>
    </div>
  `;

  // 綁定事件
  container.querySelectorAll(".召喚-守護者").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const w = (e.currentTarget as HTMLElement).dataset.world as World;
      if (!online || !可召喚守護者(w, "formal")) return;
      播放音效("祭壇召喚");
      標記守護者已召喚(w, "formal");
      排入Boss召喚({ kind: "guardian", world: w });
      應用程式狀態.返回戰場();
    });
  });

  container.querySelector(".最終召喚")!.addEventListener("click", () => {
    if (!online || !可召喚COLA("formal")) return;
    播放音效("祭壇召喚");
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
