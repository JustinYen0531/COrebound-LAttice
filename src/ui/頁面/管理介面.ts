/**
 * @file 管理介面.ts
 * @description IC 覆蓋層，5 個第一層主資料夾。只有「小隊」用大圓盤+立繪構圖，
 * 其餘 4 個資料夾用「左書籤／中內容／右補充」的乾淨資料夾式構圖。
 * 實現背包物品網格瀏覽、戰術 SVG 雷達地圖交互，以及小隊成員食譜升星模擬器。
 */
import { 應用程式狀態, 背包分類清單, 地圖分類清單 } from "../應用程式狀態";
import { 建立小隊圓盤 } from "../元件/小隊圓盤";
import { 建立圖鑑瀏覽器 } from "../元件/圖鑑瀏覽器";
import { 建立互動面板 } from "../元件/互動面板";
import type { 互動設施, 管理介面分頁 } from "../共用型別";
import { 隊長清單 } from "../資料/隊長清單";
import { MEMBERS } from "../../data/成員資料庫";
import { MATERIALS } from "../../data/素材資料庫";
import { FAMILY_LABEL } from "../../data/成員型別";
import { MATERIAL_RARITY_LABEL } from "../../data/戰鬥原語";

const 分頁清單: 管理介面分頁[] = ["小隊", "背包", "互動", "圖鑑", "地圖"];
const 互動設施清單: 互動設施[] = ["合成", "熔爐", "雕像", "商店", "召喚"];

// 模擬背包測試數據
const bagItems = {
  材料: [
    { id: "g01_orbit", name: "幾何軌道晶體", star: 1, count: 8, rarity: "common", info: "產於幾何世界，基礎合成素材", world: "geometry" },
    { id: "g02_vertex:fine", name: "幾何高級頂角石", star: 2, count: 4, rarity: "fine", info: "產於幾何世界，升星必需的高純度石料", world: "geometry" },
    { id: "o07_germ", name: "有機分裂孢子", star: 1, count: 12, rarity: "common", info: "產於有機世界，生命編織基礎材料", world: "organic" },
    { id: "f13_origin", name: "分形起源之葉", star: 1, count: 6, rarity: "common", info: "產於分形世界，無限結構的基石", world: "fractal" },
    { id: "k19_ball", name: "機械合金滾珠", star: 1, count: 9, rarity: "common", info: "產於機械世界，維持轉速的滾珠", world: "mechanical" },
  ],
  消耗品: [
    { id: "hp_s", name: "微型生命藥水", count: 3, effect: "回復 20% 生命值", desc: "野外開箱取得的廉價合成物" },
    { id: "hp_b", name: "重灌型活性液", count: 1, effect: "回復 50% 生命值", desc: "晶格核心的高活性萃取液" },
    { id: "en_s", name: "微量共鳴電池", count: 4, effect: "回復 30% 能量值", desc: "補給位特有的攜帶型電瓶" },
  ],
  任務物: [
    { id: "sigil_geo", name: "幾何核心印記", got: false, desc: "擊敗幾何世界守護者獲得的幾何特徵鎖鑰" },
    { id: "sigil_org", name: "有機核心印記", got: false, desc: "擊敗有機世界守護者獲得的細胞核心鎖鑰" },
    { id: "sigil_fra", name: "分形核心印記", got: false, desc: "擊敗分形世界守護者獲得的自相似分形鎖鑰" },
    { id: "sigil_mec", name: "機械核心印記", got: false, desc: "擊敗機械世界守護者獲得的轉速咬合齒輪鎖鑰" },
  ],
  追蹤中: [
    { id: "track_shard", name: "護盾家族碎片", current: 8, target: 15, source: "熔解幾何特產材料獲取" },
    { id: "track_gem", name: "原石 (用於技能升級)", current: 850, target: 1200, source: "擊殺怪群與流浪商店出售材料" },
  ]
};

// 選中的背包物品
let 選中背包物品: any = null;
// 選中的地圖標記
let 選中地圖標記Id: string = "m_player";

