/**
 * @file 角色升星.ts
 * @description 負責小隊隊員的星級升星 (0->1★->2★->3★) 判定，消耗生物材料與家族碎片
 *              （不消耗原石，遵照 5-3-1 比例），並套用相應的屬性倍率。
 *              對應「doc/系統機制/機制指南.md」§1.1、成員資料庫 STAR_RECIPE / FAMILY_SHARD_COST。
 *
 *              純演算：吃「目標星級 + 玩家持有材料/碎片」→ 是否可升星 + 升星後扣除清單。
 */

import { STAR_RECIPE, FAMILY_SHARD_COST, memberStatsAtStar } from "../data/成員資料庫";
import type { MemberDef, StarLevel } from "../data/成員型別";

/** 升星所需資源（5-3-1 配方 + 碎片）。 */
export interface StarUpCost {
  /** 本級高級材料數 */
  fineCurrent: number;
  /** 本級普通材料數 */
  commonCurrent: number;
  /** 上一級高級材料數（0→1★ 為 0） */
  finePrev: number;
  /** 家族碎片 */
  shards: number;
}

/** 玩家目前持有量（僅升星判定需要的欄位）。 */
export interface StarUpInventory {
  fineCurrent: number;
  commonCurrent: number;
  finePrev: number;
  shards: number;
}

/** 取升到 targetStar 的成本。 */
export function starUpCost(targetStar: StarLevel): StarUpCost {
  const recipe = STAR_RECIPE[targetStar];
  return {
    fineCurrent: recipe.fineCurrent,
    commonCurrent: recipe.commonCurrent,
    finePrev: recipe.finePrev,
    shards: FAMILY_SHARD_COST[targetStar],
  };
}

/** 是否足以升星。 */
export function canStarUp(inv: StarUpInventory, targetStar: StarLevel): boolean {
  const c = starUpCost(targetStar);
  return (
    inv.fineCurrent >= c.fineCurrent &&
    inv.commonCurrent >= c.commonCurrent &&
    inv.finePrev >= c.finePrev &&
    inv.shards >= c.shards
  );
}

/** 升星結果。 */
export interface StarUpResult {
  ok: boolean;
  /** 失敗原因（ok=true 時為空） */
  reason?: string;
  /** 升星後星級 */
  newStar?: StarLevel;
  /** 扣除後的剩餘持有量 */
  remaining?: StarUpInventory;
  /** 升星後的實際數值 */
  newStats?: ReturnType<typeof memberStatsAtStar>;
}

/**
 * 嘗試把成員從 currentStar 升到 currentStar+1。
 * @param currentStar 0 表示尚未解鎖（0→1★ 由雕像/解鎖流程處理，這裡從 1★ 起可升）
 */
export function tryStarUp(
  member: MemberDef,
  currentStar: 0 | StarLevel,
  inv: StarUpInventory,
): StarUpResult {
  if (currentStar >= 3) return { ok: false, reason: "已達最高星級 3★" };
  const target = (currentStar + 1) as StarLevel;
  if (!canStarUp(inv, target)) return { ok: false, reason: "材料或碎片不足" };
  const c = starUpCost(target);
  return {
    ok: true,
    newStar: target,
    remaining: {
      fineCurrent: inv.fineCurrent - c.fineCurrent,
      commonCurrent: inv.commonCurrent - c.commonCurrent,
      finePrev: inv.finePrev - c.finePrev,
      shards: inv.shards - c.shards,
    },
    newStats: memberStatsAtStar(member, target),
  };
}
