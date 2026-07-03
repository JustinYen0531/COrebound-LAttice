/**
 * @file 互動面板.ts
 * @description 管理介面「互動分頁」的實際操作面板。
 *              對應 5 種設施(對應 共用型別.互動設施):
 *              - 合成(工作台):成員合成/升星/技能升級的確認面板
 *              - 熔爐:材料 → 家族碎片的熔煉面板(含 +20% 地緣加成)
 *              - 雕像:0→1★ 成員解鎖面板
 *              - 商店:藥水購買 + 材料販售面板
 *              - 召喚:守護者召喚(進度檢查) / COLA 裝配(印記檢查)
 *
 *              每個面板都遵循「靠近才啟用」規則(應用程式狀態.額外.靠近的互動設施),
 *              未靠近時顯示鎖定提示。
 *
 *              面板使用 mock 玩家背包(簡單計數),正式經濟系統上線後可替換。
 */

import { 應用程式狀態 } from "../應用程式狀態";
import type { 互動設施 } from "../共用型別";
import { FAMILY_LABEL } from "../../data/成員型別";
import {
  STAR_RECIPE,
  FAMILY_SHARD_COST,
} from "../../data/成員資料庫";
import { MATERIALS } from "../../data/素材資料庫";
import {
  FAMILY_FIRE_PERIOD,
  MATERIAL_RARITY_LABEL,
  SHARD_YIELD,
  type Family,
  type MaterialStar,
} from "../../data/戰鬥原語";
import { sellPriceOfMaterial, shardFromMaterial } from "../../data/素材資料庫";

// ============================================================
// Mock 玩家背包(placeholder 經濟,讓面板有對象可操作)
// ============================================================

interface MockInventory {
  gems: number;
  /** 生物材料數量,以素材 id 為 key */
  materials: Record<string, number>;
  /** 家族碎片數量 */
  shards: Record<Family, number>;
  /** 已解鎖的成員 no */
  unlockedMembers: Set<number>;
  /** 各世界守護者印記是否已取得 */
  sigils: Record<"geometry" | "organic" | "fractal" | "mechanical", boolean>;
}

const mockInv: MockInventory = {
  gems: 500,
  materials: {
    // 給一些初始材料方便測試每個面板
    g01_orbit: 5,
    g02_vertex: 3,
    g03_path: 4,
    g04_penrose: 2,
    g05_disc: 1,
    g06_core: 1,
    o07_germ: 5,
    o08_sap: 3,
    f13_origin: 5,
    f14_dust: 3,
    k19_ball: 5,
    k20_cog: 3,
  },
  shards: { shield: 30, multishot: 25, straight: 15, mine: 10, laser: 5 },
  unlockedMembers: new Set([1, 2, 3]),
  sigils: { geometry: false, organic: false, fractal: false, mechanical: false },
};

// ============================================================
// 工具
// ============================================================

function hintIfLocked(kind: 互動設施): HTMLElement {
  const near = 應用程式狀態.額外.靠近的互動設施;
  const div = document.createElement("div");
  div.className = "互動面板-鎖定提示";
  if (near !== kind) {
    div.innerHTML = `
      <p class="占位說明">🔒 目前未接近「${kind}」對應設施</p>
      <p class="互動面板-提示">請在地圖上靠近對應設施後啟用此面板。</p>
    `;
  }
  return div;
}

function regionNearby(): "geometry" | "organic" | "fractal" | "mechanical" | null {
  // 從靠近的設施難以反推世界;改用一個 mock:玩家在哪個世界取自地圖層
  // 此處簡化:地緣加成預設為 true(玩家通常在世界內靠近設施)
  return "geometry";
}

// ============================================================
// 合成面板(工作台)
// ============================================================

