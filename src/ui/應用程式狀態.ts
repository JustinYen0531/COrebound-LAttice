/**
 * @file 應用程式狀態.ts
 * @description 主流程骨架原型的全域狀態機。只負責「畫面骨架」層級的狀態轉換與 R1-R12 衝突規則的可示範版本，
 * 不包含真實戰鬥數值。規則編號對應 doc/介面流程/主流程與頁面骨架_統一版.md 第 5 節。
 */
import type { 畫面狀態, 互動設施, 管理介面分頁, 主畫面分頁 } from "./共用型別";
import { 初始化正式玩家生命 } from "./正式對局小隊狀態";
import { 開始新對局 } from "./對局戰報狀態";
import type { 語言代碼 } from "./語系";

type 滑動面板 = "無" | "左" | "右";
const LANGUAGE_STORAGE_KEY = "cola-ui-language";

interface 額外狀態 {
  語言: 語言代碼;
  滑動面板: 滑動面板; // R1：左右滑互斥
  圓盤展開階段: 0 | 1 | 2 | 3; // 0=收起, 1=內圈, 2=中圈, 3=外圈
  選中隊長: string | null;
  選中的小隊成員展示位: number | null;
  靠近的互動設施: 互動設施 | null; // 模擬玩家是否站在某互動物件旁（R5）
  世界時鐘秒數: number; // R3：管理介面開啟時世界時間持續流動
  縮圈警戒: boolean;
  // 以下為「目前正在瀏覽的子分頁」，刻意存進 store 而非頁面內部 closure，
  // 這樣世界時鐘每秒觸發的整頁重繪才不會把玩家瀏覽到一半的分頁重置回預設值。
  互動選中設施: 互動設施 | null;
  背包選中分類: string;
  地圖選中分類: string;
  圖鑑選中OOC: string;
  圖鑑選中IC: string;
  圖鑑選中條目ID_OOC: string | null;
  圖鑑選中條目ID_IC: string | null;
  圖鑑選中星級: number;
  圖鑑選中隊長形態: number;
  圖鑑列表展開_OOC: boolean;
  圖鑑列表展開_IC: boolean;
}

function 讀取初始語言(): 語言代碼 {
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return saved === "zh" ? "zh" : "en";
  } catch {
    return "en";
  }
}

export const 背包分類清單 = ["材料", "消耗品", "任務物", "追蹤中"] as const;
export const 地圖分類清單 = ["縮影", "互動點", "危險區", "事件區"] as const;
export const 圖鑑資料查詢類分頁 = [
  "成員圖鑑",
  "怪物圖鑑",
  "世界圖鑑",
  "材料圖鑑",
  "機制圖鑑",
  "Boss圖鑑",
  "隊長圖鑑",
] as const;

class 應用程式狀態機 {
  畫面: 畫面狀態 = { 層: "主畫面", 子頁: null };
  額外: 額外狀態 = {
    語言: 讀取初始語言(),
    滑動面板: "無",
    圓盤展開階段: 0,
    選中隊長: null,
    選中的小隊成員展示位: null,
    靠近的互動設施: null,
    世界時鐘秒數: 0,
    縮圈警戒: false,
    互動選中設施: null,
    背包選中分類: 背包分類清單[0],
    地圖選中分類: 地圖分類清單[0],
    圖鑑選中OOC: 圖鑑資料查詢類分頁[0],
    圖鑑選中IC: 圖鑑資料查詢類分頁[0],
    圖鑑選中條目ID_OOC: null,
    圖鑑選中條目ID_IC: null,
    圖鑑選中星級: 3,
    圖鑑選中隊長形態: 1,
    圖鑑列表展開_OOC: true,
    圖鑑列表展開_IC: true,
  };

  private 監聽者: Array<() => void> = [];

  訂閱(fn: () => void) {
    this.監聽者.push(fn);
  }

  private 通知() {
    for (const fn of this.監聽者) fn();
  }

  private 更新畫面(下一狀態: 畫面狀態) {
    this.畫面 = 下一狀態;
    this.通知();
  }

