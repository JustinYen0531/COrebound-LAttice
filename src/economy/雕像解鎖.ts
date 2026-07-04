/**
 * @file 雕像解鎖.ts
 * @description 監聽並處理地圖上 20 尊一次性成員解鎖雕像的點擊與解鎖事件，
 *              完成解鎖（0->1★）後，執行雕像在場景中的永久消失/自毀。
 *              對應「doc/世界觀/世界觀與視覺圖鑑.md」§9.2（20 尊成員雕像，一次性解鎖）。
 *
 *              純演算：追蹤每尊雕像的解鎖狀態，點擊未解鎖者 → 解鎖對應成員 → 雕像消失。
 */

import { findMemberByNo } from "../data/成員資料庫";
import type { MemberDef } from "../data/成員型別";

/** 一尊雕像狀態。 */
export interface StatueState {
  /** 對應成員編號 01~20 */
  memberNo: number;
  /** 是否已解鎖（解鎖後雕像永久消失） */
  consumed: boolean;
}

/** 建立全 20 尊雕像的初始狀態。 */
export function createAllStatues(): StatueState[] {
  const out: StatueState[] = [];
  for (let no = 1; no <= 20; no += 1) out.push({ memberNo: no, consumed: false });
  return out;
}

/** 解鎖結果。 */
export interface StatueUnlockResult {
  ok: boolean;
  reason?: string;
  /** 解鎖到的成員（ok=true 時） */
  member?: MemberDef;
  /** 雕像是否應從場上消失 */
  removeStatue: boolean;
}

/**
 * 互動一尊雕像：一次性解鎖對應成員（0→1★），雕像隨即消失。
 * 已消耗過的雕像回傳失敗。
 */
export function interactStatue(statue: StatueState): StatueUnlockResult {
  if (statue.consumed) {
    return { ok: false, reason: "雕像已解鎖並消失", removeStatue: false };
  }
  const member = findMemberByNo(statue.memberNo);
  if (!member) {
    return { ok: false, reason: "找不到對應成員", removeStatue: false };
  }
  statue.consumed = true; // 一次性
  return { ok: true, member, removeStatue: true };
}

/** 已解鎖成員數（供進度顯示 x/20）。 */
export function unlockedCount(statues: readonly StatueState[]): number {
  return statues.filter((s) => s.consumed).length;
}
