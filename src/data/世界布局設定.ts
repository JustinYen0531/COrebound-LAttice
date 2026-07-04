/**
 * @file 世界布局設定.ts
 * @description 負責四大世界的物件分布、商店與熔爐配置、雕像位置、祭壇節點與其他固定戰場配置資料。
 *              對應「doc/世界觀/世界觀與視覺圖鑑.md」§9.2（跨世界共同功能物件）、§9.3（各世界數量）。
 *
 *              純資料/演算：把「每個世界該有幾個熔爐/工作台/雕像/商店/祭壇 + 各家族熔爐綁定」
 *              收斂成單一真相來源，供生成系統與布局系統查用（座標散佈另由地圖系統負責）。
 */

import type { Family, World } from "./成員型別";

/** 各世界的功能設施數量（機制指南 §9.2 / 世界觀 §9.3）。 */
export interface FacilityLayout {
  /** 家族專用熔爐數 */
  furnaces: number;
  /** 裝備工作台數 */
  workbenches: number;
  /** 成員解鎖雕像數 */
  statues: number;
  /** 流浪商店數 */
  shops: number;
  /** 守護者召喚祭壇數 */
  guardianAltars: number;
}

export const WORLD_FACILITY_LAYOUT: Record<World, FacilityLayout> = {
  geometry: { furnaces: 2, workbenches: 2, statues: 5, shops: 1, guardianAltars: 1 },
  organic: { furnaces: 2, workbenches: 2, statues: 5, shops: 1, guardianAltars: 1 },
  fractal: { furnaces: 3, workbenches: 3, statues: 5, shops: 1, guardianAltars: 1 },
  mechanical: { furnaces: 3, workbenches: 3, statues: 5, shops: 1, guardianAltars: 1 },
};

/** 家族熔爐分布（機制指南 §9.2：5 家族各 2 熔爐，散落四世界）。 */
export const FURNACE_FAMILY_DISTRIBUTION: Array<{ family: Family; world: World }> = [
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

/** 各世界環境物件數量（世界觀 §9.3；資源礦統一 15）。 */
export interface EnvLayout {
  /** 障礙物：兩種各自數量 [第一種, 第二種] */
  obstacles: [number, number];
  /** 資源礦物數 */
  resourceNodes: number;
  /** 環境機關數 */
  mechanisms: number;
}

export const WORLD_ENV_LAYOUT: Record<World, EnvLayout> = {
  geometry: { obstacles: [20, 8], resourceNodes: 15, mechanisms: 6 },
  organic: { obstacles: [18, 12], resourceNodes: 15, mechanisms: 8 },
  fractal: { obstacles: [22, 10], resourceNodes: 15, mechanisms: 5 },
  mechanical: { obstacles: [16, 8], resourceNodes: 15, mechanisms: 8 },
};

/** 各世界怪物數量（世界觀 §9.3）。 */
export interface MonsterLayout {
  /** T0 資源怪 */
  t0: number;
  /** T1 每種 */
  t1PerType: number;
  /** T1 種類數 */
  t1Types: number;
  /** T2 每種 */
  t2PerType: number;
  /** T2 種類數 */
  t2Types: number;
}

export const WORLD_MONSTER_LAYOUT: Record<World, MonsterLayout> = {
  geometry: { t0: 15, t1PerType: 10, t1Types: 3, t2PerType: 3, t2Types: 2 },
  organic: { t0: 15, t1PerType: 10, t1Types: 3, t2PerType: 3, t2Types: 2 },
  fractal: { t0: 15, t1PerType: 10, t1Types: 3, t2PerType: 3, t2Types: 2 },
  mechanical: { t0: 15, t1PerType: 10, t1Types: 3, t2PerType: 3, t2Types: 2 },
};

/** 全局共同物件總數（機制指南 §9.2）。 */
export const GLOBAL_COMMON_OBJECTS = {
  guardianAltars: 4, // 四世界各 1
  statues: 20, // 四世界各 5
  furnaces: 10, // 5 家族各 2
  workbenches: 10,
  shops: 4,
  colaAltar: 1, // 中央廣場 COLA 裝配儀
} as const;

/** 便捷：某世界綁定的熔爐家族清單。 */
export function furnacesInWorld(world: World): Family[] {
  return FURNACE_FAMILY_DISTRIBUTION.filter((f) => f.world === world).map((f) => f.family);
}
