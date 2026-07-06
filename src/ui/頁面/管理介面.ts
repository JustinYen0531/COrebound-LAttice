/**
 * @file 管理介面.ts
 * @description IC 覆蓋層，5 個第一層主資料夾。只有「小隊」用大圓盤+立繪構圖，
 * 其餘 4 個資料夾用「左書籤／中內容／右補充」的乾淨資料夾式構圖。
 * 實現背包物品網格瀏覽、戰術 SVG 雷達地圖交互，以及小隊成員食譜升星模擬器。
 */
import { 應用程式狀態, 背包分類清單, 地圖分類清單 } from "../應用程式狀態";
import { 建立圖鑑瀏覽器 } from "../元件/圖鑑瀏覽器";
import { 建立互動面板 } from "../元件/互動面板";
import { 讀取玩家位置 } from "../元件/世界地圖層";
import { 建立正式小隊編輯器, 建立訓練召喚面板, 建立訓練小隊編輯器 } from "../元件/訓練道場面板";
import type { 互動設施, 管理介面分頁 } from "../共用型別";
import { MATERIALS, materialImagePath } from "../../data/素材資料庫";
import { MATERIAL_RARITY_LABEL } from "../../data/戰鬥原語";
import * as 背包 from "../../economy/背包狀態";
import { POTIONS, type PotionId } from "../../economy/流浪商店";
import { 選文 } from "../語系";
import { 取得音樂狀態, 切換音樂靜音, 訂閱音樂狀態, 設定音樂音量 } from "../../audio/音樂管理";

function 雙語(中文: string, 英文: string): string {
  return 選文(應用程式狀態.額外.語言, 中文, 英文);
}

function 世界顯示名(world: string): string {
  return {
    geometry: 雙語("幾何世界", "Geometry"),
    organic: 雙語("有機世界", "Organic"),
    fractal: 雙語("分形世界", "Fractal"),
    mechanical: 雙語("機械世界", "Mechanical"),
    core: 雙語("通關道具", "Clear Item"),
  }[world] ?? world;
}

function 家族顯示名(family: string): string {
  return {
    shield: 雙語("護盾", "Shield"),
    multishot: 雙語("多發", "Multishot"),
    straight: 雙語("直線", "Straight"),
    mine: 雙語("地雷", "Mine"),
    laser: 雙語("雷射", "Laser"),
  }[family] ?? family;
}

const 分頁清單: 管理介面分頁[] = ["小隊", "背包", "互動", "圖鑑", "地圖"];
const 互動設施清單: 互動設施[] = ["合成", "熔爐", "雕像", "商店", "召喚"];

// ── 捲軸位置保存 ─────────────────────────────────────────────
// 世界時鐘每秒觸發 通知() → 路由器整頁重建管理介面，會把捲動位置歸零。
// 這裡在重建前後快照 / 還原捲動位置：只在「同一個分頁」重繪時還原，
// 切換分頁時不還原（維持換頁回到頂端的正常體驗）。
let 上次渲染分頁: 管理介面分頁 | null = null;
// 管理介面內有自己 overflow 捲動的容器（例如圖鑑列表），用選擇器逐一保存。
const 內部捲軸選擇器 = [".圖鑑瀏覽器-卡片格"];

interface 捲軸快照 {
  視窗: number;
  內部: Record<string, number>;
}

function 快照捲軸(容器: HTMLElement): 捲軸快照 {
  const 內部: Record<string, number> = {};
  for (const 選擇器 of 內部捲軸選擇器) {
    const el = 容器.querySelector<HTMLElement>(選擇器);
    if (el) 內部[選擇器] = el.scrollTop;
  }
  return { 視窗: window.scrollY, 內部 };
}

function 還原捲軸(容器: HTMLElement, 快照: 捲軸快照): void {
  for (const 選擇器 of 內部捲軸選擇器) {
    const el = 容器.querySelector<HTMLElement>(選擇器);
    if (el && 快照.內部[選擇器] != null) el.scrollTop = 快照.內部[選擇器];
  }
  window.scrollTo(0, 快照.視窗);
}

/** 內部中文 id → 中英雙語顯示標籤（id 仍作狀態鍵）。 */
const 分頁標籤: Record<管理介面分頁, string> = {
  小隊: 雙語("小隊", "Squad"),
  背包: 雙語("背包", "Bag"),
  互動: 雙語("互動", "Interact"),
  圖鑑: 雙語("圖鑑", "Codex"),
  地圖: 雙語("地圖", "Map"),
};
const 互動設施標籤: Record<互動設施, string> = {
  合成: 雙語("合成", "Craft"),
  熔爐: 雙語("熔爐", "Forge"),
  雕像: 雙語("雕像", "Statue"),
  商店: 雙語("商店", "Shop"),
  召喚: 雙語("召喚", "Summon"),
};

