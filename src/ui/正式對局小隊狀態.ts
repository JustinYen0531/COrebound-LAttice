/**
 * @file 正式對局小隊狀態.ts
 * @description 正式對局（非訓練道場）的小隊屬性與玩家生命狀態。
 *
 *              訓練道場狀態.ts 已經實作了一套完整的「隊長 + 9 槽成員 → 全隊屬性」
 *              計算與玩家生命管理。但那些狀態是「沙盒測試專用」，刻意與正式對局
 *              分離（見該檔註解），而正式對局目前在 應用程式狀態.額外 只保存了
 *              「選中隊長」這一個字串，沒有小隊屬性來源。
 *
 *              本檔補上正式對局缺的那一塊：
 *              - 用「遊戲準備流程」選中的隊長 + 預設 9 槽編隊，算出全隊屬性
 *              - 維護一份玩家生命（正式對局用，與訓練道場各自獨立）
 *              - 提供 取得正式小隊摘要()，讓 世界地圖層.ts 的碰撞結算有屬性可用
 *
 *              計算公式與 訓練道場狀態.ts 完全一致（總HP=隊長+隊員、總ATK 同理、
 *              總重量=12+隊員重量），確保兩個模式數值語意統一。
 */

import { 應用程式狀態 } from "./應用程式狀態";
import { MEMBERS } from "../data/成員資料庫";
import { statsAtStar } from "../data/成員型別";
import { captainStatsAtStar } from "../data/控制引擎";
import type { CaptainId } from "../data/戰鬥原語";

const 預設隊長: CaptainId = "conductor";
const 預設成員星級 = 3 as const;
/** 基礎重量 12，與 訓練道場狀態.ts 的 totalWeight 公式一致。 */
const 基礎重量 = 12;

interface 正式對局內部狀態 {
  playerHp: number;
  playerMaxHp: number;
  /** 是否已初始化過（首次進正式對局時把生命補滿）。 */
  initialized: boolean;
}

const 狀態: 正式對局內部狀態 = {
  playerHp: 0,
  playerMaxHp: 0,
  initialized: false,
};

function 當前隊長(): CaptainId {
  const selected = 應用程式狀態.額外.選中隊長;
  if (selected === "conductor" || selected === "operator" || selected === "launcher" || selected === "architect") {
    return selected;
  }
  return 預設隊長;
}

/**
 * 取得正式對局的全隊摘要。
 * 預設編隊 = 前 8 名成員 + 當前隊長（3 星），與遊戲準備流程的小隊圓盤預覽一致。
 */
export function 取得正式小隊摘要() {
  const captainId = 當前隊長();
  const captain = captainStatsAtStar(captainId, 4);
  const members = MEMBERS.slice(0, 8).map((member) => ({
    member,
    stats: statsAtStar(member.base, 預設成員星級),
  }));
  const totalHp = captain.hp + members.reduce((sum, entry) => sum + entry.stats.hp, 0);
  const totalAtk = captain.atk + members.reduce((sum, entry) => sum + entry.stats.atk, 0);
  const totalWeight = 基礎重量 + members.reduce((sum, entry) => sum + entry.stats.weight, 0);
  return {
    captainId,
    totalHp,
    totalAtk,
    totalWeight,
    playerHp: 狀態.playerHp,
    playerMaxHp: 狀態.playerMaxHp,
  };
}

/** 進入正式對局時呼叫：把玩家生命設為滿血。 */
export function 初始化正式玩家生命(): void {
  const summary = 取得正式小隊摘要();
  狀態.playerMaxHp = summary.totalHp;
  狀態.playerHp = summary.totalHp;
  狀態.initialized = true;
}

export function 手動設定正式玩家生命(hp: number): void {
  if (!狀態.initialized) 初始化正式玩家生命();
  狀態.playerHp = Math.max(0, Math.min(狀態.playerMaxHp, Math.round(hp)));
}

export function 回滿正式玩家生命(): void {
  初始化正式玩家生命();
}

/** 玩家是否已經陣亡（正式對局）。 */
export function 正式玩家已陣亡(): boolean {
  return 狀態.initialized && 狀態.playerHp <= 0;
}
