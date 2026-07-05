/**
 * @file 養成狀態.ts
 * @description 正式對局的「上陣小隊養成」單一真相來源：8 名上陣隊員各自的當前星級，
 *              以及由累計星級推導的隊長引擎星級。升星會真的從 背包狀態 扣資源，
 *              升完之後小隊屬性摘要（供戰鬥/HUD）也跟著變強——形成「打怪→變強」閉環。
 *
 *              升星消耗遵循機制指南：家族碎片（角色升星.starUpCost）+ 5-3-1 生物材料。
 *              生物材料以「該隊員所屬世界的任意材料」代扣（總量＝5-3-1 配方總份數），
 *              數量magnitudes 忠於配方，僅簡化「指定哪一顆材料」。
 */

import { MEMBERS } from "../data/成員資料庫";
import { statsAtStar, type Family, type StarLevel } from "../data/成員型別";
import { captainStatsAtStar } from "../data/控制引擎";
import { materialsByWorld } from "../data/素材資料庫";
import { starUpCost } from "./角色升星";
import { captainStarFromTotal } from "./隊長進化";
import * as 背包 from "../economy/背包狀態";
import { 應用程式狀態 } from "../ui/應用程式狀態";
import type { CaptainId, ControlStar } from "../data/戰鬥原語";
import { createOwnershipTable, setMemberStar, unlockMember, type OwnershipTable } from "./成員解鎖";
import { computeFamilyWeaponStatus } from "../skills/技能管理";
import { upgradeWeapon } from "./工作台製作";

export type 初始成員層級 = "inner" | "middle" | "outer";
export type 初始成員職責 = "protect" | "firepower" | "supply";

interface 隊員養成 {
  memberNo: number;
  star: StarLevel;
  layer: 初始成員層級;
  role: 初始成員職責;
}

type 武器星級 = 0 | StarLevel;

const 預設起始成員配置: Array<{ memberNo: number; layer: 初始成員層級; role: 初始成員職責 }> = [
  { memberNo: 1, layer: "inner", role: "protect" },
  { memberNo: 2, layer: "middle", role: "firepower" },
  { memberNo: 3, layer: "outer", role: "supply" },
];

let 起始成員配置 = 預設起始成員配置.map((entry) => ({ ...entry }));
const 持有狀態表: OwnershipTable = createOwnershipTable();
const 家族武器星級: Record<Family, 武器星級> = {
  shield: 0,
  multishot: 0,
  straight: 0,
  mine: 0,
  laser: 0,
};

// 正式上陣 = 開局選中的 3 名初始成員，各從 1★ 起步。
const 上陣: 隊員養成[] = 起始成員配置.map((entry) => ({
  memberNo: entry.memberNo,
  star: 1 as StarLevel,
  layer: entry.layer,
  role: entry.role,
}));

function 重建正式持有狀態(): void {
  持有狀態表.clear();
  const fresh = createOwnershipTable();
  for (const [memberNo, state] of fresh.entries()) {
    持有狀態表.set(memberNo, state);
  }
  for (const entry of 上陣) {
    unlockMember(持有狀態表, entry.memberNo);
    setMemberStar(持有狀態表, entry.memberNo, entry.star);
  }
}

function 重置家族武器星級(): void {
  (Object.keys(家族武器星級) as Family[]).forEach((family) => {
    家族武器星級[family] = 0;
  });
}

重建正式持有狀態();

const 預設隊長: CaptainId = "conductor";

function 當前隊長(): CaptainId {
  const s = 應用程式狀態.額外.選中隊長;
  if (s === "conductor" || s === "operator" || s === "launcher" || s === "architect") return s;
  return 預設隊長;
}

/** 上陣隊員累計總星級（決定隊長進化）。 */
export function 隊員累計總星級(): number {
  return 上陣.reduce((sum, e) => sum + e.star, 0);
}

/** 由累計星級推導的隊長引擎星級。 */
export function 當前隊長星級(): ControlStar {
  return captainStarFromTotal(隊員累計總星級());
}

/** 供 HUD/名單顯示的上陣清單。 */
export function 取得上陣養成(): Array<{
  memberNo: number;
  nameZh: string;
  family: string;
  star: StarLevel;
  layer: 初始成員層級;
  role: 初始成員職責;
}> {
  return 上陣.map((e) => {
    const def = MEMBERS.find((m) => m.no === e.memberNo)!;
    return {
      memberNo: e.memberNo,
      nameZh: def.nameZh,
      family: def.family,
      star: e.star,
      layer: e.layer,
      role: e.role,
    };
  });
}

export function 取得起始成員配置(): Array<{
  memberNo: number;
  layer: 初始成員層級;
  role: 初始成員職責;
}> {
  return 起始成員配置.map((entry) => ({ ...entry }));
}

export function 設定起始成員(layer: 初始成員層級, memberNo: number): void {
  const target = 起始成員配置.find((entry) => entry.layer === layer);
  if (!target) return;
  target.memberNo = memberNo;
}

