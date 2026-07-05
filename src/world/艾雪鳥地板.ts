/**
 * @file 艾雪鳥地板.ts
 * @description M.C. Escher 風格「鳥」鑲嵌鋪磚，供有機世界戰場地板使用，
 * 架構延續 愛因斯坦地板.ts／彭羅斯地板.ts 的「先算好一份鋪磚幾何，交給
 * 世界地圖層.ts 做 clip-path + 材質貼圖」模式，但這裡不需要遞迴細分——
 * Escher 鑲嵌是「手繪一份會咬合的外框，直接用平移排列」，天生無縫。
 *
 * 無縫原理（已查證兩份獨立公開資料，結論一致）：
 * - EscherMath, "Tessellations by Recognizable Figures"：
 *   https://eschermath.org/wiki/Tessellations_by_Recognizable_Figures.html
 * - EscherMath, "Creating Escher-like Tessellations Exploration"：
 *   https://eschermath.org/wiki/Creating_Escher-like_Tessellations_Exploration.html
 * 兩者皆描述同一種「平移型 (Translation, TT)」作法：從矩形出發，把上邊改成
 * 一條彎曲/凹凸的線，再把「完全相同、只做平移」的線複製到對邊；左右邊同理。
 * 因為對邊永遠是同一條曲線的平移複本，貼隔壁瓦片時凹凸處必定精確互補，
 * 不需要額外的邊界匹配規則檢查，天生無縫、不重疊。
 *
 * 本檔用 Catmull-Rom 雲點曲線在「上/下」邊刻出頭＋喙，在「左/右」邊刻出
 * 展開的翅膀，四邊都固定收斂回矩形四個角，確保外框永遠是簡單封閉多邊形。
 */

export interface EscherPoint {
  x: number;
  y: number;
}

export interface BirdTile {
  points: EscherPoint[];
  center: EscherPoint;
}

export interface EscherBirdField {
  tiles: BirdTile[];
  cellWorldWidth: number;
  cellWorldHeight: number;
}

// 設計單位下的瓦片尺寸（鳥的翼展 W、身高 H），世界座標由呼叫端的 cellSize 決定實際縮放。
const DESIGN_W = 150;
const DESIGN_H = 100;

/** 翅膀：左/右邊共用同一條曲線，中段單一寬闊圓潤隆起，兩端收斂回 0（矩形角）。 */
const WING_CURVE: EscherPoint[] = [
  { x: 0.0, y: 0 },
  { x: 0.22, y: 0 },
  { x: 0.5, y: -40 },
  { x: 0.78, y: 0 },
  { x: 1.0, y: 0 },
];

/** 頭＋喙／尾：上/下邊共用同一條曲線，圓潤頭部隆起後接一個偏移的細長喙尖。 */
const HEAD_TAIL_CURVE: EscherPoint[] = [
  { x: 0.0, y: 0 },
  { x: 0.26, y: 0 },
  { x: 0.4, y: -22 },
  { x: 0.5, y: -30 },
  { x: 0.58, y: -50 },
  { x: 0.66, y: -14 },
  { x: 0.8, y: 0 },
  { x: 1.0, y: 0 },
];

/** Catmull-Rom 雲點取樣：只需給幾個關鍵控制點，就能得到平滑有機的曲線。 */
function sampleCatmullRom(points: EscherPoint[], samplesPerSegment = 18): EscherPoint[] {
  const output: EscherPoint[] = [];
  const n = points.length;
  for (let i = 0; i < n - 1; i += 1) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(n - 1, i + 2)];
    for (let s = 0; s < samplesPerSegment; s += 1) {
      const t = s / samplesPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      const x =
        0.5 *
        (2 * p1.x +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
      const y =
        0.5 *
        (2 * p1.y +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
      output.push({ x, y });
    }
  }
  output.push(points[n - 1]);
  return output;
}

/**
 * 組出單一鳥形外框（局部座標，落在 [0,DESIGN_W] x [0,DESIGN_H]）。
 * 平移型鑲嵌的關鍵：右邊＝左邊曲線整條平移 +DESIGN_W；上邊＝下邊曲線整條平移 +DESIGN_H。
 */
function buildBirdOutline(): EscherPoint[] {
  const wingSamples = sampleCatmullRom(WING_CURVE);
  const headTailSamples = sampleCatmullRom(HEAD_TAIL_CURVE);

  const left = wingSamples.map((p) => ({ x: p.y, y: p.x * DESIGN_H }));
  const right = wingSamples.map((p) => ({ x: DESIGN_W + p.y, y: p.x * DESIGN_H }));
  const bottom = headTailSamples.map((p) => ({ x: p.x * DESIGN_W, y: p.y }));
  const top = headTailSamples.map((p) => ({ x: p.x * DESIGN_W, y: DESIGN_H + p.y }));

  const outline: EscherPoint[] = [];
  for (const point of bottom) outline.push(point);
  for (let i = 1; i < right.length; i += 1) outline.push(right[i]);
  for (let i = top.length - 2; i >= 0; i -= 1) outline.push(top[i]);
  for (let i = left.length - 2; i >= 1; i -= 1) outline.push(left[i]);
  return outline;
}

/**
 * 用純平移排出足以覆蓋目標世界座標範圍（含邊界緩衝）的整片鳥群。
 * cellSize 是「一隻鳥的翼展」對應的世界單位長度，用來把設計座標縮放到世界座標。
 */
export function buildEscherBirdField(
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  cellSize: number,
): EscherBirdField {
  const outline = buildBirdOutline();
  const scale = cellSize / DESIGN_W;
  const cellWorldWidth = DESIGN_W * scale;
  const cellWorldHeight = DESIGN_H * scale;

  const marginCells = 1;
  const iMin = Math.floor(bounds.minX / cellWorldWidth) - marginCells;
  const iMax = Math.ceil(bounds.maxX / cellWorldWidth) + marginCells;
  const jMin = Math.floor(bounds.minY / cellWorldHeight) - marginCells;
  const jMax = Math.ceil(bounds.maxY / cellWorldHeight) + marginCells;

  const tiles: BirdTile[] = [];
  for (let i = iMin; i <= iMax; i += 1) {
    for (let j = jMin; j <= jMax; j += 1) {
      const originX = i * cellWorldWidth;
      const originY = j * cellWorldHeight;
      const points = outline.map((p) => ({ x: p.x * scale + originX, y: p.y * scale + originY }));
      tiles.push({
        points,
        center: { x: originX + cellWorldWidth / 2, y: originY + cellWorldHeight / 2 },
      });
    }
  }

  return { tiles, cellWorldWidth, cellWorldHeight };
}
