/**
 * @file 熔爐熔煉.ts
 * @description 處理 10 個家族熔爐中生物材料熔煉轉化為家族通用碎片的公式，
 *              計算同世界材料熔煉獲得額外 +20% 家族碎片的產出加成。
 *              對應「doc/系統機制/機制指南.md」§5（家族熔爐與碎片）。
 *
 *              純演算：材料（星級/稀有度）+ 是否地緣 → 碎片產出量，委由 素材資料庫.shardFromMaterial。
 */

import { findMaterial, shardFromMaterial, type MaterialDef } from "../data/素材資料庫";
import type { Family } from "../data/成員型別";
import type { World } from "../data/成員型別";

/** 熔爐配置（機制指南 §9.2：幾何 2、有機 2、分形 3、機械 3，共 10 個，各綁一家族）。 */
export interface FurnaceDef {
  family: Family;
  world: World;
}

/** 一次熔煉的請求：把一批材料投入某家族熔爐。 */
export interface SmeltRequest {
  furnace: FurnaceDef;
  /** 投入的材料（materialNo → 數量） */
  inputs: Array<{ materialNo: number; count: number }>;
}

/** 熔煉結果。 */
export interface SmeltResult {
  family: Family;
  /** 產出的家族碎片總數 */
  shards: number;
  /** 因地緣加成而多產的碎片數（供 UI 顯示 +20%） */
  localBonusShards: number;
  /** 逐項明細 */
  breakdown: Array<{ materialNo: number; count: number; shardsEach: number; local: boolean }>;
}

/** 材料是否為熔爐所在世界的特產（地緣 +20%）。 */
export function isLocalMaterial(mat: MaterialDef, furnace: FurnaceDef): boolean {
  return mat.world === furnace.world;
}

/**
 * 執行熔煉：逐項把材料轉為碎片，地緣材料額外 +20%。
 * 通關道具（world="core"）的 shardFromMaterial 回傳 0，自然不可熔煉。
 */
export function smelt(req: SmeltRequest): SmeltResult {
  let shards = 0;
  let localBonusShards = 0;
  const breakdown: SmeltResult["breakdown"] = [];

  for (const line of req.inputs) {
    const mat = findMaterial(line.materialNo);
    if (!mat || line.count <= 0) continue;
    const local = isLocalMaterial(mat, req.furnace);
    const each = shardFromMaterial(mat, local);
    const baseEach = shardFromMaterial(mat, false);
    const total = each * line.count;
    shards += total;
    if (local) localBonusShards += (each - baseEach) * line.count;
    breakdown.push({ materialNo: line.materialNo, count: line.count, shardsEach: each, local });
  }

  return { family: req.furnace.family, shards, localBonusShards, breakdown };
}
