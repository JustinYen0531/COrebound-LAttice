/**
 * @file 工作台製作.ts
 * @description 負責工作台上的角色合成、升星材料檢查、技能合成入口，以及各類配方與消耗條件的整理。
 *              對應「doc/系統機制/機制指南.md」§1.1（技能升星：碎片+原石）、成員升星（5-3-1）。
 *
 *              純演算：工作台是「升星/技能合成」的統一入口，把持有資源與目標配方比對，
 *              產出可行性與扣除清單。成員升星委由 progression/角色升星，技能升星本檔定義。
 */

import { FAMILY_SHARD_COST } from "../data/成員資料庫";
import type { StarLevel } from "../data/成員型別";

/** 技能（武器）升星成本：碎片 + 原石（機制指南 §1.1 表；不消耗怪物材料）。 */
export interface WeaponUpgradeCost {
  shards: number;
  gems: number;
}

export const WEAPON_UPGRADE_COST: Record<StarLevel, WeaponUpgradeCost> = {
  1: { shards: FAMILY_SHARD_COST[1], gems: 100 },
  2: { shards: FAMILY_SHARD_COST[2], gems: 400 },
  3: { shards: FAMILY_SHARD_COST[3], gems: 1200 },
};

/** 玩家在此家族的資源持有。 */
export interface CraftInventory {
  shards: number;
  gems: number;
}

/** 技能升星結果。 */
export interface WeaponUpgradeResult {
  ok: boolean;
  reason?: string;
  newStar?: StarLevel;
  remaining?: CraftInventory;
}

/**
 * 技能（武器）升星：需要「家族人數/累計星級」前置由 技能管理.ts 先判定，
 * 這裡只處理資源消耗（碎片 + 原石）。
 * @param currentStar 目前武器星級（0 = 尚未合成）
 * @param familyUnlockedStar 技能管理算出的家族可用最高星級（前置門檻）
 */
export function upgradeWeapon(
  currentStar: 0 | StarLevel,
  familyUnlockedStar: 0 | StarLevel,
  inv: CraftInventory,
): WeaponUpgradeResult {
  if (currentStar >= 3) return { ok: false, reason: "武器已達 3★" };
  const target = (currentStar + 1) as StarLevel;
  const cost = WEAPON_UPGRADE_COST[target];
  if (inv.shards < cost.shards || inv.gems < cost.gems) {
    return { ok: false, reason: "碎片或原石不足" };
  }
  return {
    ok: true,
    newStar: target,
    remaining: { shards: inv.shards - cost.shards, gems: inv.gems - cost.gems },
  };
}

/** 工作台可執行的作業種類。 */
export type WorkbenchAction = "member_starup" | "weapon_upgrade" | "enchant_socket";

/** 工作台入口清單（供 UI 列出可做的事）。 */
export const WORKBENCH_ACTIONS: Array<{ action: WorkbenchAction; label: string }> = [
  { action: "member_starup", label: "成員升星（5-3-1 生物材料 + 家族碎片）" },
  { action: "weapon_upgrade", label: "武器技能升星（家族碎片 + 原石）" },
  { action: "enchant_socket", label: "附魔鑲嵌（依成員星級解鎖插槽）" },
];