export function 套用起始成員配置(): void {
  上陣.length = 0;
  for (const entry of 起始成員配置) {
    上陣.push({
      memberNo: entry.memberNo,
      star: 1 as StarLevel,
      layer: entry.layer,
      role: entry.role,
    });
  }
  重建正式持有狀態();
  重置家族武器星級();
}

export function 成員是否已初始化(memberNo: number): boolean {
  return 持有狀態表.get(memberNo)?.owned ?? false;
}

export function 取得全成員初始化狀態(): Array<{
  memberNo: number;
  owned: boolean;
  star: 0 | StarLevel;
}> {
  return MEMBERS.map((member) => {
    const state = 持有狀態表.get(member.no);
    return {
      memberNo: member.no,
      owned: state?.owned ?? false,
      star: state?.star ?? 0,
    };
  });
}

export function 初始化解鎖成員(memberNo: number): { ok: boolean; reason?: string } {
  const ok = unlockMember(持有狀態表, memberNo);
  return ok ? { ok: true } : { ok: false, reason: "成員已初始化或資料不存在" };
}

export function 取得家族武器升級狀態(): Array<{
  family: Family;
  currentStar: 武器星級;
  unlockedStar: 0 | StarLevel;
  memberCount: number;
  totalStar: number;
}> {
  const deployed = 取得上陣養成().map((member) => ({ family: member.family as Family, star: member.star }));
  return computeFamilyWeaponStatus(deployed).map((entry) => ({
    family: entry.family as Family,
    currentStar: 家族武器星級[entry.family as Family],
    unlockedStar: entry.unlockedStar,
    memberCount: entry.memberCount,
    totalStar: entry.totalStar,
  }));
}

export function 升級家族武器(family: Family): { ok: boolean; reason?: string; newStar?: StarLevel } {
  const familyStatus = 取得家族武器升級狀態().find((entry) => entry.family === family);
  if (!familyStatus) return { ok: false, reason: "找不到家族武器狀態" };
  const result = upgradeWeapon(
    familyStatus.currentStar,
    familyStatus.unlockedStar,
    { shards: 背包.取碎片(family), gems: 背包.取原石() },
  );
  if (!result.ok || !result.newStar || !result.remaining) {
    return { ok: false, reason: result.reason ?? "無法升級武器" };
  }
  背包.花費碎片(family, 背包.取碎片(family) - result.remaining.shards);
  背包.花費原石(背包.取原石() - result.remaining.gems);
  家族武器星級[family] = result.newStar;
  return { ok: true, newStar: result.newStar };
}

/** 全隊屬性摘要（隊長@進化星級 + 8 隊員@各自星級）。 */
export function 小隊屬性摘要() {
  const captain = captainStatsAtStar(當前隊長(), 當前隊長星級());
  let totalHp = captain.hp;
  let totalAtk = captain.atk;
  let totalWeight = 12; // 基礎重量 12（與舊版一致）
  for (const e of 上陣) {
    const def = MEMBERS.find((m) => m.no === e.memberNo)!;
    const s = statsAtStar(def.base, e.star);
    totalHp += s.hp;
    totalAtk += s.atk;
    totalWeight += s.weight;
  }
  return { captainId: 當前隊長(), totalHp, totalAtk, totalWeight };
}

/** 升星結果。 */
export interface 升星回報 {
  ok: boolean;
  reason?: string;
  newStar?: StarLevel;
}

/**
 * 升某位上陣隊員一星：從 背包 扣家族碎片 + 該世界生物材料（5-3-1 總量），成功才 star++。
 * @param index 上陣索引 0~7
 */
export function 升星上陣隊員(index: number): 升星回報 {
  const e = 上陣[index];
  if (!e) return { ok: false, reason: "無此上陣位" };
  if (e.star >= 3) return { ok: false, reason: "已達 3★" };
  const def = MEMBERS.find((m) => m.no === e.memberNo)!;
  const target = (e.star + 1) as StarLevel;
  const cost = starUpCost(target);
  const 材料需求 = cost.fineCurrent + cost.commonCurrent + cost.finePrev;

  // 檢查資源
  if (背包.取碎片(def.family) < cost.shards) return { ok: false, reason: "家族碎片不足" };
  const worldMats = materialsByWorld(def.world);
  const 可用材料 = worldMats.reduce((sum, mat) => sum + 背包.取材料(mat.no), 0);
  if (可用材料 < 材料需求) return { ok: false, reason: "生物材料不足" };

  // 扣資源
  背包.花費碎片(def.family, cost.shards);
  let remaining = 材料需求;
  for (const mat of worldMats) {
    if (remaining <= 0) break;
    const have = 背包.取材料(mat.no);
    const take = Math.min(have, remaining);
    if (take > 0) {
      背包.花費材料(mat.no, take);
      remaining -= take;
    }
  }

  e.star = target;
  setMemberStar(持有狀態表, e.memberNo, target);
  return { ok: true, newStar: target };
}

/** 除錯/驗收：把全隊重置回 1★。 */
export function 重置養成(): void {
  套用起始成員配置();
}
