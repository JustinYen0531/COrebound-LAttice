/**
 * @file weaving.ts
 * @description Living Totem 疊加編織模擬器。
 * 支援玩家任選 3 個角色，為其指派 藍/紅/黃 三種職責，並實現「最內圈皆包覆、最大半徑相異」的甜甜圈發散層次。
 */
import { 幾何世界圖騰清單 } from "./資料/幾何世界圖騰";
import { 有機世界圖騰清單 } from "./資料/有機世界圖騰";
import { 分形世界圖騰清單 } from "./資料/分形世界圖騰";
import { 機械世界圖騰清單 } from "./資料/機械世界圖騰";
import type { 圖騰角色資料 } from "./資料/幾何世界圖騰";
import type { 圖騰筆畫, 極座標 } from "./圖騰產生器";

const 畫布中心 = 200;
const 畫布尺寸 = 畫布中心 * 2;
const 內半徑偏移 = 55;
const 最大原始半徑 = 140;

// 合併 20 位成員資料
const 全體成員: 圖騰角色資料[] = [
  ...幾何世界圖騰清單,
  ...有機世界圖騰清單,
  ...分形世界圖騰清單,
  ...機械世界圖騰清單,
];

// 職責配置型別
export type 職責類型 = "藍" | "紅" | "黃";

export interface 編織插槽 {
  角色: 圖騰角色資料;
  職責: 職責類型;
}

// 職責視覺屬性映射
const 職責配置: Record<職責類型, { 顏色: string; 最大半徑: number; 說明: string }> = {
  藍: { 顏色: "#4d8dff", 最大半徑: 140, 說明: "🛡️ 保護位 (發散至最外層)" },
  紅: { 顏色: "#ff4d5e", 最大半徑: 112, 說明: "💥 火力位 (發散至中層)" },
  黃: { 顏色: "#ffd24d", 最大半徑: 85, 說明: "⚡ 補給位 (發散至內層)" },
};

// 狀態管理
let 已選插槽: 編織插槽[] = [];

// ---------------------------------------------------------------------------
// 核心數學：甜甜圈動態半徑裁剪與 remapping
// ---------------------------------------------------------------------------
function 甜甜圈職責轉換(p: 極座標, 職責: 職責類型): 極座標 {
  const cfg = 職責配置[職責];
  // 壓縮比 = (該職責最大半徑 - 內半徑偏移) / 最大原始半徑
  const 壓縮比 = (cfg.最大半徑 - 內半徑偏移) / 最大原始半徑;
  // 將原 0~140 範圍的 r 均勻壓縮並往外推到 內半徑偏移~最大半徑 區間
  const 新半徑 = 內半徑偏移 + p.r * 壓縮比;
  return { r: 新半徑, deg: p.deg };
}

function 極座標轉直角(p: 極座標, 職責: 職責類型) {
  const mapped = 甜甜圈職責轉換(p, 職責);
  const rad = (mapped.deg * Math.PI) / 180;
  return { x: 畫布中心 + mapped.r * Math.sin(rad), y: 畫布中心 - mapped.r * Math.cos(rad) };
}

function 描邊屬性(顏色: string, 粗 = 2, 淡 = false): Record<string, string | number> {
  return {
    stroke: 顏色,
    "stroke-width": 粗,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    fill: "none",
    opacity: 淡 ? 0.45 : 0.9,
    filter: "url(#glow)", // 套用 SVG 發光濾鏡
  };
}

