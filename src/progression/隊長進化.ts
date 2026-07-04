/**
 * @file 隊長進化.ts
 * @description 負責監聽小隊上陣成員的累計總星級，當總星級累加達到 5★、10★、15★、20★ 門檻時，
 *              自動進化隊長引擎 (1★->4★)，解鎖並強化控制效果數值。
 *              對應「doc/系統機制/機制指南.md」§3.0.1（隊長被動升星機制）。
 *
 *              純演算：累計總星級 → 隊長星級 → 屬性與控制效果（委由 控制引擎.ts）。
 */

import { captainStatsAtStar, controlEffectAtStar } from "../data/控制引擎";
import type { CaptainId, ControlStar } from "../data/戰鬥原語";

/** 隊長各星級所需的隊員累計總星級門檻（§3.0.1）。 */
export const CAPTAIN_STAR_THRESHOLD: Record<ControlStar, number> = {
  1: 5,
  2: 10,
  3: 15,
  4: 20,
};

/** 由隊員累計總星級推出隊長當前星級（未達 5★ 前為 1★ 基礎，達門檻自動進化）。 */
export function captainStarFromTotal(memberTotalStar: number): ControlStar {
  let star: ControlStar = 1;
  for (const s of [1, 2, 3, 4] as ControlStar[]) {
    if (memberTotalStar >= CAPTAIN_STAR_THRESHOLD[s]) star = s;
  }
  return star;
}

/** 隊長進化快照（供 UI/戰鬥層讀取當前引擎狀態）。 */
export interface CaptainEvolution {
  captainId: CaptainId;
  star: ControlStar;
  stats: ReturnType<typeof captainStatsAtStar>;
  control: ReturnType<typeof controlEffectAtStar>;
  /** 距離下一次進化還差多少累計星級（已滿 4★ 為 0） */
  toNextThreshold: number;
}

/** 依隊長 id 與當前隊員累計總星級，算出完整進化狀態。 */
export function evaluateCaptain(
  captainId: CaptainId,
  memberTotalStar: number,
): CaptainEvolution {
  const star = captainStarFromTotal(memberTotalStar);
  const next = star < 4 ? CAPTAIN_STAR_THRESHOLD[(star + 1) as ControlStar] : memberTotalStar;
  return {
    captainId,
    star,
    stats: captainStatsAtStar(captainId, star),
    control: controlEffectAtStar(captainId, star),
    toNextThreshold: Math.max(0, next - memberTotalStar),
  };
}

/**
 * 偵測「這次隊員升星是否讓隊長跨過進化門檻」。
 * @returns 若跨越門檻回傳新星級，否則 null。
 */
export function detectCaptainLevelUp(
  prevTotalStar: number,
  newTotalStar: number,
): ControlStar | null {
  const before = captainStarFromTotal(prevTotalStar);
  const after = captainStarFromTotal(newTotalStar);
  return after > before ? after : null;
}