// ============================================================
// 1. 小隊分頁 (右側詳細與升星配方食譜)
// ============================================================
function 小隊分頁內容(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "小隊分頁 專屬構圖";

  const 左 = document.createElement("div");
  左.className = "小隊分頁-left";
  左.style.flex = "1";
  左.style.display = "flex";
  左.style.justifyContent = "center";
  左.style.alignItems = "center";

  const 隊長 = 隊長清單.find((c) => c.id === 應用程式狀態.額外.選中隊長) ?? 隊長清單[0];

  const 詳情區 = document.createElement("div");
  詳情區.className = "小隊分頁-right";
  詳情區.style.width = "400px";
  詳情區.style.background = "rgba(255, 255, 255, 0.02)";
  詳情區.style.border = "1px solid rgba(255,255,255,0.06)";
  詳情區.style.borderRadius = "12px";
  詳情區.style.padding = "20px";
  詳情區.style.display = "flex";
  詳情區.style.flexDirection = "column";
  詳情區.style.gap = "14px";

  const 選中槽位 = 應用程式狀態.額外.選中的小隊成員展示位;

  if (選中槽位 === null) {
    詳情區.innerHTML = `
      <div style="text-align: center; margin: auto; padding: 40px 0; color: #8d93ad;">
        <span style="font-size: 2rem;">🛡️</span>
        <h4 style="margin: 10px 0 6px; color: #ff8a3b;">小隊編制詳情</h4>
        <p style="font-size: 0.82rem; line-height: 1.5;">點選左側圓盤的任一槽位，即可查看該成員的戰鬥定位、屬性星級與升星食譜配方。</p>
      </div>
    `;
  } else {
    // 槽位編號映射到對應成員數據 (槽位 0~8 對應資料庫成員)
    const mIndex = 選中槽位 % MEMBERS.length;
    const m = MEMBERS[mIndex];
    const userRole = 選中槽位 % 3 === 0 ? "保護 (藍色)" : 選中槽位 % 3 === 1 ? "火力 (紅色)" : "補給 (黃色)";
    const roleColor = 選中槽位 % 3 === 0 ? "#4d8dff" : 選中槽位 % 3 === 1 ? "#ff4d5e" : "#ffd24d";

    詳情區.innerHTML = `
      <div>
        <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 10px;">
          <h3 style="margin: 0; color: #fff; display: flex; align-items: center; gap: 8px;">
            <span style="font-family: monospace; color: #ff8a3b;">#${m.no.toString().padStart(2, "0")}</span> ${m.nameZh}
          </h3>
          <span style="font-size: 0.75rem; background: ${roleColor}; color: #000; padding: 2px 8px; border-radius: 4px; font-weight: bold;">
            ${userRole}
          </span>
        </div>
        <div style="font-size: 0.8rem; color: #8d93ad; margin-top: 6px;">
          家族歸屬：<span style="color:#fff;">${FAMILY_LABEL[m.family]}</span> | 
          定位：<span style="color:#fff;">${m.family === "shield" ? "全隊減傷/外環增防" : "穿透攻擊/爆裂火焰"}</span>
        </div>
      </div>

      <!-- 星等預覽區 -->
      <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: 8px; text-align: center;">
        <h4 style="margin: 0 0 8px; font-size: 0.8rem; color: #ff8a3b; text-align: left;">⭐ 戰鬥圖騰 Slice 星級演變</h4>
        <div style="display: flex; align-items: center; justify-content: space-around; margin: 10px 0;">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
            <div style="width: 32px; height: 32px; border-radius: 50%; border: 1.5px solid #ff8a3b; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; color: #ff8a3b;">1★</div>
            <span style="font-size: 0.65rem; color: #8d93ad;">初醒(極簡線條)</span>
          </div>
          <div style="font-size: 1rem; color: #ff8a3b;">➜</div>
          <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
            <div style="width: 32px; height: 32px; border-radius: 50%; border: 1.5px dashed #ffd24d; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; color: #ffd24d;">2★</div>
            <span style="font-size: 0.65rem; color: #8d93ad;">茂盛(次級能量)</span>
          </div>
          <div style="font-size: 1rem; color: #ffd24d;">➜</div>
          <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
            <div style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid #4d8dff; display: flex; align-items: center; justify-content: center; font-size: 0.72rem; color: #4d8dff; font-weight: bold;">3★</div>
            <span style="font-size: 0.65rem; color: #8d93ad;">完全體(幾何圖騰)</span>
          </div>
        </div>
      </div>

      <!-- 升星食譜配方 -->
      <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 12px; border-radius: 8px;">
        <h4 style="margin: 0 0 8px; font-size: 0.8rem; color: #ff8a3b;">🍲 進化食譜材料需求 (2★ ➔ 3★)</h4>
        <div style="display: flex; flex-direction: column; gap: 6px; font-size: 0.78rem;">
          <div style="display: flex; justify-content: space-between;">
            <span>1★ 高級材料 ([幾何高級頂角石])</span>
            <span style="color:#ffd24d;">1 / 1 個 (已滿足)</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>1★ 普通材料 ([幾何軌道晶體])</span>
            <span style="color:#ffd24d;">3 / 3 個 (已滿足)</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>${FAMILY_LABEL[m.family]}碎片</span>
            <span style="color:#ff4d5e;">8 / 15 個 (不足)</span>
          </div>
        </div>
      </div>

      <div style="display: flex; gap: 10px; margin-top: auto;">
        <button class="一級按鈕 升星模擬" style="flex: 1; padding: 8px 0; font-size: 0.8rem;">模擬提升星級 (離線)</button>
      </div>
    </div>
  `;

    詳情區.querySelector(".升星模擬")!.addEventListener("click", () => {
      alert(`[小隊沙盒] 模擬嘗試將 [${m.nameZh}] 升級。正式對局需在「裝備工作台」靠近時，點擊互動分頁消耗真實材料。`);
    });
  }

  左.appendChild(
    建立小隊圓盤({
      隊長名稱: 隊長.名稱,
      隊長代表色: 隊長.代表色,
      可互動: true,
      選中變更: (id) => {
        應用程式狀態.額外.選中的小隊成員展示位 = id;
        應用程式狀態.進入管理介面("小隊");
      },
    })
  );

  wrap.append(左, 詳情區);
  return wrap;
}

