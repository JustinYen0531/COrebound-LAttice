/**
 * @file 網格侵蝕.ts
 * @description 處理 15 分鐘後啟動的最外圍晶格塌陷「侵蝕毒圈」收縮算法，
 *              計算處於虛空侵蝕區小隊每秒 5% 最大生命值的真實扣血判定。
 *              對應「doc/系統機制/機制指南.md」§9.2（晶格侵蝕/毒圈）。
 *
 *              純演算：吃「開局秒數 + 小隊到中心距離」→ 產出當前安全半徑與每秒真實傷害。
 */

import {
  EROSION_DAMAGE_RATIO_PER_TICK,
  EROSION_START_SECOND,
} from "../data/戰鬥原語";

/** 侵蝕收縮參數。 */
export interface ErosionConfig {
  /** 地圖初始安全半徑（世界單位）：= 地圖半邊長 */
  initialRadius: number;
  /** 完全塌縮到的最小半徑（中央廣場範圍） */
  minRadius: number;
  /** 從啟動到縮到最小所花的秒數 */
  shrinkDurationSec: number;
}

export const DEFAULT_EROSION: ErosionConfig = {
  initialRadius: 4200 * Math.SQRT2,
  minRadius: 520, // = 中央廣場半徑 PLAZA_RADIUS
  shrinkDurationSec: 600, // 啟動後 10 分鐘縮到底
};

/**
 * 當前安全半徑：15 分鐘前為初始半徑（不縮），之後線性收縮到 minRadius。
 * @param elapsedSeconds 開局至今秒數
 */
export function currentSafeRadius(elapsedSeconds: number, cfg: ErosionConfig = DEFAULT_EROSION): number {
  if (elapsedSeconds < EROSION_START_SECOND) return cfg.initialRadius;
  const t = Math.min(1, (elapsedSeconds - EROSION_START_SECOND) / cfg.shrinkDurationSec);
  return cfg.initialRadius + (cfg.minRadius - cfg.initialRadius) * t;
}

/** 侵蝕是否已啟動（15 分鐘後）。 */
export function isErosionActive(elapsedSeconds: number): boolean {
  return elapsedSeconds >= EROSION_START_SECOND;
}

/**
 * 小隊是否在侵蝕區（安全半徑之外）。
 * @param distanceToCenter 小隊到地圖中心的距離
 */
export function isInErosion(
  distanceToCenter: number,
  elapsedSeconds: number,
  cfg: ErosionConfig = DEFAULT_EROSION,
): boolean {
  if (!isErosionActive(elapsedSeconds)) return false;
  return distanceToCenter > currentSafeRadius(elapsedSeconds, cfg);
}

/**
 * 計算這幀侵蝕造成的真實傷害（無視防禦）。
 * 每個傷害 Tick（1 秒）造成最大生命 5%，本函式依 dt 比例分攤。
 *
 * @param maxHp 小隊/隊長最大生命
 * @param dt 幀時間（秒）
 * @returns 這幀應扣的真實傷害（不在侵蝕區則為 0）
 */
export function erosionDamage(
  maxHp: number,
  distanceToCenter: number,
  elapsedSeconds: number,
  dt: number,
  cfg: ErosionConfig = DEFAULT_EROSION,
): number {
  if (!isInErosion(distanceToCenter, elapsedSeconds, cfg)) return 0;
  // 每秒 5% 最大生命，依 dt 比例
  return maxHp * EROSION_DAMAGE_RATIO_PER_TICK * dt;
}

/** 侵蝕狀態快照（供 HUD 顯示毒圈半徑與警戒）。 */
export interface ErosionSnapshot {
  active: boolean;
  safeRadius: number;
  /** 距離侵蝕啟動的剩餘秒數（已啟動為 0） */
  secondsUntilStart: number;
}

export function erosionSnapshot(
  elapsedSeconds: number,
  cfg: ErosionConfig = DEFAULT_EROSION,
): ErosionSnapshot {
  return {
    active: isErosionActive(elapsedSeconds),
    safeRadius: currentSafeRadius(elapsedSeconds, cfg),
    secondsUntilStart: Math.max(0, EROSION_START_SECOND - elapsedSeconds),
  };
}
