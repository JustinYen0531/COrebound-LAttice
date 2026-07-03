/**
 * @file weaving.ts
 * @description Living Totem 9層疊加編織模擬器 (3 大環 × 3 職責)。
 * 支援玩家在 內、中、外 圈各配置 3 名成員，共 9 人共同編織，實作差速互旋與精細半徑發散剪裁。
 * 新增最中央核心層級 (0~55px) 的隊長圖騰配置，支援四大主角 1★~4★ 星級演化，以白線俐落自轉呈現。
 */
import { 幾何世界圖騰清單 } from "./資料/幾何世界圖騰";
import { 有機世界圖騰清單 } from "./資料/有機世界圖騰";
import { 分形世界圖騰清單 } from "./資料/分形世界圖騰";
import { 機械世界圖騰清單 } from "./資料/機械世界圖騰";
import { 建立單個角色圖徽 } from "./資料/角色識別圖徽";
import { 隊長圖騰清單 } from "./資料/隊長圖騰";
import type { 圖騰角色資料 } from "./資料/幾何世界圖騰";
import type { 隊長圖騰資料 } from "./資料/隊長圖騰";
import type { 圖騰筆畫, 極座標 } from "./圖騰產生器";

const 畫布中心 = 320; // 放大畫布以容納最外層 300px 半徑
const 畫布尺寸 = 畫布中心 * 2;
const 作畫最大基準 = 115;

export type 大環類型 = "內" | "中" | "外";
export type 職責類型 = "藍" | "紅" | "黃";

export interface 編織插槽 {
  角色: 圖騰角色資料;
  大環: 大環類型;
  職責: 職責類型;
  等級: number;
}

// 9層系統半徑配置
const 大環配置: Record<大環類型, { 起點: number; 黃終點: number; 紅終點: number; 藍終點: number; 名稱: string }> = {
  內: { 起點: 55, 黃終點: 98, 紅終點: 120, 藍終點: 140, 名稱: "🛡️ 內環組 (r: 55~140)" },
  中: { 起點: 135, 黃終點: 175, 紅終點: 200, 藍終點: 220, 名稱: "⚔️ 中環組 (r: 135~220)" },
  外: { 起點: 215, 黃終點: 250, 紅終點: 278, 藍終點: 300, 名稱: "🔮 外環組 (r: 215~300)" },
};

const 職責配置 = {
  藍: { 顏色: "#4d8dff", 說明: "保護 (發散至大環最外層)" },
  紅: { 顏色: "#ff4d5e", 說明: "火力 (發散至大環中層)" },
  黃: { 顏色: "#ffd24d", 說明: "補給 (發散至大環內層)" },
};

// 狀態管理
let 已選插槽: 編織插槽[] = [];
let 已選隊長: 隊長圖騰資料 = 隊長圖騰清單[0]; // 預設 Architect 構築者
let 隊長等級: number = 4; // 預設 4 等級 (1★ ~ 4★)

const 全體成員: 圖騰角色資料[] = [
  ...幾何世界圖騰清單,
  ...有機世界圖騰清單,
  ...分形世界圖騰清單,
  ...機械世界圖騰清單,
];

// ---------------------------------------------------------------------------
// 9層幾何變換與直角轉換數學模型
// ---------------------------------------------------------------------------
function 九層座標轉換(p: 極座標, 大環: 大環類型, 職責: 職責類型): 極座標 {
  const cfg = 大環配置[大環];
  let 終點 = cfg.藍終點;
  if (職責 === "黃") 終點 = cfg.黃終點;
  else if (職責 === "紅") 終點 = cfg.紅終點;

  const 壓縮比 = (終點 - cfg.起點) / 作畫最大基準;
  const 新半徑 = cfg.起點 + p.r * 壓縮比;
  return { r: 新半徑, deg: p.deg };
}

function 極座標轉直角(p: 極座標, 大環: 大環類型, 職責: 職責類型) {
  const mapped = 九層座標轉換(p, 大環, 職責);
  const rad = (mapped.deg * Math.PI) / 180;
  return { x: 畫布中心 + mapped.r * Math.sin(rad), y: 畫布中心 - mapped.r * Math.cos(rad) };
}