function 合成面板(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "互動面板 互動面板-合成";
  wrap.innerHTML = `<h3>🛠️ 裝備工作台</h3>`;

  const locked = hintIfLocked("合成");
  if (locked.querySelector(".占位說明")) {
    wrap.appendChild(locked);
    return wrap;
  }

  wrap.innerHTML += `
    <p class="互動面板-說明">在此進行成員合成/升星、附魔鑲嵌、技能升級。</p>
    <div class="互動面板-區塊">
      <h4>成員升星配方(5-3-1)</h4>
      <table class="互動面板-表">
        <thead><tr><th>階段</th><th>本級高級</th><th>本級普通</th><th>上一級高級</th><th>家族碎片</th></tr></thead>
        <tbody>
          ${[1, 2, 3].map((s) => {
            const r = STAR_RECIPE[s as 1 | 2 | 3];
            return `<tr><td>${s}★</td><td>${r.fineCurrent}</td><td>${r.commonCurrent}</td><td>${
              r.finePrev || "—"
            }</td><td>${r.shards}</td></tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
    <div class="互動面板-區塊">
      <h4>技能(武器)升級</h4>
      <p class="占位說明">技能升級僅需家族碎片 + 原石,不需怪物材料。</p>
      <table class="互動面板-表">
        <thead><tr><th>階段</th><th>碎片</th><th>原石</th><th>前置(同家族人數/累計星)</th></tr></thead>
        <tbody>
          <tr><td>1★</td><td>10</td><td>100</td><td>2 人 / 累計 2★</td></tr>
          <tr><td>2★</td><td>30</td><td>400</td><td>3 人 / 累計 5★</td></tr>
          <tr><td>3★</td><td>90</td><td>1200</td><td>4 人 / 累計 9★</td></tr>
        </tbody>
      </table>
    </div>
    <div class="互動面板-區塊">
      <h4>持有資源</h4>
      <p>原石:${mockInv.gems} 顆</p>
      <p>家族碎片:${(Object.keys(mockInv.shards) as Family[]).map((f) => `${FAMILY_LABEL[f]} ${mockInv.shards[f]}`).join(" / ")}</p>
    </div>
    <div class="按鈕列">
      <button class="一級按鈕 互動面板-確認">確認合成(示範)</button>
      <button class="三級按鈕 互動面板-取消">取消</button>
    </div>
  `;

  // 示範互動:確認按鈕
  wrap.querySelector(".互動面板-確認")!.addEventListener("click", () => {
    alert("[示範] 合成確認送出。正式版需選定目標成員/技能並檢查材料。");
  });
  wrap.querySelector(".互動面板-取消")!.addEventListener("click", () => {
    應用程式狀態.返回戰場();
  });
  return wrap;
}

// ============================================================
// 熔爐面板
// ============================================================

function 熔爐面板(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "互動面板 互動面板-熔爐";
  wrap.innerHTML = `<h3>🔥 家族熔爐</h3>`;

  const locked = hintIfLocked("熔爐");
  if (locked.querySelector(".占位說明")) {
    wrap.appendChild(locked);
    return wrap;
  }

  const localWorld = regionNearby();
  wrap.innerHTML += `
    <p class="互動面板-說明">投入生物材料熔煉為家族碎片。投入<b>${localWorld ?? "當前"}世界</b>的特產材料額外 +20% 產出。</p>
    <div class="互動面板-區塊">
      <h4>熔煉轉化率</h4>
      <table class="互動面板-表">
        <thead><tr><th>星級 / 稀有度</th><th>普通</th><th>高級</th></tr></thead>
        <tbody>
          ${[1, 2, 3].map((s) => {
            const y = SHARD_YIELD[s as MaterialStar];
            return `<tr><td>${s}★</td><td>${y.common} 碎片</td><td>${y.fine} 碎片</td></tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
    <div class="互動面板-區塊">
      <h4>可熔煉材料(從背包)</h4>
      <div class="互動面板-材料列"></div>
    </div>
    <div class="互動面板-區塊">
      <h4>已持有家族碎片</h4>
      <p>${(Object.keys(mockInv.shards) as Family[]).map((f) => `${FAMILY_LABEL[f]} ${mockInv.shards[f]}`).join(" / ")}</p>
    </div>
  `;

  // 渲染可熔煉材料清單
  const matList = wrap.querySelector(".互動面板-材料列") as HTMLElement;
  const ownedMaterials = MATERIALS.filter((m) => (mockInv.materials[m.id] ?? 0) > 0 && m.world !== "core");
  if (ownedMaterials.length === 0) {
    matList.innerHTML = `<p class="占位說明">背包中無可熔煉的生物材料。</p>`;
  } else {
    for (const m of ownedMaterials) {
      const count = mockInv.materials[m.id];
      const isLocal = m.world === localWorld;
      const yield_ = shardFromMaterial(m, isLocal);
      const baseYield = shardFromMaterial(m, false);
      const row = document.createElement("div");
      row.className = "互動面板-材料項";
      row.innerHTML = `
        <span class="互動面板-材料名">${m.nameZh} <small>${m.star}★${MATERIAL_RARITY_LABEL[m.rarity]}</small></span>
        <span class="互動面板-材料持有">×${count}</span>
        <span class="互動面板-材料產出">→ ${yield_} 碎片${isLocal ? ` <small>(+20% 地緣,基礎 ${baseYield})</small>` : ""}</span>
        <button class="三級按鈕">熔煉 1 個</button>
      `;
      row.querySelector("button")!.addEventListener("click", () => {
        if (mockInv.materials[m.id] <= 0) return;
        mockInv.materials[m.id]--;
        // 假設熔爐產出統一加到 shield 家族(正式版依該熔爐的 family 屬性)
        mockInv.shards.shield += yield_;
        alert(`[示範] 熔煉 ${m.nameZh} ×1 → 獲得 ${yield_} 家族碎片。`);
        應用程式狀態.進入管理介面("互動"); // 重繪
      });
      matList.appendChild(row);
    }
  }
  return wrap;
}

// ============================================================
// 雕像面板(0→1★ 解鎖)
// ============================================================

function 雕像面板(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "互動面板 互動面板-雕像";
  wrap.innerHTML = `<h3>🗿 成員解鎖雕像</h3>`;

  const locked = hintIfLocked("雕像");
  if (locked.querySelector(".占位說明")) {
    wrap.appendChild(locked);
    return wrap;
  }

  wrap.innerHTML += `
    <p class="互動面板-說明">在此進行成員的 0→1★ 初始化解鎖。<b>一次性</b>:解鎖後該雕像永久消失。</p>
    <p class="互動面板-說明">配方:[1★ 高級 1] + [1★ 普通 3] + [家族碎片 10]</p>
    <div class="互動面板-區塊">
      <h4>20 名成員解鎖狀態</h4>
      <div class="互動面板-成員列"></div>
    </div>
  `;

  const memberList = wrap.querySelector(".互動面板-成員列") as HTMLElement;
  // 動態 import 避免循環(成員資料庫已被多處引用)
  const members = getMembers();
  for (const m of members) {
    const unlocked = mockInv.unlockedMembers.has(m.no);
    const row = document.createElement("div");
    row.className = "互動面板-成員項";
    if (unlocked) row.classList.add("已解鎖");
    row.innerHTML = `
      <span class="互動面板-成員名">${m.no.toString().padStart(2, "0")}. ${m.nameZh}</span>
      <span class="互動面板-成員家族">${FAMILY_LABEL[m.family]}</span>
      <span class="互動面板-成員狀態">${unlocked ? "✅ 已解鎖" : "🔒 未解鎖"}</span>
      ${unlocked ? "" : `<button class="三級按鈕">解鎖(示範)</button>`}
    `;
    if (!unlocked) {
      row.querySelector("button")!.addEventListener("click", () => {
        mockInv.unlockedMembers.add(m.no);
        alert(`[示範] 解鎖 ${m.nameZh}(0→1★)。正式版需檢查材料並讓該雕像在地圖消失。`);
        應用程式狀態.進入管理介面("互動");
      });
    }
    memberList.appendChild(row);
  }
  return wrap;
}

// lazy 取成員(避免循環依賴)
import { MEMBERS } from "../../data/成員資料庫";
function getMembers() {
  return MEMBERS;
}

// ============================================================
// 商店面板
// ============================================================

function 商店面板(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "互動面板 互動面板-商店";
  wrap.innerHTML = `<h3>🛒 流浪商店</h3>`;

  const locked = hintIfLocked("商店");
  if (locked.querySelector(".占位說明")) {
    wrap.appendChild(locked);
    return wrap;
  }

  const localWorld = regionNearby();
  wrap.innerHTML += `
    <p class="互動面板-說明">購買藥水、出售材料換原石。出售<b>${localWorld ?? "當前"}世界</b>材料 +20% 溢價。</p>
    <div class="互動面板-區塊">
      <h4>購買(消耗原石)</h4>
      <table class="互動面板-表">
        <thead><tr><th>藥水</th><th>效果</th><th>價格</th><th>操作</th></tr></thead>
        <tbody>
          <tr><td>小生命</td><td>HP +20%</td><td>30</td><td><button class="三級按鈕" data-buy="hp_s" data-cost="30">買</button></td></tr>
          <tr><td>大生命</td><td>HP +50%</td><td>80</td><td><button class="三級按鈕" data-buy="hp_b" data-cost="80">買</button></td></tr>
          <tr><td>小能量</td><td>能量 +30%</td><td>35</td><td><button class="三級按鈕" data-buy="en_s" data-cost="35">買</button></td></tr>
          <tr><td>大能量</td><td>能量 +75%</td><td>95</td><td><button class="三級按鈕" data-buy="en_b" data-cost="95">買</button></td></tr>
          <tr><td>小混合</td><td>HP+15%/能量+20%</td><td>55</td><td><button class="三級按鈕" data-buy="hy_s" data-cost="55">買</button></td></tr>
          <tr><td>大混合</td><td>HP+40%/能量+50%</td><td>140</td><td><button class="三級按鈕" data-buy="hy_b" data-cost="140">買</button></td></tr>
        </tbody>
      </table>
    </div>
    <div class="互動面板-區塊">
      <h4>出售材料(換原石)</h4>
      <div class="互動面板-材料列"></div>
    </div>
    <div class="互動面板-區塊">
      <p>持有原石:<b>${mockInv.gems}</b> 顆</p>
    </div>
  `;

  // 購買
  wrap.querySelectorAll("[data-buy]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const cost = Number((e.currentTarget as HTMLElement).dataset.cost);
      if (mockInv.gems < cost) {
        alert("原石不足");
        return;
      }
      mockInv.gems -= cost;
      alert(`[示範] 購買成功(-${cost} 原石)`);
      應用程式狀態.進入管理介面("互動");
    });
  });

  // 出售
  const matList = wrap.querySelector(".互動面板-材料列") as HTMLElement;
  const ownedMaterials = MATERIALS.filter((m) => (mockInv.materials[m.id] ?? 0) > 0 && m.world !== "core");
  if (ownedMaterials.length === 0) {
    matList.innerHTML = `<p class="占位說明">背包中無可出售的材料。</p>`;
  } else {
    for (const m of ownedMaterials) {
      const count = mockInv.materials[m.id];
      const isLocal = m.world === localWorld;
      const price = sellPriceOfMaterial(m, isLocal);
      const basePrice = sellPriceOfMaterial(m, false);
      const row = document.createElement("div");
      row.className = "互動面板-材料項";
      row.innerHTML = `
        <span class="互動面板-材料名">${m.nameZh} <small>${m.star}★${MATERIAL_RARITY_LABEL[m.rarity]}</small></span>
        <span class="互動面板-材料持有">×${count}</span>
        <span class="互動面板-材料產出">→ ${price} 原石${isLocal ? ` <small>(+20% 地緣,基礎 ${basePrice})</small>` : ""}</span>
        <button class="三級按鈕">出售 1 個</button>
      `;
      row.querySelector("button")!.addEventListener("click", () => {
        if (mockInv.materials[m.id] <= 0) return;
        mockInv.materials[m.id]--;
        mockInv.gems += price;
        alert(`[示範] 出售 ${m.nameZh} ×1 → +${price} 原石`);
        應用程式狀態.進入管理介面("互動");
      });
      matList.appendChild(row);
    }
  }
  return wrap;
}