function 建立元素(tag: string, attrs: Record<string, string | number>): SVGElement {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

// 根據角色筆畫與所選職責，生成對應的單個 Slice SVG 群組
function 渲染角色Slice(筆畫清單: 圖騰筆畫[], 職責: 職責類型): SVGElement {
  const g = 建立元素("g", {});
  const cfg = 職責配置[職責];
  const 壓縮比 = (cfg.最大半徑 - 內半徑偏移) / 最大原始半徑;

  for (const 筆畫 of 筆畫清單) {
    switch (筆畫.型) {
      case "線": {
        const a = 極座標轉直角(筆畫.起, 職責);
        const b = 極座標轉直角(筆畫.終, 職責);
        g.appendChild(建立元素("line", {
          x1: a.x, y1: a.y, x2: b.x, y2: b.y,
          ...描邊屬性(cfg.顏色, 筆畫.粗, 筆畫.淡),
        }));
        break;
      }
      case "折線": {
        const pts = 筆畫.點.map((p) => 極座標轉直角(p, 職責));
        const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
        g.appendChild(建立元素("path", {
          d: 筆畫.閉合 ? d + " Z" : d,
          ...描邊屬性(cfg.顏色, 筆畫.粗, 筆畫.淡),
        }));
        break;
      }
      case "圓": {
        const c = 極座標轉直角(筆畫.中心, 職責);
        const 縮放半徑 = 筆畫.半徑 * 壓縮比;
        g.appendChild(建立元素("circle", {
          cx: c.x, cy: c.y, r: 縮放半徑,
          ...(筆畫.填充
            ? { fill: cfg.顏色, stroke: "none", opacity: 筆畫.淡 ? 0.4 : 0.85, filter: "url(#glow)" }
            : 描邊屬性(cfg.顏色, 1.5, 筆畫.淡)),
        }));
        break;
      }
      case "弧": {
        // 弧長本身透過極座標縮放
        const 弧半徑 = 甜甜圈職責轉換({ r: 筆畫.半徑, deg: 0 }, 職責).r;
        const rad起 = (筆畫.起角 * Math.PI) / 180;
        const rad終 = (筆畫.終角 * Math.PI) / 180;
        const 起 = { x: 畫布中心 + 弧半徑 * Math.sin(rad起), y: 畫布中心 - 弧半徑 * Math.cos(rad起) };
        const 終 = { x: 畫布中心 + 弧半徑 * Math.sin(rad終), y: 畫布中心 - 弧半徑 * Math.cos(rad終) };
        const largeArc = Math.abs(筆畫.終角 - 筆畫.起角) > 180 ? 1 : 0;
        const d = `M${起.x.toFixed(2)},${起.y.toFixed(2)} A${弧半徑},${弧半徑} 0 ${largeArc} 1 ${終.x.toFixed(2)},${終.y.toFixed(2)}`;
        g.appendChild(建立元素("path", { d, ...描邊屬性(cfg.顏色, 筆畫.粗, 筆畫.淡) }));
        break;
      }
      case "多邊形": {
        const pts = 筆畫.點.map((p) => {
          const xy = 極座標轉直角(p, 職責);
          return `${xy.x.toFixed(2)},${xy.y.toFixed(2)}`;
        });
        g.appendChild(建立元素("polygon", {
          points: pts.join(" "),
          ...(筆畫.填充
            ? { fill: cfg.顏色, stroke: "none", opacity: 筆畫.淡 ? 0.4 : 0.85, filter: "url(#glow)" }
            : 描邊屬性(cfg.顏色, 1.5, 筆畫.淡)),
        }));
        break;
      }
    }
  }
  return g;
}

// ---------------------------------------------------------------------------
// 建立編織疊加畫布 SVG
// ---------------------------------------------------------------------------
function 建立編織圖騰SVG(容器: HTMLElement) {
  容器.innerHTML = "";
  
  const svg = 建立元素("svg", {
    viewBox: `0 0 ${畫布尺寸} ${畫布尺寸}`,
    width: "100%",
    height: "100%",
  });
  svg.style.background = "#05060b";

  // 1. 注入 SVG 發光濾鏡與漸變定義
  const defs = 建立元素("defs", {});
  const filter = 建立元素("filter", { id: "glow", x: "-20%", y: "-20%", width: "140%", height: "140%" });
  filter.innerHTML = `
    <feGaussianBlur stdDeviation="3" result="blur" />
    <feComponentTransfer in="blur" result="boost">
      <feFuncA type="linear" slope="1.5"/>
    </feComponentTransfer>
    <feMerge>
      <feMergeNode in="boost" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  `;
  defs.appendChild(filter);
  svg.appendChild(defs);

  // 2. 建立裝飾性的外環與中空輔助圓
  const bgG = 建立元素("g", { opacity: 0.15 });
  // 甜甜圈中空洞邊界
  bgG.appendChild(建立元素("circle", { cx: 畫布中心, cy: 畫布中心, r: 內半徑偏移, fill: "none", stroke: "#fff", "stroke-width": 1 }));
  // 各層職責邊界圈
  bgG.appendChild(建立元素("circle", { cx: 畫布中心, cy: 畫布中心, r: 85, fill: "none", stroke: "#ffd24d", "stroke-width": 0.5 }));
  bgG.appendChild(建立元素("circle", { cx: 畫布中心, cy: 畫布中心, r: 112, fill: "none", stroke: "#ff4d5e", "stroke-width": 0.5 }));
  bgG.appendChild(建立元素("circle", { cx: 畫布中心, cy: 畫布中心, r: 140, fill: "none", stroke: "#4d8dff", "stroke-width": 0.5 }));
  svg.appendChild(bgG);

  // 3. 為 3 個插槽分別建立旋轉 group，以達成「差速旋轉」
  已選插槽.forEach((slot, index) => {
    // 取得該角色 3★ 的完全展開筆劃，以便呈現最漂亮的 Emblem
    const 筆畫 = slot.角色.星級筆畫[2];
    
    // 建立 8 重對稱的萬花筒群組
    const rotateG = 建立元素("g", { id: `weaving-layer-${index}` });

    for (let i = 0; i < 8; i++) {
      const 旋轉角 = i * 45;
      const 楔形群組 = 建立元素("g", {
        transform: `rotate(${旋轉角} ${畫布中心} ${畫布中心})`,
      });

      const 原始半 = 渲染角色Slice(筆畫, slot.職責);
      const 鏡射半 = 建立元素("g", {
        transform: `translate(${畫布尺寸} 0) scale(-1 1)`,
      });
      鏡射半.appendChild(渲染角色Slice(筆畫, slot.職責));

      楔形群組.appendChild(原始半);
      楔形群組.appendChild(鏡射半);
      rotateG.appendChild(楔形群組);
    }
    svg.appendChild(rotateG);
  });

  容器.appendChild(svg);
}

// ---------------------------------------------------------------------------
// 差速旋轉 Tick 循環
// ---------------------------------------------------------------------------
let animationFrameId: number | null = null;
let angles = [0, 0, 0];
// 差速自旋速度設定 (黃色最內順時針、紅色中層逆時針、藍色最外順時針)
const speeds = [0.18, -0.12, 0.08]; 

function startRotationLoop() {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);

  function tick() {
    已選插槽.forEach((_, index) => {
      const el = document.getElementById(`weaving-layer-${index}`);
      if (el) {
        angles[index] += speeds[index];
        el.setAttribute("transform", `rotate(${angles[index]} ${畫布中心} ${畫布中心})`);
      }
    });
    animationFrameId = requestAnimationFrame(tick);
  }
  tick();
}

