/**
 * @file 敵人AI.ts
 * @description 定義 T0 至 T4 敵方單位的索敵、仇恨、追擊、反擊、施法與位移決策，
 *              作為怪物戰鬥行為的總入口。
 *              對應「doc/角色與敵方/怪物圖鑑.md」（各 Tier 行為）、
 *              「doc/系統機制/機制指南.md」§6.1（新手保護期）。
 *
 *              純演算：吃「怪物狀態 + 玩家位置 + 局勢旗標」，輸出一個決策
 *              （移動方向 / 是否開火 / 逃跑），不碰 DOM，不直接生成子彈。
 */

import { isUnderNewPlayerProtection } from "./敵人生成系統";
import type { EnemyTier } from "../data/戰鬥原語";
import type { Vec2 } from "../core/移動系統";

/** AI 行為模式。 */
export type AIBehavior =
  | "idle" // 待命（保護期內的 T2、無目標）
  | "flee" // 逃跑（T0 資源怪受擊）
  | "approach" // 接近玩家至攻擊距離
  | "attack" // 在攻擊距離內開火
  | "kite"; // 保持距離放風箏（遠程精英）

/** 決策輸入。 */
export interface AIContext {
  tier: EnemyTier;
  selfPos: Vec2;
  playerPos: Vec2;
  /** 自身攻擊射程（世界單位） */
  attackRange: number;
  /** 自身是否為遠程（有武器且傾向拉開距離） */
  ranged: boolean;
  /** 目前是否受擊中（T0 用來決定逃跑） */
  underFire: boolean;
  /** 開局至今秒數（新手保護期判定） */
  elapsedSeconds: number;
  /** 是否開局非主動敵對（T2 精英標記） */
  nonHostileInitially: boolean;
  /** 是否被眩暈/定身（無法行動） */
  immobilized: boolean;
}

/** 決策輸出。 */
export interface AIDecision {
  behavior: AIBehavior;
  /** 期望移動方向（單位向量；idle/attack 可能為零向量） */
  moveDir: Vec2;
  /** 這幀是否要開火（由外部節奏系統決定實際發射週期，這裡只給「是否想開火」） */
  wantsFire: boolean;
}

const ZERO: Vec2 = { x: 0, y: 0 };

function dirTo(from: Vec2, to: Vec2): Vec2 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len <= 1e-6) return { ...ZERO };
  return { x: dx / len, y: dy / len };
}

function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** 放風箏的理想距離＝攻擊射程的 70%（太近就後退）。 */
export const KITE_RATIO = 0.7;

/**
 * 決定一隻怪物這幀的行為。
 * 規則：
 * - 被定身 → idle（不能動）。
 * - T0：受擊就逃跑，否則待命。
 * - T2 且在新手保護期且標記非主動敵對 → idle。
 * - 遠程：拉開到理想放風箏距離，進射程即開火。
 * - 近程：直線接近，進射程即開火。
 */
export function decideEnemyAction(ctx: AIContext): AIDecision {
  if (ctx.immobilized) {
    return { behavior: "idle", moveDir: { ...ZERO }, wantsFire: false };
  }

  // T0 資源怪：無武器，受擊逃跑
  if (ctx.tier === 0) {
    if (ctx.underFire) {
      const away = dirTo(ctx.playerPos, ctx.selfPos); // 遠離玩家
      return { behavior: "flee", moveDir: away, wantsFire: false };
    }
    return { behavior: "idle", moveDir: { ...ZERO }, wantsFire: false };
  }

  // T2 精英於新手保護期非主動敵對
  if (
    ctx.tier === 2 &&
    ctx.nonHostileInitially &&
    isUnderNewPlayerProtection(ctx.elapsedSeconds)
  ) {
    return { behavior: "idle", moveDir: { ...ZERO }, wantsFire: false };
  }

  const d = dist(ctx.selfPos, ctx.playerPos);
  const toPlayer = dirTo(ctx.selfPos, ctx.playerPos);
  const inRange = d <= ctx.attackRange;

  if (ctx.ranged) {
    const ideal = ctx.attackRange * KITE_RATIO;
    if (d < ideal * 0.85) {
      // 太近 → 後退放風箏，同時仍可開火
      return { behavior: "kite", moveDir: dirTo(ctx.playerPos, ctx.selfPos), wantsFire: inRange };
    }
    if (d > ctx.attackRange) {
      return { behavior: "approach", moveDir: toPlayer, wantsFire: false };
    }
    return { behavior: "attack", moveDir: { ...ZERO }, wantsFire: true };
  }

  // 近程
  if (inRange) {
    return { behavior: "attack", moveDir: { ...ZERO }, wantsFire: true };
  }
  return { behavior: "approach", moveDir: toPlayer, wantsFire: false };
}
