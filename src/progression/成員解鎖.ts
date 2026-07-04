/**
 * @file 成員解鎖.ts
 * @description 處理解鎖新成員時的前置條件、雕像互動結果、0 到 1 星初始化流程，
 *              以及與角色持有狀態的同步。
 *              對應「doc/角色與敵方/成員圖鑑.md」（20 名成員）與雕像解鎖流程。
 *
 *              純演算：維護「持有/星級」狀態表，提供解鎖（0→1★）與查詢。
 *              雕像互動事件由 economy/雕像解鎖.ts 產生，這裡消化成持有狀態。
 */

import { MEMBERS, findMemberByNo } from "../data/成員資料庫";
import type { StarLevel } from "../data/成員型別";

/** 單一成員的持有狀態。star=0 表示尚未解鎖。 */
export interface MemberOwnership {
  memberNo: number;
  owned: boolean;
  star: 0 | StarLevel;
}

/** 全體成員持有狀態表（memberNo → 狀態）。 */
export type OwnershipTable = Map<number, MemberOwnership>;

/** 建立全 20 名成員的初始持有狀態（全未解鎖）。 */
export function createOwnershipTable(): OwnershipTable {
  const table: OwnershipTable = new Map();
  for (const m of MEMBERS) {
    table.set(m.no, { memberNo: m.no, owned: false, star: 0 });
  }
  return table;
}

/** 是否已持有。 */
export function isOwned(table: OwnershipTable, memberNo: number): boolean {
  return table.get(memberNo)?.owned ?? false;
}

/**
 * 初始化解鎖（0→1★）：對應雕像互動成功。
 * @returns 是否成功（已持有或成員不存在則失敗）
 */
export function unlockMember(table: OwnershipTable, memberNo: number): boolean {
  if (!findMemberByNo(memberNo)) return false;
  const cur = table.get(memberNo);
  if (!cur || cur.owned) return false;
  table.set(memberNo, { memberNo, owned: true, star: 1 });
  return true;
}

/** 更新某成員的星級（升星系統呼叫後同步）。 */
export function setMemberStar(table: OwnershipTable, memberNo: number, star: StarLevel): void {
  const cur = table.get(memberNo);
  if (cur && cur.owned) table.set(memberNo, { ...cur, star });
}

/** 已解鎖成員數。 */
export function ownedCount(table: OwnershipTable): number {
  let n = 0;
  for (const v of table.values()) if (v.owned) n += 1;
  return n;
}

/**
 * 上陣名單的累計總星級（供隊長進化與技能解鎖判定）。
 * @param deployedNos 上陣成員編號
 */
export function deployedTotalStar(table: OwnershipTable, deployedNos: readonly number[]): number {
  let total = 0;
  for (const no of deployedNos) {
    const s = table.get(no);
    if (s?.owned) total += s.star;
  }
  return total;
}
