/**
 * @file 碰撞解析.ts
 * @description 專責整理子彈、小隊、怪物、障礙物與地圖機關之間的碰撞檢測流程，
 *              並將重量對抗與傷害結算導向對應子系統。
 *              對應「doc/系統機制/機制指南.md」§1.2（重量對抗）、§1.3（Tick 傷害結算）。
 *
 *              純演算：本檔提供圓形碰撞偵測 + 兩顆投射物的重量對抗 + Tick 傷害結算，
 *              不做空間分割最佳化（場上實體量小，暴力兩兩檢測即可）。重量數學委由
 *              重量物理.ts；本檔負責「把誰撞到誰」轉成「消散/扣血/剩餘重量」。
 */

import { resolveWeightClash } from "../core/重量物理";
import type { Projectile } from "./投射物系統";
import type { Vec2 } from "../core/移動系統";

/** 帶碰撞半徑的圓形實體（怪物、小隊層、障礙物…）。 */
export interface CircleBody {
  id: string;
  position: Vec2;
  radius: number;
  /** 目前生命值 */
  hp: number;
  /** 碰撞重量（防線層/障礙物用；不參與重量對抗的可設 0） */
  weight: number;
  /** 已死亡標記（hp<=0） */
  dead?: boolean;
}

/** 圓對圓碰撞。 */
export function circlesOverlap(a: Vec2, ar: number, b: Vec2, br: number): boolean {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const rr = ar + br;
  return dx * dx + dy * dy <= rr * rr;
}

/** 投射物視為小圓（以重量粗估半徑，僅供碰撞偵測；不影響數值）。 */
export function projectileRadius(p: Projectile): number {
  // 護盾/地雷體積較大，小子彈較小；用重量做單調對應並夾在合理範圍。
  return Math.max(4, Math.min(28, 4 + Math.sqrt(Math.max(0, p.remainingWeight)) * 0.6));
}

/** 單顆投射物命中單一實體後的結果。 */
export interface HitResolution {
  /** 對實體造成的傷害 */
  damage: number;
  /** 實體是否因此死亡 */
  targetDead: boolean;
  /** 投射物是否消散 */
  projectileConsumed: boolean;
  /** 投射物對抗後剩餘重量（未消散時） */
  projectileRemainingWeight: number;
  /** 投射物是否可穿透繼續前進（重量壓過目標） */
  penetrates: boolean;
}

/**
 * 投射物命中一個帶重量實體（怪物/障礙物/防線層）的結算：
 * - 先做重量對抗決定投射物能否穿透 / 是否消散。
 * - 傷害一律結算（即使被擋下，命中當下仍造成一次傷害）。
 *
 * 注意：傷害以「單次命中」計；持續接觸的每秒傷害由 settleContactTick() 處理。
 */
export function resolveProjectileHit(p: Projectile, target: CircleBody): HitResolution {
  const clash = resolveWeightClash(p.remainingWeight, target.weight);
  const damage = p.damage;
  const newHp = target.hp - damage;
  const targetDead = newHp <= 0;

  return {
    damage,
    targetDead,
    projectileConsumed: clash.attackerConsumed,
    projectileRemainingWeight: clash.attackerRemaining,
    penetrates: clash.attackerPenetrates,
  };
}

/**
 * Tick 傷害結算（§1.3）：小隊與敵人「持續接觸」時，每個傷害 Tick 造成
 * 一次「全隊 ATK 加總」的傷害。無普攻攻速、無暴擊——固定間隔、固定數值。
 *
 * @param squadTotalAtk 全隊上陣成員 ATK 加總（含隊長）
 * @param contactTargets 目前與小隊接觸中的敵人
 * @param vulnerabilityBonus 目標身上的【易傷】加成（0.15 = +15%），可由控制引擎 4★ 施加
 */
export function settleContactTick(
  squadTotalAtk: number,
  contactTargets: readonly CircleBody[],
  vulnerabilityBonus = 0,
): Array<{ id: string; damage: number; dead: boolean }> {
  const out: Array<{ id: string; damage: number; dead: boolean }> = [];
  for (const t of contactTargets) {
    if (t.dead || t.hp <= 0) continue;
    const dmg = Math.round(squadTotalAtk * (1 + Math.max(0, vulnerabilityBonus)));
    const dead = t.hp - dmg <= 0;
    out.push({ id: t.id, damage: dmg, dead });
  }
  return out;
}

/**
 * 掃描一批投射物 vs 一批目標，回傳所有命中對（不改動輸入）。
 * 上層據此呼叫 resolveProjectileHit 做結算並套用結果。
 */
export interface HitPair {
  projectile: Projectile;
  target: CircleBody;
}

export function detectHits(
  projectiles: readonly Projectile[],
  targets: readonly CircleBody[],
): HitPair[] {
  const pairs: HitPair[] = [];
  for (const p of projectiles) {
    const pr = projectileRadius(p);
    for (const t of targets) {
      if (t.dead || t.hp <= 0) continue;
      if (circlesOverlap(p.position, pr, t.position, t.radius)) {
        pairs.push({ projectile: p, target: t });
      }
    }
  }
  return pairs;
}
