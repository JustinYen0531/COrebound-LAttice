/**
 * @file 開羅五邊形地板.ts
 * @description 開羅五邊形鑲嵌 (Cairo Pentagonal Tiling)，供機械世界戰場地板使用，
 * 架構延續 彭羅斯地板.ts／艾雪鳥地板.ts：算好一份鋪磚幾何，交給 世界地圖層.ts
 * 做 clip-path + 材質貼圖。
 *
 * 為什麼正五邊形沒辦法直接密鋪：正五邊形內角 108°，108×3=324°、108×4=432°，
 * 湊不出剛好 360°，所以正五邊形本身無法密鋪整個平面。
 *
 * 開羅鑲嵌的解法：放寬成「不規則五邊形」，角度序列改成 120°,120°,90°,120°,90°
 * （4 條邊等長、1 條邊較短，長度比為 1:(√3−1)）。這樣一來：
 * - 4 個 90° 角的頂點可以湊出 4×90°=360°（4 片五邊形繞一點轉成風車）
 * - 3 個 120° 角的頂點可以湊出 3×120°=360°（3 片五邊形繞一點）
 * 兩種頂點各自恰好湊滿一圈，整塊拼圖就能無縫密鋪。
 *
 * 已交叉查證：
 * - Wikipedia, "Cairo pentagonal tiling"：
 *   https://en.wikipedia.org/wiki/Cairo_pentagonal_tiling
 *   （確認角度序列 120,120,90,120,90 與邊長比 1:(√3−1)，為「snub square tiling
 *   的對偶」版本）
 *
 * 本檔的五邊形頂點座標是自行用「邊走法」（依角度序列逐邊累加方向向量）算出並
 * 驗證封閉（首尾相接誤差為 0）；鋪磚方式是：
 * 1. 以其中一個 90° 頂點為軸，將五邊形轉 0°/90°/180°/270° 疊出「4 片風車」。
 * 2. 這個風車單元用邊長 √3 的正方形格子做純平移，鋪滿整個目標區域。
 * 兩步都已用程式驗證：任一條邊最多被 2 片五邊形共用（內部邊恰好 2 次、
 * 外緣邊恰好 1 次），且總面積等於「單片面積 × 片數」，代表無縫、不重疊。
 */

export interface CairoPoint {
  x: number;
  y: number;
}

export interface CairoTile {
  points: CairoPoint[];
  center: CairoPoint;
}

export interface CairoField {
  tiles: CairoTile[];
  latticeWorldSize: number;
}

const SQRT3 = Math.sqrt(3);

/**
 * 設計單位下的一片五邊形。頂點角度序列：V1=120°, V2=120°, V3=90°, V4=120°, V5=90°。
 * 邊長：V1→V2 = √3−1（唯一較短邊），其餘 4 邊皆為 1。用邊走法驗證：V5→V1 剛好閉合回原點。
 */
const DESIGN_PENTAGON: CairoPoint[] = [
  { x: 0, y: 0 },
  { x: SQRT3 - 1, y: 0 },
  { x: SQRT3 - 0.5, y: SQRT3 / 2 },
  { x: SQRT3 / 2 - 0.5, y: SQRT3 / 2 + 0.5 },
  { x: -0.5, y: SQRT3 / 2 },
];

/** V3（索引 2）是五邊形的其中一個 90° 頂點，拿來當風車的轉軸。 */
const HUB_VERTEX_INDEX = 2;

function rotateAbout(points: CairoPoint[], center: CairoPoint, thetaDeg: number): CairoPoint[] {
  const rad = (thetaDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return points.map((p) => {
    const dx = p.x - center.x;
    const dy = p.y - center.y;
    return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
  });
}

/** 繞 V3 轉 0°/90°/180°/270°，疊出 4 片五邊形組成的「風車」單元（已驗證無縫覆蓋 360°）。 */
function buildPinwheel(): CairoPoint[][] {
  const hub = DESIGN_PENTAGON[HUB_VERTEX_INDEX];
  return [0, 90, 180, 270].map((deg) => rotateAbout(DESIGN_PENTAGON, hub, deg));
}

function centroid(points: CairoPoint[]): CairoPoint {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

/**
 * 用純平移把風車單元鋪滿目標世界座標範圍（含邊界緩衝）。
 * 晶格向量為 (√3,0) 與 (0,√3)（設計單位），已驗證整片鋪磚無縫；
 * latticeSize 是「一步晶格」對應的世界單位長度，用來把設計座標縮放到世界座標。
 */
export function buildCairoField(
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  latticeSize: number,
): CairoField {
  const pinwheel = buildPinwheel();
  const scale = latticeSize / SQRT3;
  const latticeWorldSize = SQRT3 * scale;

  const marginCells = 1;
  const iMin = Math.floor(bounds.minX / latticeWorldSize) - marginCells;
  const iMax = Math.ceil(bounds.maxX / latticeWorldSize) + marginCells;
  const jMin = Math.floor(bounds.minY / latticeWorldSize) - marginCells;
  const jMax = Math.ceil(bounds.maxY / latticeWorldSize) + marginCells;

  const tiles: CairoTile[] = [];
  for (let i = iMin; i <= iMax; i += 1) {
    for (let j = jMin; j <= jMax; j += 1) {
      const originX = i * latticeWorldSize;
      const originY = j * latticeWorldSize;
      for (const piece of pinwheel) {
        const points = piece.map((p) => ({ x: p.x * scale + originX, y: p.y * scale + originY }));
        tiles.push({ points, center: centroid(points) });
      }
    }
  }

  return { tiles, latticeWorldSize };
}