// ============================================================
// 召喚面板(守護者祭壇 / COLA 裝配儀)
// ============================================================

function 召喚面板(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "互動面板 互動面板-召喚";
  wrap.innerHTML = `<h3>🔱 召喚祭壇</h3>`;

  const locked = hintIfLocked("召喚");
  if (locked.querySelector(".占位說明")) {
    wrap.appendChild(locked);
    return wrap;
  }

  wrap.innerHTML += `
    <div class="互動面板-區塊">
      <h4>T3 世界守護者召喚條件</h4>
      <p class="互動面板-說明">在該世界擊殺 T2 精英 3 隻 + T1 雜兵三種各 5 隻,即可在此召喚該世界的 T3 守護者。</p>
      <table class="互動面板-表">
        <thead><tr><th>世界</th><th>T2 進度(需 3)</th><th>T1 進度(需 3 種各 5)</th><th>召喚</th></tr></thead>
        <tbody>
          ${(["geometry", "organic", "fractal", "mechanical"] as const).map((w) => {
            const ready = mockInv.sigils[w];
            return `<tr><td>${w}</td><td>${ready ? "✅ 已擊殺守護者" : "0/3"}</td><td>—</td><td>${
              ready ? "已通關" : `<button class="三級按鈕" data-summon-guardian="${w}">召喚(示範)</button>`
            }</td></tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
    <div class="互動面板-區塊">
      <h4>T4 COLA 裝配儀(中央廣場)</h4>
      <p class="互動面板-說明">集滿四枚世界晶核印記後,於中央廣場裝配儀召喚最終 Boss COLA。</p>
      <div class="互動面板-印記列">
        ${(["geometry", "organic", "fractal", "mechanical"] as const).map((w) => {
          const got = mockInv.sigils[w];
          return `<span class="互動面板-印記 ${got ? "已取得" : ""}">${w}: ${got ? "✅" : "❌"}</span>`;
        }).join("")}
      </div>
      <div class="按鈕列">
        <button class="危險按鈕 互動面板-召喚cola" ${
          Object.values(mockInv.sigils).every(Boolean) ? "" : "disabled"
        }>召喚 COLA(需四印記)</button>
      </div>
    </div>
  `;

  // 示範:擊殺守護者(實際應透過戰鬥系統)
  wrap.querySelectorAll("[data-summon-guardian]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const w = (e.currentTarget as HTMLElement).dataset.summonGuardian as typeof mockInv.sigils[keyof typeof mockInv.sigils] extends boolean ? never : string;
      alert(`[示範] 召喚 ${w} 世界守護者(應進入 Boss 戰)。`);
    });
  });

  // 示範:給玩家印記方便測試
  const giveSigilBtn = document.createElement("button");
  giveSigilBtn.className = "三級按鈕";
  giveSigilBtn.textContent = "[測試] 給予所有印記";
  giveSigilBtn.addEventListener("click", () => {
    (Object.keys(mockInv.sigils) as (keyof typeof mockInv.sigils)[]).forEach((k) => {
      mockInv.sigils[k] = true;
    });
    alert("[測試] 已給予所有世界印記。");
    應用程式狀態.進入管理介面("互動");
  });
  wrap.appendChild(giveSigilBtn);

  // 召喚 COLA
  wrap.querySelector(".互動面板-召喚cola")!.addEventListener("click", () => {
    if (!Object.values(mockInv.sigils).every(Boolean)) {
      alert("需集滿四枚世界晶核印記");
      return;
    }
    alert("[示範] 召喚 COLA!進入最終 Boss 戰。");
  });
  return wrap;
}

// ============================================================
// 主入口:依設施種類分派
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
