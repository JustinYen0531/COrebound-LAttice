/**
 * @file 敵人生成系統.ts
 * @description 負責各世界怪物的生成規則、刷新冷卻、稀有怪出現條件、新手保護期，
 *              以及不同階級敵人的場上數量控制。
 *              對應「doc/世界觀/世界觀與視覺圖鑑.md」§9.3（各世界怪物數量）、
 *              「doc/系統機制/機制指南.md」§6.1（新手保護期）。
 *
 *              純演算：定義各世界各 Tier 的目標數量與補充邏輯，不做座標散佈
 *              （座標由 地圖物件資料.ts 的隨機系統負責）。
 */

import { NEW_PLAYER_PROTECTION_SECONDS } from "../data/戰鬥原語";
import { monstersByWorld } from "../data/怪物資料庫";
import type { World } from "../data/成員型別";
import type { EnemyTier } from "../data/戰鬥原語";

/** 各世界每個 Tier 的目標場上數量（世界觀與視覺圖鑑 §9.3）。 */
export const WORLD_SPAWN_QUOTA = {
  /** T0 資源怪：每世界 15 隻 */
  t0: 15,
  /** T1 雜兵：每種 10 隻（每世界 3 種 = 30 隻） */
  t1PerType: 10,
  /** T2 精英：每種 3 隻（每世界 2 種 = 6 隻） */
  t2PerType: 3,
} as const;

/** 一筆生成需求。 */
export interface SpawnQuota {
  world: World;
  monsterNo: number;
  tier: EnemyTier;
  target: number;
}

/** 依世界計算每種怪物的目標數量。 */
export function buildWorldQuota(world: World): SpawnQuota[] {
  const monsters = monstersByWorld(world);
  const quotas: SpawnQuota[] = [];
  for (const m of monsters) {
    let target = 0;
    if (m.tier === 0) target = WORLD_SPAWN_QUOTA.t0;
    else if (m.tier === 1) target = WORLD_SPAWN_QUOTA.t1PerType;
    else if (m.tier === 2) target = WORLD_SPAWN_QUOTA.t2PerType;
    else continue; // T3/T4 由祭壇/召喚系統另行處理，不在常態生成
    quotas.push({ world, monsterNo: m.no, tier: m.tier, target });
  }
  return quotas;
}

/** 生成器狀態：追蹤各怪物目前存活數，補足到目標。 */
export class WorldSpawner {
  private alive = new Map<number, number>();
  private readonly quotas: SpawnQuota[];
  /** 重生冷卻計時（怪物 no → 剩餘秒） */
  private respawnCd = new Map<number, number>();

  constructor(
    world: World,
    private readonly respawnDelaySec = 8,
  ) {
    this.quotas = buildWorldQuota(world);
    for (const q of this.quotas) this.alive.set(q.monsterNo, 0);
  }

  /** 標記一隻被擊殺 → 開始重生冷卻。 */
  notifyKilled(monsterNo: number): void {
    this.alive.set(monsterNo, Math.max(0, (this.alive.get(monsterNo) ?? 0) - 1));
    this.respawnCd.set(monsterNo, this.respawnDelaySec);
  }

  /**
   * 推進 dt 秒，回傳這幀「應補充生成」的怪物需求（monsterNo → 補幾隻）。
   * 冷卻結束且低於目標時才補。
   */
  tick(dt: number): Array<{ monsterNo: number; count: number; tier: EnemyTier }> {
    const out: Array<{ monsterNo: number; count: number; tier: EnemyTier }> = [];
    for (const q of this.quotas) {
      const cd = this.respawnCd.get(q.monsterNo) ?? 0;
      if (cd > 0) {
        this.respawnCd.set(q.monsterNo, Math.max(0, cd - dt));
        continue;
      }
      const current = this.alive.get(q.monsterNo) ?? 0;
      const deficit = q.target - current;
      if (deficit > 0) {
        this.alive.set(q.monsterNo, q.target);
        out.push({ monsterNo: q.monsterNo, count: deficit, tier: q.tier });
      }
    }
    return out;
  }

  aliveCount(monsterNo: number): number {
    return this.alive.get(monsterNo) ?? 0;
  }
}

/**
 * 新手保護期判定（§6.1）：開局前 10 分鐘 T2 精英不主動攻擊。
 * @param elapsedSeconds 開局至今秒數
 */
export function isUnderNewPlayerProtection(elapsedSeconds: number): boolean {
  return elapsedSeconds < NEW_PLAYER_PROTECTION_SECONDS;
}