  設定語言(語言: 語言代碼) {
    this.額外.語言 = 語言;
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, 語言);
    } catch {
      // ignore storage failures in preview/sandbox contexts
    }
    this.通知();
  }

  // ---- 世界時鐘：R3，不因為切換 UI 層而暫停 ----
  啟動世界時鐘() {
    setInterval(() => {
      const 在對局內 = this.畫面.層 === "操作頁面" || this.畫面.層 === "管理介面";
      if (!在對局內) return;
      this.額外.世界時鐘秒數 += 1;
      if (this.額外.世界時鐘秒數 >= 45) this.額外.縮圈警戒 = true;
      this.通知();
    }, 1000);
  }

  // ---- 主畫面 ----
  切換主畫面子頁(子頁: 主畫面分頁) {
    if (this.畫面.層 !== "主畫面") {
      this.更新畫面({ 層: "主畫面", 子頁: 子頁 });
      return;
    }
    const 目前 = this.畫面.子頁;
    this.更新畫面({ 層: "主畫面", 子頁: 目前 === 子頁 ? null : 子頁 });
  }

  返回主畫面() {
    this.額外.滑動面板 = "無";
    this.額外.圓盤展開階段 = 0;
    this.更新畫面({ 層: "主畫面", 子頁: null });
  }

  // ---- 遊戲準備流程 / 進場 ----
  進入遊戲準備流程(來源: "New Game" | "Continue Game" | "再來一場") {
    this.更新畫面({ 層: "遊戲準備流程", 來源 });
  }

  確認進場(訓練道場 = false) {
    this.額外.世界時鐘秒數 = 0;
    this.額外.縮圈警戒 = false;
    this.額外.滑動面板 = "無";
    this.額外.圓盤展開階段 = 0;
    // 正式遊玩進場時把玩家生命補滿（訓練道場另由其狀態自行管理）。
    if (!訓練道場) {
      初始化正式玩家生命();
      開始新對局();
    }
    this.更新畫面({ 層: "操作頁面", 訓練道場 });
  }

  進入訓練道場() {
    this.額外.世界時鐘秒數 = 0;
    this.額外.縮圈警戒 = false;
    this.更新畫面({ 層: "操作頁面", 訓練道場: true });
  }

  // ---- 操作頁面：左右滑互斥 R1 ----
  設定滑動面板(面板: 滑動面板) {
    if (this.畫面.層 !== "操作頁面") return;
    this.額外.滑動面板 = this.額外.滑動面板 === 面板 ? "無" : 面板;
    this.通知();
  }

  // ---- 頭像停留展開圓盤，逐圈展開 ----
  展開下一圈() {
    if (this.畫面.層 !== "操作頁面") return;
    this.額外.圓盤展開階段 = Math.min(3, (this.額外.圓盤展開階段 + 1)) as 0 | 1 | 2 | 3;
    this.通知();
  }

  收回圓盤() {
    this.額外.圓盤展開階段 = 0;
    this.通知();
  }

  // ---- 點擊已展開圓盤 -> 進入管理介面 ----
  進入管理介面(分頁: 管理介面分頁 = "小隊") {
    if (this.畫面.層 !== "操作頁面" && this.畫面.層 !== "管理介面") return;
    const 訓練道場 = this.畫面.訓練道場;
    this.額外.滑動面板 = "無"; // R2：進管理介面時操作頁面滑動狀態自動收回
    this.更新畫面({ 層: "管理介面", 分頁, 訓練道場 });
  }

  // ---- 驚嘆號提示：模擬靠近設施 + 快跳規則 R6 ----
  模擬靠近設施(設施: 互動設施 | null) {
    this.額外.靠近的互動設施 = 設施;
    this.通知();
  }

  點擊驚嘆號提示() {
    if (!this.額外.靠近的互動設施) return;
    const 訓練道場 =
      this.畫面.層 === "操作頁面" || this.畫面.層 === "管理介面" ? this.畫面.訓練道場 : false;
    this.額外.互動選中設施 = this.額外.靠近的互動設施; // R6：驚嘆號跳轉優先權高於玩家原本停留的分頁
    this.更新畫面({
      層: "管理介面",
      分頁: "互動",
      驚嘆號跳轉互動子頁: this.額外.靠近的互動設施,
      訓練道場,
    });
  }

  切換管理介面分頁(分頁: 管理介面分頁) {
    if (this.畫面.層 !== "管理介面") return;
    this.更新畫面({ 層: "管理介面", 分頁, 訓練道場: this.畫面.訓練道場 });
  }

  // ---- 子分頁選取（持久化進 store，避免世界時鐘每秒重繪把選取重置） ----
  設定互動選中設施(設施: 互動設施) {
    this.額外.互動選中設施 = 設施;
    this.通知();
  }

  設定背包分類(名稱: string) {
    this.額外.背包選中分類 = 名稱;
    this.通知();
  }

  設定地圖分類(名稱: string) {
    this.額外.地圖選中分類 = 名稱;
    this.通知();
  }

  設定圖鑑分頁(情境: "OOC" | "IC", 名稱: string) {
    if (情境 === "OOC") {
      this.額外.圖鑑選中OOC = 名稱;
      this.額外.圖鑑選中條目ID_OOC = null;
      this.額外.圖鑑列表展開_OOC = true;
    } else {
      this.額外.圖鑑選中IC = 名稱;
      this.額外.圖鑑選中條目ID_IC = null;
      this.額外.圖鑑列表展開_IC = true;
    }
    this.通知();
  }

  設定圖鑑選中條目(情境: "OOC" | "IC", id: string | null) {
    if (情境 === "OOC") {
      this.額外.圖鑑選中條目ID_OOC = id;
      this.額外.圖鑑列表展開_OOC = id === null;
    } else {
      this.額外.圖鑑選中條目ID_IC = id;
      this.額外.圖鑑列表展開_IC = id === null;
    }
    this.通知();
  }

  設定圖鑑列表展開(情境: "OOC" | "IC", 展開: boolean) {
    if (情境 === "OOC") this.額外.圖鑑列表展開_OOC = 展開;
    else this.額外.圖鑑列表展開_IC = 展開;
    this.通知();
  }

  設定圖鑑選中星級(星級: number) {
    this.額外.圖鑑選中星級 = 星級;
    this.通知();
  }

  設定圖鑑選中隊長形態(形態: number) {
    this.額外.圖鑑選中隊長形態 = 形態;
    this.通知();
  }

  // ---- R7：管理介面只能回操作頁面，不能直接回主畫面 ----
  返回戰場() {
    if (this.畫面.層 !== "管理介面") return;
    this.額外.圓盤展開階段 = 0;
    this.更新畫面({ 層: "操作頁面", 訓練道場: this.畫面.訓練道場 });
  }

  // ---- R12：訓練道場不觸發結算頁，直接回主畫面 ----
  退出訓練道場() {
    this.返回主畫面();
  }

  // ---- R11：終局事件最高優先權，強制打斷任何層級直接進結算頁 ----
  觸發終局事件() {
    if (this.畫面.層 === "操作頁面" && this.畫面.訓練道場) return; // 訓練道場沒有終局事件
    if (this.畫面.層 === "管理介面" && this.畫面.訓練道場) return;
    this.更新畫面({ 層: "結算頁" });
  }

  回大廳() {
    this.返回主畫面();
  }

  再來一場() {
    this.進入遊戲準備流程("再來一場");
  }
}

export const 應用程式狀態 = new 應用程式狀態機();
