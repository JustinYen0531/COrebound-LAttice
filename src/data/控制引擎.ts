/**
 * @file 控制引擎.ts
 * @description 四位隊長的控制引擎(減速/擊退/眩暈/沉默)1★~4★ 完整數值表。
 *              對應「doc/系統機制/機制指南.md」§3.1~§3.4。
 *
 *              怪物圖鑑明確規範:敵方怪物「直接照搬玩家的控制引擎」,
 *              並使用 1★/2★/4★ 星級(機制指南各怪物條目所標)。
 *              因此本檔同時供隊長與怪物查用。
 */

import type { CaptainId, ControlEffect, ControlKind, ControlStar } from "./戰鬥原語";

// ============================================================
// 一、隊長 1★ 基礎數值(機制指南 §3.1~§3.4)
// ============================================================

export interface CaptainBase {
  id: CaptainId;
  nameZh: string;
  nameEn: string;
  control: ControlKind;
  /** 1★ 基礎 HP/ATK/Speed */
  hp: number;
  atk: number;
  speed: number;
  /** 控制效果說明 */
  controlDesc: string;
}

export const CAPTAIN_BASE: Record<CaptainId, CaptainBase> = {
  architect: {
    id: "architect", nameZh: "Architect", nameEn: "Architect", control: "slow",
    hp: 1500, atk: 100, speed: 300,
    controlDesc: "減慢 (Slow):子彈命中時降低目標移動速度。",
  },
  conductor: {
    id: "conductor", nameZh: "Conductor", nameEn: "Conductor", control: "knockback",
    hp: 1200, atk: 100, speed: 400,
    controlDesc: "擊退 (Knockback):子彈命中時將目標往子彈飛行反方向擊退。",
  },
  launcher: {
    id: "launcher", nameZh: "Launcher", nameEn: "Launcher", control: "stun",
    hp: 1000, atk: 200, speed: 300,
    controlDesc: "眩暈 (Stun):子彈命中時使目標陷入眩暈,期間無法移動與攻擊。",
  },
  operator: {
    id: "operator", nameZh: "Operator", nameEn: "Operator", control: "silence",
    hp: 1200, atk: 150, speed: 300,
    controlDesc: "沉默 (Silence):子彈命中時使目標陷入沉默,期間無法釋放主動與週期技能。",
  },
};

// ============================================================
// 二、星級屬性倍率(機制指南 §3.1~§3.4:1★=1x / 2★=2x / 3★=3x / 4★=4x)
// ============================================================

export const CAPTAIN_STAR_MULT: Record<ControlStar, number> = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
};

/** 計算隊長在指定星級的 HP/ATK/Speed */
export function captainStatsAtStar(id: CaptainId, star: ControlStar) {
  const b = CAPTAIN_BASE[id];
  const m = CAPTAIN_STAR_MULT[star];
  return {
    hp: b.hp * m,
    atk: b.atk * m,
    speed: b.speed * m,
    star,
  };
}

// ============================================================
// 三、控制效果數值表(1★ 無控制;2★ 首次解鎖;3★ 強化;4★ 質變+附加)
// ============================================================

/**
 * 取得隊長在指定星級的控制效果實例。
 * 1★:無控制(機制指南 §3 各隊長「1★ 無控制效果」)。
 * 2★:首次解鎖。
 * 3★:數值提升。
 * 4★:終極質變 + 附加效果(易傷/破防/爆裂波/技能停滯)。
 */
