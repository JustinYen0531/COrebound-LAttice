/**
 * @file 附魔系統.ts
 * @description 負責子彈與護盾消散時的附魔效果判定與邏輯執行（例如反彈、分裂、收斂、
 *              巨大化、煙火、爆炸等）。
 *              對應「doc/系統機制/機制指南.md」§2.1~§2.4（各家族已綁定附魔）。
 *
 *              純演算：以「生命週期事件」為介面——投射物在生成 / 命中 / 消散 / 每幀 時，
 *              把它與掛載的附魔丟進本檔，本檔回傳「要改寫的屬性」或「要衍生的新投射物計畫」。
 *              數值一律讀 武器與附魔.ts 的 ENCHANTS[id].levels[star].params，不硬寫。
 */

import { ENCHANTS } from "../data/武器與附魔";
import type { EnchantId, EnchantStar } from "../data/戰鬥原語";
import type { Projectile, SpawnRequest } from "../combat/投射物系統";

/** 取某附魔在某星級的結構化參數（找不到回傳空物件）。 */
export function enchantParams(id: EnchantId, star: EnchantStar): Record<string, number> {
  const def = ENCHANTS[id];
  if (!def) return {};
  return def.levels[star]?.params ?? {};
}

/** 生成時：把「發射前就生效」的附魔套進發射（收斂縮角、超廣角擴角等）。 */
export interface SpawnModifiers {
  /** 散射/扇形半張角的乘算係數（<1 收斂、>1 擴張） */
  angleScale: number;
  /** 生命 Tick / 存活時間的乘算係數 */
  lifeScale: number;
  /** 速度乘算係數 */
  speedScale: number;
  /** 額外追加的發射輪次（連射） */
  extraRounds: number;
}

export function computeSpawnModifiers(enchants: Record<string, EnchantStar>): SpawnModifiers {
  const mod: SpawnModifiers = { angleScale: 1, lifeScale: 1, speedScale: 1, extraRounds: 0 };
  for (const [id, star] of Object.entries(enchants) as [EnchantId, EnchantStar][]) {
    const p = enchantParams(id, star);
    // 收斂 focus：縮小散角、延長存活、（3★）加速
    if (id === "focus") {
      if (p.angleShrink) mod.angleScale *= 1 - p.angleShrink;
      if (p.tickBonus) mod.lifeScale *= 1 + p.tickBonus;
      if (p.speedBonus) mod.speedScale *= 1 + p.speedBonus;
    }
    // 超廣角 wide_angle：擴大護盾扇角
    if (id === "wide_angle" && p.angleBonus) mod.angleScale *= 1 + p.angleBonus;
    // 連射 rapid_fire：追加發射輪次
    if (id === "rapid_fire" && p.extraRounds) mod.extraRounds += p.extraRounds;
  }
  return mod;
}

/** 每幀：處理需要持續作用的附魔（追蹤轉向、狙擊隨距增益）。就地改動 p。 */
export function tickProjectileEnchants(
  p: Projectile,
  dt: number,
  nearestEnemyDir?: { x: number; y: number },
): void {
  for (const [id, star] of Object.entries(p.enchants) as [EnchantId, EnchantStar][]) {
    const params = enchantParams(id, star);
    // 追蹤 homing：每秒最多 turnRate 度朝最近敵方偏轉
    if (id === "homing" && nearestEnemyDir && params.turnRate) {
      const maxTurn = ((params.turnRate * Math.PI) / 180) * dt;
      const cur = Math.atan2(p.direction.y, p.direction.x);
      const want = Math.atan2(nearestEnemyDir.y, nearestEnemyDir.x);
      let delta = want - cur;
      while (delta > Math.PI) delta -= 2 * Math.PI;
      while (delta < -Math.PI) delta += 2 * Math.PI;
      const applied = Math.max(-maxTurn, Math.min(maxTurn, delta));
      const na = cur + applied;
      p.direction = { x: Math.cos(na), y: Math.sin(na) };
    }
    // 狙擊 snipe：飛行距離每達半射程，傷害與重量增益一階（上限 cap），寫入 meta 供命中結算讀
    if (id === "snipe" && params.stepRatio && p.maxRange > 0) {
      const halves = Math.floor(p.traveled / (p.maxRange / 2));
      p.meta.snipeGain = Math.min(params.cap ?? Infinity, halves * params.stepRatio);
    }
  }
}

