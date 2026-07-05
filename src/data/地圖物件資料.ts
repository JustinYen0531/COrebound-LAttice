/**
 * @file 地圖物件資料.ts
 * @description 戰場世界地圖的程序生成資料層。
 *
 *              本版從「固定小地圖展示板」改成：
 *              - 大尺寸世界座標(遠大於畫面)
 *              - 每次載入生成一張地圖
 *              - 各世界互動物件分散且不對稱
 *              - 玩家與設施的互動改用連續座標距離判定
 */

import { MEMBERS } from "./成員資料庫";
import type { Family, World } from "./成員型別";

// ============================================================
// 一、基礎列舉
// ============================================================

export type Region = "plaza" | World;

export const REGION_LABEL: Record<Region, string> = {
  plaza: "中央廣場",
  geometry: "幾何世界",
  organic: "有機世界",
  fractal: "分形世界",
  mechanical: "機械世界",
};

export const REGION_DIRECTION: Record<Exclude<Region, "plaza">, { dx: number; dy: number }> = {
  geometry: { dx: 1, dy: 0 },
  organic: { dx: 0, dy: 1 },
  fractal: { dx: -1, dy: 0 },
  mechanical: { dx: 0, dy: -1 },
};

export type FacilityKind = "合成" | "熔爐" | "雕像" | "商店" | "召喚";

export const FACILITY_GLYPH: Record<FacilityKind, string> = {
  合成: "🛠️",
  熔爐: "🔥",
  雕像: "🗿",
  商店: "🛒",
  召喚: "🔱",
};

export const FACILITY_LABEL: Record<FacilityKind, string> = {
  合成: "裝備工作台",
  熔爐: "家族熔爐",
  雕像: "成員雕像",
  商店: "流浪商店",
  召喚: "召喚祭壇",
};

export interface MapObject {
  id: string;
  kind: FacilityKind;
  region: Region;
  x: number;
  y: number;
  label: string;
  detail?: string;
  family?: Family;
  memberNo?: number;
  summonType?: "guardian" | "cola";
}

export interface MapZone {
  region: Region;
  centerX: number;
  centerY: number;
  labelX: number;
  labelY: number;
}

export interface DividerPoint {
  x: number;
  y: number;
}

export interface GeneratedMap {
  seed: number;
  worldHalfSize: number;
  plazaRadius: number;
  nearRadius: number;
  zones: MapZone[];
  verticalDivider: DividerPoint[];
  horizontalDivider: DividerPoint[];
  objects: MapObject[];
}

// ============================================================
// 二、地圖尺度
// ============================================================

// 邊長乘上 sqrt(2)，因此整張正方形地圖的總面積精確成為上一版的兩倍。
const MAP_HALF_SIZE = 4200 * Math.SQRT2;

export const MAP_BOUNDS = {
  minX: -MAP_HALF_SIZE,
  maxX: MAP_HALF_SIZE,
  minY: -MAP_HALF_SIZE,
  maxY: MAP_HALF_SIZE,
};

export const PLAZA_RADIUS = 520;
export const NEAR_RADIUS = 70;

const WORLD_HALF_SIZE = MAP_BOUNDS.maxX;
const OBJECT_MIN_DISTANCE = 420;
const MAP_EDGE_CLEARANCE = 480;
const DIVIDER_CLEARANCE = 420;

const FURNACE_DISTRIBUTION: { family: Family; world: World }[] = [
  { family: "shield", world: "geometry" },
  { family: "multishot", world: "geometry" },
  { family: "multishot", world: "organic" },
  { family: "straight", world: "organic" },
  { family: "straight", world: "fractal" },
  { family: "mine", world: "fractal" },
  { family: "laser", world: "fractal" },
  { family: "shield", world: "mechanical" },
  { family: "mine", world: "mechanical" },
  { family: "laser", world: "mechanical" },
];

