/**
 * @file 驗收場狀態.ts
 * @description 訓練道場驗收控制台的共用狀態：
 *              - 累積擊殺數 / 擊殺分布
 *              - 本次驗收結果（進行中 / 勝利 / 失敗）
 *              - 最後一則關鍵事件提示
 *
 *              刻意做成純狀態，讓世界地圖層寫入、HUD/控制台讀取。
 */

export type 驗收結果 = "idle" | "running" | "victory" | "defeat";

interface 驗收場內部 {
  kills: number;
  killBreakdown: Record<string, number>;
  result: 驗收結果;
  lastEvent: string;
}

const 狀態: 驗收場內部 = {
  kills: 0,
  killBreakdown: {},
  result: "idle",
  lastEvent: "尚未開始驗收。",
};

export function 取得驗收場快照() {
  return {
    kills: 狀態.kills,
    killBreakdown: { ...狀態.killBreakdown },
    result: 狀態.result,
    lastEvent: 狀態.lastEvent,
  };
}

export function 重置驗收場狀態(): void {
  狀態.kills = 0;
  狀態.killBreakdown = {};
  狀態.result = "idle";
  狀態.lastEvent = "已重置驗收場，等待下一輪測試。";
}

export function 記錄驗收擊殺(key: string, 說明?: string): void {
  狀態.kills += 1;
  狀態.killBreakdown[key] = (狀態.killBreakdown[key] ?? 0) + 1;
  if (狀態.result === "idle") 狀態.result = "running";
  狀態.lastEvent = 說明 ?? `已擊殺 ${key}`;
}

export function 設定驗收事件(訊息: string): void {
  if (!訊息) return;
  if (狀態.result === "idle") 狀態.result = "running";
  狀態.lastEvent = 訊息;
}

export function 標記驗收結果(result: 驗收結果, 訊息: string): void {
  狀態.result = result;
  狀態.lastEvent = 訊息;
}