// 模擬背包測試數據
const bagItems = {
  材料: [
    { id: "g01_orbit", name: "Geometric Orbit Crystal", star: 1, count: 8, rarity: "common", info: "A basic crafting crystal from Geometry.", world: "geometry" },
    { id: "g02_vertex:fine", name: "Refined Vertex Stone", star: 2, count: 4, rarity: "fine", info: "A high-purity shard used for rank-ups.", world: "geometry" },
    { id: "o07_germ", name: "Organic Split Spore", star: 1, count: 12, rarity: "common", info: "A basic life-weaving material from Organic.", world: "organic" },
    { id: "f13_origin", name: "Fractal Origin Leaf", star: 1, count: 6, rarity: "common", info: "A foundational fragment from the Fractal world.", world: "fractal" },
    { id: "k19_ball", name: "Mechanical Alloy Ball", star: 1, count: 9, rarity: "common", info: "A rolling component that keeps rotation stable.", world: "mechanical" },
  ],
  消耗品: [
    { id: "hp_s", name: "Minor Life Flask", count: 3, effect: "Restore 20% HP", desc: "A cheap field-made mix found in crates." },
    { id: "hp_b", name: "Reinforced Vital Fluid", count: 1, effect: "Restore 50% HP", desc: "A high-activity extract refined from lattice cores." },
    { id: "en_s", name: "Resonance Cell", count: 4, effect: "Restore 30% Energy", desc: "A portable battery favored by supply roles." },
  ],
  任務物: [
    { id: "sigil_geo", name: "Geometry Core Sigil", got: false, desc: "A geometric key earned from the Geometry guardian." },
    { id: "sigil_org", name: "Organic Core Sigil", got: false, desc: "A living-cell key earned from the Organic guardian." },
    { id: "sigil_fra", name: "Fractal Core Sigil", got: false, desc: "A self-similar key earned from the Fractal guardian." },
    { id: "sigil_mec", name: "Mechanical Core Sigil", got: false, desc: "A geared lock-key earned from the Mechanical guardian." },
  ],
  追蹤中: [
    { id: "track_shard", name: "Shield Family Shards", current: 8, target: 15, source: "Smelt Geometry materials" },
    { id: "track_gem", name: "Gems (for skill upgrades)", current: 850, target: 1200, source: "Monster drops and shop sales" },
  ]
};

// 選中的背包物品
let 選中背包物品: any = null;
const Showcase背包草稿: Record<"材料" | "消耗品", { itemKey: string; count: string }> = {
  材料: { itemKey: "material:1", count: "1" },
  消耗品: { itemKey: "potion:1", count: "1" },
};
const Showcase藥水編號: PotionId[] = ["hp_small", "hp_big", "energy_small", "energy_big", "hybrid_small", "hybrid_big"];
// 選中的地圖標記
let 選中地圖標記Id: string = "m_player";

// ============================================================
// 1. 小隊分頁 (右側詳細與升星配方食譜)
// ============================================================
function 小隊分頁內容(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "小隊分頁 專屬構圖";
  const 訓練道場模式 = 應用程式狀態.畫面.層 === "管理介面" && 應用程式狀態.畫面.訓練道場;

  const 詳情區 = document.createElement("div");
  詳情區.className = "小隊分頁-right";
  詳情區.style.display = "flex";
  詳情區.style.flexDirection = "column";
  詳情區.style.gap = "14px";
  詳情區.style.width = "min(1120px, calc(100vw - 140px))";
  詳情區.appendChild(
    訓練道場模式
      ? 建立訓練小隊編輯器(() => {
          應用程式狀態.進入管理介面("小隊");
        })
      : 建立正式小隊編輯器(() => {
          應用程式狀態.進入管理介面("小隊");
        }),
  );

  wrap.append(詳情區);
  return wrap;
}

