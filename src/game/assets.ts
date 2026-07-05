/**
 * @file assets.ts
 * @description 資產載入器 + 音樂管理。全部素材沿用舊專案(見 AUDIT.md 第三節)。
 */

import type { World } from "../legacy/data/成員型別";
import type { CaptainId } from "../legacy/data/戰鬥原語";

const imageCache = new Map<string, HTMLImageElement>();

export function loadImage(url: string): HTMLImageElement {
  let img = imageCache.get(url);
  if (!img) {
    img = new Image();
    img.src = url;
    imageCache.set(url, img);
  }
  return img;
}

export function enemyImage(enemyId: string): HTMLImageElement {
  return loadImage(`assets/enemies/${enemyId}.png`);
}

export function avatarImage(memberId: string, star: 1 | 2 | 3): HTMLImageElement {
  return loadImage(`assets/avatars/${memberId}_s${star}.png`);
}

export function captainImage(id: CaptainId): HTMLImageElement {
  return loadImage(`assets/captains/${id}.png`);
}

export function floorImage(world: World): HTMLImageElement {
  return loadImage(`assets/floors/${world}.png`);
}

export function facilityImage(name: string): HTMLImageElement {
  return loadImage(`assets/facilities/${name}.png`);
}

export function propImage(world: World, name: string): HTMLImageElement {
  return loadImage(`assets/props/${world}/${name}.png`);
}

/** 預先觸發關鍵圖片的載入(不阻塞;canvas 端繪圖時再檢查 complete) */
export function preloadCore(): void {
  const worlds: World[] = ["geometry", "organic", "fractal", "mechanical"];
  for (const w of worlds) floorImage(w);
  for (const c of ["conductor", "operator", "launcher", "architect"] as CaptainId[]) captainImage(c);
  for (const f of [
    "guardian_altar_geometry", "guardian_altar_organic", "guardian_altar_fractal", "guardian_altar_mechanical",
    "family_furnace_shield", "family_furnace_multishot", "family_furnace_straight", "family_furnace_mine",
    "shop",
  ]) facilityImage(f);
}

// ============================================================
// 音樂(舊專案 5 首:大廳/初期/中期/後期/大後期)
// ============================================================

export type MusicTrack = "title" | "early" | "mid" | "late" | "showdown";

class MusicManager {
  private audio: HTMLAudioElement | null = null;
  private current: MusicTrack | null = null;
  private unlocked = false;
  volume = 0.55;

  /** 瀏覽器需要手勢後才允許播放;由第一次點擊呼叫 */
  unlock(): void {
    this.unlocked = true;
    if (this.current) this.play(this.current);
  }

  play(track: MusicTrack): void {
    if (this.current === track && this.audio && !this.audio.paused) return;
    this.current = track;
    if (!this.unlocked) return;
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    const a = new Audio(`assets/music/${track}.mp3`);
    a.loop = true;
    a.volume = this.volume;
    a.play().catch(() => {
      /* 自動播放被擋下時靜默;下一次手勢會重試 */
    });
    this.audio = a;
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    this.current = null;
  }
}

export const music = new MusicManager();
