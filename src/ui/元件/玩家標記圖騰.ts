/**
 * @file 玩家標記圖騰.ts
 * @description 把「9 層疊加編織圖騰」(隊長六邊形印襯 + 9 成員三層差速旋轉)
 *              做成自包含的玩家標記,供世界地圖層取代漩渦 emoji 🌀。
 *
 *              與 totem/weaving.ts 共用同一套資料(隊長圖騰清單、各世界成員、圖徽),
 *              但本檔不依賴 weaving.ts 的頁面級狀態,而是接受一個小隊配置後
 *              產出一個獨立的 SVG 節點(含自己的差速旋轉動畫)。
 *
 *              視覺層次(與 weaving.ts 一致):
 *              1. 最底:9 成員萬花筒彩色線條(內/中/外三層 × 8 重對稱)
 *              2. 中:中央隊長純白實線圖騰(六邊形印襯,6 重對稱)
 *              3. 最頂:9 個角色專屬圓徽章(黑底白邊,隨大環旋轉)
 */

import type { 圖騰筆畫, 極座標 } from "../../totem/圖騰產生器";
import { 隊長圖騰清單, type 隊長圖騰資料 } from "../../totem/資料/隊長圖騰";
import { 幾何世界圖騰清單 } from "../../totem/資料/幾何世界圖騰";
import { 有機世界圖騰清單 } from "../../totem/資料/有機世界圖騰";
import { 分形世界圖騰清單 } from "../../totem/資料/分形世界圖騰";
import { 機械世界圖騰清單 } from "../../totem/資料/機械世界圖騰";
import type { 圖騰角色資料 } from "../../totem/資料/幾何世界圖騰";
import { 建立角色迷你頭像SVG徽章 } from "./css角色頭像";

// ============================================================
// 常數(沿用 weaving.ts,但畫布縮小為玩家標記尺寸)
// ============================================================

const SVG_NS = "http://www.w3.org/2000/svg";
const 中心 = 160; // viewBox 中心(320×320 畫布)
const 畫布尺寸 = 中心 * 2;
const 作畫最大基準 = 115;

type 大環類型 = "內" | "中" | "外";
type 職責類型 = "藍" | "紅" | "黃";

const 大環配置: Record<大環類型, { 起點: number; 黃終點: number; 紅終點: number; 藍終點: number }> = {
  內: { 起點: 55, 黃終點: 98, 紅終點: 120, 藍終點: 140 },
  中: { 起點: 135, 黃終點: 175, 紅終點: 200, 藍終點: 220 },
  外: { 起點: 215, 黃終點: 250, 紅終點: 278, 藍終點: 300 },
};

const 職責顏色: Record<職責類型, string> = {
  藍: "#4d8dff",
  紅: "#ff4d5e",
  黃: "#ffd24d",
};

interface 插槽 {
  角色: 圖騰角色資料;
  大環: 大環類型;
  職責: 職責類型;
  等級: number;
}

const 全部圖騰角色 = [
  ...幾何世界圖騰清單,
  ...有機世界圖騰清單,
  ...分形世界圖騰清單,
  ...機械世界圖騰清單,
];

const 圖騰角色索引 = new Map(全部圖騰角色.map((entry) => [entry.名稱, entry]));

const 正式小隊環位配置: Array<{ 大環: 大環類型; 職責: 職責類型 }> = [
  { 大環: "內", 職責: "紅" },
  { 大環: "內", 職責: "黃" },
  { 大環: "內", 職責: "藍" },
  { 大環: "中", 職責: "紅" },
  { 大環: "中", 職責: "黃" },
  { 大環: "中", 職責: "藍" },
  { 大環: "外", 職責: "紅" },
  { 大環: "外", 職責: "黃" },
];

// ============================================================
// 數學(與 weaving.ts 同一套九層座標轉換)
// ============================================================

function 九層轉換(p: 極座標, 大環: 大環類型, 職責: 職責類型): 極座標 {
  const cfg = 大環配置[大環];
  let 終點 = cfg.藍終點;
  if (職責 === "黃") 終點 = cfg.黃終點;
  else if (職責 === "紅") 終點 = cfg.紅終點;
  const 壓縮比 = (終點 - cfg.起點) / 作畫最大基準;
  return { r: cfg.起點 + p.r * 壓縮比, deg: p.deg };
}

function 極轉直角(p: 極座標, 大環: 大環類型, 職責: 職責類型) {
  const m = 九層轉換(p, 大環, 職責);
  const rad = (m.deg * Math.PI) / 180;
  return { x: 中心 + m.r * Math.sin(rad), y: 中心 - m.r * Math.cos(rad) };
}

