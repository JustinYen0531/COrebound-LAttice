/**
 * @file 背包狀態.ts
 * @description 玩家持有資源的單一真相來源：生物材料（依 materialNo）、家族碎片、原石。
 *              擊殺掉落寫入這裡；熔爐、升星、商店、工作台等消耗也從這裡扣。
 *
 *              純狀態：不碰 DOM。UI 透過 快照() 讀顯示，透過各 加入/花費 API 改動。
 */

import type { Family } from "../data/成員型別";

interface 背包內部 {
  /** materialNo → 持有數 */
  材料: Map<number, number>;
  /** 家族碎片 */
  碎片: Record<Family, number>;
  /** 原石 */
  原石: number;
}

const 狀態: 背包內部 = {
  材料: new Map(),
  碎片: { shield: 0, multishot: 0, straight: 0, mine: 0, laser: 0 },
  原石: 0,
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
export function 材料總數(): number {
  let n = 0;
  for (const v of 狀態.材料.values()) n += v;
  return n;
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

/** 顯示用快照。 */
export function 背包快照() {
  return {
    原石: 狀態.原石,
    材料總數: 材料總數(),
    碎片: { ...狀態.碎片 },
    材料明細: Array.from(狀態.材料.entries()).map(([no, count]) => ({ no, count })),
  };
}

/** 除錯/驗收：清空並可選給初始資源。 */
export function 重置背包(初始原石 = 0): void {
  狀態.材料.clear();
  狀態.碎片 = { shield: 0, multishot: 0, straight: 0, mine: 0, laser: 0 };
  狀態.原石 = 初始原石;
}