const FAMILY_LABEL_ZH: Record<Family, string> = {
  shield: "護盾",
  multishot: "多發",
  straight: "直線",
  mine: "地雷",
  laser: "激光",
};

const WORLD_OBJECT_GRID_X = [1480, 2460, 3440, 4420] as const;
const WORLD_OBJECT_GRID_Y = [1480, 2460, 3440, 4420] as const;
const WORLD_OBJECT_GRID_ORDER = [0, 5, 10, 15, 3, 12, 6, 9, 1, 14, 4, 11, 2, 13, 7, 8] as const;

function worldSigns(world: World): { x: -1 | 1; y: -1 | 1 } {
  switch (world) {
    case "geometry":
      return { x: 1, y: -1 };
    case "fractal":
      return { x: -1, y: -1 };
    case "organic":
      return { x: -1, y: 1 };
    case "mechanical":
      return { x: 1, y: 1 };
  }
}

function buildWorldObjectAnchors(world: World): Array<{ x: number; y: number }> {
  const signs = worldSigns(world);
  return WORLD_OBJECT_GRID_ORDER.map((index) => {
    const col = index % 4;
    const row = Math.floor(index / 4);
    return {
      x: WORLD_OBJECT_GRID_X[col] * signs.x,
      y: WORLD_OBJECT_GRID_Y[row] * signs.y,
    };
  });
}

// ============================================================
// 三、亂數工具
// ============================================================

export interface RandomSource {
  next(): number;
  range(min: number, max: number): number;
  int(min: number, max: number): number;
}

export function createRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
  return {
    next,
    range(min, max) {
      return min + (max - min) * next();
    },
    int(min, max) {
      return Math.floor(min + (max - min + 1) * next());
    },
  };
}

function createMapSeed(): number {
  // 鎖定種子，讓世界分界與地圖物件都維持固定版本。
  return 0x51c0ffee;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distanceToSegment(point: DividerPoint, start: DividerPoint, end: DividerPoint): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return distance(point, start);
  const projection = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared;
  const t = Math.max(0, Math.min(1, projection));
  return distance(point, { x: start.x + dx * t, y: start.y + dy * t });
}

function distanceToDivider(point: DividerPoint, divider: DividerPoint[]): number {
  let nearest = Number.POSITIVE_INFINITY;
  for (let i = 0; i < divider.length - 1; i++) {
    nearest = Math.min(nearest, distanceToSegment(point, divider[i], divider[i + 1]));
  }
  return nearest;
}

function isInsidePlacementSafeZone(
  point: DividerPoint,
  verticalDivider: DividerPoint[],
  horizontalDivider: DividerPoint[],
): boolean {
  return (
    point.x >= MAP_BOUNDS.minX + MAP_EDGE_CLEARANCE &&
    point.x <= MAP_BOUNDS.maxX - MAP_EDGE_CLEARANCE &&
    point.y >= MAP_BOUNDS.minY + MAP_EDGE_CLEARANCE &&
    point.y <= MAP_BOUNDS.maxY - MAP_EDGE_CLEARANCE &&
    distanceToDivider(point, verticalDivider) >= DIVIDER_CLEARANCE &&
    distanceToDivider(point, horizontalDivider) >= DIVIDER_CLEARANCE
  );
}

// ============================================================
// 四、生成邏輯
// ============================================================

function buildWobblyDivider(
  random: RandomSource,
  orientation: "vertical" | "horizontal",
): DividerPoint[] {
  const points: DividerPoint[] = [];
  const steps = 16;
  const half = WORLD_HALF_SIZE;
  const majorAmp = 460;
  const minorAmp = 120;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const axis = -half + t * half * 2;
    const waveA = Math.sin(t * Math.PI * 2.3 + random.range(-0.8, 0.8)) * majorAmp;
    const waveB = Math.sin(t * Math.PI * 6.2 + random.range(-0.4, 0.4)) * minorAmp;
    const drift = random.range(-60, 60);
    const offset = waveA + waveB + drift;

    points.push(
      orientation === "vertical"
        ? { x: offset, y: axis }
        : { x: axis, y: offset },
    );
  }

  if (orientation === "vertical") {
    points[0].x = 0;
    points[Math.floor(points.length / 2)].x = 0;
    points[points.length - 1].x = 0;
  } else {
    points[0].y = 0;
    points[Math.floor(points.length / 2)].y = 0;
    points[points.length - 1].y = 0;
  }

  return points;
}

