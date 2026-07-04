/**
 * @file 技能管理.ts
 * @description 負責解鎖與啟用武器技能，動態檢查上陣隊伍中同家族成員的人數與「累計總星級」門檻
 *              （1★需 2 人+累計 2★, 2★需 3 人+累計 5★, 3★需 4 人+累計 9★）。
 *              對應「doc/系統機制/機制指南.md」§1.1（家族星級啟用條件）。
 *
 *              純演算：吃上陣名單（家族 + 個人星級），算出每個家族目前可啟用到幾星武器。
 */

import type { Family, StarLevel } from "../data/成員型別";
import type { WeaponFamily } from "../data/戰鬥原語";

/** 一名上陣成員在技能判定上需要的最小資訊。 */
export interface DeployedMember {
  family: Family;
  /** 個人養成星級 1~3 */
  star: StarLevel;
}

/** 家族星級啟用門檻（機制指南 §1.1）。 */
export interface FamilyStarThreshold {
  /** 需要的最少同家族人數 */
  minCount: number;
  /** 需要的同家族累計總星級 */
  minTotalStar: number;
}

/** 1★/2★/3★ 武器的解鎖門檻。 */
export const FAMILY_STAR_THRESHOLDS: Record<StarLevel, FamilyStarThreshold> = {
  1: { minCount: 2, minTotalStar: 2 },
  2: { minCount: 3, minTotalStar: 5 },
  3: { minCount: 4, minTotalStar: 9 },
};

/** 某家族在當前隊伍下的技能可用度。 */
export interface FamilyWeaponStatus {
  family: WeaponFamily;
  /** 同家族上陣人數 */
  memberCount: number;
  /** 同家族累計總星級 */
  totalStar: number;
  /** 可啟用的最高武器星級（0 = 尚未解鎖任何武器） */
  unlockedStar: 0 | StarLevel;
}

/** 統計每個家族的人數與累計星級。 */
export function tallyFamilies(
  deployed: readonly DeployedMember[],
): Record<Family, { count: number; totalStar: number }> {
  const acc: Record<Family, { count: number; totalStar: number }> = {
    shield: { count: 0, totalStar: 0 },
    multishot: { count: 0, totalStar: 0 },
    straight: { count: 0, totalStar: 0 },
    mine: { count: 0, totalStar: 0 },
    laser: { count: 0, totalStar: 0 },
  };
  for (const m of deployed) {
    acc[m.family].count += 1;
    acc[m.family].totalStar += m.star;
  }
  return acc;
}

/** 由人數與累計星級推出可啟用的最高武器星級。 */
export function resolveUnlockedStar(count: number, totalStar: number): 0 | StarLevel {
  let best: 0 | StarLevel = 0;
  for (const star of [1, 2, 3] as StarLevel[]) {
    const t = FAMILY_STAR_THRESHOLDS[star];
    if (count >= t.minCount && totalStar >= t.minTotalStar) {
      best = star;
    }
  }
  return best;
}

/** 一次算出全部家族的武器可用度。 */
export function computeFamilyWeaponStatus(
  deployed: readonly DeployedMember[],
): FamilyWeaponStatus[] {
  const tally = tallyFamilies(deployed);
  return (Object.keys(tally) as Family[]).map((family) => {
    const { count, totalStar } = tally[family];
    return {
      family,
      memberCount: count,
      totalStar,
      unlockedStar: resolveUnlockedStar(count, totalStar),
    };
  });
}

/** 便捷：某家族目前是否已啟用（至少 1★ 武器）。 */
export function isFamilyActive(deployed: readonly DeployedMember[], family: Family): boolean {
  const t = tallyFamilies(deployed)[family];
  return resolveUnlockedStar(t.count, t.totalStar) >= 1;
}
