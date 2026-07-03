/**
 * Hat aperiodic monotile substitution adapted from Craig S. Kaplan's hatviz.
 * Source: https://github.com/isohedral/hatviz (BSD-3-Clause).
 */

export interface EinsteinPoint {
  x: number;
  y: number;
}

type Matrix = [number, number, number, number, number, number];
type TileLabel = "H1" | "H" | "T" | "P" | "F";

interface Child {
  transform: Matrix;
  geometry: Geometry;
}

interface Geometry {
  shape: EinsteinPoint[];
  children?: Child[];
  label?: TileLabel;
}

export interface EinsteinTile {
  label: TileLabel;
  points: EinsteinPoint[];
  center: EinsteinPoint;
  mirrored: boolean;
}

const SQRT_3_OVER_2 = Math.sqrt(3) / 2;
const IDENTITY: Matrix = [1, 0, 0, 0, 1, 0];

const point = (x: number, y: number): EinsteinPoint => ({ x, y });
const add = (a: EinsteinPoint, b: EinsteinPoint): EinsteinPoint => point(a.x + b.x, a.y + b.y);
const subtract = (a: EinsteinPoint, b: EinsteinPoint): EinsteinPoint => point(a.x - b.x, a.y - b.y);
const hexPoint = (x: number, y: number): EinsteinPoint => point(x + y * 0.5, y * SQRT_3_OVER_2);

const HAT_OUTLINE = [
  hexPoint(0, 0), hexPoint(-1, -1), hexPoint(0, -2), hexPoint(2, -2),
  hexPoint(2, -1), hexPoint(4, -2), hexPoint(5, -1), hexPoint(4, 0),
  hexPoint(3, 0), hexPoint(2, 2), hexPoint(0, 3), hexPoint(0, 2), hexPoint(-1, 2),
];

function multiply(a: Matrix, b: Matrix): Matrix {
  return [
    a[0] * b[0] + a[1] * b[3],
    a[0] * b[1] + a[1] * b[4],
    a[0] * b[2] + a[1] * b[5] + a[2],
    a[3] * b[0] + a[4] * b[3],
    a[3] * b[1] + a[4] * b[4],
    a[3] * b[2] + a[4] * b[5] + a[5],
  ];
}

function transformPoint(matrix: Matrix, source: EinsteinPoint): EinsteinPoint {
  return point(
    matrix[0] * source.x + matrix[1] * source.y + matrix[2],
    matrix[3] * source.x + matrix[4] * source.y + matrix[5],
  );
}

function translate(x: number, y: number): Matrix {
  return [1, 0, x, 0, 1, y];
}

function rotate(angle: number): Matrix {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return [cosine, -sine, 0, sine, cosine, 0];
}

function rotateAbout(center: EinsteinPoint, angle: number): Matrix {
  return multiply(translate(center.x, center.y), multiply(rotate(angle), translate(-center.x, -center.y)));
}

function inverse(matrix: Matrix): Matrix {
  const determinant = matrix[0] * matrix[4] - matrix[1] * matrix[3];
  return [
    matrix[4] / determinant,
    -matrix[1] / determinant,
    (matrix[1] * matrix[5] - matrix[2] * matrix[4]) / determinant,
    -matrix[3] / determinant,
    matrix[0] / determinant,
    (matrix[2] * matrix[3] - matrix[0] * matrix[5]) / determinant,
  ];
}

function matchSegment(from: EinsteinPoint, to: EinsteinPoint): Matrix {
  return [to.x - from.x, from.y - to.y, from.x, to.y - from.y, to.x - from.x, from.y];
}

function matchTwo(
  fromA: EinsteinPoint,
  fromB: EinsteinPoint,
  toA: EinsteinPoint,
  toB: EinsteinPoint,
): Matrix {
  return multiply(matchSegment(toA, toB), inverse(matchSegment(fromA, fromB)));
}

function intersect(
  p1: EinsteinPoint,
  q1: EinsteinPoint,
  p2: EinsteinPoint,
  q2: EinsteinPoint,
): EinsteinPoint {
  const denominator = (q2.y - p2.y) * (q1.x - p1.x) - (q2.x - p2.x) * (q1.y - p1.y);
  const ratio = ((q2.x - p2.x) * (p1.y - p2.y) - (q2.y - p2.y) * (p1.x - p2.x)) / denominator;
  return point(p1.x + ratio * (q1.x - p1.x), p1.y + ratio * (q1.y - p1.y));
}

function leaf(label: TileLabel): Geometry {
  return { shape: HAT_OUTLINE, label };
}

function meta(shape: EinsteinPoint[], children: Child[]): Geometry {
  return { shape, children };
}

function addChild(parent: Geometry, transform: Matrix, geometry: Geometry): void {
  parent.children ??= [];
  parent.children.push({ transform, geometry });
}

