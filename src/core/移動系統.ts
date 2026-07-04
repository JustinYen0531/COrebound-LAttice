/**
 * @file 移動系統.ts
 * @description 計算小隊 9 人同心圓陣型滑行移動、Space 鍵隊長主動位移（CD 與手感限制）、
 *              走動距離充能與停下觸發判定。
 *              對應「doc/系統機制/機制指南.md」§3（隊長引擎）與週期技能的移動距離充能。
 *
 *              本檔為純演算：吃「輸入方向 + dt + 小隊組成」→ 產出「新座標 + 本幀位移量」，
 *              不碰 DOM。速度來源：隊長基礎 Speed 為引擎主體，隊員 speed 加成累加，
 *              重量拖累移動、控制減速再打折。
 */

/** 二維向量（與其他戰鬥模組共用的最小結構）。 */
export interface Vec2 {
  x: number;
  y: number;
}

/** 影響小隊移動速度的當前組成。 */
export interface SquadMobility {
  /** 隊長引擎基礎速度（已含隊長星級倍率） */
  captainSpeed: number;
  /** 全體上陣隊員的 speed 加成加總 */
  memberSpeedSum: number;
  /** 全體上陣單位（含隊長）的重量加總，用來計算重量拖累 */
  totalWeight: number;
  /** 附魔/風域等提供的移動速度加成比例（0.15 = +15%），可加總 */
  speedBonusRatio: number;
  /** 敵方控制施加的減速比例（0.20 = -20%），可加總後 clamp */
  slowRatio: number;
  /** 是否被眩暈/沉默定身（完全無法移動） */
  immobilized: boolean;
}

/** 重量拖累係數：每點重量讓有效速度打的折扣（重量越大越慢，但有下限）。 */
export const WEIGHT_DRAG_PER_UNIT = 0.0006;
/** 重量拖累最多把速度打到剩下的比例（避免陣容太重完全走不動）。 */
export const WEIGHT_DRAG_FLOOR = 0.5;
/** 減速可疊加的最大總量（避免多個減速把速度歸零）。 */
export const MAX_SLOW_RATIO = 0.8;

/**
 * 由小隊組成算出「每秒有效移動速度」（世界座標單位/秒）。
 *
 * 公式：
 *   基礎 = 隊長引擎速度 + 隊員速度加成加總
 *   重量折扣 = clamp(1 - 重量 × 拖累係數, 下限, 1)
 *   加成 = (1 + 附魔加成)
 *   減速 = (1 - clamp(控制減速, 0, 上限))
 *   有效速度 = 基礎 × 重量折扣 × 加成 × 減速
 */
export function computeEffectiveSpeed(m: SquadMobility): number {
  if (m.immobilized) return 0;
  const basis = Math.max(0, m.captainSpeed + m.memberSpeedSum);
  const drag = Math.max(WEIGHT_DRAG_FLOOR, 1 - Math.max(0, m.totalWeight) * WEIGHT_DRAG_PER_UNIT);
  const bonus = 1 + Math.max(0, m.speedBonusRatio);
  const slow = 1 - Math.min(MAX_SLOW_RATIO, Math.max(0, m.slowRatio));
  return basis * drag * bonus * slow;
}

/** 正規化方向向量（零向量回傳零向量）。 */
export function normalize(v: Vec2): Vec2 {
  const len = Math.hypot(v.x, v.y);
  if (len <= 1e-6) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

/** 單幀移動結果。 */
export interface MoveStep {
  /** 移動後的新位置 */
  position: Vec2;
  /** 本幀實際位移距離（世界座標單位），供週期技能充能與「是否移動中」判定 */
  distance: number;
  /** 本幀是否有實際移動（距離 > 極小值） */
  moved: boolean;
}

/**
 * 推進小隊一幀連續移動。
 * @param pos 目前位置
 * @param inputDir 輸入方向（WASD 合成，未必正規化）
 * @param mobility 小隊移動組成
 * @param dt 幀時間（秒）
 * @param clampFn 可選：把新座標夾回地圖範圍（回傳夾住後的座標）
 */
export function advanceMovement(
  pos: Vec2,
  inputDir: Vec2,
  mobility: SquadMobility,
  dt: number,
  clampFn?: (p: Vec2) => Vec2,
): MoveStep {
  const dir = normalize(inputDir);
  if (dir.x === 0 && dir.y === 0) {
    return { position: { ...pos }, distance: 0, moved: false };
  }
  const speed = computeEffectiveSpeed(mobility);
  const raw = { x: pos.x + dir.x * speed * dt, y: pos.y + dir.y * speed * dt };
  const next = clampFn ? clampFn(raw) : raw;
  const distance = Math.hypot(next.x - pos.x, next.y - pos.y);
  return { position: next, distance, moved: distance > 1e-4 };
}

/**
 * 週期技能 / 隊長進化用的「移動距離充能」累加器。
 * 走動累積距離達門檻即觸發一次（機制指南：週期技能靠移動距離充能）。
 */
export class DistanceChargeMeter {
  private accumulated = 0;

  constructor(private readonly threshold: number) {}

  /** 加入本幀移動距離，回傳這次加入後「跨過門檻的觸發次數」（通常 0 或 1，位移過大可能多次）。 */
  add(distance: number): number {
    if (distance <= 0 || this.threshold <= 0) return 0;
    this.accumulated += distance;
    let triggers = 0;
    while (this.accumulated >= this.threshold) {
      this.accumulated -= this.threshold;
      triggers += 1;
    }
    return triggers;
  }

  /** 目前充能比例 0~1（供 HUD 顯示週期技能累積環）。 */
  ratio(): number {
    if (this.threshold <= 0) return 1;
    return Math.max(0, Math.min(1, this.accumulated / this.threshold));
  }

  reset(): void {
    this.accumulated = 0;
  }
}
