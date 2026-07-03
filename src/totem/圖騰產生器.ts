/**
 * @file 圖騰產生器.ts
 * @description 依據 .agents/skills/lattice-language/SKILL.md 的 Signature Slice 規則實作的
 * 圖騰生成器：每個角色只需畫「一份 45 度楔形切片」的一半（0°~22.5°，0°＝正上方），
 * 產生器會先鏡射補成完整 45° 楔形，再旋轉 8 次（Rotation + Reflection + Point Symmetry）
 * 拼成完整圓形圖騰，對應規格書「Signature Slice 設計規則」。
 *
 * 星級演化規則（規格書「星級演化規則」）：
 * - 主輪廓必須永遠保持一致，星級只疊加圖層，不重畫整個圖騰。
 * - 呼叫端只需把 3 個星級各自的「累加後」筆畫陣列傳入，本檔不處理疊加邏輯。
 */

export const 畫布中心 = 150;
export const 畫布尺寸 = 畫布中心 * 2;

/** 極座標：deg 以正上方為 0 度、順時針遞增；半楔角作畫時角度需落在 0~22.5 之間 */
export interface 極座標 {
  r: number;
  deg: number;
}

export type 圖騰筆畫 =
  | { 型: "線"; 起: 極座標; 終: 極座標; 粗?: number; 淡?: boolean }
  | { 型: "折線"; 點: 極座標[]; 粗?: number; 閉合?: boolean; 淡?: boolean }
  | { 型: "圓"; 中心: 極座標; 半徑: number; 填充?: boolean; 淡?: boolean }
  | { 型: "弧"; 半徑: number; 起角: number; 終角: number; 粗?: number; 淡?: boolean }
  | { 型: "多邊形"; 點: 極座標[]; 填充?: boolean; 淡?: boolean };

const SVG_NS = "http://www.w3.org/2000/svg";

export const 甜甜圈內半徑 = 55;
export const 甜甜圈外半徑 = 140;
export const 甜甜圈壓縮比 = (甜甜圈外半徑 - 甜甜圈內半徑) / 甜甜圈外半徑;

function 極座標轉直角(p: 極座標, cx = 畫布中心, cy = 畫布中心) {
  const rad = (p.deg * Math.PI) / 180;
  // 甜甜圈變換：擠壓中心向外推，中空半徑為 55px，並等比壓縮剩餘半徑
  const 新半徑 = 甜甜圈內半徑 + p.r * 甜甜圈壓縮比;
  return { x: cx + 新半徑 * Math.sin(rad), y: cy - 新半徑 * Math.cos(rad) };
}

function 弧上的點(半徑: number, 角度: number, cx = 畫布中心, cy = 畫布中心) {
  return 極座標轉直角({ r: 半徑, deg: 角度 }, cx, cy);
}

