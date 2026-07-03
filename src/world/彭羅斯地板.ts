/**
 * @file 彭羅斯地板.ts
 * @description Penrose P3（菱形）非週期性鋪磚，透過 Robinson 三角形細分（deflation）生成，
 * 架構比照 愛因斯坦地板.ts（Hat monotile），供分形世界戰場地板使用。
 *
 * 演算法依據（已交叉查證兩份獨立公開資料，結論一致）：
 * - Wikipedia "Penrose tiling"：https://en.wikipedia.org/wiki/Penrose_tiling
 *   （P3 由厚/薄兩種菱形組成，可沿對角線切成兩種 Robinson 三角形：
 *   銳角 36-72-72、鈍角 36-36-108，兩者邊長比為黃金比 φ）
 * - Preshing, "Penrose Tiling Explained"：https://preshing.com/20110831/penrose-tiling-explained/
 *   （提供了可直接實作的細分公式，本檔的 subdivide() 即依此重新以 TypeScript 實作）
 *
 * 為什麼細分保證「無縫」：
 * 細分只是把一個三角形換成幾個更小的三角形，這些小三角形的聯集「精確等於」原三角形本身
 * （不多不少、不重疊），所以只要起始的種子圖案本身合法，遞迴細分幾輪之後，
 * 整塊拼圖依然是合法、無縫、不重疊的 Penrose 鋪磚——不需要額外的邊界匹配規則檢查。
 *
 * 渲染時把「同色、共用底邊」的兩個三角形合併回一片菱形（薄菱形＝2 個銳角三角形、
 * 厚菱形＝2 個鈍角三角形），呈現傳統上大家認得出來的 Penrose 菱形鋪磚樣式。
 */

export interface PenrosePoint {
  x: number;
  y: number;
}

export type PenroseTileKind = "thin" | "thick";

export interface PenroseTile {
  kind: PenroseTileKind;
  points: PenrosePoint[]; // 4 點＝完整菱形；3 點＝拼圖最外緣尚未配對的半片（會被 clip-path 裁掉）
  center: PenrosePoint;
}

export interface PenroseSupertile {
  tiles: PenroseTile[];
  boundary: PenrosePoint[]; // 種子圖案的外緣十邊形；細分不會改變這個外緣（見檔頭說明）
}

const PHI = (1 + Math.sqrt(5)) / 2;

type TriangleColor = 0 | 1; // 0＝銳角三角形(薄菱形的一半)，1＝鈍角三角形(厚菱形的一半)

interface Triangle {
  color: TriangleColor;
  a: PenrosePoint; // 頂角(apex)：色 0 為 36°、色 1 為 108°
  b: PenrosePoint; // 底邊兩端點
  c: PenrosePoint;
}

function lerp(from: PenrosePoint, to: PenrosePoint, t: number): PenrosePoint {
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}

function createSeedWheel(): { triangles: Triangle[]; boundary: PenrosePoint[] } {
  const center: PenrosePoint = { x: 0, y: 0 };
  const rim: PenrosePoint[] = [];
  for (let i = 0; i < 10; i += 1) {
    const angle = (i * Math.PI) / 5; // 每片 36°，10 片湊滿 360°
    rim.push({ x: Math.cos(angle), y: Math.sin(angle) });
  }
  const triangles: Triangle[] = [];
  for (let i = 0; i < 10; i += 1) {
    triangles.push({ color: 0, a: center, b: rim[i], c: rim[(i + 1) % 10] });
  }
  return { triangles, boundary: rim };
}

/** 依 Robinson 三角形細分規則，把每個三角形換成更小的子三角形（銳角→2 片、鈍角→3 片）。 */
function subdivide(triangles: Triangle[]): Triangle[] {
  const result: Triangle[] = [];
  for (const tri of triangles) {
    if (tri.color === 0) {
      const p = lerp(tri.a, tri.b, 1 / PHI);
      result.push({ color: 0, a: tri.c, b: p, c: tri.b });
      result.push({ color: 1, a: p, b: tri.c, c: tri.a });
    } else {
      const q = lerp(tri.b, tri.a, 1 / PHI);
      const r = lerp(tri.b, tri.c, 1 / PHI);
      result.push({ color: 1, a: r, b: tri.c, c: tri.a });
      result.push({ color: 1, a: q, b: r, c: tri.b });
      result.push({ color: 0, a: r, b: q, c: tri.a });
    }
  }
  return result;
}

function edgeKey(p: PenrosePoint, q: PenrosePoint): string {
  const pKey = `${Math.round(p.x * 1e6)},${Math.round(p.y * 1e6)}`;
  const qKey = `${Math.round(q.x * 1e6)},${Math.round(q.y * 1e6)}`;
  return pKey < qKey ? `${pKey}|${qKey}` : `${qKey}|${pKey}`;
}

function averagePoint(points: PenrosePoint[]): PenrosePoint {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

/**
 * 把「同色、共用底邊(b-c)」的三角形兩兩合併成菱形。
 * 底邊落在整塊拼圖最外緣（十邊形邊界）的三角形找不到配對，維持三點的半片——
 * 這些只出現在最外圍，之後會被 clip-path 裁掉，不影響鋪磚本體的無縫性。
 */
function mergeIntoRhombi(triangles: Triangle[]): PenroseTile[] {
  const byEdge = new Map<string, Triangle[]>();
  for (const triangle of triangles) {
    const key = edgeKey(triangle.b, triangle.c);
    const bucket = byEdge.get(key);
    if (bucket) bucket.push(triangle);
    else byEdge.set(key, [triangle]);
  }

  const tiles: PenroseTile[] = [];
  const consumed = new Set<Triangle>();

  for (const bucket of byEdge.values()) {
    if (bucket.length === 2 && bucket[0].color === bucket[1].color) {
      const [first, second] = bucket;
      consumed.add(first);
      consumed.add(second);
      const points = [first.a, first.b, second.a, first.c];
      tiles.push({
        kind: first.color === 0 ? "thin" : "thick",
        points,
        center: averagePoint(points),
      });
    }
  }

  for (const triangle of triangles) {
    if (consumed.has(triangle)) continue;
    const points = [triangle.a, triangle.b, triangle.c];
    tiles.push({
      kind: triangle.color === 0 ? "thin" : "thick",
      points,
      center: averagePoint(points),
    });
  }

  return tiles;
}

export function buildPenroseSupertile(generations = 6): PenroseSupertile {
  const seed = createSeedWheel();
  let triangles = seed.triangles;
  for (let round = 0; round < generations; round += 1) triangles = subdivide(triangles);
  return {
    tiles: mergeIntoRhombi(triangles),
    boundary: seed.boundary,
  };
}
