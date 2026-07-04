/**
 * @file 流浪商店.ts
 * @description 處理流浪商店的藥水交易（小/大藥水購入與冷卻）、特色藥水大規格提供的永久 Buff 疊加，
 *              以及材料/碎片兌換原石的回收功能（包含 +20% 世界地緣售賣溢價）。
 *              對應「doc/系統機制/機制指南.md」§8（藥水商店、能量、資源回收）。
 *
 *              純演算：定價表 + 購買扣原石 + 回收計價（委由 素材資料庫 的售價函式）。
 */

import {
  findMaterial,
  sellPriceOfMaterial,
  sellPriceOfShard,
} from "../data/素材資料庫";
import type { World } from "../data/成員型別";

/** 基礎藥水規格與價格（機制指南 §8.2）。 */
export type PotionId =
  | "hp_small" | "hp_big"
  | "energy_small" | "energy_big"
  | "hybrid_small" | "hybrid_big";

export interface PotionDef {
  id: PotionId;
  price: number;
  /** 恢復生命比例 */
  hpRatio: number;
  /** 恢復能量比例 */
  energyRatio: number;
  /** 大藥水需 3s 確認 */
  big: boolean;
}

export const POTIONS: Record<PotionId, PotionDef> = {
  hp_small: { id: "hp_small", price: 30, hpRatio: 0.2, energyRatio: 0, big: false },
  hp_big: { id: "hp_big", price: 80, hpRatio: 0.5, energyRatio: 0, big: true },
  energy_small: { id: "energy_small", price: 35, hpRatio: 0, energyRatio: 0.3, big: false },
  energy_big: { id: "energy_big", price: 95, hpRatio: 0, energyRatio: 0.75, big: true },
  hybrid_small: { id: "hybrid_small", price: 55, hpRatio: 0.15, energyRatio: 0.2, big: false },
  hybrid_big: { id: "hybrid_big", price: 140, hpRatio: 0.4, energyRatio: 0.5, big: true },
};

/** 世界特色大 Buff 藥水（機制指南 §8.3），需擊殺該世界守護者才解鎖。 */
export interface WorldBuffPotion {
  world: World;
  nameZh: string;
  price: number;
  /** 永久屬性加成描述（結構化關鍵值，供戰鬥層永久疊加） */
  permanent: Record<string, number>;
}

export const WORLD_BUFF_POTIONS: Record<World, WorldBuffPotion> = {
  geometry: {
    world: "geometry", nameZh: "折射微粒藥水", price: 600,
    permanent: { reflectDamageMult: 0.10, collisionDamageReduction: 0.05 },
  },
  organic: {
    world: "organic", nameZh: "古木精華藥水", price: 600,
    permanent: { baseWeightMult: 0.10, moveSpeedMult: 0.10 },
  },
  fractal: {
    world: "fractal", nameZh: "遞歸冰晶藥水", price: 600,
    permanent: { firePeriodCut: 0.08, activeCooldownCut: 0.05 },
  },
  mechanical: {
    world: "mechanical", nameZh: "高壓蒸汽藥水", price: 600,
    permanent: { maxEnergyBonus: 20, energyRegenMult: 0.15 },
  },
};

/** 購買結果。 */
export interface PurchaseResult {
  ok: boolean;
  reason?: string;
  gemsSpent: number;
  gemsRemaining: number;
}

/** 購買基礎藥水。 */
export function buyPotion(id: PotionId, gems: number): PurchaseResult {
  const def = POTIONS[id];
  if (!def) return { ok: false, reason: "無此藥水", gemsSpent: 0, gemsRemaining: gems };
  if (gems < def.price) return { ok: false, reason: "原石不足", gemsSpent: 0, gemsRemaining: gems };
  return { ok: true, gemsSpent: def.price, gemsRemaining: gems - def.price };
}

/**
 * 購買世界特色大 Buff 藥水。
 * @param guardianDefeated 該世界守護者是否已被擊敗（解鎖門檻）
 */
export function buyWorldBuff(world: World, gems: number, guardianDefeated: boolean): PurchaseResult {
  const def = WORLD_BUFF_POTIONS[world];
  if (!guardianDefeated) return { ok: false, reason: "需先擊敗該世界守護者", gemsSpent: 0, gemsRemaining: gems };
  if (gems < def.price) return { ok: false, reason: "原石不足", gemsSpent: 0, gemsRemaining: gems };
  return { ok: true, gemsSpent: def.price, gemsRemaining: gems - def.price };
}

/**
 * 回收：把材料賣成原石。地緣（本世界材料在本世界商店賣）+20%。
 * @param shopWorld 商店所在世界（決定地緣溢價）
 */
export function sellMaterials(
  lines: Array<{ materialNo: number; count: number }>,
  shopWorld: World,
): { gems: number; breakdown: Array<{ materialNo: number; unit: number; count: number }> } {
  let gems = 0;
  const breakdown: Array<{ materialNo: number; unit: number; count: number }> = [];
  for (const line of lines) {
    const mat = findMaterial(line.materialNo);
    if (!mat || line.count <= 0) continue;
    const local = mat.world === shopWorld;
    const unit = sellPriceOfMaterial(mat, local);
    gems += unit * line.count;
    breakdown.push({ materialNo: line.materialNo, unit, count: line.count });
  }
  return { gems, breakdown };
}

/** 回收：把家族碎片賣成原石。 */
export function sellShards(count: number): number {
  return sellPriceOfShard(Math.max(0, count));
}
