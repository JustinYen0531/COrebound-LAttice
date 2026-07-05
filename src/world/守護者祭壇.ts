/**
 * @file 守護者祭壇.ts
 * @description 負責世界守護者召喚祭壇的啟用條件、進度追蹤、召喚儀式、晶核印記掉落，
 *              以及與世界進程系統的串接。
 *              對應「doc/系統機制/機制指南.md」§6.2（T3 守護者召喚條件）、§9.3（晶核印記）。
 *
 *              純演算：累計擊殺數 → 是否達標可召喚 → 召喚後標記守護者已擊敗、掉落印記。
 */

import type { World } from "../data/成員型別";

/** 召喚門檻（機制指南 §6.2）。 */
export const GUARDIAN_SUMMON_REQUIREMENT = {
  /** T2 中型精英累計擊殺數（該世界 2 種精英合計） */
  eliteKills: 3,
  /** T1 每種雜兵各需擊殺數 */
  minionKillsPerType: 5,
  /** T1 雜兵種類數 */
  minionTypes: 3,
} as const;

/** 該世界召喚進度追蹤。 */
export interface GuardianProgress {
  world: World;
  /** T2 精英累計擊殺 */
  eliteKills: number;
  /** 各 T1 雜兵種類的擊殺數（key = 怪物 no 或種類 id） */
  minionKills: Record<string, number>;
  /** 守護者是否已被召喚並擊敗 */
  guardianDefeated: boolean;
}

export function createGuardianProgress(world: World): GuardianProgress {
  return { world, eliteKills: 0, minionKills: {}, guardianDefeated: false };
}

/** 記錄一次擊殺。 */
export function recordKill(
  progress: GuardianProgress,
  tier: 1 | 2,
  minionType?: string,
): void {
  if (tier === 2) {
    progress.eliteKills += 1;
  } else if (tier === 1 && minionType) {
    progress.minionKills[minionType] = (progress.minionKills[minionType] ?? 0) + 1;
  }
}

/** 是否已達召喚門檻。 */
export function canSummonGuardian(progress: GuardianProgress): boolean {
  if (progress.eliteKills < GUARDIAN_SUMMON_REQUIREMENT.eliteKills) return false;
  const types = Object.values(progress.minionKills).filter(
    (n) => n >= GUARDIAN_SUMMON_REQUIREMENT.minionKillsPerType,
  ).length;
  return types >= GUARDIAN_SUMMON_REQUIREMENT.minionTypes;
}

/** 召喚進度摘要（供 UI 顯示 3/3 精英、5/5 雜兵…）。 */
export interface SummonReadiness {
  eliteDone: boolean;
  eliteKills: number;
  eliteNeeded: number;
  minionTypesDone: number;
  minionTypesNeeded: number;
  ready: boolean;
}

export function summonReadiness(progress: GuardianProgress): SummonReadiness {
  const minionTypesDone = Object.values(progress.minionKills).filter(
    (n) => n >= GUARDIAN_SUMMON_REQUIREMENT.minionKillsPerType,
  ).length;
  return {
    eliteDone: progress.eliteKills >= GUARDIAN_SUMMON_REQUIREMENT.eliteKills,
    eliteKills: progress.eliteKills,
    eliteNeeded: GUARDIAN_SUMMON_REQUIREMENT.eliteKills,
    minionTypesDone,
    minionTypesNeeded: GUARDIAN_SUMMON_REQUIREMENT.minionTypes,
    ready: canSummonGuardian(progress),
  };
}

/** 各世界對應的晶核印記 id。 */
export const WORLD_SIGIL: Record<World, string> = {
  geometry: "sigil_geometry",
  organic: "sigil_organic",
  fractal: "sigil_fractal",
  mechanical: "sigil_mechanical",
};

/**
 * 標記守護者被擊敗，回傳 100% 掉落的世界晶核印記 id（§9.3）。
 * @returns 印記 id；若守護者尚未可召喚則回傳 null。
 */
export function defeatGuardian(progress: GuardianProgress): string | null {
  if (!canSummonGuardian(progress)) return null;
  progress.guardianDefeated = true;
  return WORLD_SIGIL[progress.world];
}
