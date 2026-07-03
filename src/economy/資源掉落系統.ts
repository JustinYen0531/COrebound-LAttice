/**
 * @file 資源掉落系統.ts
 * @description 怪物擊殺後的掉落演算法。
 *              對應「doc/角色與敵方/怪物圖鑑.md」IMPORTANT 區(階梯式交錯掉落鏈)
 *              與「doc/系統機制/機制指南.md」§6.3(狂暴額外掉落)。
 *
 *              本檔是「演算法」,資料本身在:
 *              - 素材資料庫.ts(25 種素材)
 *              - 怪物資料庫.ts(29 隻怪物)
 *              - 戰鬥原語.ts(TIER_DROP 階梯鏈 + ENRAGE_MODIFIERS)
 *
 *              原則:不隨機化核心掉落,只在「狂暴額外」與「寶箱」處帶機率。
 */

import { ENRAGE_MODIFIERS, TIER_DROP, type EnemyTier, type MaterialRarity, type MaterialStar } from "../data/戰鬥原語";
import type { World } from "../data/成員型別";
import { findMaterialBySpec, MATERIALS, type MaterialDef } from "../data/素材資料庫";
import type { MonsterDef } from "../data/怪物資料庫";

/** 通關道具 COrebound 核心鑰匙(no.25) */
const CORE_KEY: MaterialDef | undefined = MATERIALS.find((m) => m.no === 25);

// ============================================================
// 一、掉落結果結構
// ============================================================

export interface DropEntry {
  material: MaterialDef;
  count: number;
  /** 是否為狂暴額外掉落(顯示用) */
  enragedBonus?: boolean;
}

export interface DropResult {
  /** 生物材料掉落 */
  materials: DropEntry[];
  /** 原石數量(基礎少量,具體數字依 tier) */
  gems: number;
  /** 是否通關(T4 COLA 掉核心鑰匙) */
  clearsGame: boolean;
  /** 通關道具(若有) */
  keyItem?: MaterialDef;
}

// ============================================================
// 二、各階基礎原石掉落(怪物圖鑑各條目描述「少量/中等/大量/極大量」)
// ============================================================

const TIER_BASE_GEMS: Record<EnemyTier, number> = {
  0: 3, // T0 固定極少量
  1: 8, // T1 少量
  2: 25, // T2 中等
  3: 80, // T3 大量
  4: 500, // T4 極大量
};

// ============================================================
// 三、核心掉落演算法
// ============================================================

/**
 * 計算擊殺某怪物後的掉落。
 *
 * @param monster 怪物定義
 * @param worldEnraged 該怪物所屬世界是否已狂暴(世界守護者被擊敗)— 影響 T2 精英額外 3★ 高級掉落
 * @param rng 亂數產生器(預設 Math.random),供測試注入
 */
