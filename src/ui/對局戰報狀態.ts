/** 正式對局的單局統計。進場重置，終局後供結算頁讀取。 */
export type 對局結果 = "running" | "victory" | "defeat";

interface 對局戰報內部 {
  result: 對局結果;
  reason: string;
  startedAtMs: number;
  endedAtMs: number | null;
  kills: number;
  damageDealt: number;
  damageTaken: number;
  gemsEarned: number;
  materialsEarned: number;
  guardiansDefeated: number;
  coreKeyEarned: boolean;
}

const 建立初始狀態 = (): 對局戰報內部 => ({
  result: "running",
  reason: "對局進行中",
  startedAtMs: Date.now(),
  endedAtMs: null,
  kills: 0,
  damageDealt: 0,
  damageTaken: 0,
  gemsEarned: 0,
  materialsEarned: 0,
  guardiansDefeated: 0,
  coreKeyEarned: false,
});

let 狀態 = 建立初始狀態();

export function 開始新對局(): void {
  狀態 = 建立初始狀態();
}

export function 記錄對局傷害(造成傷害: number, 承受傷害 = 0): void {
  狀態.damageDealt += Math.max(0, Math.round(造成傷害));
  狀態.damageTaken += Math.max(0, Math.round(承受傷害));
}

export function 記錄對局擊殺(): void {
  狀態.kills += 1;
}

export function 記錄對局掉落(原石: number, 材料: number, 核心鑰匙 = false): void {
  狀態.gemsEarned += Math.max(0, Math.round(原石));
  狀態.materialsEarned += Math.max(0, Math.round(材料));
  狀態.coreKeyEarned ||= 核心鑰匙;
}

export function 記錄守護者擊敗(): void {
  狀態.guardiansDefeated = Math.min(4, 狀態.guardiansDefeated + 1);
}

export function 結束對局(result: Exclude<對局結果, "running">, reason: string): void {
  if (狀態.endedAtMs !== null) return;
  狀態.result = result;
  狀態.reason = reason;
  狀態.endedAtMs = Date.now();
}

export function 取得對局戰報() {
  const end = 狀態.endedAtMs ?? Date.now();
  return {
    ...狀態,
    durationSeconds: Math.max(0, Math.floor((end - 狀態.startedAtMs) / 1000)),
  };
}