function interpolateDivider(points: DividerPoint[], value: number, axis: "x" | "y"): number {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const aAxis = axis === "x" ? a.x : a.y;
    const bAxis = axis === "x" ? b.x : b.y;
    if ((value >= aAxis && value <= bAxis) || (value >= bAxis && value <= aAxis)) {
      const denom = bAxis - aAxis || 1;
      const t = (value - aAxis) / denom;
      return axis === "x"
        ? a.y + (b.y - a.y) * t
        : a.x + (b.x - a.x) * t;
    }
  }

  const first = points[0];
  const last = points[points.length - 1];
  return axis === "x" ? (value < first.x ? first.y : last.y) : (value < first.y ? first.x : last.x);
}

function regionAtPoint(
  point: { x: number; y: number },
  verticalDivider: DividerPoint[],
  horizontalDivider: DividerPoint[],
): World {
  const xBoundary = interpolateDivider(verticalDivider, point.y, "y");
  const yBoundary = interpolateDivider(horizontalDivider, point.x, "x");
  const left = point.x < xBoundary;
  const top = point.y < yBoundary;

  if (!left && top) return "geometry";
  if (left && top) return "fractal";
  if (left && !top) return "organic";
  return "mechanical";
}

function buildZones(
  random: RandomSource,
  verticalDivider: DividerPoint[],
  horizontalDivider: DividerPoint[],
): MapZone[] {
  const zones: MapZone[] = [
    {
      region: "plaza",
      centerX: 0,
      centerY: 0,
      labelX: 0,
      labelY: 0,
    },
  ];

  const approximateLabels: Record<World, { x: number; y: number }> = {
    geometry: { x: WORLD_HALF_SIZE * 0.52, y: -WORLD_HALF_SIZE * 0.52 },
    fractal: { x: -WORLD_HALF_SIZE * 0.52, y: -WORLD_HALF_SIZE * 0.52 },
    organic: { x: -WORLD_HALF_SIZE * 0.52, y: WORLD_HALF_SIZE * 0.52 },
    mechanical: { x: WORLD_HALF_SIZE * 0.52, y: WORLD_HALF_SIZE * 0.52 },
  };

  const worlds: World[] = ["geometry", "organic", "fractal", "mechanical"];
  for (const world of worlds) {
    const labelBase = approximateLabels[world];
    const label = nudgePointIntoRegion(
      {
        x: labelBase.x + random.range(-240, 240),
        y: labelBase.y + random.range(-240, 240),
      },
      world,
      verticalDivider,
      horizontalDivider,
      random,
    );

    zones.push({
      region: world,
      centerX: label.x,
      centerY: label.y,
      labelX: label.x,
      labelY: label.y,
    });
  }

  return zones;
}

function findZone(zones: MapZone[], region: Region): MapZone {
  const zone = zones.find((entry) => entry.region === region);
  if (!zone) throw new Error(`找不到區域 ${region}`);
  return zone;
}

function samplePointInRegion(
  region: World,
  verticalDivider: DividerPoint[],
  horizontalDivider: DividerPoint[],
  random: RandomSource,
): { x: number; y: number } {
  const margin = 220;
  for (let attempt = 0; attempt < 150; attempt++) {
    const point = {
      x: random.range(MAP_BOUNDS.minX + margin, MAP_BOUNDS.maxX - margin),
      y: random.range(MAP_BOUNDS.minY + margin, MAP_BOUNDS.maxY - margin),
    };
    if (distance(point, { x: 0, y: 0 }) < PLAZA_RADIUS + 120) continue;
    if (regionAtPoint(point, verticalDivider, horizontalDivider) === region) return point;
  }

  return nudgePointIntoRegion({ x: 0, y: 0 }, region, verticalDivider, horizontalDivider, random);
}

