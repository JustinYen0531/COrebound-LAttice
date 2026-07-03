/**
 * @file 地圖物件資料.ts
 * @description 大地圖上所有 placeholder 物件的資料模型與實例。
 *              對應「doc/世界觀/世界觀與視覺圖鑑.md」§9(全局地圖佈局與物件數量分佈)。
 *
 *              地圖結構(§9.1):中央廣場為起點,四大世界向四方位星狀延伸。
 *              - 中央廣場 (0,0):安全區,含中央傳送陣 + COLA 裝配儀
 *              - 幾何世界(+X 東):2 熔爐 + 2 工作台 + 5 雕像 + 1 商店 + 1 祭壇
 *              - 有機世界(-Y 南):2 熔爐 + 2 工作台 + 5 雕像 + 1 商店 + 1 祭壇
 *              - 分形世界(-X 西):3 熔爐 + 3 工作台 + 5 雕像 + 1 商店 + 1 祭壇
 *              - 機械世界(+Y 北):3 熔爐 + 3 工作台 + 5 雕像 + 1 商店 + 1 祭壇
 *
 *              座標系:網格座標 (x, y),1 單位 = 1 格。
 *              玩家與物件的「靠近」以歐幾里得距離 ≤ NEAR_RADIUS 判定。
 */

import type { World } from "./成員型別";
import { MEMBERS } from "./成員資料庫";
import type { Family } from "./成員型別";

// ============================================================
// 一、地圖區域
// ============================================================

export type Region = "plaza" | World;

export const REGION_LABEL: Record<Region, string> = {
  plaza: "中央廣場",
  geometry: "幾何世界",
  organic: "有機世界",
  fractal: "分形世界",
  mechanical: "機械世界",
};

/** 各世界相對中央的方位單位向量(星狀延伸) */
export const REGION_DIRECTION: Record<Exclude<Region, "plaza">, { dx: number; dy: number }> = {
  geometry: { dx: 1, dy: 0 }, // 東
  organic: { dx: 0, dy: -1 }, // 南
  fractal: { dx: -1, dy: 0 }, // 西
  mechanical: { dx: 0, dy: 1 }, // 北
};

// ============================================================
// 二、物件種類(對應既有 互動設施 型別 + 非互動裝飾)
// ============================================================

/** 可互動的設施種類(對應 共用型別.互動設施,擴充工作台與裝配儀) */
export type FacilityKind =
  | "合成" // 裝備工作台(合成/升星/附魔/技能升級)
  | "熔爐" // 家族專用熔爐(材料 → 家族碎片)
  | "雕像" // 成員解鎖雕像(0→1★)
  | "商店" // 流浪商店(藥水買賣 + 材料回收)
  | "召喚"; // 守護者祭壇 / COLA 裝配儀

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

// ============================================================
// 三、地圖物件定義
// ============================================================

export interface MapObject {
  /** 穩定 id */
  id: string;
  /** 種類 */
  kind: FacilityKind;
  /** 所屬區域 */
  region: Region;
  /** 網格座標 */
  x: number;
  y: number;
  /** 顯示名稱 */
  label: string;
  /** 細節(滑鼠停留提示用) */
  detail?: string;
  /** 熔爐所屬家族(僅 kind=熔爐) */
  family?: Family;
  /** 雕像對應的成員 no(僅 kind=雕像) */
  memberNo?: number;
  /** 召喚祭壇的類型(T3 守護者 vs T4 COLA 裝配儀) */
  summonType?: "guardian" | "cola";
}

// ============================================================
// 四、靠近判定
// ============================================================

/** 玩家與物件相距多少格內視為「靠近」(可互動) */
export const NEAR_RADIUS = 1.5;

export function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function isNear(player: { x: number; y: number }, obj: MapObject): boolean {
  return distance(player, obj) <= NEAR_RADIUS;
}

// ============================================================
// 五、生成大地圖的所有物件(遵循世界觀 §9.2-9.3 數量)
// ============================================================

/**
 * 家族熔爐在世界間的分佈(§9.2 + 各世界 §9.3):
 * - 護盾熔爐:幾何、機械
 * - 多發熔爐:有機、幾何
 * - 直線熔爐:分形、有機
 * - 地雷熔爐:機械、分形
 * - 激光熔爐:分形、機械
 * 每家族 2 個,共 10 個。
 */
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

/**
 * 工作台分佈(§9.3):幾何 2、有機 2、分形 3、機械 3 = 10 個
 * 雕像分佈:每世界 5 尊,對應該世界 5 名成員
 * 商店:每世界中途 1 個,共 4 個
 * 守護者祭壇:每世界中央 1 個,共 4 個
 */
