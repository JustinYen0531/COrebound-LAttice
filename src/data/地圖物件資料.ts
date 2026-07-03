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
  radiusX: number;
  radiusY: number;
  labelX: number;
  labelY: number;
}

export interface GeneratedMap {
  seed: number;
  worldHalfSize: number;
  plazaRadius: number;
  nearRadius: number;
  zones: MapZone[];
  objects: MapObject[];
}

// ============================================================
// 二、地圖尺度
// ============================================================

export const MAP_BOUNDS = {
  minX: -4200,
  maxX: 4200,
  minY: -4200,
  maxY: 4200,
};

export const PLAZA_RADIUS = 520;
export const NEAR_RADIUS = 70;

const WORLD_HALF_SIZE = MAP_BOUNDS.maxX;
const WORLD_ANCHOR_DISTANCE = 1500;
const OBJECT_MIN_DISTANCE = 120;

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

// ============================================================
// 三、亂數工具
// ============================================================

interface RandomSource {
  next(): number;
  range(min: number, max: number): number;
  int(min: number, max: number): number;
}

function createRandom(seed: number): RandomSource {
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
  const base = Date.now() & 0xffffffff;
  return base ^ 0x51c0ffee;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// ============================================================
// 四、生成邏輯
// ============================================================

function buildZones(random: RandomSource): MapZone[] {
  const zones: MapZone[] = [
    {
      region: "plaza",
      centerX: 0,
      centerY: 0,
      radiusX: PLAZA_RADIUS,
      radiusY: PLAZA_RADIUS,
      labelX: 0,
      labelY: 0,
    },
  ];

  const worlds: World[] = ["geometry", "organic", "fractal", "mechanical"];
  for (const world of worlds) {
    const dir = REGION_DIRECTION[world];
    const tangent = { dx: -dir.dy, dy: dir.dx };
    const axialJitter = random.range(-180, 180);
    const lateralJitter = random.range(-420, 420);
    const radiusX = random.range(1550, 2050);
    const radiusY = random.range(1450, 1950);
    const centerX = dir.dx * (WORLD_ANCHOR_DISTANCE + axialJitter) + tangent.dx * lateralJitter;
    const centerY = dir.dy * (WORLD_ANCHOR_DISTANCE + axialJitter) + tangent.dy * lateralJitter;

    zones.push({
      region: world,
      centerX,
      centerY,
      radiusX,
      radiusY,
      labelX: centerX + tangent.dx * random.range(-280, 280),
      labelY: centerY + tangent.dy * random.range(-280, 280),
    });
  }

  return zones;
}

function findZone(zones: MapZone[], region: Region): MapZone {
  const zone = zones.find((entry) => entry.region === region);
  if (!zone) throw new Error(`找不到區域 ${region}`);
  return zone;
}

function samplePointInZone(
  zone: MapZone,
  random: RandomSource,
  radialBand: [number, number],
): { x: number; y: number } {
  const angle = random.range(0, Math.PI * 2);
  const t = Math.sqrt(random.next());
  const bandRatio = radialBand[0] + (radialBand[1] - radialBand[0]) * t;
  const x = zone.centerX + Math.cos(angle) * zone.radiusX * bandRatio;
  const y = zone.centerY + Math.sin(angle) * zone.radiusY * bandRatio;
  return { x, y };
}

function placePoint(
  usedPoints: Array<{ x: number; y: number }>,
  zone: MapZone,
  random: RandomSource,
  radialBand: [number, number],
  minDistance = OBJECT_MIN_DISTANCE,
): { x: number; y: number } {
  for (let attempt = 0; attempt < 80; attempt++) {
    const point = samplePointInZone(zone, random, radialBand);
    if (
      usedPoints.every((used) => distance(used, point) >= minDistance) &&
      Math.abs(point.x) <= WORLD_HALF_SIZE - 20 &&
      Math.abs(point.y) <= WORLD_HALF_SIZE - 20
    ) {
      usedPoints.push(point);
      return point;
    }
  }

  const fallback = samplePointInZone(zone, random, radialBand);
  usedPoints.push(fallback);
  return fallback;
}

function buildObjects(zones: MapZone[], random: RandomSource): MapObject[] {
  const usedPoints: Array<{ x: number; y: number }> = [];
  const objects: MapObject[] = [];

  objects.push({
    id: "summon_cola",
    kind: "召喚",
    region: "plaza",
    x: random.range(-80, 80),
    y: random.range(-80, 80),
    label: "COLA 裝配儀",
    detail: "集滿四枚世界晶核印記後，插入印記召喚最終 Boss COLA。",
    summonType: "cola",
  });
  usedPoints.push({ x: 0, y: 0 });

  const worlds: World[] = ["geometry", "organic", "fractal", "mechanical"];
  for (const world of worlds) {
    const zone = findZone(zones, world);
    const worldMembers = MEMBERS.filter((member) => member.world === world);
    const workbenchCount = world === "geometry" || world === "organic" ? 2 : 3;

    const altarPoint = placePoint(usedPoints, zone, random, [0.08, 0.2], 180);
    objects.push({
      id: `altar_${world}`,
      kind: "召喚",
      region: world,
      x: altarPoint.x,
      y: altarPoint.y,
      label: `${REGION_LABEL[world]}守護者祭壇`,
      detail: `擊殺 ${REGION_LABEL[world]} 的 T2 精英 3 隻 + T1 雜兵三種各 5 隻後，在此召喚 T3 守護者。`,
      summonType: "guardian",
    });

    const shopPoint = placePoint(usedPoints, zone, random, [0.22, 0.42], 180);
    objects.push({
      id: `shop_${world}`,
      kind: "商店",
      region: world,
      x: shopPoint.x,
      y: shopPoint.y,
      label: `${REGION_LABEL[world]}流浪商店`,
      detail: "出售生命/能量/混合藥水與本世界特色 Buff；收購材料(本世界材料 +20% 溢價)。",
    });

    for (let i = 0; i < workbenchCount; i++) {
      const point = placePoint(usedPoints, zone, random, [0.32, 0.74], 165);
      objects.push({
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
      const point = placePoint(usedPoints, zone, random, [0.46, 0.96], 150);
      objects.push({
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
    const zone = findZone(zones, furnace.world);
    const point = placePoint(
      usedPoints,
      zone,
      random,
      furnacesPerWorld[furnace.world] === 0 ? [0.38, 0.78] : [0.58, 0.98],
      180,
    );
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
  const zones = buildZones(random);
  const objects = buildObjects(zones, random);

  return {
    seed,
    worldHalfSize: WORLD_HALF_SIZE,
    plazaRadius: PLAZA_RADIUS,
    nearRadius: NEAR_RADIUS,
    zones,
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
