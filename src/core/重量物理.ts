/**
 * @file 重量物理.ts
 * @description 計算子彈與防線的碰撞重量對抗（大吃小消耗）、重量扣減至 0 消除，
 *              以及子彈未被完全扣減時的逐層穿透防線判定。
 *              對應「doc/系統機制/機制指南.md」§1.2（碰撞重量機制）。
 *
 *              本檔只做「重量對抗」的數學，不碰 DOM、不做空間查詢——
 *              空間上「誰撞到誰」由 碰撞解析.ts 決定，決定之後把兩邊的剩餘重量
 *              丟進本檔的函式求出對抗結果。
 *
 *              核心規則（§1.2）：
 *              - 重量大者直接消除重量小者，並依對抗扣掉自身部分剩餘重量後繼續前進。
 *              - 小子彈可用連續碰撞逐步扣減大子彈，大子彈重量歸零即消除。
 *              - 逐層穿透：子彈撞穿一層後若仍有剩餘重量，繼續往內層判定，直到歸零。
 */

/** 一個帶碰撞重量的實體（子彈、護盾、防線層、地雷…）只需暴露剩餘重量。 */
export interface WeightBearing {
  /** 目前剩餘的碰撞重量（隱性碰撞生命值）。<=0 視為已被消除。 */
  remainingWeight: number;
}

/** 單次重量對抗的結果。 */
export interface WeightClashResult {
  /** 攻方（來襲子彈）對抗後剩餘重量 */
  attackerRemaining: number;
  /** 守方（被撞者）對抗後剩餘重量 */
  defenderRemaining: number;
  /** 攻方是否在此次對抗後被消除 */
  attackerConsumed: boolean;
  /** 守方是否在此次對抗後被消除 */
  defenderConsumed: boolean;
  /** 攻方是否可繼續前進（重量尚未歸零 → 逐層穿透下一層） */
  attackerPenetrates: boolean;
}

/** 霸體級重量閾值：達到此值視為幾乎不可被重量對抗消除（如護盾 9999）。 */
export const SUPERARMOR_WEIGHT = 9999;

/**
 * 單次重量對抗（§1.2 重量壓制 + 累積消除）。
 *
 * 演算法：雙方各自扣掉「對方的剩餘重量」——這同時涵蓋三種情境：
 * - 攻方 > 守方：守方歸零被消除，攻方保留差額繼續前進（壓制 + 穿透）。
 * - 攻方 < 守方：攻方歸零被消除，守方僅被扣掉攻方那點重量（累積消除的單步）。
 * - 攻方 = 守方：兩敗俱傷，雙方同時歸零。
 *
 * 霸體（remainingWeight >= SUPERARMOR_WEIGHT）一方在被扣後仍遠大於 0，
 * 自然不會被單次對抗消除，不需特例。
 */
export function resolveWeightClash(
  attackerWeight: number,
  defenderWeight: number,
): WeightClashResult {
  const atk = Math.max(0, attackerWeight);
  const def = Math.max(0, defenderWeight);

  const attackerRemaining = Math.max(0, atk - def);
  const defenderRemaining = Math.max(0, def - atk);

  const attackerConsumed = attackerRemaining <= 0;
  const defenderConsumed = defenderRemaining <= 0;

  return {
    attackerRemaining,
    defenderRemaining,
    attackerConsumed,
    defenderConsumed,
    // 只有「攻方還活著且守方被打穿」才算穿透，可進入下一層判定。
    attackerPenetrates: !attackerConsumed && defenderConsumed,
  };
}

/** 逐層穿透結算報告。 */
export interface PenetrationReport {
  /** 打穿（消除）的層數 */
  layersBroken: number;
  /** 各層對抗後的剩餘重量（與傳入 layers 對齊） */
  layerRemaining: number[];
  /** 子彈貫穿後的最終剩餘重量（0 = 子彈已耗盡） */
  attackerRemaining: number;
  /** 是否貫穿整條防線（所有層都被打穿且子彈仍有剩餘） */
  fullyPierced: boolean;
  /** 命中但未打穿的那一層索引（-1 = 沒有被卡住，全部貫穿） */
  stoppedAtLayer: number;
}

/**
 * 逐層穿透結算（§1.2 逐層穿透判定）。
 *
 * 一顆子彈以初始重量，依序撞擊由外而內排好的多層防線（layers）。
 * 每撞穿一層就扣掉該層重量，只要仍有剩餘重量就繼續往內撞，直到歸零或穿透全部層。
 *
 * @param attackerWeight 子彈初始碰撞重量
 * @param layers 由外而內的各層剩餘重量（唯讀，函式回傳新陣列，不就地改動）
 */
export function resolvePenetration(
  attackerWeight: number,
  layers: readonly number[],
): PenetrationReport {
  let remaining = Math.max(0, attackerWeight);
  const layerRemaining = layers.map((w) => Math.max(0, w));
  let layersBroken = 0;
  let stoppedAtLayer = -1;

  for (let i = 0; i < layerRemaining.length; i += 1) {
    if (remaining <= 0) {
      stoppedAtLayer = i;
      break;
    }
    const clash = resolveWeightClash(remaining, layerRemaining[i]);
    layerRemaining[i] = clash.defenderRemaining;
    remaining = clash.attackerRemaining;
    if (clash.defenderConsumed) {
      layersBroken += 1;
    } else {
      // 被這一層擋下（守方未歸零 → 攻方必然歸零）
      stoppedAtLayer = i;
      break;
    }
  }

  const fullyPierced = layersBroken === layerRemaining.length && remaining > 0;
  return {
    layersBroken,
    layerRemaining,
    attackerRemaining: remaining,
    fullyPierced,
    stoppedAtLayer,
  };
}

/**
 * 累積消除（§1.2）：一群小子彈連續撞擊同一顆大子彈，回傳大子彈是否被耗盡。
 * 小子彈可能各自重量不同，依序把它們的重量從大子彈扣除。
 *
 * @returns 消除掉大子彈所耗用的小子彈數量（不足以消除則等於全部數量）與大子彈剩餘重量
 */
export function resolveAttrition(
  bigWeight: number,
  smallWeights: readonly number[],
): { spent: number; bigRemaining: number; destroyed: boolean } {
  let remaining = Math.max(0, bigWeight);
  let spent = 0;
  for (const w of smallWeights) {
    if (remaining <= 0) break;
    remaining = Math.max(0, remaining - Math.max(0, w));
    spent += 1;
  }
  return { spent, bigRemaining: remaining, destroyed: remaining <= 0 };
}

/** 便捷判斷：此重量是否屬於霸體級（幾乎不可被單次對抗消除）。 */
export function isSuperArmor(weight: number): boolean {
  return weight >= SUPERARMOR_WEIGHT;
}