export function controlEffectAtStar(id: CaptainId, star: ControlStar): ControlEffect | null {
  // 1★ 無控制效果 — 機制指南 §3.1~§3.4
  if (star === 1) return null;

  const b = CAPTAIN_BASE[id];
  switch (id) {
    case "architect": {
      // 減速 — §3.1
      // 2★:降 20% / 1.5s | 3★:降 35% / 2.0s | 4★:降 50% / 2.5s + 易傷 +15% / 3s
      const slowTable: Record<2 | 3 | 4, { mag: number; dur: number }> = {
        2: { mag: 0.20, dur: 1.5 },
        3: { mag: 0.35, dur: 2.0 },
        4: { mag: 0.50, dur: 2.5 },
      };
      const t = slowTable[star as 2 | 3 | 4];
      return {
        kind: "slow",
        star,
        magnitude: t.mag,
        duration: t.dur,
      };
    }
    case "conductor": {
      // 擊退 — §3.2
      // 2★:擊退 1.0 | 3★:擊退 1.8 + 撞牆眩暈 0.5s | 4★:擊退 2.5 + 撞牆眩暈 1.0s + 破防 -20% / 3s
      const kbTable: Record<2 | 3 | 4, { dist: number; wallStun?: number }> = {
        2: { dist: 1.0 },
        3: { dist: 1.8, wallStun: 0.5 },
        4: { dist: 2.5, wallStun: 1.0 },
      };
      const t = kbTable[star as 2 | 3 | 4];
      return {
        kind: "knockback",
        star,
        magnitude: t.dist,
        duration: t.wallStun ?? 0, // 撞牆眩暈以 duration 承載(0 = 無牆眩暈)
      };
    }
    case "launcher": {
      // 眩暈 — §3.3
      // 2★:0.5s | 3★:1.0s | 4★:1.5s + 解眩後爆發擊退波 1.5 距離
      const stunTable: Record<2 | 3 | 4, number> = { 2: 0.5, 3: 1.0, 4: 1.5 };
      return {
        kind: "stun",
        star,
        magnitude: star === 4 ? 1.5 : 0, // 4★ 解眩後的擊退波距離
        duration: stunTable[star as 2 | 3 | 4],
      };
    }
    case "operator": {
      // 沉默 — §3.4
      // 2★:1.5s | 3★:2.5s | 4★:4.0s + 技能冷卻停滯 + 移速 -20%
      const silTable: Record<2 | 3 | 4, number> = { 2: 1.5, 3: 2.5, 4: 4.0 };
      return {
        kind: "silence",
        star,
        magnitude: star === 4 ? 0.20 : 0, // 4★ 額外降移速 20%
        duration: silTable[star as 2 | 3 | 4],
      };
    }
  }
}

// ============================================================
// 四、4★ 終極質變附加效果(機制指南 §3.1~§3.4 各 4★ 條目)
// ============================================================

export interface UltimateAppendage {
  /** 附加效果名稱 */
  name: string;
  /** 機制說明 */
  description: string;
  /** 結構化參數(供戰鬥系統讀取) */
  params: Record<string, number>;
}

export const ULTIMATE_APPENDAGE: Record<CaptainId, UltimateAppendage> = {
  architect: {
    name: "易傷",
    description: "4★ 減速同時對目標施加【易傷】,所受傷害 +15%,持續 3s。",
    params: { damageTakenBonus: 0.15, duration: 3.0 },
  },
  conductor: {
    name: "破防",
    description: "4★ 擊退同時施加【破防】,目標碰撞傷害減免降低 20%,持續 3s。",
    params: { damageReductionLoss: 0.20, duration: 3.0 },
  },
  launcher: {
    name: "爆裂波",
    description: "4★ 眩暈解除時,目標朝周圍爆發一圈微型擊退波,將周圍敵方單位擊退 1.5 距離。",
    params: { knockbackDistance: 1.5 },
  },
  operator: {
    name: "技能停滯",
    description: "4★ 沉默期間,目標所有技能冷卻時間與移動距離充能完全停滯,並額外降低移動速度 20%。",
    params: { cooldownFreeze: 1, moveSpeedLoss: 0.20 },
  },
};

// ============================================================
// 五、怪物常用控制引擎快捷建構
// ============================================================

/**
 * 怪物照搬控制引擎時,用此快捷產生 ControlEffect。
 * 例:1★ 幾何減速 = controlForEnemy("architect", 2)(怪物用 2★ 等級)
 *     4★ 終極控制 = controlForEnemy("architect", 4)
 */
export function controlForEnemy(captainId: CaptainId, star: ControlStar): ControlEffect | null {
  return controlEffectAtStar(captainId, star);
}