// ============================================================
// 2. 背包分頁 (網格骨架與右側物品詳情)
// ============================================================
function 背包分頁內容(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "資料夾式版面";
  const inventory = 背包.背包快照();

  const 書籤欄 = document.createElement("div");
  書籤欄.className = "資料夾式版面-書籤欄";
  for (const 名稱 of 背包分類清單) {
    const btn = document.createElement("button");
    btn.textContent =
      名稱 === "材料" ? 雙語("材料", "Materials") :
      名稱 === "消耗品" ? 雙語("消耗品", "Consumables") :
      名稱 === "任務物" ? 雙語("任務物", "Quest Items") :
      雙語("追蹤中", "Tracked");
    btn.classList.toggle("作用中", 應用程式狀態.額外.背包選中分類 === 名稱);
    btn.onclick = () => {
      應用程式狀態.設定背包分類(名稱);
      選中背包物品 = null; // 切換分類清空選中
      應用程式狀態.進入管理介面("背包");
    };
    書籤欄.appendChild(btn);
  }

  const 內容區 = document.createElement("div");
  內容區.className = "資料夾式版面-內容區";
  
  const activeTab = 應用程式狀態.額外.背包選中分類 as keyof typeof bagItems;
  const realMaterials = inventory.材料明細
    .map(({ no, count }) => {
      const def = MATERIALS.find((m) => m.no === no);
      return def ? {
        no,
        id: def.id,
        name: 應用程式狀態.額外.語言 === "zh" ? def.nameZh : def.nameEn,
        star: def.star,
        count,
        rarity: def.rarity,
        info: def.visual,
        world: def.world,
        image: materialImagePath(def.no),
      } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null && item.count > 0);
  const potionName: Record<keyof typeof POTIONS, string> = {
    hp_small: 雙語("生命藥水 (小)", "Life Potion (S)"),
    hp_big: 雙語("生命藥水 (大)", "Life Potion (L)"),
    energy_small: 雙語("能量藥水 (小)", "Energy Potion (S)"),
    energy_big: 雙語("能量藥水 (大)", "Energy Potion (L)"),
    hybrid_small: 雙語("混合藥水 (小)", "Hybrid Potion (S)"),
    hybrid_big: 雙語("混合藥水 (大)", "Hybrid Potion (L)"),
  };
  const realPotions = inventory.藥水明細
    .map(({ id, count }) => {
      const def = POTIONS[id];
      return def ? {
        id,
        name: potionName[id],
        count,
        effect: `${def.hpRatio > 0 ? `HP +${Math.round(def.hpRatio * 100)}%` : ""}${def.hpRatio > 0 && def.energyRatio > 0 ? " / " : ""}${def.energyRatio > 0 ? `Energy +${Math.round(def.energyRatio * 100)}%` : ""}`,
        desc: def.big ? "A larger potion meant for confirmed battle use." : "A smaller potion suited for field supply.",
      } : null;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null && item.count > 0);
  const shardEmoji: Record<string, string> = {
    shield: "🛡️",
    multishot: "🎯",
    straight: "📏",
    mine: "💣",
    laser: "🔦",
  };
  const shardInventory = inventory.碎片 ?? { shield: 0, multishot: 0, straight: 0, mine: 0, laser: 0 };
  const realShards = (Object.entries(shardInventory) as Array<[keyof typeof shardInventory, number]>)
    .map(([family, count]) => ({
      id: `shard_${family}`,
      name: `${家族顯示名(family)} ${雙語("碎片", "Shards")}`,
      count,
      effect: 雙語("可用於角色升星與家族武器強化。", "Used for member star-ups and family weapon upgrades."),
      desc: 雙語("目前沒有專屬圖片，先用 emoji 代替。", "No dedicated image yet, using emoji as a placeholder."),
      emoji: shardEmoji[family] ?? "✨",
      family,
      category: "shard",
    }))
    .filter((item) => item.count > 0);
  const items =
    activeTab === "材料" ? [...realMaterials, ...realShards] :
    activeTab === "消耗品" ? realPotions :
    bagItems[activeTab] || [];

  const itemsGrid = document.createElement("div");
  itemsGrid.style.display = "grid";
  itemsGrid.style.gridTemplateColumns = "repeat(auto-fill, minmax(76px, 1fr))";
  itemsGrid.style.gap = "10px";
  itemsGrid.style.marginTop = "12px";

  const 可Showcase新增 = 應用程式狀態.額外.Showcase模式 && (activeTab === "材料" || activeTab === "消耗品");
  if (items.length === 0 && !可Showcase新增) {
    itemsGrid.innerHTML = `<p class="占位說明" style="grid-column: 1/-1; text-align: center; padding: 40px 0;">${雙語("此類別中尚無物品。", "No items in this category yet.")}</p>`;
  } else {
    items.forEach((item: any) => {
      const cell = document.createElement("div");
      cell.style.background = "rgba(255,255,255,0.02)";
      cell.style.border = (選中背包物品 && 選中背包物品.id === item.id) 
        ? "1.5px solid #ff8a3b" 
        : "1px solid rgba(255,255,255,0.08)";
      cell.style.borderRadius = "8px";
      cell.style.padding = "8px";
      cell.style.textAlign = "center";
      cell.style.cursor = "pointer";
      cell.style.position = "relative";
      cell.style.transition = "background 0.15s";
      
      let badge = "📦";
      if (activeTab === "消耗品") badge = "🧪";
      else if (activeTab === "任務物") badge = "🔑";
      else if (activeTab === "追蹤中") badge = "📌";

      const 視覺HTML = activeTab === "材料" && item.image
        ? `<div style="height:52px;display:flex;align-items:center;justify-content:center;margin-bottom:6px;"><img src="${item.image}" alt="${item.name}" style="max-width:52px;max-height:52px;object-fit:contain;filter:drop-shadow(0 5px 8px rgba(0,0,0,0.28));" draggable="false" /></div>`
        : `<div style="font-size: 1.5rem; margin-bottom: 4px;">${item.emoji ?? badge}</div>`;

      cell.innerHTML = `
        ${視覺HTML}
        <div style="font-size: 0.7rem; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.name}</div>
        <span style="position: absolute; bottom: 4px; right: 6px; background: rgba(0,0,0,0.6); color: #ffd24d; font-size: 0.65rem; padding: 1px 4px; border-radius: 3px; font-weight: bold;">
          ${item.count !== undefined ? `×${item.count}` : `${item.current}/${item.target}`}
        </span>
      `;

      cell.onclick = () => {
        選中背包物品 = item;
        應用程式狀態.進入管理介面("背包");
      };
      itemsGrid.appendChild(cell);
    });
  }

  if (可Showcase新增) {
    const addCell = document.createElement("button");
    addCell.type = "button";
    addCell.className = `Showcase背包加號${選中背包物品?.id === "__showcase_add__" ? " 作用中" : ""}`;
    addCell.innerHTML = `<span>＋</span><small>${雙語("加入物品", "Add Item")}</small>`;
    addCell.onclick = () => {
      選中背包物品 = { id: "__showcase_add__", category: activeTab };
      應用程式狀態.進入管理介面("背包");
    };
    itemsGrid.appendChild(addCell);
  }

  const 背包分類標籤 = activeTab === "材料" ? 雙語("材料", "Materials")
    : activeTab === "消耗品" ? 雙語("消耗品", "Consumables")
    : activeTab === "任務物" ? 雙語("任務物", "Quest Items")
    : 雙語("追蹤中", "Tracked");
  內容區.innerHTML = `<h3>🎒 ${雙語("背包儲備", "Bag Inventory")} / ${背包分類標籤}</h3>`;
  內容區.appendChild(itemsGrid);

  const 補充區 = document.createElement("div");
  補充區.className = "資料夾式版面-補充區";

  if (選中背包物品?.id === "__showcase_add__" && 可Showcase新增) {
    wrap.classList.add("資料夾式版面--Showcase背包編輯");
    const category = activeTab as "材料" | "消耗品";
    const draft = Showcase背包草稿[category];
    const catalog = category === "材料"
      ? [
          ...MATERIALS.map((item) => ({
            key: `material:${item.no}`,
            label: `🧱 ${String(item.no).padStart(2, "0")} ${應用程式狀態.額外.語言 === "zh" ? item.nameZh : item.nameEn}`,
            count: 背包.取材料(item.no),
            kind: "material" as const,
            no: item.no,
          })),
          ...(["shield", "multishot", "straight", "mine", "laser"] as const).map((family) => ({
            key: `shard:${family}`,
            label: `${shardEmoji[family]} ${家族顯示名(family)} ${雙語("碎片", "Shards")}`,
            count: 背包.取碎片(family),
            kind: "shard" as const,
            family,
          })),
        ]
      : Showcase藥水編號.map((id, index) => ({
          key: `potion:${index + 1}`,
          label: `🧪 ${potionName[id]}`,
          count: 背包.取藥水(id),
          kind: "potion" as const,
          no: index + 1,
        }));
    補充區.classList.add("Showcase背包編輯器");
    const selected = catalog.find((item) => item.key === draft.itemKey) ?? catalog[0] ?? null;
    if (selected && selected.key !== draft.itemKey) draft.itemKey = selected.key;
    補充區.innerHTML = `
      <h4 style="color:#a26a17;margin-top:0;">＋ ${雙語("Showcase 加入物品", "Showcase Add Item")}</h4>
      <div class="Showcase背包編輯器-清單">
        ${catalog.map((item) => `<button type="button" data-item-key="${item.key}"><b>${item.kind === "material" ? String(item.no).padStart(2, "0") : item.kind === "shard" ? "SH" : "PT"}</b><span>${item.label}</span><small>×${item.count}</small></button>`).join("")}
      </div>
      <div class="Showcase背包編輯器-輸入">
        <label>${雙語("目前選取", "Current Item")}<div data-add-item-label style="padding:8px 10px;border:1px solid rgba(255,255,255,0.14);border-radius:8px;background:rgba(255,255,255,0.06);color:#f7e7ba;min-height:38px;display:flex;align-items:center;">${selected?.label ?? 雙語("請先從上方選物品", "Choose an item above first.")}</div></label>
        <label>${雙語("數量", "Quantity")}<input type="number" min="1" max="9999" value="${draft.count}" data-add-count /></label>
        <button type="button" class="一級按鈕" data-add-confirm>${雙語("加入背包", "Add to Bag")}</button>
        <div class="Showcase背包編輯器-訊息" data-add-message></div>
      </div>
    `;
    const itemLabel = 補充區.querySelector<HTMLElement>("[data-add-item-label]")!;
    const countInput = 補充區.querySelector<HTMLInputElement>("[data-add-count]")!;
    countInput.oninput = () => { draft.count = countInput.value; };
    補充區.querySelectorAll<HTMLButtonElement>("[data-item-key]").forEach((button) => {
      button.onclick = () => {
        draft.itemKey = button.dataset.itemKey ?? catalog[0]?.key ?? "";
        const picked = catalog.find((item) => item.key === draft.itemKey);
        itemLabel.textContent = picked?.label ?? 雙語("請先從上方選物品", "Choose an item above first.");
        countInput.focus();
      };
    });
    補充區.querySelector<HTMLButtonElement>("[data-add-confirm]")!.onclick = () => {
      const selected = catalog.find((item) => item.key === draft.itemKey);
      const count = Math.floor(Number(draft.count));
      const message = 補充區.querySelector<HTMLElement>("[data-add-message]")!;
      if (!selected || !Number.isFinite(count) || count <= 0) {
        message.textContent = 雙語("請選擇列表中的物品，並輸入大於 0 的數量。", "Choose an item from the list and enter a quantity above zero.");
        return;
      }
      if (selected.kind === "material") 背包.加入材料(selected.no, count);
      else if (selected.kind === "shard") 背包.加入碎片(selected.family, count);
      else 背包.加入藥水(Showcase藥水編號[selected.no - 1], count);
      選中背包物品 = { id: "__showcase_add__", category };
      應用程式狀態.進入管理介面("背包");
    };
  } else if (選中背包物品 === null) {
    補充區.innerHTML = `
      <h4>🔍 ${雙語("物品詳細說明", "Item Details")}</h4>
      <p style="font-size: 0.8rem; color: #8d93ad; line-height: 1.5;">${雙語("點選左側格網中的任何物品，即可在此查看材料地緣歸屬、熔煉轉化率或合成配方用途。", "Click any item in the left grid to inspect its world origin, forge conversion rate, or crafting usage here.")}</p>
    `;
  } else {
    let specDetails = "";
    if (activeTab === "材料") {
      if (選中背包物品.category === "shard") {
        specDetails = `
          <div style="display:flex;justify-content:center;align-items:center;font-size:4rem;margin: 0 0 12px;">${選中背包物品.emoji ?? "✨"}</div>
          <div style="margin-top: 10px; font-size: 0.8rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px; line-height: 1.6;">
            <div>${雙語("家族類型", "Family")}：<span style="color:#ffd24d;">${家族顯示名(選中背包物品.family)}</span></div>
            <div style="color: #4d8dff; margin-top: 4px;">${雙語("用途：角色升星、家族武器升級、熔爐系統流轉。", "Usage: member star-ups, family weapon upgrades, and forge progression.")}</div>
          </div>
        `;
      } else {
        const worldName = 世界顯示名(選中背包物品.world as string);
        specDetails = `
          <div style="display:flex;justify-content:center;margin: 0 0 12px;">
            <img src="${選中背包物品.image}" alt="${選中背包物品.name}" style="max-width:160px;max-height:160px;object-fit:contain;filter:drop-shadow(0 8px 12px rgba(0,0,0,0.24));" draggable="false" />
          </div>
          <div style="margin-top: 10px; font-size: 0.8rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px; line-height: 1.6;">
            <div>${雙語("地緣出處", "World Origin")}：<span style="color:#ffd24d;">${worldName}</span></div>
            <div>${雙語("星級星等", "Star Rating")}：<span style="color:#ffd24d;">${選中背包物品.star}★</span></div>
            <div style="color: #4d8dff; margin-top: 4px;">${雙語("熔爐轉化：投入熔爐可轉化為對應家族碎片", "Forge Conversion: feed it into the forge to turn it into matching family shards.")}</div>
          </div>
        `;
      }
    } else if (activeTab === "消耗品") {
      specDetails = `
        <div style="margin-top: 10px; font-size: 0.8rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px;">
          <div style="color: #ffd24d; font-weight: bold;">${雙語("使用效果", "Effect")}：${選中背包物品.effect}</div>
          <button class="三級按鈕" style="width: 100%; margin-top: 12px; font-size: 0.75rem; padding: 4px 0;">${雙語("在對局中快捷使用", "Quick-Use In Battle")}</button>
        </div>
      `;
    } else if (activeTab === "追蹤中") {
      specDetails = `
        <div style="margin-top: 10px; font-size: 0.8rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px; line-height: 1.5;">
          <div>${雙語("獲取來源", "Source")}：<span style="color:#4d8dff;">${選中背包物品.source}</span></div>
        </div>
      `;
    }

    補充區.innerHTML = `
      <h4 style="color: #ff8a3b; margin-top: 0;">${選中背包物品.name}</h4>
      <p style="font-size: 0.8rem; line-height: 1.4; color: #fff;">
        ${選中背包物品.info || 選中背包物品.desc || 雙語("無說明文件。", "No description available.")}
      </p>
      ${specDetails}
    `;
  }

  wrap.append(書籤欄, 內容區, 補充區);
  return wrap;
}

// ============================================================
// 3. 地圖分頁 (SVG 戰術雷達與標記)
// ============================================================
// 模擬地圖標記列表
const mapMarkers = [
  { id: "m_player", icon: "🌀", label: "Player Squad (Current Position)", x: 160, y: 160, zone: "Central Plaza", desc: "Your squad is standing in the hub plaza where the COLA route converges." },
  { id: "m_arch", icon: "🛠️", label: "Geometry Workbench", x: 60, y: 60, zone: "Geometry", desc: "Used for member crafting, rank-ups, and skill upgrades. Unlocks on approach." },
  { id: "m_furnace", icon: "🔥", label: "Fractal Family Forge", x: 260, y: 70, zone: "Fractal", desc: "Smelts Fractal materials into Mine/Laser shards with a +20% local bonus." },
  { id: "m_statue", icon: "🗿", label: "Spore Awakening Statue", x: 80, y: 250, zone: "Organic", desc: "An ancient statue used to unlock Spore from 0 to 1★." },
  { id: "m_shop", icon: "🛒", label: "Mechanical Wander Shop", x: 240, y: 240, zone: "Mechanical", desc: "Buy major healing and resonance batteries, or sell alloys for gems." },
  { id: "m_altar", icon: "🔱", label: "World Summoning Altar", x: 160, y: 50, zone: "North Geometry Frontier", desc: "Summon the T3 Geometry guardian once the elite kill condition is full." },
];

function 地圖分頁內容(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "資料夾式版面";
  const 訓練道場模式 = 應用程式狀態.畫面.層 === "管理介面" && 應用程式狀態.畫面.訓練道場;

  const 書籤欄 = document.createElement("div");
  書籤欄.className = "資料夾式版面-書籤欄";
  const 地圖分類標籤: Record<(typeof 地圖分類清單)[number], string> = {
    縮影: 雙語("縮影", "Overview"),
    互動點: 雙語("互動點", "Interactions"),
    危險區: 雙語("危險區", "Danger Zones"),
    事件區: 雙語("事件區", "Events"),
  };
  for (const 名稱 of 地圖分類清單) {
    const btn = document.createElement("button");
    btn.textContent = 地圖分類標籤[名稱];
    btn.classList.toggle("作用中", 應用程式狀態.額外.地圖選中分類 === 名稱);
    btn.onclick = () => {
      應用程式狀態.設定地圖分類(名稱);
      應用程式狀態.進入管理介面("地圖");
    };
    書籤欄.appendChild(btn);
  }

  const 內容區 = document.createElement("div");
  內容區.className = "資料夾式版面-內容區";
  
  // 建立 SVG 戰術雷達圖
  const mapSvgWrapper = document.createElement("div");
  mapSvgWrapper.style.width = "100%";
  mapSvgWrapper.style.aspectRatio = "1/1";
  mapSvgWrapper.style.background = "#05060b";
  mapSvgWrapper.style.border = "1px solid rgba(255,255,255,0.06)";
  mapSvgWrapper.style.borderRadius = "12px";
  mapSvgWrapper.style.position = "relative";
  mapSvgWrapper.style.marginTop = "10px";
  mapSvgWrapper.style.overflow = "hidden";

  const SVG_NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 320 320");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");

  // 雷達網格線
  for (let r = 40; r <= 160; r += 40) {
    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", "160");
    circle.setAttribute("cy", "160");
    circle.setAttribute("r", String(r));
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", "rgba(111, 140, 255, 0.08)");
    circle.setAttribute("stroke-width", "1");
    if (r === 160) circle.setAttribute("stroke-dasharray", "4,4");
    svg.appendChild(circle);
  }
  // 雷達十字分界線
  const lineH = document.createElementNS(SVG_NS, "line");
  lineH.setAttribute("x1", "0"); lineH.setAttribute("y1", "160"); lineH.setAttribute("x2", "320"); lineH.setAttribute("y2", "160");
  lineH.setAttribute("stroke", "rgba(111, 140, 255, 0.06)");
  svg.appendChild(lineH);

  const lineV = document.createElementNS(SVG_NS, "line");
  lineV.setAttribute("x1", "160"); lineV.setAttribute("y1", "0"); lineV.setAttribute("x2", "160"); lineV.setAttribute("y2", "320");
  lineV.setAttribute("stroke", "rgba(111, 140, 255, 0.06)");
  svg.appendChild(lineV);

  // 四大世界文字標籤標記
  const zonesText = [
    { text: "🧱 Geometry", x: 30, y: 40 },
    { text: "🔮 Fractal", x: 230, y: 40 },
    { text: "🌿 Organic", x: 30, y: 290 },
    { text: "⚙️ Mechanical", x: 230, y: 290 },
  ];
  zonesText.forEach(zt => {
    const text = document.createElementNS(SVG_NS, "text");
    text.setAttribute("x", String(zt.x));
    text.setAttribute("y", String(zt.y));
    text.setAttribute("fill", "rgba(255, 255, 255, 0.25)");
    text.setAttribute("font-size", "10");
    text.setAttribute("font-family", "monospace");
    text.textContent = zt.text;
    svg.appendChild(text);
  });

  // 繪製地圖標記點
  mapMarkers.forEach((marker) => {
    const group = document.createElementNS(SVG_NS, "g");
    group.style.cursor = "pointer";
    
    // 如果選中，繪製一個閃爍的外光圈
    const isSelected =選中地圖標記Id === marker.id;
    if (isSelected) {
      const pulseRing = document.createElementNS(SVG_NS, "circle");
      pulseRing.setAttribute("cx", String(marker.x));
      pulseRing.setAttribute("cy", String(marker.y));
      pulseRing.setAttribute("r", "16");
      pulseRing.setAttribute("fill", "none");
      pulseRing.setAttribute("stroke", "#ff8a3b");
      pulseRing.setAttribute("stroke-width", "1.5");
      group.appendChild(pulseRing);
    }

    const circle = document.createElementNS(SVG_NS, "circle");
    circle.setAttribute("cx", String(marker.x));
    circle.setAttribute("cy", String(marker.y));
    circle.setAttribute("r", "10");
    circle.setAttribute("fill", isSelected ? "#12172a" : "#0c0e17");
    circle.setAttribute("stroke", isSelected ? "#ff8a3b" : "rgba(255,255,255,0.3)");
    circle.setAttribute("stroke-width", "1.2");
    group.appendChild(circle);

    const txt = document.createElementNS(SVG_NS, "text");
    txt.setAttribute("x", String(marker.x - 6));
    txt.setAttribute("y", String(marker.y + 4));
    txt.setAttribute("font-size", "10");
    txt.textContent = marker.icon;
    group.appendChild(txt);

    group.addEventListener("click", () => {
      選中地圖標記Id = marker.id;
      應用程式狀態.進入管理介面("地圖");
    });

    svg.appendChild(group);
  });

  mapSvgWrapper.appendChild(svg);

  const 地圖分類顯示 =
    地圖分類標籤[應用程式狀態.額外.地圖選中分類 as (typeof 地圖分類清單)[number]] ??
    地圖分類標籤.縮影;
  內容區.innerHTML = `<h3>🛰️ ${雙語("戰術地圖", "Tactical Map")} / ${地圖分類顯示}</h3>`;
  內容區.appendChild(mapSvgWrapper);

  const 補充區 = document.createElement("div");
  補充區.className = "資料夾式版面-補充區";

  const selectedMarker = mapMarkers.find((m) => m.id === 選中地圖標記Id) ?? mapMarkers[0];

  if (訓練道場模式) {
    const 玩家位置 = 讀取玩家位置();
    補充區.appendChild(
      建立訓練召喚面板(
        () => {
          應用程式狀態.進入管理介面("地圖");
        },
        玩家位置,
      ),
    );

    const 坐標提示 = document.createElement("div");
    坐標提示.style.marginTop = "12px";
    坐標提示.style.padding = "10px";
    坐標提示.style.borderRadius = "8px";
    坐標提示.style.background = "rgba(255,255,255,0.03)";
    坐標提示.style.border = "1px solid rgba(255,255,255,0.06)";
    坐標提示.style.fontSize = "0.75rem";
    坐標提示.style.lineHeight = "1.5";
    坐標提示.style.color = "#8d93ad";
    坐標提示.innerHTML = `
      <div>${雙語("目前召喚中心", "Current Summon Center")}：<span style="color:#fff;font-family:monospace;">X ${Math.round(玩家位置.x)} / Y ${Math.round(玩家位置.y)}</span></div>
      <div style="margin-top:4px;">${雙語("召喚時會直接以你現在站的位置為中心，丟到附近做即時碰撞測試。", "Summons will use your current standing point as the center and drop nearby for live collision testing.")}</div>
    `;
    補充區.appendChild(坐標提示);
  } else {
    補充區.innerHTML = `
    <h4 style="color: #ff8a3b; margin-top: 0; display: flex; align-items: center; gap: 6px;">
      <span>${selectedMarker.icon}</span> ${selectedMarker.label}
    </h4>
    <div style="font-size: 0.8rem; color: #8d93ad; margin-bottom: 10px;">
      ${雙語("所屬區域", "Zone")}：<span style="color:#fff;">${selectedMarker.zone}</span><br/>
      ${雙語("座標", "Coordinates")}：<span style="color:#fff; font-family: monospace;">X: ${selectedMarker.x}, Y: ${320 - selectedMarker.y}</span>
    </div>
    <p style="font-size: 0.82rem; line-height: 1.5; color: #fff; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px;">
      ${selectedMarker.desc}
    </p>

    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 10px; border-radius: 6px; font-size: 0.75rem; color: #8d93ad; margin-top: auto;">
      💡 ${雙語("提示：點擊左側雷達圖上的標記，可以直接快速定位並查看詳細說明。", "Tip: click markers on the radar map to jump straight to their details.")}
    </div>
  `;
  }

  wrap.append(書籤欄, 內容區, 補充區);
  return wrap;
}

// ============================================================
// 4. 互動分頁內容
// ============================================================
function 互動分頁內容(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "資料夾式版面";

  const 書籤欄 = document.createElement("div");
  書籤欄.className = "資料夾式版面-書籤欄";
  const 選中設施 = 應用程式狀態.額外.互動選中設施 ?? 互動設施清單[0];

  for (const 設施 of 互動設施清單) {
    const btn = document.createElement("button");
    btn.textContent = 互動設施標籤[設施] ?? 設施;
    const 啟用中 = 應用程式狀態.額外.靠近的互動設施 === 設施;
    btn.classList.toggle("作用中", 選中設施 === 設施);
    btn.classList.toggle("鎖定", !啟用中);
    btn.onclick = () => 應用程式狀態.設定互動選中設施(設施);
    書籤欄.appendChild(btn);
  }

  const 啟用中 = 應用程式狀態.額外.靠近的互動設施 === 選中設施;
  const 內容區 = document.createElement("div");
  內容區.className = "資料夾式版面-內容區";
  // 使用實際的互動面板 (靠近才啟用,未靠近面板內部會顯示鎖定提示)
  內容區.appendChild(建立互動面板(選中設施));

  const 補充區 = document.createElement("div");
  補充區.className = "資料夾式版面-補充區";
  補充區.innerHTML = `
    <h4 style="margin-top: 0; color: #ff8a3b;">${雙語("互動子分頁鎖定規則", "Interact Sub-Tab Lock Rules")} (R5)</h4>
    <p style="font-size: 0.8rem; line-height: 1.5; color: #8d93ad;">${雙語("每個子分頁各自依「玩家是否正靠近對應設施」獨立判定，互不連動。", "Each sub-tab unlocks independently based on whether the player is standing near its matching facility.")}</p>
    
    <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px; font-size: 0.8rem; line-height: 1.6; margin-top: 10px;">
      <div>${雙語("目前靠近", "Currently Near")}：<b style="color: #ffd24d;">${應用程式狀態.額外.靠近的互動設施 ?? 雙語("（無）", "(None)")}</b></div>
      <div>${雙語("選中設施", "Selected Facility")}：<b style="color: #fff;">${選中設施}</b></div>
      <div style="margin-top: 4px;">${雙語("狀態", "Status")}：${啟用中 
        ? `<span style='color: #4d8dff; font-weight: bold;'>${雙語("已連接啟用（現場操作）", "Connected (Live Operation)")}</span>` 
        : `<span style='color: #d8b46a; font-weight: bold;'>${雙語("遠端預覽（現場操作會鎖定）", "Remote Preview (Live actions stay locked)")}</span>`
      }</div>
    </div>
    
    <p class="占位說明" style="margin-top: 12px; font-size: 0.76rem;">${雙語("提示：回到操作頁面利用 WASD 移動靠近對應設施，即可進入現場操作模式。", "Tip: move with WASD on the operation page to stand near the matching facility and enter live operation mode.")}</p>
  `;

  wrap.append(書籤欄, 內容區, 補充區);
  return wrap;
}

export function 渲染管理介面(容器: HTMLElement) {
  const state = 應用程式狀態.畫面;
  if (state.層 !== "管理介面") {
    容器.innerHTML = "";
    上次渲染分頁 = null;
    return;
  }
  // 重建前先快照捲動位置（僅同分頁重繪時才會於結尾還原）。
  const 同分頁重繪 = 上次渲染分頁 === state.分頁;
  const 捲軸位置 = 同分頁重繪 ? 快照捲軸(容器) : null;
  容器.innerHTML = "";
  const 額外 = 應用程式狀態.額外;

  const root = document.createElement("div");
  root.className = "管理介面-root";

  const 頂部 = document.createElement("div");
  頂部.className = "操作頁面-頂部";
  頂部.innerHTML = `
    <span>${雙語("管理介面", "Management")}${state.訓練道場 ? ` (${雙語("訓練道場", "Training Dojo")})` : ""}</span>
    <span class="世界時鐘 ${額外.縮圈警戒 ? "警戒" : ""}">${雙語("世界時鐘", "World Clock")}: ${額外.世界時鐘秒數}s (${雙語("規則 R3：管理介面開啟時不會暫停", "R3: does not pause just because the Management panel is open")})${
    額外.縮圈警戒 ? " ⚠" : ""
  }</span>
  `;
  頂部.appendChild(建立管理音量控制());
  root.appendChild(頂部);

  const 分頁列 = document.createElement("div");
  分頁列.className = "管理介面-分頁列";
  for (const 分頁 of 分頁清單) {
    const btn = document.createElement("button");
    btn.textContent = 分頁標籤[分頁] ?? 分頁;
    btn.classList.toggle("作用中", state.分頁 === 分頁);
    btn.onclick = () => 應用程式狀態.切換管理介面分頁(分頁);
    分頁列.appendChild(btn);
  }
  root.appendChild(分頁列);

  const 內容 = document.createElement("div");
  內容.className = "管理介面-內容";

  switch (state.分頁) {
    case "小隊":
      內容.appendChild(小隊分頁內容());
      break;
    case "背包":
      內容.appendChild(背包分頁內容());
      break;
    case "互動":
      內容.appendChild(互動分頁內容());
      break;
    case "圖鑑":
      內容.appendChild(建立圖鑑瀏覽器("IC"));
      break;
    case "地圖":
      內容.appendChild(地圖分頁內容());
      break;
  }

  root.appendChild(內容);

  const 底部按鈕列 = document.createElement("div");
  底部按鈕列.className = "按鈕列";

  const 返回 = document.createElement("button");
  返回.className = "一級按鈕";
  返回.textContent = 雙語("返回戰場", "Back to Battlefield");
  返回.title = 雙語("規則 R7：只能回操作頁面，不能直接回主畫面", "R7: can only return to the operation page, not straight to the main screen");
  返回.onclick = () => 應用程式狀態.返回戰場();
  底部按鈕列.appendChild(返回);

  if (!state.訓練道場) {
    const 終局 = document.createElement("button");
    終局.className = "危險按鈕";
    終局.textContent = `${雙語("觸發終局事件", "Trigger End-Game Event")} (${雙語("規則 R11：可中斷管理介面並直接進入結算", "R11: can interrupt the Management panel and go straight to Settlement")})`;
    終局.onclick = () => 應用程式狀態.觸發終局事件();
    底部按鈕列.appendChild(終局);
  }

  root.appendChild(底部按鈕列);
  容器.appendChild(root);

  // 重建完成後還原捲動位置（僅同分頁重繪；換頁時 捲軸位置 為 null，維持回到頂端）。
  上次渲染分頁 = state.分頁;
  if (捲軸位置) 還原捲軸(容器, 捲軸位置);
}

function 建立管理音量控制(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.display = "grid";
  wrap.style.gridTemplateColumns = "auto auto minmax(112px, 148px) auto";
  wrap.style.alignItems = "center";
  wrap.style.gap = "8px";
  wrap.style.marginLeft = "auto";
  wrap.style.padding = "8px 12px";
  wrap.style.borderRadius = "999px";
  wrap.style.background = "rgba(255,255,255,0.72)";
  wrap.style.border = "1px solid rgba(44, 58, 91, 0.08)";

  const label = document.createElement("span");
  label.textContent = 雙語("音樂", "Music");
  label.style.fontSize = "0.76rem";
  label.style.fontWeight = "700";
  label.style.color = "#23314f";

  const muteBtn = document.createElement("button");
  muteBtn.className = "二級按鈕";
  muteBtn.style.padding = "6px 10px";
  muteBtn.style.fontSize = "0.72rem";

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0";
  slider.max = "100";
  slider.step = "1";
  slider.style.width = "100%";
  slider.style.accentColor = "#4d8dff";

  const value = document.createElement("span");
  value.style.fontSize = "0.74rem";
  value.style.fontWeight = "700";
  value.style.color = "#5c6a85";
  value.style.minWidth = "42px";
  value.style.textAlign = "right";

  const track = document.createElement("div");
  track.style.gridColumn = "1 / -1";
  track.style.fontSize = "0.7rem";
  track.style.color = "#7080a3";
  track.style.textAlign = "right";

  const scene = document.createElement("div");
  scene.style.gridColumn = "1 / -1";
  scene.style.fontSize = "0.7rem";
  scene.style.color = "#8d93ad";
  scene.style.textAlign = "right";

  const render = () => {
    const state = 取得音樂狀態();
    slider.value = String(Math.round(state.volume * 100));
    muteBtn.textContent = state.muted ? 雙語("取消靜音", "Unmute") : 雙語("靜音", "Mute");
    value.textContent = state.muted ? 雙語("已靜音", "Muted") : `${Math.round(state.volume * 100)}%`;
    track.textContent = `${雙語("目前曲目", "Now Playing")}: ${state.trackLabel}`;
    scene.textContent = `${雙語("目前場景", "Current Scene")}: ${state.sceneLabel}`;
  };

  muteBtn.onclick = () => {
    切換音樂靜音();
    render();
  };
  slider.oninput = () => {
    設定音樂音量(Number(slider.value) / 100);
    render();
  };

  const unsubscribe = 訂閱音樂狀態(render);
  const observer = new MutationObserver(() => {
    if (!document.body.contains(wrap)) {
      unsubscribe();
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  wrap.append(label, muteBtn, slider, value, track, scene);
  render();
  return wrap;
}