/** 消散/命中事件衍生的新投射物計畫（分裂、爆炸、擊殺連鎖等）。 */
export interface DerivedPlan {
  from: EnchantId;
  /** 要生成幾顆 */
  count: number;
  /** 繼承母彈的傷害比例 */
  damageRatio: number;
  /** 繼承母彈的重量比例 */
  weightRatio: number;
  /** 是否環形均佈（爆炸），否則沿母彈方向（分裂/連鎖） */
  radial: boolean;
  /** 附帶擊退等級（0 = 無） */
  knockback: number;
}

/**
 * 投射物「消散/命中結束」時觸發的衍生附魔。
 * 本檔只算「要生成幾顆、繼承多少傷害/重量」，實際方向鋪排交呼叫端（需場景資訊）。
 *
 * @param cause "expire"=壽命/距離到期、"hit"=撞擊、"kill"=擊殺目標
 */
export function planDerivedSpawns(
  p: Projectile,
  cause: "expire" | "hit" | "kill",
): DerivedPlan[] {
  const plans: DerivedPlan[] = [];
  for (const [id, star] of Object.entries(p.enchants) as [EnchantId, EnchantStar][]) {
    const params = enchantParams(id, star);
    // 分裂 splinter：護盾消散時分裂衝擊波
    if (id === "splinter" && cause === "expire") {
      plans.push({
        from: id, count: params.count ?? 0, damageRatio: params.damageRatio ?? 0,
        weightRatio: params.weightRatio ?? 0, radial: false, knockback: 0,
      });
    }
    // 爆炸 explosion：飛行結束/碰撞觸發環形碎片
    if (id === "explosion" && (cause === "expire" || cause === "hit")) {
      plans.push({
        from: id, count: params.fragments ?? 0, damageRatio: params.damageRatio ?? 0,
        weightRatio: params.weightRatio ?? 0, radial: true, knockback: params.knockback ?? 0,
      });
    }
    // 擊殺連鎖 kill_chain：擊殺目標時以該點再射一輪
    if (id === "kill_chain" && cause === "kill") {
      plans.push({
        from: id, count: 1, damageRatio: params.damageRatio ?? 0,
        weightRatio: 1, radial: false, knockback: 0,
      });
    }
  }
  return plans;
}

/** 依衍生計畫與母彈，展開成具體發射請求（呼叫端提供母彈當下的位置與方向）。 */
export function expandDerivedPlan(
  plan: DerivedPlan,
  parent: Projectile,
): SpawnRequest[] {
  const reqs: SpawnRequest[] = [];
  const baseDir = parent.direction;
  for (let i = 0; i < plan.count; i += 1) {
    let dir = baseDir;
    if (plan.radial && plan.count > 0) {
      const deg = (360 / plan.count) * i;
      const r = (deg * Math.PI) / 180;
      dir = { x: Math.cos(r), y: Math.sin(r) };
    }
    reqs.push({
      family: parent.family,
      faction: parent.faction,
      origin: { ...parent.position },
      aim: dir,
      weaponStar: 1,
      damageMult: plan.damageRatio,
      enchants: {},
    });
  }
  return reqs;
}

/**
 * 反彈 repel（護盾）：在重量完全碾壓敵方子彈時，把該敵彈轉為己方攻擊。
 * @returns 反彈後的傷害與加速；未達碾壓條件回傳 null（不反彈）
 */
export function tryRepel(
  shieldWeight: number,
  enemyProjectileWeight: number,
  enemyProjectileDamage: number,
  star: EnchantStar,
): { damage: number; speedBonus: number } | null {
  const p = enchantParams("repel", star);
  if (shieldWeight <= enemyProjectileWeight) return null; // 未完全碾壓
  return {
    damage: Math.round(enemyProjectileDamage * (p.damageRatio ?? 0)),
    speedBonus: p.speedBonus ?? 0,
  };
}