function 隊長極轉直角(p: 極座標) {
  const rad = (p.deg * Math.PI) / 180;
  return { x: 中心 + p.r * Math.sin(rad), y: 中心 - p.r * Math.cos(rad) };
}

function 描邊(顏色: string, 粗 = 2, 淡 = false): Record<string, string | number> {
  return {
    stroke: 顏色,
    "stroke-width": 粗,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    fill: "none",
    opacity: 淡 ? 0.55 : 1.0,
  };
}

function 建立元素(tag: string, attrs: Record<string, string | number>): SVGElement {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}


// ============================================================
// 渲染:角色 Slice(8 重對稱萬花筒)
// ============================================================

function 渲染角色Slice(筆畫清單: 圖騰筆畫[], 大環: 大環類型, 職責: 職責類型): SVGElement {
  const g = 建立元素("g", {});
  const cfg = 大環配置[大環];
  const 顏色 = 職責顏色[職責];
  let 終點 = cfg.藍終點;
  if (職責 === "黃") 終點 = cfg.黃終點;
  else if (職責 === "紅") 終點 = cfg.紅終點;
  const 壓縮比 = (終點 - cfg.起點) / 作畫最大基準;

  for (const 筆畫 of 筆畫清單) {
    switch (筆畫.型) {
      case "線": {
        const a = 極轉直角(筆畫.起, 大環, 職責);
        const b = 極轉直角(筆畫.終, 大環, 職責);
        g.appendChild(建立元素("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, ...描邊(顏色, 筆畫.粗, 筆畫.淡) }));
        break;
      }
      case "折線": {
        const pts = 筆畫.點.map((p) => 極轉直角(p, 大環, 職責));
        const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
        g.appendChild(建立元素("path", { d: 筆畫.閉合 ? d + " Z" : d, ...描邊(顏色, 筆畫.粗, 筆畫.淡) }));
        break;
      }
      case "圓": {
        const c = 極轉直角(筆畫.中心, 大環, 職責);
        const r = 筆畫.半徑 * 壓縮比;
        g.appendChild(建立元素("circle", {
          cx: c.x, cy: c.y, r,
          ...(筆畫.填充 ? { fill: 顏色, stroke: "none", opacity: 筆畫.淡 ? 0.5 : 1.0 } : 描邊(顏色, 筆畫.粗 ?? 1.5, 筆畫.淡)),
        }));
        break;
      }
      case "弧": {
        const 弧半徑 = 九層轉換({ r: 筆畫.半徑, deg: 0 }, 大環, 職責).r;
        const rad起 = (筆畫.起角 * Math.PI) / 180;
        const rad終 = (筆畫.終角 * Math.PI) / 180;
        const 起 = { x: 中心 + 弧半徑 * Math.sin(rad起), y: 中心 - 弧半徑 * Math.cos(rad起) };
        const 終 = { x: 中心 + 弧半徑 * Math.sin(rad終), y: 中心 - 弧半徑 * Math.cos(rad終) };
        const large = Math.abs(筆畫.終角 - 筆畫.起角) > 180 ? 1 : 0;
        const d = `M${起.x.toFixed(2)},${起.y.toFixed(2)} A${弧半徑},${弧半徑} 0 ${large} 1 ${終.x.toFixed(2)},${終.y.toFixed(2)}`;
        g.appendChild(建立元素("path", { d, ...描邊(顏色, 筆畫.粗, 筆畫.淡) }));
        break;
      }
      case "多邊形": {
        const pts = 筆畫.點.map((p) => {
          const xy = 極轉直角(p, 大環, 職責);
          return `${xy.x.toFixed(2)},${xy.y.toFixed(2)}`;
        });
        g.appendChild(建立元素("polygon", {
          points: pts.join(" "),
          ...(筆畫.填充 ? { fill: 顏色, stroke: "none", opacity: 筆畫.淡 ? 0.5 : 1.0 } : 描邊(顏色, 1.5, 筆畫.淡)),
        }));
        break;
      }
    }
  }
  return g;
}

// ============================================================
// 渲染:隊長 Slice(6 重對稱)
// ============================================================

function 渲染隊長Slice(筆畫清單: 圖騰筆畫[], 顏色: string): SVGElement {
  const g = 建立元素("g", {});
  for (const 筆畫 of 筆畫清單) {
    switch (筆畫.型) {
      case "線": {
        const a = 隊長極轉直角(筆畫.起);
        const b = 隊長極轉直角(筆畫.終);
        g.appendChild(建立元素("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, ...描邊(顏色, 筆畫.粗, 筆畫.淡) }));
        break;
      }
      case "折線": {
        const pts = 筆畫.點.map(隊長極轉直角);
        const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
        g.appendChild(建立元素("path", { d: 筆畫.閉合 ? d + " Z" : d, ...描邊(顏色, 筆畫.粗, 筆畫.淡) }));
        break;
      }
      case "圓": {
        const c = 隊長極轉直角(筆畫.中心);
        g.appendChild(建立元素("circle", {
          cx: c.x, cy: c.y, r: 筆畫.半徑,
          ...(筆畫.填充 ? { fill: 顏色, stroke: "none", opacity: 筆畫.淡 ? 0.55 : 1.0 } : 描邊(顏色, 筆畫.粗 ?? 1.5, 筆畫.淡)),
        }));
        break;
      }
      case "弧": {
        const rad起 = (筆畫.起角 * Math.PI) / 180;
        const rad終 = (筆畫.終角 * Math.PI) / 180;
        const 起 = { x: 中心 + 筆畫.半徑 * Math.sin(rad起), y: 中心 - 筆畫.半徑 * Math.cos(rad起) };
        const 終 = { x: 中心 + 筆畫.半徑 * Math.sin(rad終), y: 中心 - 筆畫.半徑 * Math.cos(rad終) };
        const large = Math.abs(筆畫.終角 - 筆畫.起角) > 180 ? 1 : 0;
        const d = `M${起.x.toFixed(2)},${起.y.toFixed(2)} A${筆畫.半徑},${筆畫.半徑} 0 ${large} 1 ${終.x.toFixed(2)},${終.y.toFixed(2)}`;
        g.appendChild(建立元素("path", { d, ...描邊(顏色, 筆畫.粗, 筆畫.淡) }));
        break;
      }
      case "多邊形": {
        const pts = 筆畫.點.map((p) => {
          const xy = 隊長極轉直角(p);
          return `${xy.x.toFixed(2)},${xy.y.toFixed(2)}`;
        });
        g.appendChild(建立元素("polygon", {
          points: pts.join(" "),
          ...(筆畫.填充 ? { fill: 顏色, stroke: "none", opacity: 筆畫.淡 ? 0.55 : 1.0 } : 描邊(顏色, 1.5, 筆畫.淡)),
        }));
        break;
      }
    }
  }
  return g;
}

// ============================================================
// 主入口:建立玩家標記圖騰
// ============================================================

export interface 玩家標記選項 {
  /** 顯示尺寸(px) */
  size?: number;
  /** 隊長(預設 Architect 4★) */
  隊長?: 隊長圖騰資料;
  隊長等級?: number;
  /** 9 名成員配置(預設用與 weaving.ts 相同的 demo 小隊) */
  小隊?: 插槽[];
  /** 是否啟動差速旋轉(預設 true) */
  旋轉?: boolean;
  /** 最多顯示到哪一圈。1=內圈、2=中圈、3=外圈 */
  最大展開層級?: 1 | 2 | 3;
}

export function 由正式成員陣容建立圖騰小隊(
  roster: Array<{
    nameZh: string;
    star: number;
    layer?: "inner" | "middle" | "outer";
    role?: "protect" | "firepower" | "supply";
  }>,
): { 小隊: 插槽[]; 最大展開層級: 1 | 2 | 3 } {
  const 小隊: 插槽[] = roster
    .map((member, index) => {
      const layout = member.layer
        ? {
            大環: member.layer === "inner" ? "內" : member.layer === "middle" ? "中" : "外",
            職責:
              member.role === "protect"
                ? "藍"
                : member.role === "supply"
                  ? "黃"
                  : "紅",
          }
        : 正式小隊環位配置[index];
      const 角色 = 圖騰角色索引.get(member.nameZh);
      if (!layout || !角色) return null;
      return {
        角色,
        大環: layout.大環,
        職責: layout.職責,
        等級: Math.max(1, Math.min(3, Math.round(member.star))),
      };
    })
    .filter((entry): entry is 插槽 => entry !== null);

  const 最大展開層級: 1 | 2 | 3 = 小隊.some((slot) => slot.大環 === "外")
    ? 3
    : 小隊.some((slot) => slot.大環 === "中")
      ? 2
      : 1;

  return { 小隊, 最大展開層級 };
}

export function 取得隊長圖騰資料(id: string): 隊長圖騰資料 {
  return 隊長圖騰清單.find((entry) => entry.id === id) ?? 隊長圖騰清單[0];
}

/**
 * 產出一個自包含的 9 層疊加編織圖騰 SVG 節點。
 * 回傳的 SVGSVGElement 可直接 appendChild 到任意容器。
 */
export function 建立玩家標記圖騰(opts: 玩家標記選項 = {}): SVGSVGElement {
  const size = opts.size ?? 140;
  const 隊長 = opts.隊長 ?? 隊長圖騰清單[0];
  const 隊長等級 = opts.隊長等級 ?? 4;
  const 小隊 = opts.小隊 ?? 預設Demo小隊();
  const 旋轉 = opts.旋轉 ?? true;
  const 最大展開層級 = opts.最大展開層級 ?? 3;
  const 大環列表 = (["內", "中", "外"] as const).slice(0, 最大展開層級);

  const svg = 建立元素("svg", {
    viewBox: `0 0 ${畫布尺寸} ${畫布尺寸}`,
    width: String(size),
    height: String(size),
  }) as SVGSVGElement;
  svg.classList.add("玩家標記圖騰");

  // 0. 三圈操作 hitbox 預覽：環帶本身就是未來可點擊區，不只是裝飾線。
  const hitboxes = 建立元素("g", { class: "玩家標記圖騰-hitboxes" });
  const hitbox配置 = [
    { 名稱: "內圈", 內徑: 55, 外徑: 140, 顏色: "#65d9ff" },
    { 名稱: "中圈", 內徑: 140, 外徑: 220, 顏色: "#ffd36a" },
    { 名稱: "外圈", 內徑: 220, 外徑: 300, 顏色: "#ff7f9d" },
  ];
  for (const [index, hitbox] of hitbox配置.entries()) {
    if (index >= 最大展開層級) break;
    const 半徑 = (hitbox.內徑 + hitbox.外徑) / 2;
    const 寬度 = hitbox.外徑 - hitbox.內徑;
    const ring = 建立元素("circle", {
      cx: 中心,
      cy: 中心,
      r: 半徑,
      fill: "none",
      stroke: hitbox.顏色,
      "stroke-width": 寬度,
      opacity: 0.1,
      class: `player-ring-hitbox 玩家標記圖騰-hitbox-${hitbox.名稱}`,
      "data-ring": hitbox.名稱,
      "pointer-events": "stroke",
    });
    ring.setAttribute("aria-label", `${hitbox.名稱}操作範圍`);
    hitboxes.appendChild(ring);
    hitboxes.appendChild(建立元素("circle", {
      cx: 中心,
      cy: 中心,
      r: hitbox.外徑,
      fill: "none",
      stroke: hitbox.顏色,
      "stroke-width": 3,
      "stroke-dasharray": "8,5",
      opacity: 0.9,
      "pointer-events": "none",
    }));
  }
  svg.appendChild(hitboxes);

  // 1. 背景圈
  const bg = 建立元素("g", { opacity: 0.22 });
  bg.appendChild(建立元素("circle", { cx: 中心, cy: 中心, r: 55, fill: "none", stroke: "#fff", "stroke-width": 1.5 }));
  if (最大展開層級 >= 1) {
    bg.appendChild(建立元素("circle", { cx: 中心, cy: 中心, r: 140, fill: "none", stroke: "#fff", "stroke-width": 1.2, "stroke-dasharray": "6,6" }));
  }
  if (最大展開層級 >= 2) {
    bg.appendChild(建立元素("circle", { cx: 中心, cy: 中心, r: 220, fill: "none", stroke: "#fff", "stroke-width": 1.2, "stroke-dasharray": "6,6" }));
  }
  if (最大展開層級 >= 3) {
    bg.appendChild(建立元素("circle", { cx: 中心, cy: 中心, r: 300, fill: "none", stroke: "#fff", "stroke-width": 1.2, "stroke-dasharray": "6,6" }));
  }
  svg.appendChild(bg);

  // 2-4. 三層成員線條(差速互旋)
  const 環角度: Record<大環類型, number> = { 內: 0, 中: 0, 外: 0 };
  const 環速度: Record<大環類型, number> = { 內: 0.16, 中: -0.10, 外: 0.05 };
  const 大環線條節點 = {} as Record<大環類型, SVGElement>;
  const 大環徽章節點 = {} as Record<大環類型, SVGElement>;

  for (const 環 of 大環列表) {
    const linesG = 建立元素("g", { id: `pm-ring-${環}-lines` });
    const 該環插槽 = 小隊.filter((s) => s.大環 === 環);
    for (const slot of 該環插槽) {
      const 筆畫 = slot.角色.星級筆畫[slot.等級 - 1];
      for (let i = 0; i < 8; i++) {
        const 楔形 = 建立元素("g", { transform: `rotate(${i * 45} ${中心} ${中心})` });
        楔形.appendChild(渲染角色Slice(筆畫, slot.大環, slot.職責));
        const 鏡射 = 建立元素("g", { transform: `translate(${畫布尺寸} 0) scale(-1 1)` });
        鏡射.appendChild(渲染角色Slice(筆畫, slot.大環, slot.職責));
        楔形.appendChild(鏡射);
        linesG.appendChild(楔形);
      }
    }
    svg.appendChild(linesG);
    大環線條節點[環] = linesG;
  }

  // 2. 中央隊長圖騰(6 重對稱,獨立自旋)
  const 隊長筆畫 = 隊長.星級筆畫[隊長等級 - 1];
  const 隊長G = 建立元素("g", { id: "pm-ring-隊長" });
  隊長G.classList.add("玩家標記圖騰-隊長核心");
  let 隊長角 = 0;
  const 隊長速度 = 0.03;
  for (let i = 0; i < 6; i++) {
    const 楔形 = 建立元素("g", { transform: `rotate(${i * 60} ${中心} ${中心})` });
    楔形.appendChild(渲染隊長Slice(隊長筆畫, "#ffffff"));
    const 鏡射 = 建立元素("g", { transform: `translate(${畫布尺寸} 0) scale(-1 1)` });
    鏡射.appendChild(渲染隊長Slice(隊長筆畫, "#ffffff"));
    楔形.appendChild(鏡射);
    隊長G.appendChild(楔形);
  }
  svg.appendChild(隊長G);

  // 3. 最頂層:9 角色圓徽章(隨大環旋轉)
  for (const 環 of 大環列表) {
    const emblemsG = 建立元素("g", { id: `pm-ring-${環}-emblems` });
    const 該環插槽 = 小隊.filter((s) => s.大環 === 環);
    該環插槽.forEach((slot, idx) => {
      const cfg = 大環配置[slot.大環];
      let 終點 = cfg.藍終點;
      if (slot.職責 === "黃") 終點 = cfg.黃終點;
      else if (slot.職責 === "紅") 終點 = cfg.紅終點;
      const 圖徽半徑 = cfg.起點 + (終點 - cfg.起點) * 0.84;
      const 角度 = idx * 120;
      const 顏色 = 職責顏色[slot.職責];
      const 容器G = 建立元素("g", { transform: `translate(${中心}, ${中心})` });
      容器G.appendChild(建立角色迷你頭像SVG徽章(slot.角色.id, slot.等級, 圖徽半徑, 顏色, 角度));
      emblemsG.appendChild(容器G);
    });
    svg.appendChild(emblemsG);
    大環徽章節點[環] = emblemsG;
  }

  // 啟動差速旋轉動畫
  if (旋轉) {
    let rafId: number | null = null;
    const tick = () => {
      if (!svg.isConnected) {
        if (rafId !== null) cancelAnimationFrame(rafId);
        return;
      }
      隊長角 += 隊長速度;
      隊長G.setAttribute("transform", `rotate(${隊長角} ${中心} ${中心})`);
      for (const 環 of 大環列表) {
        環角度[環] += 環速度[環];
        大環線條節點[環].setAttribute("transform", `rotate(${環角度[環]} ${中心} ${中心})`);
        大環徽章節點[環].setAttribute("transform", `rotate(${環角度[環]} ${中心} ${中心})`);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  return svg;
}

// ============================================================
// 預設 Demo 小隊(與 weaving.ts 相同配置)
// ============================================================

function 預設Demo小隊(): 插槽[] {
  const 全體 = [
    ...幾何世界圖騰清單,
    ...有機世界圖騰清單,
    ...分形世界圖騰清單,
    ...機械世界圖騰清單,
  ];
  return [
    { 角色: 全體[0], 大環: "內", 職責: "藍", 等級: 1 },
    { 角色: 全體[2], 大環: "內", 職責: "紅", 等級: 2 },
    { 角色: 全體[3], 大環: "內", 職責: "黃", 等級: 3 },
    { 角色: 全體[10], 大環: "中", 職責: "藍", 等級: 3 },
    { 角色: 全體[12], 大環: "中", 職責: "紅", 等級: 1 },
    { 角色: 全體[14], 大環: "中", 職責: "黃", 等級: 2 },
    { 角色: 全體[15], 大環: "外", 職責: "藍", 等級: 2 },
    { 角色: 全體[17], 大環: "外", 職責: "紅", 等級: 3 },
    { 角色: 全體[18], 大環: "外", 職責: "黃", 等級: 1 },
  ];
}