export function rollMonsterDrop(
  monster: MonsterDef,
  worldEnraged = false,
  rng: () => number = Math.random,
): DropResult {
  const tier = monster.tier;
  const shape = TIER_DROP[tier];
  const world = monster.world === "core" ? null : (monster.world as World);

  const materials: DropEntry[] = [];

  // ---- T0:固定掉 1★ 普通 1 份 + 少量原石 ----
  if (tier === 0 && world) {
    const mat = findMaterialBySpec(world, shape.star as MaterialStar, shape.rarity as MaterialRarity);
    if (mat) materials.push({ material: mat, count: shape.count });
    return { materials, gems: TIER_BASE_GEMS[0], clearsGame: false };
  }

  // ---- T1:1★ 高級 1 份 + 2★ 普通 2 份(增量掉落)----
  if (tier === 1 && world) {
    const fine1 = findMaterialBySpec(world, 1, "fine");
    const common2 = findMaterialBySpec(world, 2, "common");
    if (fine1) materials.push({ material: fine1, count: 1 });
    if (common2) materials.push({ material: common2, count: 2 });
    return { materials, gems: TIER_BASE_GEMS[1], clearsGame: false };
  }

  // ---- T2:2★ 高級 1 份 + 3★ 普通 1 份;狂暴後 30% 機率額外掉 3★ 高級 ----
  if (tier === 2 && world) {
    const fine2 = findMaterialBySpec(world, 2, "fine");
    const common3 = findMaterialBySpec(world, 3, "common");
    if (fine2) materials.push({ material: fine2, count: 1 });
    if (common3) materials.push({ material: common3, count: 1 });
    // 狂暴額外掉落(機制指南 §6.3)
    if (worldEnraged && rng() < ENRAGE_MODIFIERS.bonusFine3Chance) {
      const fine3 = findMaterialBySpec(world, 3, "fine");
      if (fine3) materials.push({ material: fine3, count: 1, enragedBonus: true });
    }
    return { materials, gems: TIER_BASE_GEMS[2], clearsGame: false };
  }

  // ---- T3:3★ 高級 2 份(100%)----
  if (tier === 3 && world) {
    const fine3 = findMaterialBySpec(world, 3, "fine");
    if (fine3) materials.push({ material: fine3, count: 2 });
    return { materials, gems: TIER_BASE_GEMS[3], clearsGame: false };
  }

  // ---- T4:3★ 高級 + 通關鑰匙 ----
  if (tier === 4) {
    // COLA 不屬任一世界;3★ 高級取任一世界(這裡用幾何作為代表,實際可隨機)
    const fine3 = findMaterialBySpec("geometry", 3, "fine");
    if (fine3) materials.push({ material: fine3, count: 1 });
    return {
      materials,
      gems: TIER_BASE_GEMS[4],
      clearsGame: true,
      keyItem: CORE_KEY,
    };
  }

  return { materials, gems: 0, clearsGame: false };
}

// ============================================================
// 四、寶箱掉落(機制指南 §9.4)
// ============================================================

/**
 * 禪繞寶箱開啟掉落(機制指南 §9.4)。
 * 開啟消耗小隊最大能量 50%,必定獲得 150~300 原石 + 隨機 1~2★ 世界材料。
 */
export function rollChestDrop(world: World, rng: () => number = Math.random): DropResult {
  const gems = 150 + Math.floor(rng() * 151); // 150~300
  const star = (rng() < 0.5 ? 1 : 2) as MaterialStar;
  const rarity: MaterialRarity = rng() < 0.5 ? "common" : "fine";
  const mat = findMaterialBySpec(world, star, rarity);
  const materials: DropEntry[] = mat ? [{ material: mat, count: 1 }] : [];
  return { materials, gems, clearsGame: false };
}

/** 開啟寶箱的能量代價(機制指南 §9.4) */
export const CHEST_OPEN_ENERGY_COST_RATIO = 0.5;

// ============================================================
// 五、世界守護者召喚條件(機制指南 §6.2)
// ============================================================

export interface GuardianSummonProgress {
  /** T2 精英累計擊殺(需達 3 隻) */
  t2Killed: number;
  /** T1 雜兵各種類擊殺(每種需達 5 隻,該世界共 3 種) */
  t1KilledByType: Record<string, number>;
}

export const GUARDIAN_SUMMON_REQUIREMENT = {
  t2Required: 3,
  t1RequiredPerType: 5,
  t1Types: 3, // 每世界 3 種 T1
} as const;

/** 檢查是否達成世界守護者召喚條件 */
export function canSummonGuardian(progress: GuardianSummonProgress): boolean {
  if (progress.t2Killed < GUARDIAN_SUMMON_REQUIREMENT.t2Required) return false;
  const types = Object.values(progress.t1KilledByType);
  if (types.length < GUARDIAN_SUMMON_REQUIREMENT.t1Types) return false;
  return types.every((n) => n >= GUARDIAN_SUMMON_REQUIREMENT.t1RequiredPerType);
}

// ============================================================
// 六、偵錯輔助
// ============================================================

/** 把掉落結果轉成可讀字串(供 UI 戰報、測試斷言用) */
export function describeDrop(drop: DropResult): string {
  const parts: string[] = [];
  if (drop.gems > 0) parts.push(`${drop.gems} 原石`);
  for (const e of drop.materials) {
    const tag = e.enragedBonus ? "(狂暴額外)" : "";
    parts.push(`${e.material.nameZh} ×${e.count}${tag}`);
  }
  if (drop.clearsGame && drop.keyItem) parts.push(`${drop.keyItem.nameZh}(通關!)`);
  return parts.join(", ") || "無掉落";
}