function 描邊屬性(顏色: string, 粗 = 2, 淡 = false, 加光影 = true): Record<string, string | number> {
  return {
    stroke: 顏色,
    "stroke-width": 粗,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    fill: "none",
    opacity: 淡 ? 0.45 : 0.85,
    ...(加光影 ? { filter: "url(#glow)" } : {}),
  };
}

function 建立元素(tag: string, attrs: Record<string, string | number>): SVGElement {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

// 渲染角色 Slice (萬花筒線條)
function 渲染角色Slice(筆畫清單: 圖騰筆畫[], 大環: 大環類型, 職責: 職責類型): SVGElement {
  const g = 建立元素("g", {});
  const cfg = 大環配置[大環];
  const 顏色 = 職責配置[職責].顏色;
  
  let 終點 = cfg.藍終點;
  if (職責 === "黃") 終點 = cfg.黃終點;
  else if (職責 === "紅") 終點 = cfg.紅終點;
  const 壓縮比 = (終點 - cfg.起點) / 作畫最大基準;

  for (const 筆畫 of 筆畫清單) {
    switch (筆畫.型) {
      case "線": {
        const a = 極座標轉直角(筆畫.起, 大環, 職責);
        const b = 極座標轉直角(筆畫.終, 大環, 職責);
        g.appendChild(建立元素("line", {
          x1: a.x, y1: a.y, x2: b.x, y2: b.y,
          ...描邊屬性(顏色, 筆畫.粗, 筆畫.淡),
        }));
        break;
      }
      case "折線": {
        const pts = 筆畫.點.map((p) => 極座標轉直角(p, 大環, 職責));
        const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
        g.appendChild(建立元素("path", {
          d: 筆畫.閉合 ? d + " Z" : d,
          ...描邊屬性(顏色, 筆畫.粗, 筆畫.淡),
        }));
        break;
      }
      case "圓": {
        const c = 極座標轉直角(筆畫.中心, 大環, 職責);
        const 縮放半徑 = 筆畫.半徑 * 壓縮比;
        g.appendChild(建立元素("circle", {
          cx: c.x, cy: c.y, r: 縮放半徑,
          ...(筆畫.填充
            ? { fill: 顏色, stroke: "none", opacity: 筆畫.淡 ? 0.4 : 0.8, filter: "url(#glow)" }
            : 描邊屬性(顏色, 1.5, 筆畫.淡)),
        }));
        break;
      }
      case "弧": {
        const 弧半徑 = 九層座標轉換({ r: 筆畫.半徑, deg: 0 }, 大環, 職責).r;
        const rad起 = (筆畫.起角 * Math.PI) / 180;
        const rad終 = (筆畫.終角 * Math.PI) / 180;
        const 起 = { x: 畫布中心 + 弧半徑 * Math.sin(rad起), y: 畫布中心 - 弧半徑 * Math.cos(rad起) };
        const 終 = { x: 畫布中心 + 弧半徑 * Math.sin(rad終), y: 畫布中心 - 弧半徑 * Math.cos(rad終) };
        const largeArc = Math.abs(筆畫.終角 - 筆畫.起角) > 180 ? 1 : 0;
        const d = `M${起.x.toFixed(2)},${起.y.toFixed(2)} A${弧半徑},${弧半徑} 0 ${largeArc} 1 ${終.x.toFixed(2)},${終.y.toFixed(2)}`;
        g.appendChild(建立元素("path", { d, ...描邊屬性(顏色, 筆畫.粗, 筆畫.淡) }));
        break;
      }
      case "多邊形": {
        const pts = 筆畫.點.map((p) => {
          const xy = 極座標轉直角(p, 大環, 職責);
          return `${xy.x.toFixed(2)},${xy.y.toFixed(2)}`;
        });
        g.appendChild(建立元素("polygon", {
          points: pts.join(" "),
          ...(筆畫.填充
            ? { fill: 顏色, stroke: "none", opacity: 筆畫.淡 ? 0.4 : 0.8, filter: "url(#glow)" }
            : 描邊屬性(顏色, 1.5, 筆畫.淡)),
        }));
        break;
      }
    }
  }
  return g;
}

// ---------------------------------------------------------------------------
// 渲染中央核心隊長圖騰 (不進行 8 重萬花筒，直接呈現白描原始肖像圖騰)
// ---------------------------------------------------------------------------
function 渲染隊長圖騰(筆畫清單: 圖騰筆畫[], 顏色 = "#ffffff"): SVGElement {
  const g = 建立元素("g", {});

  const 轉直角 = (p: 極座標) => {
    const rad = (p.deg * Math.PI) / 180;
    return {
      x: 畫布中心 + p.r * Math.sin(rad),
      y: 畫布中心 - p.r * Math.cos(rad),
    };
  };

  for (const 筆畫 of 筆畫清單) {
    switch (筆畫.型) {
      case "線": {
        const a = 轉直角(筆畫.起);
        const b = 轉直角(筆畫.終);
        // 去除發光光暈，確保純白線條無比清晰乾淨
        g.appendChild(建立元素("line", {
          x1: a.x, y1: a.y, x2: b.x, y2: b.y,
          ...描邊屬性(顏色, 筆畫.粗, 筆畫.淡, false),
        }));
        break;
      }
      case "折線": {
        const pts = 筆畫.點.map(轉直角);
        const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
        g.appendChild(建立元素("path", {
          d: 筆畫.閉合 ? d + " Z" : d,
          ...描邊屬性(顏色, 筆畫.粗, 筆畫.淡, false),
        }));
        break;
      }
      case "圓": {
        const c = 轉直角(筆畫.中心);
        g.appendChild(建立元素("circle", {
          cx: c.x, cy: c.y, r: 筆畫.半徑,
          ...(筆畫.填充
            ? { fill: 顏色, stroke: "none", opacity: 筆畫.淡 ? 0.5 : 0.95 }
            : 描邊屬性(顏色, 1.5, 筆畫.淡, false)),
        }));
        break;
      }
      case "弧": {
        const rad起 = (筆畫.起角 * Math.PI) / 180;
        const rad終 = (筆畫.終角 * Math.PI) / 180;
        const 起 = { x: 畫布中心 + 筆畫.半徑 * Math.sin(rad起), y: 畫布中心 - 筆畫.半徑 * Math.cos(rad起) };
        const 終 = { x: 畫布中心 + 筆畫.半徑 * Math.sin(rad終), y: 畫布中心 - 筆畫.半徑 * Math.cos(rad終) };
        const largeArc = Math.abs(筆畫.終角 - 筆畫.起角) > 180 ? 1 : 0;
        const d = `M${起.x.toFixed(2)},${起.y.toFixed(2)} A${筆畫.半徑},${筆畫.半徑} 0 ${largeArc} 1 ${終.x.toFixed(2)},${終.y.toFixed(2)}`;
        g.appendChild(建立元素("path", { d, ...描邊屬性(顏色, 筆畫.粗, 筆畫.淡, false) }));
        break;
      }
      case "多邊形": {
        const pts = 筆畫.點.map((p) => {
          const xy = 轉直角(p);
          return `${xy.x.toFixed(2)},${xy.y.toFixed(2)}`;
        });
        g.appendChild(建立元素("polygon", {
          points: pts.join(" "),
          ...(筆畫.填充
            ? { fill: 顏色, stroke: "none", opacity: 筆畫.淡 ? 0.5 : 0.95 }
            : 描邊屬性(顏色, 1.5, 筆畫.淡, false)),
        }));
        break;
      }
    }
  }
  return g;
}

// ---------------------------------------------------------------------------
// 建立編織 SVG 畫布
// ---------------------------------------------------------------------------
function 建立編織圖騰SVG(容器: HTMLElement) {
  容器.innerHTML = "";

  const svg = 建立元素("svg", {
    viewBox: `0 0 ${畫布尺寸} ${畫布尺寸}`,
    width: "100%",
    height: "100%",
  });
  svg.style.background = "#05060b";

  // 濾鏡與定義
  const defs = 建立元素("defs", {});
  const filter = 建立元素("filter", { id: "glow", x: "-20%", y: "-20%", width: "140%", height: "140%" });
  filter.innerHTML = `
    <feGaussianBlur stdDeviation="3.5" result="blur" />
    <feComponentTransfer in="blur" result="boost">
      <feFuncA type="linear" slope="1.8"/>
    </feComponentTransfer>
    <feMerge>
      <feMergeNode in="boost" />
      <feMergeNode in="SourceGraphic" />
    </feMerge>
  `;
  defs.appendChild(filter);
  svg.appendChild(defs);

  // 1. 靜態背景圈與不會自轉的虛線圈
  const bgG = 建立元素("g", { opacity: 0.22 });
  // 最中央的核心邊界 (55px)
  bgG.appendChild(建立元素("circle", { cx: 畫布中心, cy: 畫布中心, r: 55, fill: "none", stroke: "#ffffff", "stroke-width": 1.5 }));
  // 三大環靜態虛線邊界
  bgG.appendChild(建立元素("circle", { cx: 畫布中心, cy: 畫布中心, r: 140, fill: "none", stroke: "#ffffff", "stroke-width": 1.2, "stroke-dasharray": "6,6" }));
  bgG.appendChild(建立元素("circle", { cx: 畫布中心, cy: 畫布中心, r: 220, fill: "none", stroke: "#ffffff", "stroke-width": 1.2, "stroke-dasharray": "6,6" }));
  bgG.appendChild(建立元素("circle", { cx: 畫布中心, cy: 畫布中心, r: 300, fill: "none", stroke: "#ffffff", "stroke-width": 1.2, "stroke-dasharray": "6,6" }));
  svg.appendChild(bgG);

  // 2. 渲染中央核心隊長圖騰 (獨立自轉群組，0~55px 範圍)
  const 隊長筆畫 = 已選隊長.星級筆畫[隊長等級 - 1];
  const 隊長群組 = 建立元素("g", { id: "weaving-ring-隊長" });
  隊長群組.appendChild(渲染隊長圖騰(隊長筆畫, "#ffffff"));
  svg.appendChild(隊長群組);

  // 3. 建立 內、中、外 3 個旋轉大環組
  const 大環類型列表: 大環類型[] = ["內", "中", "外"];
  大環類型列表.forEach((環key) => {
    const 環群組 = 建立元素("g", { id: `weaving-ring-${環key}` });
    const 該大環插槽 = 已選插槽.filter((s) => s.大環 === 環key);
    
    // A. 8 重鏡射萬花筒
    該大環插槽.forEach((slot) => {
      const 筆畫 = slot.角色.星級筆畫[slot.等級 - 1];
      for (let i = 0; i < 8; i++) {
        const 旋轉角 = i * 45;
        const 楔形群組 = 建立元素("g", {
          transform: `rotate(${旋轉角} ${畫布中心} ${畫布中心})`,
        });

        const 原始半 = 渲染角色Slice(筆畫, slot.大環, slot.職責);
        const 鏡射半 = 建立元素("g", {
          transform: `translate(${畫布尺寸} 0) scale(-1 1)`,
        });
        鏡射半.appendChild(渲染角色Slice(筆畫, slot.大環, slot.職責));

        楔形群組.appendChild(原始半);
        楔形群組.appendChild(鏡射半);
        環群組.appendChild(楔形群組);
      }
    });

    // B. 三方向 (0°, 120°, 240°) 角色專屬徽章
    該大環插槽.forEach((slot, idx) => {
      const emblemCenterG = 建立元素("g", {
        transform: `translate(${畫布中心}, ${畫布中心})`
      });

      const cfg = 大環配置[slot.大環];
      let 終點 = cfg.藍終點;
      if (slot.職責 === "黃") 終點 = cfg.黃終點;
      else if (slot.職責 === "紅") 終點 = cfg.紅終點;
      
      const 圖徽半徑 = cfg.起點 + (終點 - cfg.起點) * 0.84;
      const 角度 = idx * 120;
      const 顏色 = 職責配置[slot.職責].顏色;

      const glyphEl = 建立單個角色圖徽(slot.角色.id, slot.等級, 圖徽半徑, 顏色, 角度);
      emblemCenterG.appendChild(glyphEl);
      環群組.appendChild(emblemCenterG);
    });

    svg.appendChild(環群組);
  });

  容器.appendChild(svg);
}

// ---------------------------------------------------------------------------
// 差速自旋 Loop (含中央隊長沉穩自轉)
// ---------------------------------------------------------------------------
let animationFrameId: number | null = null;
let ringAngles = { 內: 0, 中: 0, 外: 0, 隊長: 0 };
const ringSpeeds = { 
  內: 0.16,
  中: -0.10,
  外: 0.05,
  隊長: 0.03 // 沉穩徐緩的隊長自轉角速度
}; 

function startRotationLoop() {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);

  function tick() {
    // 隊長自轉
    const el隊長 = document.getElementById("weaving-ring-隊長");
    if (el隊長) {
      ringAngles.隊長 += ringSpeeds.隊長;
      el隊長.setAttribute("transform", `rotate(${ringAngles.隊長} ${畫布中心} ${畫布中心})`);
    }

    // 三大環自轉
    const 大環類型列表: 大環類型[] = ["內", "中", "外"];
    大環類型列表.forEach((環key) => {
      const el = document.getElementById(`weaving-ring-${環key}`);
      if (el) {
        ringAngles[環key] += ringSpeeds[環key];
        el.setAttribute("transform", `rotate(${ringAngles[環key]} ${畫布中心} ${畫布中心})`);
      }
    });
    animationFrameId = requestAnimationFrame(tick);
  }
  tick();
}

