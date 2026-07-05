/**
 * @file 背包狀態.ts
 * @description 玩家持有資源的單一真相來源：生物材料（依 materialNo）、家族碎片、原石。
 *              擊殺掉落寫入這裡；熔爐、升星、商店、工作台等消耗也從這裡扣。
 *
 *              純狀態：不碰 DOM。UI 透過 快照() 讀顯示，透過各 加入/花費 API 改動。
 */

import type { Family } from "../data/成員型別";
import type { PotionId } from "./流浪商店";

interface 背包內部 {
  /** materialNo → 持有數 */
  材料: Map<number, number>;
  /** 家族碎片 */
  碎片: Record<Family, number>;
  /** 原石 */
  原石: number;
  /** 藥水與戰鬥消耗品 */
  藥水: Map<PotionId, number>;
}

const 狀態: 背包內部 = {
  材料: new Map(),
  碎片: { shield: 0, multishot: 0, straight: 0, mine: 0, laser: 0 },
  原石: 0,
  藥水: new Map(),
};

// ---- 加入 ----
export function 加入材料(materialNo: number, count: number): void {
  if (count <= 0) return;
  狀態.材料.set(materialNo, (狀態.材料.get(materialNo) ?? 0) + count);
}
export function 加入原石(count: number): void {
  if (count > 0) 狀態.原石 += count;
}
export function 加入碎片(family: Family, count: number): void {
  if (count > 0) 狀態.碎片[family] += count;
}
export function 加入藥水(id: PotionId, count: number): void {
  if (count <= 0) return;
  狀態.藥水.set(id, (狀態.藥水.get(id) ?? 0) + count);
}

// ---- 查詢 ----
export function 取材料(materialNo: number): number {
  return 狀態.材料.get(materialNo) ?? 0;
}
export function 取碎片(family: Family): number {
  return 狀態.碎片[family];
}
export function 取原石(): number {
  return 狀態.原石;
}
export function 取藥水(id: PotionId): number {
  return 狀態.藥水.get(id) ?? 0;
}
export function 材料總數(): number {
  let n = 0;
  for (const v of 狀態.材料.values()) n += v;
  return n;
}
export function 藥水總數(): number {
  let n = 0;
  for (const v of 狀態.藥水.values()) n += v;
  return n;
}

/** 首次正式進場的最低補給；只在背包完全空時生效，避免重複刷資源。 */
export function 確保初始補給(): void {
  const shardTotal = Object.values(狀態.碎片).reduce((sum, count) => sum + count, 0);
  if (狀態.原石 > 0 || 材料總數() > 0 || 藥水總數() > 0 || shardTotal > 0) return;
  狀態.原石 = 120;
  加入藥水("hp_small", 2);
  加入藥水("energy_small", 1);
}

export interface 死亡懲罰結果 {
  原石損失: number;
  遺落材料: Array<{ no: number; count: number }>;
}

/** 死亡時永久扣除 30% 原石，並從未熔煉材料中隨機抽出 20% 供跑屍取回。 */
export function 套用死亡懲罰(rng: () => number = Math.random): 死亡懲罰結果 {
  const 原石損失 = Math.floor(狀態.原石 * 0.3);
  狀態.原石 -= 原石損失;

  const total = 材料總數();
  let remainingToDrop = Math.floor(total * 0.2);
  const dropped = new Map<number, number>();
  while (remainingToDrop > 0) {
    const available = [...狀態.材料.entries()].filter(([, count]) => count > 0);
    const availableTotal = available.reduce((sum, [, count]) => sum + count, 0);
    if (availableTotal <= 0) break;
    let pick = Math.min(0.999999, Math.max(0, rng())) * availableTotal;
    let selected = available[available.length - 1][0];
    for (const [no, count] of available) {
      pick -= count;
      if (pick < 0) {
        selected = no;
        break;
      }
    }
    狀態.材料.set(selected, (狀態.材料.get(selected) ?? 0) - 1);
    dropped.set(selected, (dropped.get(selected) ?? 0) + 1);
    remainingToDrop -= 1;
  }
  return {
    原石損失,
    遺落材料: [...dropped.entries()].map(([no, count]) => ({ no, count })),
  };
}

export function 取回遺落材料(materials: Array<{ no: number; count: number }>): void {
  for (const material of materials) 加入材料(material.no, material.count);
}

// ---- 花費（回傳是否成功）----
export function 花費原石(count: number): boolean {
  if (狀態.原石 < count) return false;
  狀態.原石 -= count;
  return true;
}
export function 花費碎片(family: Family, count: number): boolean {
  if (狀態.碎片[family] < count) return false;
  狀態.碎片[family] -= count;
  return true;
}
export function 花費材料(materialNo: number, count: number): boolean {
  const have = 取材料(materialNo);
  if (have < count) return false;
  狀態.材料.set(materialNo, have - count);
  return true;
}
export function 花費藥水(id: PotionId, count: number): boolean {
  const have = 取藥水(id);
  if (have < count) return false;
  狀態.藥水.set(id, have - count);
  return true;
}

/** 顯示用快照。 */
export function 背包快照() {
  return {
    原石: 狀態.原石,
    材料總數: 材料總數(),
    碎片: { ...狀態.碎片 },
    材料明細: Array.from(狀態.材料.entries()).map(([no, count]) => ({ no, count })),
    藥水明細: Array.from(狀態.藥水.entries()).map(([id, count]) => ({ id, count })),
  };
}

/** 除錯/驗收：清空並可選給初始資源。 */
export function 重置背包(初始原石 = 0): void {
  狀態.材料.clear();
  狀態.碎片 = { shield: 0, multishot: 0, straight: 0, mine: 0, laser: 0 };
  狀態.原石 = 初始原石;
  狀態.藥水.clear();
}