// ---------------------------------------------------------------------------
// UI 佈局與元件渲染
// ---------------------------------------------------------------------------
const style = document.createElement("style");
style.textContent = `
  html, body {
    margin: 0; background: #080a12; color: #fff;
    font-family: "Segoe UI", "Noto Sans TC", system-ui, sans-serif;
  }
  .weaving-root {
    padding: 32px; max-width: 1400px; margin: 0 auto;
    display: grid; grid-template-columns: 1fr 480px; gap: 32px;
  }
  
  /* 左側控制區 */
  .control-panel {
    display: flex; flex-direction: column; gap: 24px;
  }
  .header h1 {
    font-size: 1.8rem; font-weight: 700; color: #ff8a3b; margin: 0 0 8px;
    text-shadow: 0 0 15px rgba(255, 138, 59, 0.15);
  }
  .header p { color: #8f8f9c; font-size: 0.9rem; margin: 0; line-height: 1.4; }
  .header a { color: #ff8a3b; text-decoration: underline; margin-left: 8px; font-weight: bold; }
  
  /* 已選插槽區 */
  .slots-row {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px; padding: 20px;
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
  }
  .slot-card {
    background: rgba(0, 0, 0, 0.4);
    border: 1px dashed rgba(255, 255, 255, 0.1);
    border-radius: 8px; padding: 12px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    min-height: 140px; text-align: center; position: relative;
  }
  .slot-card.active {
    border-style: solid;
  }
  .slot-card.slot-blue { border-color: #4d8dff; box-shadow: 0 0 10px rgba(77,141,255,0.15); }
  .slot-card.slot-red { border-color: #ff4d5e; box-shadow: 0 0 10px rgba(255,77,94,0.15); }
  .slot-card.slot-yellow { border-color: #ffd24d; box-shadow: 0 0 10px rgba(255,210,77,0.15); }
  
  .slot-card .remove-btn {
    position: absolute; top: 6px; right: 8px;
    background: none; border: none; color: #ff4d5e; font-size: 1.1rem; cursor: pointer;
  }
  .slot-name { font-size: 1.05rem; font-weight: bold; margin-bottom: 2px; }
  .slot-code { font-size: 0.78rem; color: #8f8f9c; margin-bottom: 12px; }
  .role-select {
    background: #121424; color: #fff; border: 1px solid rgba(255,255,255,0.15);
    border-radius: 4px; padding: 4px 8px; font-size: 0.8rem; cursor: pointer; width: 100%;
  }

  /* 成員池區 */
  .pool-section {
    display: flex; flex-direction: column; gap: 12px;
  }
  .pool-title { font-size: 1.1rem; font-weight: bold; color: #ff8a3b; }
  .pool-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px;
    max-height: 380px; overflow-y: auto; padding-right: 8px;
  }
  .pool-item {
    background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255,255,255,0.06);
    border-radius: 6px; padding: 10px; cursor: pointer; text-align: center;
    transition: background 0.2s, border-color 0.2s;
  }
  .pool-item:hover {
    background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 138, 59, 0.3);
  }
  .pool-item.selected {
    background: rgba(255, 138, 59, 0.1); border-color: #ff8a3b; cursor: not-allowed; opacity: 0.5;
  }
  .pool-item .p-name { font-weight: bold; font-size: 0.95rem; display: block; }
  .pool-item .p-family { font-size: 0.75rem; color: #4d8dff; display: block; margin-top: 2px; }

  /* 右側畫布展示區 */
  .canvas-panel {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    background: #05060b; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px;
    padding: 32px; box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.6);
  }
  .canvas-container {
    width: 100%; aspect-ratio: 1 / 1; max-width: 400px;
    position: relative;
  }
  .empty-hint {
    color: #8f8f9c; font-size: 0.95rem; text-align: center; line-height: 1.6;
  }
`;
document.head.appendChild(style);