// ---------------------------------------------------------------------------
// UI 介面更新與事件
// ---------------------------------------------------------------------------
const style = document.createElement("style");
style.textContent = `
  html, body {
    margin: 0; background: #080a12; color: #fff;
    font-family: "Segoe UI", "Noto Sans TC", system-ui, sans-serif;
  }
  .weaving-root {
    padding: 32px; max-width: 1500px; margin: 0 auto;
    display: grid; grid-template-columns: 1fr 540px; gap: 32px;
  }
  
  /* 左側控制面板 */
  .control-panel {
    display: flex; flex-direction: column; gap: 20px;
  }
  .header h1 {
    font-size: 1.8rem; font-weight: 700; color: #ff8a3b; margin: 0 0 8px;
    text-shadow: 0 0 15px rgba(255, 138, 59, 0.15);
  }
  .header p { color: #8f8f9c; font-size: 0.9rem; margin: 0; line-height: 1.4; }
  .header a { color: #ff8a3b; text-decoration: underline; margin-left: 8px; font-weight: bold; }

  /* 隊長配置卡片 */
  .captain-box {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 138, 59, 0.25);
    border-radius: 10px; padding: 14px;
    box-shadow: 0 0 12px rgba(255, 138, 59, 0.08);
  }
  .captain-title {
    font-size: 0.95rem; font-weight: bold; color: #ff8a3b; margin-bottom: 10px;
    display: flex; align-items: center; gap: 6px;
  }
  .captain-controls {
    display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
  }

  /* 9層小隊插槽配置 */
  .rings-container {
    display: flex; flex-direction: column; gap: 16px;
  }
  .ring-group-box {
    background: rgba(255, 255, 255, 0.01);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 10px; padding: 14px;
  }
  .ring-group-title {
    font-size: 0.95rem; font-weight: bold; color: #ff8a3b; margin-bottom: 10px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .ring-group-slots {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
  }
  .slot-card {
    background: rgba(0, 0, 0, 0.5);
    border: 1px dashed rgba(255, 255, 255, 0.08);
    border-radius: 6px; padding: 10px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    min-height: 125px; text-align: center; position: relative;
  }
  .slot-card.active { border-style: solid; }
  .slot-card.slot-blue { border-color: #4d8dff; box-shadow: 0 0 8px rgba(77,141,255,0.12); }
  .slot-card.slot-red { border-color: #ff4d5e; box-shadow: 0 0 8px rgba(255,77,94,0.12); }
  .slot-card.slot-yellow { border-color: #ffd24d; box-shadow: 0 0 8px rgba(255,210,77,0.12); }
  
  .slot-card .remove-btn {
    position: absolute; top: 4px; right: 6px;
    background: none; border: none; color: #ff4d5e; font-size: 1rem; cursor: pointer;
  }
  .slot-name { font-size: 0.95rem; font-weight: bold; margin-bottom: 2px; }
  .slot-code { font-size: 0.72rem; color: #8f8f9c; margin-bottom: 6px; }
  .role-select {
    background: #121424; color: #fff; border: 1px solid rgba(255,255,255,0.15);
    border-radius: 4px; padding: 3px 6px; font-size: 0.75rem; cursor: pointer; width: 100%;
  }

  /* 成員選擇池 */
  .pool-section {
    display: flex; flex-direction: column; gap: 8px;
  }
  .pool-title { font-size: 1rem; font-weight: bold; color: #ff8a3b; }
  .pool-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px;
    max-height: 160px; overflow-y: auto; padding-right: 6px;
  }
  .pool-item {
    background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255,255,255,0.05);
    border-radius: 6px; padding: 8px; cursor: pointer; text-align: center;
    transition: background 0.15s, border-color 0.15s;
  }
  .pool-item:hover {
    background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 138, 59, 0.3);
  }
  .pool-item.selected {
    background: rgba(255, 138, 59, 0.08); border-color: #ff8a3b; cursor: not-allowed; opacity: 0.4;
  }
  .pool-item .p-name { font-weight: bold; font-size: 0.88rem; display: block; }
  .pool-item .p-family { font-size: 0.72rem; color: #4d8dff; display: block; }

  /* 右側畫布面板 */
  .canvas-panel {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    background: #05060b; border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 16px;
    padding: 24px; box-shadow: inset 0 0 50px rgba(0, 0, 0, 0.7);
  }
  .canvas-container {
    width: 100%; aspect-ratio: 1 / 1; max-width: 500px;
    position: relative;
  }
  .empty-hint {
    color: #8f8f9c; font-size: 0.9rem; text-align: center; line-height: 1.5;
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
    <h1>Living Totem 9層疊加編織模擬器</h1>
    <p>
      <b>3×3 陣列識別系統</b>：外圈成員以 120° 差速旋轉並顯示職責徽章；<b>圓心為專屬隊長核心圖騰</b>（1★~4★），白線俐落自轉，展現戰術核心！
      <a href="/index.html">返回主畫面</a>
    </p>
  `;
  leftPanel.appendChild(header);

  // 👑 中央隊長配置
  const capBox = document.createElement("div");
  capBox.className = "captain-box";
  
  const capTitle = document.createElement("div");
  capTitle.className = "captain-title";
  capTitle.innerHTML = `<span>👑 中央核心隊長配置 (0~55px 圓心)</span>`;
  capBox.appendChild(capTitle);

  const capControls = document.createElement("div");
  capControls.className = "captain-controls";

  // 隊長選擇 Select
  const capSel = document.createElement("select");
  capSel.className = "role-select";
  隊長圖騰清單.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = `隊長：${c.名稱} (${c.代號})`;
    opt.selected = 已選隊長.id === c.id;
    capSel.appendChild(opt);
  });
  capSel.addEventListener("change", (e) => {
    const targetId = (e.target as HTMLSelectElement).value;
    const found = 隊長圖騰清單.find((c) => c.id === targetId);
    if (found) 已選隊長 = found;
    更新模擬器();
  });
  capControls.appendChild(capSel);

  // 隊長星級 Select
  const capLvlSel = document.createElement("select");
  capLvlSel.className = "role-select";
  for (let lv = 1; lv <= 4; lv++) {
    const opt = document.createElement("option");
    opt.value = String(lv);
    opt.textContent = `★`.repeat(lv) + ` 等級圖騰`;
    opt.selected = 隊長等級 === lv;
    capLvlSel.appendChild(opt);
  }
  capLvlSel.addEventListener("change", (e) => {
    隊長等級 = Number((e.target as HTMLSelectElement).value);
    更新模擬器();
  });
  capControls.appendChild(capLvlSel);

  capBox.appendChild(capControls);
  leftPanel.appendChild(capBox);

  // 9層插槽分組
  const ringsContainer = document.createElement("div");
  ringsContainer.className = "rings-container";

  const 大環種類: 大環類型[] = ["內", "中", "外"];
  大環種類.forEach((環key) => {
    const box = document.createElement("div");
    box.className = "ring-group-box";

    const title = document.createElement("div");
    title.className = "ring-group-title";
    title.innerHTML = `<span>${大環配置[環key].名稱}</span> <span style="font-size: 0.75rem; color:#8f8f9c;">可配置 3 名成員</span>`;
    box.appendChild(title);

    const slotsGrid = document.createElement("div");
    slotsGrid.className = "ring-group-slots";

    const 該環插槽 = 已選插槽.filter((s) => s.大環 === 環key);
    for (let slotIndex = 0; slotIndex < 3; slotIndex++) {
      const card = document.createElement("div");
      const slot = 該環插槽[slotIndex];

      if (slot) {
        const cls = slot.職責 === "藍" ? "slot-blue" : slot.職責 === "紅" ? "slot-red" : "slot-yellow";
        card.className = `slot-card active ${cls}`;
        card.innerHTML = `
          <button class="remove-btn">×</button>
          <div class="slot-name">${slot.角色.名稱}</div>
          <div class="slot-code">${slot.角色.代號}</div>
        `;
        
        card.querySelector(".remove-btn")!.addEventListener("click", () => {
          const targetIdx = 已選插槽.findIndex((s) => s.角色.id === slot.角色.id);
          if (targetIdx !== -1) 已選插槽.splice(targetIdx, 1);
          更新模擬器();
        });

        // 職責 Select
        const sel = document.createElement("select");
        sel.className = "role-select";
        for (const [k, v] of Object.entries(職責配置)) {
          const opt = document.createElement("option");
          opt.value = k;
          opt.textContent = k === "黃" ? "⚡ 黃 (補給位)" : k === "紅" ? "💥 紅 (火力位)" : "🛡️ 藍 (保護位)";
          opt.selected = slot.職責 === k;
          sel.appendChild(opt);
        }
        sel.addEventListener("change", (e) => {
          slot.職責 = (e.target as HTMLSelectElement).value as 職責類型;
          更新模擬器();
        });
        card.appendChild(sel);

        // 星等 Select
        const lvlSel = document.createElement("select");
        lvlSel.className = "role-select";
        lvlSel.style.marginTop = "4px";
        for (let lv = 1; lv <= 3; lv++) {
          const opt = document.createElement("option");
          opt.value = String(lv);
          opt.textContent = `★`.repeat(lv) + ` 星級圖徽`;
          opt.selected = slot.等級 === lv;
          lvlSel.appendChild(opt);
        }
        lvlSel.addEventListener("change", (e) => {
          slot.等級 = Number((e.target as HTMLSelectElement).value);
          更新模擬器();
        });
        card.appendChild(lvlSel);

      } else {
        card.className = "slot-card";
        card.innerHTML = `<p style="color: #4f516a; font-size: 0.75rem; margin: 0;">空插槽<br/>[點選下方加入]</p>`;
      }
      slotsGrid.appendChild(card);
    }
    box.appendChild(slotsGrid);
    ringsContainer.appendChild(box);
  });
  leftPanel.appendChild(ringsContainer);

  // 成員選擇池
  const poolSection = document.createElement("div");
  poolSection.className = "pool-section";
  poolSection.innerHTML = `<div class="pool-title">成員選擇池 (點選加入對應大環)</div>`;

  const selectorRow = document.createElement("div");
  selectorRow.style.display = "flex";
  selectorRow.style.gap = "8px";
  selectorRow.style.marginBottom = "8px";

  let 當前指派環: 大環類型 = "內";
  const 內Btn = document.createElement("button");
  const 中Btn = document.createElement("button");
  const 外Btn = document.createElement("button");

  const updateButtons = () => {
    [內Btn, 中Btn, 外Btn].forEach(b => {
      b.style.flex = "1";
      b.style.padding = "6px";
      b.style.border = "1px solid rgba(255,255,255,0.15)";
      b.style.background = "#121424";
      b.style.color = "#8f8f9c";
      b.style.cursor = "pointer";
      b.style.borderRadius = "4px";
      b.style.fontSize = "0.8rem";
    });
    const activeBtn = 當前指派環 === "內" ? 內Btn : 當前指派環 === "中" ? 中Btn : 外Btn;
    activeBtn.style.background = "#ff8a3b";
    activeBtn.style.color = "#000";
    activeBtn.style.borderColor = "#ff8a3b";
    activeBtn.style.fontWeight = "bold";
  };

  內Btn.textContent = "加入至：內環組"; 內Btn.onclick = () => { 當前指派環 = "內"; updateButtons(); };
  中Btn.textContent = "加入至：中環組"; 中Btn.onclick = () => { 當前指派環 = "中"; updateButtons(); };
  外Btn.textContent = "加入至：外環組"; 外Btn.onclick = () => { 當前指派環 = "外"; updateButtons(); };
  updateButtons();
  
  selectorRow.append(內Btn, 中Btn, 外Btn);
  poolSection.appendChild(selectorRow);

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
        const 該環已選數量 = 已選插槽.filter((s) => s.大環 === 當前指派環).length;
        if (該環已選數量 >= 3) {
          alert(`這個大環層（${當前指派環}環）已經排滿 3 人囉！請切換到其他環層，或移除現有成員。`);
          return;
        }

        const 該環已選職責 = 已選插槽.filter((s) => s.大環 === 當前指派環).map(s => s.職責);
        let 預設職責: 職責類型 = "藍";
        if (!該環已選職責.includes("紅")) 預設職責 = "紅";
        else if (!該環已選職責.includes("黃")) 預設職責 = "黃";

        已選插槽.push({ 角色: m, 大環: 當前指派環, 職責: 預設職責, 等級: 3 });
        更新模擬器();
      });
    }
    poolGrid.appendChild(item);
  });
  poolSection.appendChild(poolGrid);
  leftPanel.appendChild(poolSection);

  // --- 右側畫布區 ---
  const canvasPanel = document.createElement("div");
  canvasPanel.className = "canvas-panel";

  const canvasContainer = document.createElement("div");
  canvasContainer.className = "canvas-container";

  // 無論插槽是否有角色，由於現在有中央隊長圖騰，畫布都會完美繪製！
  建立編織圖騰SVG(canvasContainer);
  
  canvasPanel.appendChild(canvasContainer);
  leftPanel.style.maxHeight = "660px";

  root.append(leftPanel, canvasPanel);
  app.appendChild(root);

  // 啟動旋轉 Loop
  startRotationLoop();
}

function 更新模擬器() {
  渲染頁面();
}

// 預設載入小隊 Demo，並搭載預設隊長 Architect TIER IV
已選插槽 = [
  { 角色: 全體成員[0], 大環: "內", 職責: "藍", 等級: 1 }, 
  { 角色: 全體成員[2], 大環: "內", 職責: "紅", 等級: 2 }, 
  { 角色: 全體成員[3], 大環: "內", 職責: "黃", 等級: 3 }, 

  { 角色: 全體成員[10], 大環: "中", 職責: "藍", 等級: 3 }, 
  { 角色: 全體成員[12], 大環: "中", 職責: "紅", 等級: 1 }, 
  { 角色: 全體成員[14], 大環: "中", 職責: "黃", 等級: 2 }, 

  { 角色: 全體成員[15], 大環: "外", 職責: "藍", 等級: 2 }, 
  { 角色: 全體成員[17], 大環: "外", 職責: "紅", 等級: 3 }, 
  { 角色: 全體成員[18], 大環: "外", 職責: "黃", 等級: 1 }, 
];

// 啟動渲染
渲染頁面();