function 建立元素(tag: string, attrs: Record<string, string | number>): SVGElement {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

function 描邊屬性(粗 = 2, 淡 = false): Record<string, string | number> {
  return {
    stroke: "#ffffff",
    "stroke-width": 粗,
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    fill: "none",
    opacity: 淡 ? 0.45 : 1,
  };
}

function 畫筆畫(筆畫: 圖騰筆畫): SVGElement {
  switch (筆畫.型) {
    case "線": {
      const a = 極座標轉直角(筆畫.起);
      const b = 極座標轉直角(筆畫.終);
      return 建立元素("line", {
        x1: a.x,
        y1: a.y,
        x2: b.x,
        y2: b.y,
        ...描邊屬性(筆畫.粗, 筆畫.淡),
      });
    }
    case "折線": {
      const pts = 筆畫.點.map((p) => 極座標轉直角(p));
      const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
      return 建立元素("path", {
        d: 筆畫.閉合 ? d + " Z" : d,
        ...描邊屬性(筆畫.粗, 筆畫.淡),
      });
    }
    case "圓": {
      const c = 極座標轉直角(筆畫.中心);
      // 圓半徑同步按比例壓縮，以維持精確的圓形視覺比例
      const 縮放半徑 = 筆畫.半徑 * 甜甜圈壓縮比;
      return 建立元素("circle", {
        cx: c.x,
        cy: c.y,
        r: 縮放半徑,
        ...(筆畫.填充
          ? { fill: "#ffffff", stroke: "none", opacity: 筆畫.淡 ? 0.45 : 1 }
          : 描邊屬性(1.5, 筆畫.淡)),
      });
    }
    case "弧": {
      const 起 = 弧上的點(筆畫.半徑, 筆畫.起角);
      const 終 = 弧上的點(筆畫.半徑, 筆畫.終角);
      const largeArc = Math.abs(筆畫.終角 - 筆畫.起角) > 180 ? 1 : 0;
      const d = `M${起.x.toFixed(2)},${起.y.toFixed(2)} A${筆畫.半徑},${筆畫.半徑} 0 ${largeArc} 1 ${終.x.toFixed(2)},${終.y.toFixed(2)}`;
      return 建立元素("path", { d, ...描邊屬性(筆畫.粗, 筆畫.淡) });
    }
    case "多邊形": {
      const pts = 筆畫.點.map((p) => {
        const xy = 極座標轉直角(p);
        return `${xy.x.toFixed(2)},${xy.y.toFixed(2)}`;
      });
      return 建立元素("polygon", {
        points: pts.join(" "),
        ...(筆畫.填充
          ? { fill: "#ffffff", stroke: "none", opacity: 筆畫.淡 ? 0.45 : 1 }
          : 描邊屬性(1.5, 筆畫.淡)),
      });
    }
  }
}

export interface 圖騰渲染選項 {
  /** 圖騰整體再額外旋轉的度數（例如讓某個角色的主軸不一定朝正上方），預設 0 */
  整體旋轉?: number;
  /** 外框裝飾環：0=無、1~3 對應星級可疊加的外圈刻度環 */
  外圈刻度?: number;
}

/**
 * 產生完整圖騰的 SVG 元素。
 * 演算法：先建立「半楔形」原始筆畫的 <g>，鏡射出另一半湊成完整 45° 楔形，
 * 再把這個 45° 楔形旋轉複製 8 份（8 × 45° = 360°），對應規格書的
 * Rotation / Reflection / Point Symmetry 三種操作。
 */
export function 建立圖騰SVG(半楔筆畫: 圖騰筆畫[], 選項: 圖騰渲染選項 = {}): SVGSVGElement {
  const svg = 建立元素("svg", {
    viewBox: `0 0 ${畫布尺寸} ${畫布尺寸}`,
    width: "100%",
    height: "100%",
  }) as SVGSVGElement;
  svg.style.background = "#000";

  const 全域群組 = 建立元素("g", {
    transform: `rotate(${選項.整體旋轉 ?? 0} ${畫布中心} ${畫布中心})`,
  });

  for (let i = 0; i < 8; i++) {
    const 旋轉角 = i * 45;
    const 楔形群組 = 建立元素("g", {
      transform: `rotate(${旋轉角} ${畫布中心} ${畫布中心})`,
    });

    // 原始半楔（0°~22.5°）
    const 原始半 = 建立元素("g", {});
    for (const 筆畫 of 半楔筆畫) 原始半.appendChild(畫筆畫(筆畫));

    // 鏡射半楔（以垂直中軸鏡射，等於把 deg 取負號的視覺效果）
    const 鏡射半 = 建立元素("g", {
      transform: `translate(${畫布尺寸} 0) scale(-1 1)`,
    });
    for (const 筆畫 of 半楔筆畫) 鏡射半.appendChild(畫筆畫(筆畫));

    楔形群組.appendChild(原始半);
    楔形群組.appendChild(鏡射半);
    全域群組.appendChild(楔形群組);
  }

  if (選項.外圈刻度 && 選項.外圈刻度 > 0) {
    for (let ring = 0; ring < 選項.外圈刻度; ring++) {
      const 半徑 = 138 - ring * 12;
      const 圓 = 建立元素("circle", {
        cx: 畫布中心,
        cy: 畫布中心,
        r: 半徑,
        fill: "none",
        stroke: "#ffffff",
        "stroke-width": 0.75,
        opacity: 0.18,
      });
      全域群組.appendChild(圓);
    }
  }

  svg.appendChild(全域群組);
  return svg as SVGSVGElement;
}