function evaluateChild(parent: Geometry, childIndex: number, pointIndex: number): EinsteinPoint {
  const child = parent.children?.[childIndex];
  if (!child) throw new Error("Einstein metatile child is missing");
  return transformPoint(child.transform, child.geometry.shape[pointIndex]);
}

function recenter(parent: Geometry): void {
  const center = parent.shape.reduce((sum, p) => add(sum, p), point(0, 0));
  center.x /= parent.shape.length;
  center.y /= parent.shape.length;
  parent.shape = parent.shape.map((p) => subtract(p, center));
  for (const child of parent.children ?? []) {
    child.transform = multiply(translate(-center.x, -center.y), child.transform);
  }
}

function createInitialMetatiles(): [Geometry, Geometry, Geometry, Geometry] {
  const hHat = leaf("H");
  const h1Hat = leaf("H1");
  const tHat = leaf("T");
  const pHat = leaf("P");
  const fHat = leaf("F");

  const hOutline = [
    point(0, 0), point(4, 0), point(4.5, SQRT_3_OVER_2),
    point(2.5, 5 * SQRT_3_OVER_2), point(1.5, 5 * SQRT_3_OVER_2), point(-0.5, SQRT_3_OVER_2),
  ];
  const h = meta(hOutline, []);
  addChild(h, matchTwo(HAT_OUTLINE[5], HAT_OUTLINE[7], hOutline[5], hOutline[0]), hHat);
  addChild(h, matchTwo(HAT_OUTLINE[9], HAT_OUTLINE[11], hOutline[1], hOutline[2]), hHat);
  addChild(h, matchTwo(HAT_OUTLINE[5], HAT_OUTLINE[7], hOutline[3], hOutline[4]), hHat);
  addChild(
    h,
    multiply(translate(2.5, SQRT_3_OVER_2), multiply(
      [-0.5, -SQRT_3_OVER_2, 0, SQRT_3_OVER_2, -0.5, 0],
      [0.5, 0, 0, 0, -0.5, 0],
    )),
    h1Hat,
  );

  const tOutline = [point(0, 0), point(3, 0), point(1.5, 3 * SQRT_3_OVER_2)];
  const t = meta(tOutline, [{ transform: [0.5, 0, 0.5, 0, 0.5, SQRT_3_OVER_2], geometry: tHat }]);

  const pOutline = [point(0, 0), point(4, 0), point(3, 2 * SQRT_3_OVER_2), point(-1, 2 * SQRT_3_OVER_2)];
  const p = meta(pOutline, []);
  addChild(p, [0.5, 0, 1.5, 0, 0.5, SQRT_3_OVER_2], pHat);
  addChild(p, multiply(translate(0, 2 * SQRT_3_OVER_2), multiply(
    [0.5, SQRT_3_OVER_2, 0, -SQRT_3_OVER_2, 0.5, 0],
    [0.5, 0, 0, 0, 0.5, 0],
  )), pHat);

  const fOutline = [
    point(0, 0), point(3, 0), point(3.5, SQRT_3_OVER_2),
    point(3, 2 * SQRT_3_OVER_2), point(-1, 2 * SQRT_3_OVER_2),
  ];
  const f = meta(fOutline, []);
  addChild(f, [0.5, 0, 1.5, 0, 0.5, SQRT_3_OVER_2], fHat);
  addChild(f, multiply(translate(0, 2 * SQRT_3_OVER_2), multiply(
    [0.5, SQRT_3_OVER_2, 0, -SQRT_3_OVER_2, 0.5, 0],
    [0.5, 0, 0, 0, 0.5, 0],
  )), fHat);

  return [h, t, p, f];
}