export function placePoint(
  usedPoints: Array<{ x: number; y: number }>,
  region: World,
  verticalDivider: DividerPoint[],
  horizontalDivider: DividerPoint[],
  random: RandomSource,
  minDistance = OBJECT_MIN_DISTANCE,
): { x: number; y: number } | null {
  for (let attempt = 0; attempt < 500; attempt++) {
    const point = samplePointInRegion(region, verticalDivider, horizontalDivider, random);
    if (
      usedPoints.every((used) => distance(used, point) >= minDistance) &&
      isInsidePlacementSafeZone(point, verticalDivider, horizontalDivider)
    ) {
      usedPoints.push(point);
      return point;
    }
  }
  return null;
}

function nudgePointIntoRegion(
  point: { x: number; y: number },
  region: World,
  verticalDivider: DividerPoint[],
  horizontalDivider: DividerPoint[],
  random: RandomSource,
): { x: number; y: number } {
  let current = { ...point };
  for (let step = 0; step < 80; step++) {
    if (regionAtPoint(current, verticalDivider, horizontalDivider) === region) return current;
    const targetSigns: Record<World, { x: number; y: number }> = {
      geometry: { x: 1, y: -1 },
      fractal: { x: -1, y: -1 },
      organic: { x: -1, y: 1 },
      mechanical: { x: 1, y: 1 },
    };
    current = {
      x: current.x + targetSigns[region].x * random.range(80, 140),
      y: current.y + targetSigns[region].y * random.range(80, 140),
    };
  }
  return current;
}

function buildObjects(): MapObject[] {
  const objects: MapObject[] = [];
  const worlds: World[] = ["geometry", "organic", "fractal", "mechanical"];
  const worldAnchors: Record<World, Array<{ x: number; y: number }>> = {
    geometry: buildWorldObjectAnchors("geometry"),
    organic: buildWorldObjectAnchors("organic"),
    fractal: buildWorldObjectAnchors("fractal"),
    mechanical: buildWorldObjectAnchors("mechanical"),
  };
  const takeAnchor = (world: World): { x: number; y: number } | null => worldAnchors[world].shift() ?? null;
  const colaWorld: World = "mechanical";
  const colaPoint = takeAnchor(colaWorld);

  if (colaPoint) {
    objects.push({
      id: "summon_cola",
      kind: "召喚",
      region: colaWorld,
      x: colaPoint.x,
      y: colaPoint.y,
      label: "COLA 裝配儀",
      detail: "集滿四枚世界晶核印記後，插入印記召喚最終 Boss COLA。",
      summonType: "cola",
    });
  }

  for (const world of worlds) {
    const worldMembers = MEMBERS.filter((member) => member.world === world);
    const workbenchCount = world === "geometry" || world === "organic" ? 2 : 3;

    const altarPoint = takeAnchor(world);
    if (altarPoint) objects.push({
      id: `altar_${world}`,
      kind: "召喚",
      region: world,
      x: altarPoint.x,
      y: altarPoint.y,
      label: `${REGION_LABEL[world]}守護者祭壇`,
      detail: `擊殺 ${REGION_LABEL[world]} 的 T2 精英 3 隻 + T1 雜兵三種各 5 隻後，在此召喚 T3 守護者。`,
      summonType: "guardian",
    });

    const shopPoint = takeAnchor(world);
    if (shopPoint) objects.push({
      id: `shop_${world}`,
      kind: "商店",
      region: world,
      x: shopPoint.x,
      y: shopPoint.y,
      label: `${REGION_LABEL[world]}流浪商店`,
      detail: "出售生命/能量/混合藥水與本世界特色 Buff；收購材料(本世界材料 +20% 溢價)。",
    });

    for (let i = 0; i < workbenchCount; i++) {
      const point = takeAnchor(world);
      if (point) objects.push({
        id: `workbench_${world}_${i + 1}`,
        kind: "合成",
        region: world,
        x: point.x,
        y: point.y,
        label: `${REGION_LABEL[world]}工作台 ${i + 1}`,
        detail: "小隊管理、附魔鑲嵌、技能升級、成員合成與升星。",
      });
    }

    for (const member of worldMembers) {
      const point = takeAnchor(world);
      if (point) objects.push({
        id: `statue_${member.id}`,
        kind: "雕像",
        region: world,
        x: point.x,
        y: point.y,
        label: `${member.nameZh} 雕像`,
        detail: `一次性 0→1★ 解鎖 ${member.nameZh}(${member.nameEn})。解鎖後雕像永久消失。`,
        memberNo: member.no,
      });
    }
  }

  const furnacesPerWorld: Record<World, number> = {
    geometry: 0,
    organic: 0,
    fractal: 0,
    mechanical: 0,
  };

  for (const furnace of FURNACE_DISTRIBUTION) {
    const point = takeAnchor(furnace.world);
    if (!point) continue;
    furnacesPerWorld[furnace.world] += 1;

    objects.push({
      id: `furnace_${furnace.family}_${furnace.world}_${furnacesPerWorld[furnace.world]}`,
      kind: "熔爐",
      region: furnace.world,
      x: point.x,
      y: point.y,
      label: `${FAMILY_LABEL_ZH[furnace.family]}熔爐`,
      detail: `投入生物材料熔煉為${FAMILY_LABEL_ZH[furnace.family]}家族碎片。投入本世界特產材料額外 +20% 產出。`,
      family: furnace.family,
    });
  }

  return objects;
}

