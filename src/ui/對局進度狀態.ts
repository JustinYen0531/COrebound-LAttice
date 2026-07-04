/**
 * @file 對局進度狀態.ts
 * @description 一整局的推圖進度：各世界守護者召喚進度（擊殺數）、守護者是否已擊敗、
 *              世界狂暴、四枚世界印記、最終 Boss COLA 是否可召喚。
 *              把 守護者祭壇 / 世界狂暴 / 最終Boss可樂 的純邏輯串成一個對局層狀態。
 */

import {
  createGuardianProgress,
  recordKill,
  canSummonGuardian,
  defeatGuardian,
  summonReadiness,
  type GuardianProgress,
} from "../world/守護者祭壇";
import { WorldEnrageState } from "../world/世界狂暴";
import { canSummonCola } from "../boss/最終Boss可樂";
import { WORLD_SIGIL } from "../world/守護者祭壇";
import type { World } from "../data/成員型別";

const WORLDS: World[] = ["geometry", "organic", "fractal", "mechanical"];

interface 對局進度內部 {
  guardian: Record<World, GuardianProgress>;
  enrage: WorldEnrageState;
  sigils: Set<string>;
  /** 各世界守護者是否「已在場召喚中」（避免重複召喚） */
  guardianSpawned: Record<World, boolean>;
  colaSpawned: boolean;
}

function 建立初始(): 對局進度內部 {
  const guardian = {} as Record<World, GuardianProgress>;
  const guardianSpawned = {} as Record<World, boolean>;
  for (const w of WORLDS) {
    guardian[w] = createGuardianProgress(w);
    guardianSpawned[w] = false;
  }
  return { guardian, enrage: new WorldEnrageState(), sigils: new Set(), guardianSpawned, colaSpawned: false };
}

export type 對局進度模式 = "formal" | "dojo";
let 正式狀態 = 建立初始();
let 訓練狀態 = 建立初始();

function 取得狀態(mode: 對局進度模式): 對局進度內部 {
  return mode === "dojo" ? 訓練狀態 : 正式狀態;
}

export function 重置對局進度(mode: 對局進度模式 = "formal"): void {
  if (mode === "dojo") 訓練狀態 = 建立初始();
  else 正式狀態 = 建立初始();
}

/** 記錄一次擊殺（T1/T2 計入該世界守護者召喚進度）。 */
export function 記錄世界擊殺(world: World, tier: number, minionType?: string, mode: 對局進度模式 = "formal"): void {
  const 狀態 = 取得狀態(mode);
  if (tier === 1) recordKill(狀態.guardian[world], 1, minionType);
  else if (tier === 2) recordKill(狀態.guardian[world], 2);
}

/** 某世界守護者是否可召喚（達擊殺門檻且尚未召喚/擊敗）。 */
export function 可召喚守護者(world: World, mode: 對局進度模式 = "formal"): boolean {
  const 狀態 = 取得狀態(mode);
  return (
    !狀態.guardianSpawned[world] &&
    !狀態.guardian[world].guardianDefeated &&
    canSummonGuardian(狀態.guardian[world])
  );
}

/** 標記守護者已召喚到場上。 */
export function 標記守護者已召喚(world: World, mode: 對局進度模式 = "formal"): void {
  const 狀態 = 取得狀態(mode);
  狀態.guardianSpawned[world] = true;
}

/** 守護者被擊敗：拿印記 + 本世界狂暴 + 跨世界連動。回傳印記 id（或 null）。 */
export function 擊敗守護者(world: World, mode: 對局進度模式 = "formal"): string | null {
  const 狀態 = 取得狀態(mode);
  const sigil = defeatGuardian(狀態.guardian[world]);
  if (!sigil) return null;
  狀態.enrage.defeatGuardian(world);
  狀態.sigils.add(sigil);
  狀態.guardianSpawned[world] = false;
  return sigil;
}

/** 某世界是否已狂暴（影響掉落與怪物戰力）。 */
export function 世界已狂暴(world: World, mode: 對局進度模式 = "formal"): boolean {
  const 狀態 = 取得狀態(mode);
  return 狀態.enrage.isEnraged(world);
}

export function 取得狂暴狀態(mode: 對局進度模式 = "formal"): WorldEnrageState {
  const 狀態 = 取得狀態(mode);
  return 狀態.enrage;
}

/** 是否集齊四印記可召喚 COLA。 */
export function 可召喚COLA(mode: 對局進度模式 = "formal"): boolean {
  const 狀態 = 取得狀態(mode);
  return !狀態.colaSpawned && canSummonCola([...狀態.sigils]);
}

export function 標記COLA已召喚(mode: 對局進度模式 = "formal"): void {
  const 狀態 = 取得狀態(mode);
  狀態.colaSpawned = true;
}

/** 進度摘要（供驗收面板顯示）。 */
export function 對局進度摘要(mode: 對局進度模式 = "formal") {
  const 狀態 = 取得狀態(mode);
  return {
    守護者: WORLDS.map((w) => ({
      world: w,
      ready: 可召喚守護者(w, mode),
      defeated: 狀態.guardian[w].guardianDefeated,
      spawned: 狀態.guardianSpawned[w],
      enraged: 狀態.enrage.isEnraged(w),
      readiness: summonReadiness(狀態.guardian[w]),
    })),
    印記數: 狀態.sigils.size,
    可召喚COLA: 可召喚COLA(mode),
    COLA已召喚: 狀態.colaSpawned,
    全守護者已倒: 狀態.enrage.allGuardiansDown(),
  };
}

/** 印記全集合（除錯用）。 */
export const 全部印記 = Object.values(WORLD_SIGIL);
