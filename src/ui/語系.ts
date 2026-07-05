export type 語言代碼 = "zh" | "en";

export function 選文(語言: 語言代碼, 中文: string, 英文: string): string {
  return 語言 === "zh" ? 中文 : 英文;
}
