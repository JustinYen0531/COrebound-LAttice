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

import { 小隊屬性摘要 } from "../progression/養成狀態";
import { 應用程式狀態 } from "./應用程式狀態";

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

/**
 * 取得正式對局的全隊摘要。
 * 屬性由 養成狀態 提供（隊長@進化星級 + 8 隊員@各自升星星級），
 * 因此「打怪→升星」會實際反映到全隊 HP/ATK/重量。
 */
export function 取得正式小隊摘要() {
  const s = 小隊屬性摘要();
  return {
    captainId: s.captainId,
    totalHp: s.totalHp,
    totalAtk: s.totalAtk,
    totalWeight: s.totalWeight,
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
  const nextHp = Math.max(0, Math.min(狀態.playerMaxHp, Math.round(hp)));
  if (應用程式狀態.額外.Showcase模式 && 應用程式狀態.額外.ShowcaseGodMode && nextHp < 狀態.playerHp) return;
  狀態.playerHp = nextHp;
}

export function 回滿正式玩家生命(): void {
  初始化正式玩家生命();
}

/**
 * 升星後刷新最大生命：重算全隊 totalHp 當上限，並維持目前生命百分比。
 * 讓「升星→血條上限提升」立即反映（不需重進戰局）。
 */
export function 刷新正式最大生命(): void {
  if (!狀態.initialized) {
    初始化正式玩家生命();
    return;
  }
  const 舊比例 = 狀態.playerMaxHp > 0 ? 狀態.playerHp / 狀態.playerMaxHp : 1;
  狀態.playerMaxHp = 取得正式小隊摘要().totalHp;
  狀態.playerHp = Math.round(狀態.playerMaxHp * 舊比例);
}

/** 玩家是否已經陣亡（正式對局）。 */
export function 正式玩家已陣亡(): boolean {
  return 狀態.initialized && 狀態.playerHp <= 0;
}
