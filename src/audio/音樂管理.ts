import { 應用程式狀態 } from "../ui/應用程式狀態";

type 音軌鍵 =
  | "lobby"
  | "early"
  | "mid"
  | "late"
  | "showdown"
  | "boss_geometry"
  | "boss_fractal"
  | "boss_mechanical"
  | "boss_cola";

type Boss音樂類型 = "geometry" | "organic" | "fractal" | "mechanical" | "cola" | null;

interface 戰場音樂情境 {
  elapsedSeconds: number;
  boss: Boss音樂類型;
}

interface 音樂狀態 {
  volume: number;
  muted: boolean;
  trackLabel: string;
  sceneLabel: string;
}

const VOLUME_STORAGE_KEY = "cola-music-volume";
const MUTE_STORAGE_KEY = "cola-music-muted";

const 音軌表: Record<音軌鍵, { src: string; label: string }> = {
  lobby: { src: "/assets/audio/music/title/大廳音樂.mp3", label: "Lobby Theme" },
  early: { src: "/assets/audio/music/gameplay/遊戲初期音樂.mp3", label: "Early Battle" },
  mid: { src: "/assets/audio/music/gameplay/遊戲中期音樂.mp3", label: "Mid Battle" },
  late: { src: "/assets/audio/music/gameplay/遊戲後期音樂.mp3", label: "Late Battle" },
  showdown: { src: "/assets/audio/music/gameplay/遊戲大後期音樂.mp3", label: "Showdown" },
  boss_geometry: { src: "/assets/audio/music/gameplay/幾何boss音樂.mp3", label: "Geometry Guardian" },
  boss_fractal: { src: "/assets/audio/music/gameplay/分形boss音樂.mp3", label: "Fractal Guardian" },
  boss_mechanical: { src: "/assets/audio/music/gameplay/機械boss音樂.mp3", label: "Mechanical Guardian" },
  boss_cola: { src: "/assets/audio/music/gameplay/最終boss音樂.mp3", label: "Final Boss" },
};

const audio = new Audio();
audio.loop = true;
audio.preload = "auto";

let 已啟動 = false;
let 已解鎖 = false;
let 目前音軌: 音軌鍵 | null = null;
let 戰場情境: 戰場音樂情境 = { elapsedSeconds: 0, boss: null };
let 音量 = 讀取初始音量();
let 靜音 = 讀取初始靜音();
const 監聽者 = new Set<() => void>();

function 讀取初始音量(): number {
  try {
    const raw = window.localStorage.getItem(VOLUME_STORAGE_KEY);
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return Math.max(0, Math.min(1, parsed));
  } catch {
    // ignore
  }
  return 0.6;
}

function 讀取初始靜音(): boolean {
  try {
    return window.localStorage.getItem(MUTE_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function 寫入設定(): void {
  try {
    window.localStorage.setItem(VOLUME_STORAGE_KEY, String(音量));
    window.localStorage.setItem(MUTE_STORAGE_KEY, String(靜音));
  } catch {
    // ignore
  }
}

function 通知(): void {
  for (const fn of 監聽者) fn();
}

function 套用音量(): void {
  audio.volume = 靜音 ? 0 : 音量;
}

function 解析戰場音軌(): 音軌鍵 {
  if (戰場情境.boss === "cola") return "boss_cola";
  if (戰場情境.boss === "geometry") return "boss_geometry";
  if (戰場情境.boss === "fractal") return "boss_fractal";
  if (戰場情境.boss === "mechanical") return "boss_mechanical";
  if (戰場情境.boss === "organic") return "late";

  if (戰場情境.elapsedSeconds < 240) return "early";
  if (戰場情境.elapsedSeconds < 540) return "mid";
  if (戰場情境.elapsedSeconds < 900) return "late";
  return "showdown";
}

function 解析音樂場景標籤(): string {
  const layer = 應用程式狀態.畫面.層;
  if (layer === "主畫面") return "Lobby";
  if (layer === "遊戲準備流程") return "Pre-Match Setup";
  if (layer === "結算頁") return "Settlement";
  if (layer === "管理介面" || layer === "操作頁面") {
    if (應用程式狀態.畫面.訓練道場) return "Training Dojo";
    if (戰場情境.boss === "cola") return "Final Boss";
    if (戰場情境.boss === "geometry") return "Geometry Guardian";
    if (戰場情境.boss === "organic") return "Organic Guardian";
    if (戰場情境.boss === "fractal") return "Fractal Guardian";
    if (戰場情境.boss === "mechanical") return "Mechanical Guardian";
    return "Battlefield";
  }
  return "Lobby";
}

function 解析目標音軌(): 音軌鍵 {
  const layer = 應用程式狀態.畫面.層;
  if (layer === "操作頁面" || layer === "管理介面") {
    return 應用程式狀態.畫面.訓練道場 ? "early" : 解析戰場音軌();
  }
  if (layer === "遊戲準備流程" || layer === "結算頁") return "lobby";
  return "lobby";
}

async function 刷新播放(): Promise<void> {
  套用音量();
  const target = 解析目標音軌();
  const track = 音軌表[target];
  if (目前音軌 !== target) {
    目前音軌 = target;
    audio.src = track.src;
    audio.currentTime = 0;
  }
  通知();
  if (!已解鎖) return;
  try {
    await audio.play();
  } catch {
    // autoplay blocked; wait for next unlock gesture
  }
}

function 嘗試解鎖(): void {
  if (已解鎖) return;
  已解鎖 = true;
  void 刷新播放();
}

export function 啟動音樂管理(): void {
  if (已啟動) return;
  已啟動 = true;
  套用音量();
  應用程式狀態.訂閱(() => {
    void 刷新播放();
  });
  window.addEventListener("pointerdown", 嘗試解鎖, { passive: true });
  window.addEventListener("keydown", 嘗試解鎖, { passive: true });
  void 刷新播放();
}

export function 更新戰場音樂情境(next: 戰場音樂情境): void {
  if (戰場情境.elapsedSeconds === next.elapsedSeconds && 戰場情境.boss === next.boss) return;
  戰場情境 = next;
  if (應用程式狀態.畫面.層 === "操作頁面" || 應用程式狀態.畫面.層 === "管理介面") {
    void 刷新播放();
  }
}

export function 設定音樂音量(next: number): void {
  音量 = Math.max(0, Math.min(1, next));
  套用音量();
  寫入設定();
  通知();
}

export function 切換音樂靜音(): void {
  靜音 = !靜音;
  套用音量();
  寫入設定();
  通知();
}

export function 取得音樂狀態(): 音樂狀態 {
  return {
    volume: 音量,
    muted: 靜音,
    trackLabel: 目前音軌 ? 音軌表[目前音軌].label : "未播放",
    sceneLabel: 解析音樂場景標籤(),
  };
}

export function 訂閱音樂狀態(fn: () => void): () => void {
  監聽者.add(fn);
  return () => {
    監聽者.delete(fn);
  };
}
