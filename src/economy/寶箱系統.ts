/**
 * @file 寶箱系統.ts
 * @description 處理禪繞寶箱的刷新時間、開啟條件、能量消耗、解鎖流程，以及開啟後的戰利品掉落分配。
 *              對應「doc/系統機制/機制指南.md」§7（寶箱），掉落委由 資源掉落系統.rollChestDrop。
 *
 *              純演算：開箱需消耗當前能量的一定比例，能量足夠才開，開啟後回傳掉落。
 */

import {
  CHEST_OPEN_ENERGY_COST_RATIO,
  rollChestDrop,
  type DropResult,
} from "./資源掉落系統";
import type { World } from "../data/成員型別";

/** 場上一個寶箱的狀態。 */
export interface ChestState {
  id: string;
  world: World;
  opened: boolean;
}

/** 開箱嘗試結果。 */
export interface ChestOpenResult {
  ok: boolean;
  reason?: string;
  /** 實際消耗的能量 */
  energySpent: number;
  /** 開箱後剩餘能量 */
  energyRemaining: number;
  /** 掉落（ok=false 時為 null） */
  drop: DropResult | null;
}

/**
 * 嘗試開啟寶箱：消耗「當前能量 × CHEST_OPEN_ENERGY_COST_RATIO」。
 * @param currentEnergy 小隊當前能量
 * @param maxEnergy 能量上限（用來換算消耗基準；此處以當前能量比例計）
 */
export function openChest(
  chest: ChestState,
  currentEnergy: number,
  rng: () => number = Math.random,
): ChestOpenResult {
  if (chest.opened) {
    return { ok: false, reason: "寶箱已開啟", energySpent: 0, energyRemaining: currentEnergy, drop: null };
  }
  const cost = currentEnergy * CHEST_OPEN_ENERGY_COST_RATIO;
  if (currentEnergy < cost || cost <= 0) {
    return { ok: false, reason: "能量不足以開啟", energySpent: 0, energyRemaining: currentEnergy, drop: null };
  }
  chest.opened = true;
  const drop = rollChestDrop(chest.world, rng);
  return {
    ok: true,
    energySpent: cost,
    energyRemaining: currentEnergy - cost,
    drop,
  };
}