function buildMapObjects(): MapObject[] {
  const objs: MapObject[] = [];
  const worldDepth = 5;

  // ---- 中央廣場:COLA 裝配儀 + 傳送陣 ----
  objs.push({
    id: "summon_cola",
    kind: "召喚",
    region: "plaza",
    x: 0,
    y: 0,
    label: "COLA 裝配儀",
    detail: "集滿四枚世界晶核印記後,插入印記召喚最終 Boss COLA。",
    summonType: "cola",
  });

  // ---- 各世界的物件 ----
  const worlds: World[] = ["geometry", "organic", "fractal", "mechanical"];
  for (const world of worlds) {
    const dir = REGION_DIRECTION[world];
    // 該世界沿方位向延伸,物件散落在距中央 4~10 格的範圍

    // 守護者祭壇(該世界正中央區域) — 放在 baseR 處
    objs.push({
      id: `altar_${world}`,
      kind: "召喚",
      region: world,
      x: dir.dx * worldDepth,
      y: dir.dy * worldDepth,
      label: `${REGION_LABEL[world]}守護者祭壇`,
      detail: `擊殺 ${REGION_LABEL[world]} 的 T2 精英 3 隻 + T1 雜兵三種各 5 隻後,在此召喚 T3 守護者。`,
      summonType: "guardian",
    });

    // 商店(中途安全屋) — 放在 baseR+2 處的側偏
    const perp = { dx: -dir.dy, dy: dir.dx }; // 垂直方向
    objs.push({
      id: `shop_${world}`,
      kind: "商店",
      region: world,
      x: dir.dx * (worldDepth + 2) + perp.dx * 1,
      y: dir.dy * (worldDepth + 2) + perp.dy * 1,
      label: `${REGION_LABEL[world]} 流浪商店`,
      detail: "出售生命/能量/混合藥水與本世界特色 Buff;收購材料(本世界材料 +20% 溢價)。",
    });

    // 雕像(5 尊,對應該世界成員)
    const worldMembers = MEMBERS.filter((m) => m.world === world);
    worldMembers.forEach((m, i) => {
      const offset = i - 2; // -2..2
      objs.push({
        id: `statue_${m.id}`,
        kind: "雕像",
        region: world,
        x: dir.dx * (worldDepth + 3) + perp.dx * offset,
        y: dir.dy * (worldDepth + 3) + perp.dy * offset,
        label: `${m.nameZh} 雕像`,
        detail: `一次性 0→1★ 解鎖 ${m.nameZh}(${m.nameEn})。解鎖後雕像永久消失。`,
        memberNo: m.no,
      });
    });

    // 工作台(幾何/有機各 2,分形/機械各 3)
    const workbenchCount = world === "geometry" || world === "organic" ? 2 : 3;
    for (let i = 0; i < workbenchCount; i++) {
      const offset = (i - (workbenchCount - 1) / 2) * 2;
      objs.push({
        id: `workbench_${world}_${i}`,
        kind: "合成",
        region: world,
        x: dir.dx * (worldDepth + 5) + perp.dx * offset,
        y: dir.dy * (worldDepth + 5) + perp.dy * offset,
        label: `${REGION_LABEL[world]} 工作台 ${i + 1}`,
        detail: "小隊管理、附魔鑲嵌、技能升級、成員合成與升星。",
      });
    }
  }

  // ---- 家族熔爐(依 FURNACE_DISTRIBUTION)----
  // 每世界 2~3 個,放在該世界更深處
  const furnacesPerWorld: Record<World, number> = { geometry: 0, organic: 0, fractal: 0, mechanical: 0 };
  FURNACE_DISTRIBUTION.forEach((f, idx) => {
    const dir = REGION_DIRECTION[f.world];
    const perp = { dx: -dir.dy, dy: dir.dx };
    const localIdx = furnacesPerWorld[f.world]++;
    const offset = (localIdx - 0.5) * 3;
    objs.push({
      id: `furnace_${f.family}_${f.world}`,
      kind: "熔爐",
      region: f.world,
      x: dir.dx * (worldDepth + 7) + perp.dx * offset,
      y: dir.dy * (worldDepth + 7) + perp.dy * offset,
      label: `${FAMILY_LABEL_ZH[f.family]}家族熔爐(${REGION_LABEL[f.world]})`,
      detail: `投入生物材料熔煉為${FAMILY_LABEL_ZH[f.family]}家族碎片。投入本世界特產材料額外 +20% 產出。`,
      family: f.family,
    });
    void idx;
  });

  return objs;
}

/** 全地圖所有物件(常數,啟動時生成一次) */
export const MAP_OBJECTS: readonly MapObject[] = buildMapObjects();

// ============================================================
// 六、查詢 API
// ============================================================

export function objectsByRegion(region: Region): MapObject[] {
  return MAP_OBJECTS.filter((o) => o.region === region);
}

export function objectsByKind(kind: FacilityKind): MapObject[] {
  return MAP_OBJECTS.filter((o) => o.kind === kind);
}

/** 找出玩家目前「靠近」的所有物件(可能多個,取最近的主要) */
export function nearbyObjects(player: { x: number; y: number }): MapObject[] {
  return MAP_OBJECTS.filter((o) => isNear(player, o)).sort(
    (a, b) => distance(player, a) - distance(player, b),
  );
}

/** 地圖邊界(供玩家移動限制) */
export const MAP_BOUNDS = {
  minX: -14,
  maxX: 14,
  minY: -14,
  maxY: 14,
};

// ============================================================
// 七、數量自檢常數(供測試對照世界觀 §9.2)
// ============================================================
export const EXPECTED_COUNTS = {
  furnace: 10, // 5 家族 × 2
  workbench: 10, // 2+2+3+3
  statue: 20, // 4 世界 × 5
  shop: 4, // 4 世界 × 1
  guardianAltar: 4, // 4 世界 × 1
  colaAltar: 1, // 中央
  totalFacilities: 49, // 10+10+20+4+4+1
} as const;
