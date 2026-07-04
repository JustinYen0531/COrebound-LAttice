/**
 * @file glyphs.ts
 * @description HUD 專用線稿圖示集，取代先前佔位用的 emoji（🛡💥🎯💣⚡🧪❤🔋等）。
 * 統一走「黑白／粗線條」語彙：單色 stroke="currentColor"，無填色，
 * 由呼叫端的 CSS color 決定顯示顏色，跟遊戲其他部分（圖騰、地板、環境物件）
 * 的線稿美術方向一致。viewBox 固定 0 0 24 24，方便任意縮放置中。
 */

import type { WeaponFamily } from "./types";

const WRAP = (inner: string) =>
  `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;

/** 家族線稿：護盾＝六角盾牌／多發＝三向扇射／直線＝單一長箭／地雷＝菱形引爆／激光＝鋸齒光束 */
const FAMILY_PATH: Record<WeaponFamily, string> = {
  shield: `<path d="M12 2.5 L20 6 V11.5 C20 16.2 16.6 20.1 12 21.5 C7.4 20.1 4 16.2 4 11.5 V6 Z"
      stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M12 6.5 V17.5 M8.2 9 H15.8" stroke="currentColor" stroke-width="1.2" opacity="0.7"/>`,
  multishot: `<path d="M12 21 V10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M12 10 L5 4 M12 10 L12 2.5 M12 10 L19 4"
      stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="5" cy="4" r="1.4" fill="currentColor"/>
    <circle cx="12" cy="2.5" r="1.4" fill="currentColor"/>
    <circle cx="19" cy="4" r="1.4" fill="currentColor"/>`,
  straight: `<path d="M4 12 H18.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    <path d="M14.5 7 L20 12 L14.5 17" stroke="currentColor" stroke-width="2"
      stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  mine: `<path d="M12 2.5 L21.5 12 L12 21.5 L2.5 12 Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M12 7.5 V12 L15 14.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="12" cy="12" r="1.6" fill="currentColor"/>`,
  laser: `<path d="M6 2.5 L3 12.5 H9 L5.5 21.5 L21 9.5 H13.5 L17.5 2.5 Z"
      stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>`,
};

export function familyGlyphSvg(family: WeaponFamily): string {
  return WRAP(FAMILY_PATH[family]);
}

/** 藥水線稿：小/大生命藥水為水滴、能量藥水為閃電、混合為雙水滴交疊 */
export type PotionKind = "hp-small" | "hp-big" | "energy-small" | "energy-big" | "hybrid";

const POTION_PATH: Record<PotionKind, string> = {
  "hp-small": `<path d="M12 3 C12 3 6 10.5 6 15 a6 6 0 0 0 12 0 C18 10.5 12 3 12 3 Z"
      stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>`,
  "hp-big": `<path d="M12 2.5 C12 2.5 5 11 5 16 a7 7 0 0 0 14 0 C19 11 12 2.5 12 2.5 Z"
      stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M9.5 16 h5 M12 13.5 v5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`,
  "energy-small": `<path d="M13 2.5 L6 13.5 H11 L10 21.5 L18 10 H13 Z"
      stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/>`,
  "energy-big": `<path d="M14 2 L5.5 13.5 H11 L9.5 22 L19 9.5 H13 Z"
      stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round"/>`,
  hybrid: `<path d="M9 3.5 C9 3.5 4 10 4 13.5 a5 5 0 0 0 10 0 C14 10 9 3.5 9 3.5 Z"
      stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M15.5 8.5 C15.5 8.5 11.5 13.7 11.5 16.7 a4 4 0 0 0 8 0 C19.5 13.7 15.5 8.5 15.5 8.5 Z"
      stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" opacity="0.85"/>`,
};

export function potionGlyphSvg(kind: PotionKind): string {
  return WRAP(POTION_PATH[kind]);
}

/** 鎖頭（家族人數不足時使用，取代 🔒） */
export function lockGlyphSvg(): string {
  return WRAP(
    `<rect x="5.5" y="10.5" width="13" height="10" rx="1.5" stroke="currentColor" stroke-width="1.8"/>
     <path d="M8 10.5 V7.5 a4 4 0 0 1 8 0 V10.5" stroke="currentColor" stroke-width="1.8" fill="none"/>`,
  );
}

/** 週期技能（循環累積）與自動施法（脈衝觸發）圖示，取代 ↻ / ✦ */
export function periodicGlyphSvg(kind: "periodic" | "auto"): string {
  if (kind === "periodic") {
    return WRAP(
      `<path d="M18.5 8 A7.5 7.5 0 1 0 19.8 14" stroke="currentColor" stroke-width="1.8"
         stroke-linecap="round" fill="none"/>
       <path d="M18.5 3.5 V8.5 H13.5" stroke="currentColor" stroke-width="1.8"
         stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
    );
  }
  return WRAP(
    `<path d="M12 3 L14.5 9.5 L21 12 L14.5 14.5 L12 21 L9.5 14.5 L3 12 L9.5 9.5 Z"
       stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>`,
  );
}
