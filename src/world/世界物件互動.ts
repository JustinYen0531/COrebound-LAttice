/**
 * @file 世界物件互動.ts
 * @description 負責世界內障礙物、礦物、反射鏡面、蒸汽閥、彈射葉瓣、引力漩渦等互動物件
 *              對小隊、怪物與子彈的作用。
 *              對應「doc/世界觀/世界觀與視覺圖鑑.md」§7（各世界環境物件機制）。
 *
 *              純演算：以 catalogId 分派每種物件的確定性物理反應，回傳「要對子彈/小隊
 *              施加什麼」。不碰 DOM，座標由呼叫端提供。
 */

import { resolveWeightClash } from "../core/重量物理";
import type { Vec2 } from "../core/移動系統";

/** 子彈打到「可破壞障礙 / 資源礦」時的結果。 */
export interface ObstacleHitResult {
  /** 障礙物剩餘重量 */
  obstacleRemainingWeight: number;
  /** 障礙物是否被打破 */
  obstacleDestroyed: boolean;
  /** 子彈剩餘重量 */
  projectileRemainingWeight: number;
  /** 子彈是否消散 */
  projectileConsumed: boolean;
}

/** 可破壞障礙 / 資源礦：走重量對抗。 */
export function hitDestructible(
  projectileWeight: number,
  obstacleWeight: number,
): ObstacleHitResult {
  const clash = resolveWeightClash(projectileWeight, obstacleWeight);
  return {
    obstacleRemainingWeight: clash.defenderRemaining,
    obstacleDestroyed: clash.defenderConsumed,
    projectileRemainingWeight: clash.attackerRemaining,
    projectileConsumed: clash.attackerConsumed,
  };
}

/** 反射：把入射方向沿鏡面法線鏡射。 */
export function reflect(dir: Vec2, normal: Vec2): Vec2 {
  const nlen = Math.hypot(normal.x, normal.y) || 1;
  const nx = normal.x / nlen;
  const ny = normal.y / nlen;
  const dot = dir.x * nx + dir.y * ny;
  return { x: dir.x - 2 * dot * nx, y: dir.y - 2 * dot * ny };
}

/**
 * 不可能稜鏡（幾何・不可破壞）：以精確 90° 或 120° 偏轉折射入射子彈。
 * 依入射角就近選 90 或 120 度，回傳偏轉後方向。
 */
export function impossiblePrismDeflect(dir: Vec2): Vec2 {
  const deg = Math.random() < 0.5 ? 90 : 120; // 兩種精確角度擇一
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { x: dir.x * c - dir.y * s, y: dir.x * s + dir.y * c };
}

/** 折射鏡面陷阱（幾何・機關）：子彈改為鏡面當前垂直折射軌跡；小隊經過受輕微反推。 */
export const REFRACTION_MIRROR_PUSHBACK = 0.5;

/** 捕蠅草彈射板（有機・機關）：踏上瞬間朝葉尖方向彈射的位移距離。 */
export const FLYTRAP_LAUNCH_DISTANCE = 5;

export function flytrapLaunch(pos: Vec2, leafDir: Vec2): Vec2 {
  const len = Math.hypot(leafDir.x, leafDir.y) || 1;
  return {
    x: pos.x + (leafDir.x / len) * FLYTRAP_LAUNCH_DISTANCE,
    y: pos.y + (leafDir.y / len) * FLYTRAP_LAUNCH_DISTANCE,
  };
}

/** 捕食者孢子囊（有機・障礙）：破裂後生成毒霧。 */
export const SPORE_POD_FOG = {
  /** 持續傷害 Tick 數 */
  durationTicks: 3,
  /** 區內移動速度降低比例 */
  slowRatio: 0.3,
} as const;

/** 分形結晶樹（分形・障礙）：每次被擊向兩側噴出 2 顆自相似碎冰（主彈 20% 傷害）。 */
export const FRACTAL_TREE_SHARD = {
  count: 2,
  damageRatio: 0.2,
} as const;

/** 遞歸石門（分形・障礙）：只擋「大於門框」的子彈，小於門框 50% 體積者無損穿過。 */
export function recursiveGatewayBlocks(projectileRadius: number, gateHalfSize: number): boolean {
  // 半徑小於門框 50% → 放行；否則阻擋
  return projectileRadius >= gateHalfSize * 0.5;
}

/** 重力扭曲漩渦（分形・機關）：每 Tick 把半徑內單位/子彈朝中心吸附。 */
export const GRAVITY_VORTEX = {
  /** 影響半徑（距離單位） */
  radius: 3,
  /** 每 Tick 吸附強度（朝心位移） */
  pullPerTick: 0.6,
} as const;

/** 計算漩渦這幀對某位置的吸附位移。 */
export function gravityVortexPull(
  targetPos: Vec2,
  vortexPos: Vec2,
  dt: number,
): Vec2 {
  const dx = vortexPos.x - targetPos.x;
  const dy = vortexPos.y - targetPos.y;
  const d = Math.hypot(dx, dy);
  if (d > GRAVITY_VORTEX.radius || d <= 1e-6) return { x: 0, y: 0 };
  const strength = GRAVITY_VORTEX.pullPerTick * dt;
  return { x: (dx / d) * strength, y: (dy / d) * strength };
}

/** 嚙合大型齒輪組（機械・障礙，不可破壞）：擊中側邊沿旋轉切線方向擊退。 */
export const GEAR_TANGENT_KNOCKBACK = 1.5;

/** 求切線方向擊退向量（順時針旋轉齒輪的切線 = 半徑向量旋轉 90°）。 */
export function gearTangentKnockback(hitPos: Vec2, gearCenter: Vec2, clockwise = true): Vec2 {
  const rx = hitPos.x - gearCenter.x;
  const ry = hitPos.y - gearCenter.y;
  const len = Math.hypot(rx, ry) || 1;
  // 切線 = 半徑旋轉 ±90°
  const tx = clockwise ? ry / len : -ry / len;
  const ty = clockwise ? -rx / len : rx / len;
  return { x: tx * GEAR_TANGENT_KNOCKBACK, y: ty * GEAR_TANGENT_KNOCKBACK };
}

/** 高壓蒸汽閥（機械・機關）：噴射時順向通過的加速、逆向敵方灼傷。 */
export const STEAM_VENT = {
  /** 每 3 Tick 噴射一次，持續 1 秒 */
  intervalTicks: 3,
  durationSec: 1,
  /** 順向通過瞬時加速比例 */
  boostRatio: 0.25,
} as const;