function buildGeneratedMap(seed: number): GeneratedMap {
  const random = createRandom(seed);
  const verticalDivider = buildWobblyDivider(random, "vertical");
  const horizontalDivider = buildWobblyDivider(random, "horizontal");
  const zones = buildZones(random, verticalDivider, horizontalDivider);
  const objects = buildObjects();

  return {
    seed,
    worldHalfSize: WORLD_HALF_SIZE,
    plazaRadius: PLAZA_RADIUS,
    nearRadius: NEAR_RADIUS,
    zones,
    verticalDivider,
    horizontalDivider,
    objects,
  };
}

// ============================================================
// 五、對外輸出
// ============================================================

export const MAP_SEED = createMapSeed();
export const GENERATED_MAP = buildGeneratedMap(MAP_SEED);
export const MAP_OBJECTS: readonly MapObject[] = GENERATED_MAP.objects;
export const MAP_ZONES: readonly MapZone[] = GENERATED_MAP.zones;
export const MAP_VERTICAL_DIVIDER: readonly DividerPoint[] = GENERATED_MAP.verticalDivider;
export const MAP_HORIZONTAL_DIVIDER: readonly DividerPoint[] = GENERATED_MAP.horizontalDivider;

export function objectsByRegion(region: Region): MapObject[] {
  return MAP_OBJECTS.filter((object) => object.region === region);
}

export function objectsByKind(kind: FacilityKind): MapObject[] {
  return MAP_OBJECTS.filter((object) => object.kind === kind);
}

export function nearbyObjects(player: { x: number; y: number }): MapObject[] {
  return MAP_OBJECTS.filter((object) => isNear(player, object)).sort(
    (a, b) => distance(player, a) - distance(player, b),
  );
}

export function isNear(player: { x: number; y: number }, object: MapObject): boolean {
  return distance(player, object) <= NEAR_RADIUS;
}

export const EXPECTED_COUNTS = {
  furnace: 10,
  workbench: 10,
  statue: 20,
  shop: 4,
  guardianAltar: 4,
  colaAltar: 1,
  totalFacilities: 49,
} as const;