function 渲染頁面() {
  const app = document.getElementById("app");
  if (!app) return;
  app.innerHTML = "";

  const root = document.createElement("div");
  root.className = "weaving-root";

  // --- 左側控制區 ---
  const leftPanel = document.createElement("div");
  leftPanel.className = "control-panel";

  // 標題
  const header = document.createElement("div");
  header.className = "header";
  header.innerHTML = `
    <h1>Living Totem 疊加編織模擬器</h1>
    <p>
      此模擬器展示小隊 3 人圖騰「共同編織」的視覺效果。
      <br/><b>發散規則：</b>藍色發散至最外層(140px)、紅色至中層(112px)、黃色縮至內層(85px)，三者最內層均為 55px 中空包覆。
      <a href="/index.html">返回主畫面</a>
    </p>
  `;
  leftPanel.appendChild(header);

  // 插槽區
  const slotsRow = document.createElement("div");
  slotsRow.className = "slots-row";
  for (let i = 0; i < 3; i++) {
    const card = document.createElement("div");
    const slot = 已選插槽[i];

    if (slot) {
      const cls = slot.職責 === "藍" ? "slot-blue" : slot.職責 === "紅" ? "slot-red" : "slot-yellow";
      card.className = `slot-card active ${cls}`;
      card.innerHTML = `
        <button class="remove-btn">×</button>
        <div class="slot-name">${slot.角色.名稱}</div>
        <div class="slot-code">${slot.角色.代號}</div>
      `;
      // 移除按鈕事件
      card.querySelector(".remove-btn")!.addEventListener("click", () => {
        已選插槽.splice(i, 1);
        更新模擬器();
      });

      // 職責選擇 Select
      const sel = document.createElement("select");
      sel.className = "role-select";
      for (const [k, v] of Object.entries(職責配置)) {
        const opt = document.createElement("option");
        opt.value = k;
        opt.textContent = v.說明;
        opt.selected = slot.職責 === k;
        sel.appendChild(opt);
      }
      sel.addEventListener("change", (e) => {
        slot.職責 = (e.target as HTMLSelectElement).value as 職責類型;
        更新模擬器();
      });
      card.appendChild(sel);
    } else {
      card.className = "slot-card";
      card.innerHTML = `<p style="color: #4f516a; font-size: 0.85rem; margin: 0;">插槽 ${i + 1}<br/>[ 點選下方成員加入 ]</p>`;
    }
    slotsRow.appendChild(card);
  }
  leftPanel.appendChild(slotsRow);

  // 小隊成員池區
  const poolSection = document.createElement("div");
  poolSection.className = "pool-section";
  poolSection.innerHTML = `<div class="pool-title">成員選擇池 (點選加入插槽)</div>`;

  const poolGrid = document.createElement("div");
  poolGrid.className = "pool-grid";
  全體成員.forEach((m) => {
    const item = document.createElement("div");
    const isSelected = 已選插槽.some((s) => s.角色.id === m.id);
    item.className = `pool-item ${isSelected ? "selected" : ""}`;
    item.innerHTML = `
      <span class="p-name">${m.名稱}</span>
      <span class="p-family">${m.家族}</span>
    `;
    if (!isSelected) {
      item.addEventListener("click", () => {
        if (已選插槽.length >= 3) {
          alert("最多隻能同時疊加 3 個角色的圖騰唷！請先移除一個插槽。");
          return;
        }
        // 預設給予剩餘還沒有指派的職責，使三者儘量不重疊
        const 已選職責 = 已選插槽.map(s => s.職責);
        let 預設職責: 職責類型 = "藍";
        if (!已選職責.includes("紅")) 預設職責 = "紅";
        else if (!已選職責.includes("黃")) 預設職責 = "黃";

        已選插槽.push({ 角色: m, 職責: 預設職責 });
        更新模擬器();
      });
    }
    poolGrid.appendChild(item);
  });
  poolSection.appendChild(poolGrid);
  leftPanel.appendChild(poolSection);

  // --- 右側畫布展示區 ---
  const canvasPanel = document.createElement("div");
  canvasPanel.className = "canvas-panel";

  const canvasContainer = document.createElement("div");
  canvasContainer.className = "canvas-container";

  if (已選插槽.length > 0) {
    建立編織圖騰SVG(canvasContainer);
  } else {
    canvasContainer.style.display = "flex";
    canvasContainer.style.alignItems = "center";
    canvasContainer.style.justifyContent = "center";
    canvasContainer.innerHTML = `
      <div class="empty-hint">
        <span style="font-size: 3rem; display: block; margin-bottom: 12px;">🧬</span>
        請在左側點選成員<br/>
        並指派紅/黃/藍色職責，<br/>
        即可在此編織出專屬的疊加 Living Totem！
      </div>
    `;
  }
  canvasPanel.appendChild(canvasContainer);

  root.append(leftPanel, canvasPanel);
  app.appendChild(root);

  // 重啟旋轉 Loop
  if (已選插槽.length > 0) {
    startRotationLoop();
  } else if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

function 更新模擬器() {
  渲染頁面();
}

// 預設為用戶選定三個角色作為初始 Demo，讓他一眼就看到效果
已選插槽 = [
  { 角色: 全體成員[0], 職責: "藍" }, // 稜鏡 (保護)
  { 角色: 全體成員[2], 職責: "紅" }, // 向量 (火力)
  { 角色: 全體成員[3], 職責: "黃" }, // 節點 (補給)
];

// 啟動渲染
渲染頁面();