function constructPatch(h: Geometry, t: Geometry, p: Geometry, f: Geometry): Geometry {
  const rules: Array<Array<number | "H" | "T" | "P" | "F">> = [
    ["H"], [0, 0, "P", 2], [1, 0, "H", 2], [2, 0, "P", 2], [3, 0, "H", 2],
    [4, 4, "P", 2], [0, 4, "F", 3], [2, 4, "F", 3], [4, 1, 3, 2, "F", 0],
    [8, 3, "H", 0], [9, 2, "P", 0], [10, 2, "H", 0], [11, 4, "P", 2],
    [12, 0, "H", 2], [13, 0, "F", 3], [14, 2, "F", 1], [15, 3, "H", 4],
    [8, 2, "F", 1], [17, 3, "H", 0], [18, 2, "P", 0], [19, 2, "H", 2],
    [20, 4, "F", 3], [20, 0, "P", 2], [22, 0, "H", 2], [23, 4, "F", 3],
    [23, 0, "F", 3], [16, 0, "P", 2], [9, 4, 0, 2, "T", 2], [4, 0, "F", 3],
  ];
  const shapes = { H: h, T: t, P: p, F: f };
  const patch = meta([], []);

  for (const rule of rules) {
    if (rule.length === 1) {
      addChild(patch, IDENTITY, shapes[rule[0] as keyof typeof shapes]);
      continue;
    }
    const children = patch.children ?? [];
    if (rule.length === 4) {
      const source = children[rule[0] as number];
      const edge = rule[1] as number;
      const target = shapes[rule[2] as keyof typeof shapes];
      const targetEdge = rule[3] as number;
      const from = transformPoint(source.transform, source.geometry.shape[(edge + 1) % source.geometry.shape.length]);
      const to = transformPoint(source.transform, source.geometry.shape[edge]);
      addChild(patch, matchTwo(
        target.shape[targetEdge], target.shape[(targetEdge + 1) % target.shape.length], from, to,
      ), target);
      continue;
    }
    const first = children[rule[0] as number];
    const second = children[rule[2] as number];
    const from = transformPoint(second.transform, second.geometry.shape[rule[3] as number]);
    const to = transformPoint(first.transform, first.geometry.shape[rule[1] as number]);
    const target = shapes[rule[4] as keyof typeof shapes];
    const targetEdge = rule[5] as number;
    addChild(patch, matchTwo(
      target.shape[targetEdge], target.shape[(targetEdge + 1) % target.shape.length], from, to,
    ), target);
  }
  return patch;
}

function constructMetatiles(patch: Geometry): [Geometry, Geometry, Geometry, Geometry] {
  const bps1 = evaluateChild(patch, 8, 2);
  const bps2 = evaluateChild(patch, 21, 2);
  const rotatedBps = transformPoint(rotateAbout(bps1, -2 * Math.PI / 3), bps2);
  const p72 = evaluateChild(patch, 7, 2);
  const p252 = evaluateChild(patch, 25, 2);
  const lowerLeft = intersect(bps1, rotatedBps, evaluateChild(patch, 6, 2), p72);
  let vector = subtract(evaluateChild(patch, 6, 2), lowerLeft);

  const hOutline = [lowerLeft, bps1];
  vector = transformPoint(rotate(-Math.PI / 3), vector);
  hOutline.push(add(hOutline[1], vector));
  hOutline.push(evaluateChild(patch, 14, 2));
  vector = transformPoint(rotate(-Math.PI / 3), vector);
  hOutline.push(subtract(hOutline[3], vector));
  hOutline.push(evaluateChild(patch, 6, 2));
  const h = meta(hOutline, []);

  const p = meta([p72, add(p72, subtract(bps1, lowerLeft)), bps1, lowerLeft], []);
  const f = meta([
    bps2, evaluateChild(patch, 24, 2), evaluateChild(patch, 25, 0),
    p252, add(p252, subtract(lowerLeft, bps1)),
  ], []);

  const children = patch.children ?? [];
  for (const index of [0, 9, 16, 27, 26, 6, 1, 8, 10, 15]) addChild(h, children[index].transform, children[index].geometry);
  for (const index of [7, 2, 3, 4, 28]) addChild(p, children[index].transform, children[index].geometry);
  for (const index of [21, 20, 22, 23, 24, 25]) addChild(f, children[index].transform, children[index].geometry);

  const a = hOutline[2];
  const b = add(hOutline[1], subtract(hOutline[4], hOutline[5]));
  const c = transformPoint(rotateAbout(b, -Math.PI / 3), a);
  const t = meta([b, c, a], []);
  addChild(t, children[11].transform, children[11].geometry);

  for (const tile of [h, t, p, f]) recenter(tile);
  return [h, t, p, f];
}

function flatten(geometry: Geometry, parent: Matrix, output: EinsteinTile[]): void {
  if (geometry.label) {
    const points = geometry.shape.map((p) => transformPoint(parent, p));
    const center = points.reduce((sum, p) => add(sum, p), point(0, 0));
    center.x /= points.length;
    center.y /= points.length;
    output.push({
      label: geometry.label,
      points,
      center,
      mirrored: parent[0] * parent[4] - parent[1] * parent[3] < 0,
    });
    return;
  }
  for (const child of geometry.children ?? []) {
    flatten(child.geometry, multiply(parent, child.transform), output);
  }
}

export function buildEinsteinHatPatch(substitutionRounds = 3): EinsteinTile[] {
  let metatiles = createInitialMetatiles();
  for (let round = 0; round < substitutionRounds; round += 1) {
    metatiles = constructMetatiles(constructPatch(...metatiles));
  }
  const output: EinsteinTile[] = [];
  flatten(metatiles[0], IDENTITY, output);
  return output;
}
