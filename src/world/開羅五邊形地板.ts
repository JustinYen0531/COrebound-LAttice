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
 *   → 把這 3 片的輪廓合起來看，外緣剛好是一個正六邊形（180°-120°=60° 的外角），
 *     也就是「把一個正六邊形切成三等份」即得這組 120° 節點，呼應鑲嵌的對稱性。
 * 兩種頂點各自恰好湊滿一圈，整塊拼圖就能無縫密鋪。
 *
 * 已交叉查證：
 * - Wikipedia, "Cairo pentagonal tiling"：
 *   https://en.wikipedia.org/wiki/Cairo_pentagonal_tiling
 *   （確認角度序列 120,120,90,120,90 與邊長比 1:(√3−1)，為「snub square tiling
 *   的對偶」版本）
 *
 * 本檔的五邊形頂點座標是自行用「邊走法」（依角度序列逐邊累加方向向量）算出並
 * 驗證封閉（首尾相接誤差為 0）。鋪磚方式採「邊反射 BFS」：
 * 從一片種子五邊形出發，對它的每一條邊把五邊形跨該邊鏡射過去，當作鄰居。
 * 用「邊覆蓋次數」Map 做去重——一條邊已有 2 片共用就不再延伸，保證不重疊。
 * BFS queue 用 head pointer（而非 Array.shift()），避免 O(n²) 慢化。
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

/** 量化精度：確保 chain of reflections 後同一條邊仍能匹配。1e-4 足夠。 */
const ROUND_PRECISION = 1e4;

function quantize(value: number): number {
  return Math.round(value * ROUND_PRECISION) / ROUND_PRECISION;
}

function pointKey(p: CairoPoint): string {
  return `${quantize(p.x)},${quantize(p.y)}`;
}

/** 邊的 canonical key：端點量化後按字典序排列，確保兩片共用同一條邊時 key 相同。 */
function edgeKey(a: CairoPoint, b: CairoPoint): string {
  const ka = pointKey(a);
  const kb = pointKey(b);
  return ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
}

function centroid(points: CairoPoint[]): CairoPoint {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

/**
 * 把整個多邊形跨過直線 a→b 鏡射。鏡射後多邊形的「那一條共用邊」會落在 a↔b 上，
 * 且法線反向，因此兩片剛好邊對邊相接，是 face-to-face 鑲嵌唯一的合法鄰居。
 */
function reflectAcrossLine(points: CairoPoint[], a: CairoPoint, b: CairoPoint): CairoPoint[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy || 1;
  return points.map((p) => {
    const px = p.x - a.x;
    const py = p.y - a.y;
    const projection = (px * dx + py * dy) / lengthSquared;
    const footX = a.x + projection * dx;
    const footY = a.y + projection * dy;
    return { x: 2 * footX - p.x, y: 2 * footY - p.y };
  });
}

/**
 * 用「邊反射 BFS」把開羅五邊形鑲嵌鋪滿目標世界座標範圍（含邊界緩衝）。
 *
 * 為什麼是 BFS 而不是固定晶格平移：開羅鑲嵌的平移週期並不是簡單的正方形，
 * 用錯晶格會讓相鄰單元錯位；改從一片種子五邊形出發、跨每一條邊鏡射找鄰居，
 * 因為鑲嵌本身是邊對邊的，鄰居形狀由「跨邊鏡射」唯一決定，鋪出來必然無縫。
 *
 * 去重機制：維護一個 edgeCount Map，每放一片瓦片就把它的 5 條邊的計數 +1。
 * 當某條邊計數達到 2（內部邊，已被兩片共用），就不再從這條邊延伸新鄰居。
 * 外緣邊計數為 1，仍可延伸。
 *
 * 效能：BFS queue 用 head pointer 而非 Array.shift()（O(n) → O(1) dequeue），
 * 總複雜度 O(n) 而非 O(n²)。
 */
export function buildCairoField(
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  latticeSize: number,
): CairoField {
  const scale = latticeSize / SQRT3;
  const latticeWorldSize = latticeSize;

  // 在設計座標系下 BFS 鋪磚，目標範圍 = 世界 bounds ÷ scale（外加緩衝）。
  const margin = 2;
  const designMinX = bounds.minX / scale - margin;
  const designMaxX = bounds.maxX / scale + margin;
  const designMinY = bounds.minY / scale - margin;
  const designMaxY = bounds.maxY / scale + margin;

  const withinDesignBounds = (center: CairoPoint): boolean =>
    center.x >= designMinX &&
    center.x <= designMaxX &&
    center.y >= designMinY &&
    center.y <= designMaxY;

  // 邊覆蓋次數：1 = 外緣邊（仍可延伸），2 = 內部邊（已滿，不再延伸）
  const edgeCount = new Map<string, number>();

  function registerEdges(pts: CairoPoint[]): void {
    for (let i = 0; i < pts.length; i += 1) {
      const ek = edgeKey(pts[i], pts[(i + 1) % pts.length]);
      edgeCount.set(ek, (edgeCount.get(ek) ?? 0) + 1);
    }
  }

  // Head-pointer BFS queue：dequeue = ++head（O(1)），enqueue = push（amortized O(1)）。
  // 避免 Array.shift() 的 O(n) 複雜度導致 ~20000 片瓦片時 queue 操作退化成 O(n²)。
  const queue: CairoPoint[][] = [];
  let queueHead = 0;
  const tiles: CairoTile[] = [];

  const seed = DESIGN_PENTAGON.map((p) => ({ x: p.x, y: p.y }));
  registerEdges(seed);
  tiles.push({ points: seed, center: centroid(seed) });
  queue.push(seed);

  while (queueHead < queue.length) {
    const current = queue[queueHead++];
    for (let i = 0; i < current.length; i += 1) {
      const a = current[i];
      const b = current[(i + 1) % current.length];
      const ek = edgeKey(a, b);
      // 內部邊（已被 2 片共用）不再延伸鄰居。
      if ((edgeCount.get(ek) ?? 0) >= 2) continue;
      const neighbor = reflectAcrossLine(current, a, b);
      registerEdges(neighbor);
      const neighborCenter = centroid(neighbor);
      tiles.push({ points: neighbor, center: neighborCenter });
      // 只有重心還在設計目標範圍內的才繼續延伸；範圍外的仍記錄進 tiles，
      // 用來填滿 clip-path 外緣的邊界瓦片。
      if (withinDesignBounds(neighborCenter)) {
        queue.push(neighbor);
      }
    }
  }

  // 把設計座標縮放成世界座標。
  const worldTiles: CairoTile[] = tiles.map((tile) => ({
    points: tile.points.map((p) => ({ x: p.x * scale, y: p.y * scale })),
    center: { x: tile.center.x * scale, y: tile.center.y * scale },
  }));

  return { tiles: worldTiles, latticeWorldSize };
}