// ============================================================
// 2. 背包分頁 (網格骨架與右側物品詳情)
// ============================================================
function 背包分頁內容(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "資料夾式版面";

  const 書籤欄 = document.createElement("div");
  書籤欄.className = "資料夾式版面-書籤欄";
  for (const 名稱 of 背包分類清單) {
    const btn = document.createElement("button");
    btn.textContent = 名稱;
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
  const items = bagItems[activeTab] || [];

  const itemsGrid = document.createElement("div");
  itemsGrid.style.display = "grid";
  itemsGrid.style.gridTemplateColumns = "repeat(auto-fill, minmax(76px, 1fr))";
  itemsGrid.style.gap = "10px";
  itemsGrid.style.marginTop = "12px";

  if (items.length === 0) {
    itemsGrid.innerHTML = `<p class="占位說明" style="grid-column: 1/-1; text-align: center; padding: 40px 0;">此類別中尚無物品。</p>`;
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
      if (activeTab === "材料") badge = "🧬";
      else if (activeTab === "消耗品") badge = "🧪";
      else if (activeTab === "任務物") badge = "🔑";
      else if (activeTab === "追蹤中") badge = "📌";

      cell.innerHTML = `
        <div style="font-size: 1.5rem; margin-bottom: 4px;">${badge}</div>
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

  內容區.innerHTML = `<h3>🎒 背包儲備 / ${activeTab}</h3>`;
  內容區.appendChild(itemsGrid);

  const 補充區 = document.createElement("div");
  補充區.className = "資料夾式版面-補充區";

  if (選中背包物品 === null) {
    補充區.innerHTML = `
      <h4>🔍 物品詳細說明</h4>
      <p style="font-size: 0.8rem; color: #8d93ad; line-height: 1.5;">點選左側格網中的任何物品，即可在此查看材料地緣歸屬、熔煉轉化率或合成配方用途。</p>
    `;
  } else {
    let specDetails = "";
    if (activeTab === "材料") {
      const worldName = {
        geometry: "幾何世界",
        organic: "有機世界",
        fractal: "分形世界",
        mechanical: "機械世界",
        core: "通關道具",
      }[選中背包物品.world as "geometry" | "organic" | "fractal" | "mechanical" | "core"] ?? "幾何世界";
      
      specDetails = `
        <div style="margin-top: 10px; font-size: 0.8rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px; line-height: 1.6;">
          <div>地緣出處：<span style="color:#ffd24d;">${worldName}</span></div>
          <div>星級星等：<span style="color:#ffd24d;">${選中背包物品.star}★</span></div>
          <div style="color: #4d8dff; margin-top: 4px;">熔爐轉化：投入熔爐可轉化為對應家族碎片</div>
        </div>
      `;
    } else if (activeTab === "消耗品") {
      specDetails = `
        <div style="margin-top: 10px; font-size: 0.8rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px;">
          <div style="color: #ffd24d; font-weight: bold;">使用效果：${選中背包物品.effect}</div>
          <button class="三級按鈕" style="width: 100%; margin-top: 12px; font-size: 0.75rem; padding: 4px 0;">在對局中快捷使用</button>
        </div>
      `;
    } else if (activeTab === "追蹤中") {
      specDetails = `
        <div style="margin-top: 10px; font-size: 0.8rem; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px; line-height: 1.5;">
          <div>獲取來源：<span style="color:#4d8dff;">${選中背包物品.source}</span></div>
        </div>
      `;
    }

    補充區.innerHTML = `
      <h4 style="color: #ff8a3b; margin-top: 0;">${選中背包物品.name}</h4>
      <p style="font-size: 0.8rem; line-height: 1.4; color: #fff;">
        ${選中背包物品.info || 選中背包物品.desc || "無說明文件。"}
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
  { id: "m_player", icon: "🌀", label: "玩家小隊 (當前位置)", x: 160, y: 160, zone: "中央廣場", desc: "目前位於交匯的廣場區域，可在此裝配 COLA Boss。" },
  { id: "m_arch", icon: "🛠️", label: "幾何裝備工作台", x: 60, y: 60, zone: "幾何世界", desc: "用於成員合成升星與技能升級，靠近解鎖。" },
  { id: "m_furnace", icon: "🔥", label: "分形家族熔爐", x: 260, y: 70, zone: "分形世界", desc: "投放分形生物材料熔解為 Mine/Laser 碎片，+20% 地緣加成。" },
  { id: "m_statue", icon: "🗿", label: "孢粉初始化雕像", x: 80, y: 250, zone: "有機世界", desc: "解鎖角色「孢粉(0➔1★)」的遠古雕像遺留處。" },
  { id: "m_shop", icon: "🛒", label: "機械流浪商店", x: 240, y: 240, zone: "機械世界", desc: "購買大生命與共鳴電瓶，或將機械合金出售為原石。" },
  { id: "m_altar", icon: "🔱", label: "世界召喚祭壇", x: 160, y: 50, zone: "北方幾何邊疆", desc: "當集滿精英擊殺進度時，可召喚 T3 幾何守護者 Boss。" },
];

function 地圖分頁內容(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "資料夾式版面";

  const 書籤欄 = document.createElement("div");
  書籤欄.className = "資料夾式版面-書籤欄";
  for (const 名稱 of 地圖分類清單) {
    const btn = document.createElement("button");
    btn.textContent = 名稱;
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
    { text: "🧱 幾何世界", x: 30, y: 40 },
    { text: "🔮 分形世界", x: 230, y: 40 },
    { text: "🌿 有機世界", x: 30, y: 290 },
    { text: "⚙️ 機械世界", x: 230, y: 290 },
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

  內容區.innerHTML = `<h3>🛰️ 戰術地圖 / ${應用程式狀態.額外.地圖選中分類}</h3>`;
  內容區.appendChild(mapSvgWrapper);

  const 補充區 = document.createElement("div");
  補充區.className = "資料夾式版面-補充區";

  const selectedMarker = mapMarkers.find((m) => m.id === 選中地圖標記Id) ?? mapMarkers[0];

  補充區.innerHTML = `
    <h4 style="color: #ff8a3b; margin-top: 0; display: flex; align-items: center; gap: 6px;">
      <span>${selectedMarker.icon}</span> ${selectedMarker.label}
    </h4>
    <div style="font-size: 0.8rem; color: #8d93ad; margin-bottom: 10px;">
      所屬區域：<span style="color:#fff;">${selectedMarker.zone}</span><br/>
      座標：<span style="color:#fff; font-family: monospace;">X: ${selectedMarker.x}, Y: ${320 - selectedMarker.y}</span>
    </div>
    <p style="font-size: 0.82rem; line-height: 1.5; color: #fff; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px;">
      ${selectedMarker.desc}
    </p>

    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 10px; border-radius: 6px; font-size: 0.75rem; color: #8d93ad; margin-top: auto;">
      💡 提示：點擊左側雷達圖上的標記，可以直接快速定位並查看詳細說明。
    </div>
  `;

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
    btn.textContent = 設施;
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
    <h4 style="margin-top: 0; color: #ff8a3b;">互動子分頁鎖定規則 (R5)</h4>
    <p style="font-size: 0.8rem; line-height: 1.5; color: #8d93ad;">每個子分頁各自依「玩家是否正靠近對應設施」獨立判定，互不連動。</p>
    
    <div style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 6px; font-size: 0.8rem; line-height: 1.6; margin-top: 10px;">
      <div>目前靠近：<b style="color: #ffd24d;">${應用程式狀態.額外.靠近的互動設施 ?? "（無）"}</b></div>
      <div>選中設施：<b style="color: #fff;">${選中設施}</b></div>
      <div style="margin-top: 4px;">狀態：${啟用中 
        ? "<span style='color: #4d8dff; font-weight: bold;'>✅ 已連接啟用 (現場操作)</span>" 
        : "<span style='color: #d8b46a; font-weight: bold;'>⚠️ 離線模擬 (沙盒操作)</span>"
      }</div>
    </div>
    
    <p class="占位說明" style="margin-top: 12px; font-size: 0.76rem;">提示：回到操作頁面利用 WASD 移動靠近對應設施，即可進入完全在線的操作模式。</p>
  `;

  wrap.append(書籤欄, 內容區, 補充區);
  return wrap;
}

export function 渲染管理介面(容器: HTMLElement) {
  容器.innerHTML = "";
  const state = 應用程式狀態.畫面;
  if (state.層 !== "管理介面") return;
  const 額外 = 應用程式狀態.額外;

  const root = document.createElement("div");
  root.className = "管理介面-root";

  const 頂部 = document.createElement("div");
  頂部.className = "操作頁面-頂部";
  頂部.innerHTML = `
    <span>管理介面 ${state.訓練道場 ? "（訓練道場）" : ""}</span>
    <span class="世界時鐘 ${額外.縮圈警戒 ? "警戒" : ""}">世界時鐘：${額外.世界時鐘秒數}s (R3：不因開啟管理介面而暫停)${
    額外.縮圈警戒 ? " ⚠" : ""
  }</span>
  `;
  root.appendChild(頂部);

  const 分頁列 = document.createElement("div");
  分頁列.className = "管理介面-分頁列";
  for (const 分頁 of 分頁清單) {
    const btn = document.createElement("button");
    btn.textContent = 分頁;
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
  返回.textContent = "返回戰場";
  返回.title = "R7：只能回操作頁面，不能直接回主畫面";
  返回.onclick = () => 應用程式狀態.返回戰場();
  底部按鈕列.appendChild(返回);

  if (!state.訓練道場) {
    const 終局 = document.createElement("button");
    終局.className = "危險按鈕";
    終局.textContent = "觸發終局事件 (R11：可打斷管理介面直接進結算頁)";
    終局.onclick = () => 應用程式狀態.觸發終局事件();
    底部按鈕列.appendChild(終局);
  }

  root.appendChild(底部按鈕列);
  容器.appendChild(root);
}
