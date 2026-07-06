/**
 * @file 音效管理.ts
 * @description 全遊戲 UI/戰鬥音效：全部用 Web Audio 程序合成（不依賴音檔），
 *              與 音樂管理.ts 同一套「首次手勢解鎖 + localStorage 音量/靜音」慣例。
 *
 *              兩種掛載方式：
 *              1. 集中掛載（本檔內）：全域按鈕點擊、應用程式狀態轉場（子頁展開/收回、
 *                 管理介面開關、圖鑑選取、縮圈警戒、勝利結算）、隊長主動技能施放事件。
 *              2. 分散掛載（各元件內 import 播放音效）：HUD 抽屜/提示、藥水拖放、
 *                 受擊/碰撞/死亡復活、寶箱/撿取/Boss、互動設施成功失敗。
 *
 *              聲音家族刻意共用（先求手感一致再分支）：
 *              - 「儀式介面聲」：主畫面/管理頁/圖鑑/輪播 都是同一族乾淨正弦+三角波。
 *              - 「交易三聲」：商店/熔爐/工作台 共用 設施開啟/交易成功/交易失敗。
 */

import { 應用程式狀態 } from "../ui/應用程式狀態";

export type 音效名稱 =
  | "主畫面進入"
  | "世界輪播"
  | "按鈕點擊"
  | "子頁展開"
  | "子頁收回"
  | "管理開啟"
  | "管理關閉"
  | "圖鑑選取"
  | "技能施放"
  | "HUD提示"
  | "左抽屜"
  | "右抽屜"
  | "藥水拖起"
  | "藥水成功"
  | "藥水失敗"
  | "受擊"
  | "碰撞命中"
  | "死亡復活"
  | "縮圈警告"
  | "縮圈灼傷"
  | "設施開啟"
  | "交易成功"
  | "交易失敗"
  | "熔煉完成"
  | "升級完成"
  | "雕像解鎖"
  | "祭壇召喚"
  | "寶箱開啟"
  | "撿取"
  | "撿取重要"
  | "Boss登場"
  | "勝利";

const SFX_VOLUME_STORAGE_KEY = "cola-sfx-volume";
const SFX_MUTE_STORAGE_KEY = "cola-sfx-muted";
/** 目前舊量表的 100%（內部值 2.0）在新量表對應 30%。 */
export const 音效音量上限 = 20 / 3;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let limiter: DynamicsCompressorNode | null = null;
let 已解鎖 = false;
let 已啟動 = false;
let 已播進場音 = false;
let 音量 = 讀取初始音量();
let 靜音 = 讀取初始靜音();
const 監聽者 = new Set<() => void>();

/** 同名音效最短間隔（ms）：避免碰撞/受擊這類每 tick 觸發的音效洗版。 */
const 節流間隔: Partial<Record<音效名稱, number>> = {
  受擊: 240,
  碰撞命中: 300,
  縮圈灼傷: 900,
  撿取: 90,
  按鈕點擊: 60,
  圖鑑選取: 80,
  HUD提示: 400,
};
const 上次播放: Partial<Record<音效名稱, number>> = {};

function 讀取初始音量(): number {
  try {
    const raw = window.localStorage.getItem(SFX_VOLUME_STORAGE_KEY);
    // 注意：Number(null) === 0，缺鍵必須先擋掉，否則首次遊玩會被誤判成音量 0。
    if (raw !== null) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) return Math.max(0, Math.min(音效音量上限, parsed));
    }
  } catch {
    // ignore
  }
  return 音效音量上限 * 0.5;
}

function 讀取初始靜音(): boolean {
  try {
    return window.localStorage.getItem(SFX_MUTE_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function 寫入設定(): void {
  try {
    window.localStorage.setItem(SFX_VOLUME_STORAGE_KEY, String(音量));
    window.localStorage.setItem(SFX_MUTE_STORAGE_KEY, String(靜音));
  } catch {
    // ignore
  }
}

function 通知(): void {
  for (const fn of 監聽者) fn();
}

function 套用音量(): void {
  if (master && ctx) master.gain.setValueAtTime(靜音 ? 0 : 音量, ctx.currentTime);
}

function 確保音訊環境(): AudioContext | null {
  if (!ctx) {
    try {
      ctx = new AudioContext();
      master = ctx.createGain();
      limiter = ctx.createDynamicsCompressor();
      limiter.threshold.setValueAtTime(-8, ctx.currentTime);
      limiter.knee.setValueAtTime(12, ctx.currentTime);
      limiter.ratio.setValueAtTime(8, ctx.currentTime);
      limiter.attack.setValueAtTime(0.003, ctx.currentTime);
      limiter.release.setValueAtTime(0.16, ctx.currentTime);
      master.connect(limiter);
      limiter.connect(ctx.destination);
      套用音量();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

// ============================================================
// 合成基元
// ============================================================

interface 音符參數 {
  /** 起始頻率（Hz） */
  freq: number;
  /** 結束頻率（未給則不滑音） */
  endFreq?: number;
  type?: OscillatorType;
  /** 音長（秒，含釋放） */
  dur: number;
  gain?: number;
  /** 起音（秒） */
  attack?: number;
  /** 延遲開始（秒） */
  at?: number;
  pan?: number;
}

function 播音符(c: AudioContext, out: AudioNode, p: 音符參數): void {
  const t0 = c.currentTime + (p.at ?? 0);
  const osc = c.createOscillator();
  osc.type = p.type ?? "sine";
  osc.frequency.setValueAtTime(p.freq, t0);
  if (p.endFreq !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, p.endFreq), t0 + p.dur);
  const g = c.createGain();
  const peak = p.gain ?? 0.12;
  const attack = p.attack ?? 0.008;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + p.dur);
  osc.connect(g);
  let tail: AudioNode = g;
  if (p.pan !== undefined && typeof StereoPannerNode !== "undefined") {
    const panner = c.createStereoPanner();
    panner.pan.setValueAtTime(p.pan, t0);
    tail.connect(panner);
    tail = panner;
  }
  tail.connect(out);
  osc.start(t0);
  osc.stop(t0 + p.dur + 0.02);
}

interface 噪音參數 {
  dur: number;
  gain?: number;
  at?: number;
  filterType?: BiquadFilterType;
  /** 濾波起始頻率 */
  freq?: number;
  /** 濾波結束頻率（掃頻） */
  endFreq?: number;
  q?: number;
  pan?: number;
}

let 噪音緩衝: AudioBuffer | null = null;

function 取噪音緩衝(c: AudioContext): AudioBuffer {
  if (!噪音緩衝 || 噪音緩衝.sampleRate !== c.sampleRate) {
    噪音緩衝 = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const data = 噪音緩衝.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  }
  return 噪音緩衝;
}

function 播噪音(c: AudioContext, out: AudioNode, p: 噪音參數): void {
  const t0 = c.currentTime + (p.at ?? 0);
  const src = c.createBufferSource();
  src.buffer = 取噪音緩衝(c);
  src.loop = true;
  const filter = c.createBiquadFilter();
  filter.type = p.filterType ?? "bandpass";
  filter.frequency.setValueAtTime(p.freq ?? 1000, t0);
  if (p.endFreq !== undefined) filter.frequency.exponentialRampToValueAtTime(Math.max(20, p.endFreq), t0 + p.dur);
  filter.Q.setValueAtTime(p.q ?? 0.9, t0);
  const g = c.createGain();
  const peak = p.gain ?? 0.1;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + p.dur);
  src.connect(filter);
  filter.connect(g);
  let tail: AudioNode = g;
  if (p.pan !== undefined && typeof StereoPannerNode !== "undefined") {
    const panner = c.createStereoPanner();
    panner.pan.setValueAtTime(p.pan, t0);
    tail.connect(panner);
    tail = panner;
  }
  tail.connect(out);
  src.start(t0);
  src.stop(t0 + p.dur + 0.02);
}

// ============================================================
// 音色庫：每個名稱一支合成函式
// ============================================================

const 音色庫: Record<音效名稱, (c: AudioContext, out: AudioNode) => void> = {
  // 開遊戲第一聲：低頻核心點亮 + 上方亮音「叮」。短、乾淨。
  主畫面進入: (c, o) => {
    播音符(c, o, { freq: 110, endFreq: 220, type: "sine", dur: 0.5, gain: 0.16, attack: 0.05 });
    播音符(c, o, { freq: 880, dur: 0.34, gain: 0.08, at: 0.16 });
    播音符(c, o, { freq: 1318, dur: 0.4, gain: 0.05, at: 0.22 });
  },
  // 世界轉台：翻頁噪音掃頻 + 落定輕擊。
  世界輪播: (c, o) => {
    播噪音(c, o, { dur: 0.3, gain: 0.07, filterType: "bandpass", freq: 420, endFreq: 2000, q: 1.4 });
    播音符(c, o, { freq: 96, endFreq: 68, type: "sine", dur: 0.16, gain: 0.1, at: 0.24 });
  },
  // 主畫面大按鈕 / 通用儀式介面點擊：木質短擊。
  按鈕點擊: (c, o) => {
    播音符(c, o, { freq: 520, endFreq: 300, type: "triangle", dur: 0.07, gain: 0.1 });
    播噪音(c, o, { dur: 0.04, gain: 0.045, filterType: "highpass", freq: 2400 });
  },
  // 子頁像資料夾打開：兩音上行。
  子頁展開: (c, o) => {
    播音符(c, o, { freq: 392, dur: 0.1, gain: 0.09, type: "triangle" });
    播音符(c, o, { freq: 587, dur: 0.14, gain: 0.09, type: "triangle", at: 0.07 });
  },
  子頁收回: (c, o) => {
    播音符(c, o, { freq: 587, dur: 0.1, gain: 0.08, type: "triangle" });
    播音符(c, o, { freq: 392, dur: 0.14, gain: 0.08, type: "triangle", at: 0.07 });
  },
  // 局內 → 管理頁：儀式上行揭幕。
  管理開啟: (c, o) => {
    播音符(c, o, { freq: 262, endFreq: 523, type: "sine", dur: 0.3, gain: 0.12, attack: 0.03 });
    播音符(c, o, { freq: 1568, dur: 0.26, gain: 0.045, at: 0.16 });
  },
  // 回到戰場：下行收幕。
  管理關閉: (c, o) => {
    播音符(c, o, { freq: 523, endFreq: 262, type: "sine", dur: 0.26, gain: 0.11, attack: 0.02 });
    播音符(c, o, { freq: 131, dur: 0.18, gain: 0.07, at: 0.14 });
  },
  // 點圖鑑條目：水晶輕點。
  圖鑑選取: (c, o) => {
    播音符(c, o, { freq: 1244, dur: 0.09, gain: 0.07 });
    播音符(c, o, { freq: 1865, dur: 0.12, gain: 0.04, at: 0.03 });
  },
  // 隊長主動技能：能量釋放。
  技能施放: (c, o) => {
    播音符(c, o, { freq: 920, endFreq: 180, type: "sawtooth", dur: 0.3, gain: 0.1 });
    播噪音(c, o, { dur: 0.2, gain: 0.06, filterType: "highpass", freq: 1500, endFreq: 500 });
    播音符(c, o, { freq: 72, dur: 0.24, gain: 0.14, at: 0.02 });
  },
  // 停在核心區的輕提示：極輕柔一聲。
  HUD提示: (c, o) => {
    播音符(c, o, { freq: 988, dur: 0.14, gain: 0.038, attack: 0.02 });
  },
  // 左右抽屜：滑動風聲，左右聲道相反。
  左抽屜: (c, o) => {
    播噪音(c, o, { dur: 0.22, gain: 0.06, filterType: "lowpass", freq: 1400, endFreq: 500, pan: -0.45 });
    播音符(c, o, { freq: 294, endFreq: 415, type: "triangle", dur: 0.16, gain: 0.06, pan: -0.45 });
  },
  右抽屜: (c, o) => {
    播噪音(c, o, { dur: 0.22, gain: 0.06, filterType: "lowpass", freq: 1400, endFreq: 500, pan: 0.45 });
    播音符(c, o, { freq: 415, endFreq: 294, type: "triangle", dur: 0.16, gain: 0.06, pan: 0.45 });
  },
  // 拿起藥水：上挑撥弦。
  藥水拖起: (c, o) => {
    播音符(c, o, { freq: 660, endFreq: 880, type: "triangle", dur: 0.09, gain: 0.08 });
  },
  // 投放成功：咕嘟 + 確認音。
  藥水成功: (c, o) => {
    播音符(c, o, { freq: 300, endFreq: 180, type: "sine", dur: 0.09, gain: 0.1 });
    播音符(c, o, { freq: 523, dur: 0.1, gain: 0.08, at: 0.09 });
    播音符(c, o, { freq: 784, dur: 0.16, gain: 0.08, at: 0.16 });
  },
  // 投放失敗：低頻雙嗡拒絕。
  藥水失敗: (c, o) => {
    播音符(c, o, { freq: 220, type: "square", dur: 0.09, gain: 0.055 });
    播音符(c, o, { freq: 196, type: "square", dur: 0.12, gain: 0.055, at: 0.13 });
  },
  // 玩家小隊被打到：悶擊。
  受擊: (c, o) => {
    播噪音(c, o, { dur: 0.12, gain: 0.09, filterType: "lowpass", freq: 900, endFreq: 300 });
    播音符(c, o, { freq: 190, endFreq: 85, type: "sine", dur: 0.14, gain: 0.14 });
  },
  // 小隊碰撞輸出命中：比受擊更亮更利。
  碰撞命中: (c, o) => {
    播噪音(c, o, { dur: 0.08, gain: 0.07, filterType: "highpass", freq: 1800 });
    播音符(c, o, { freq: 330, endFreq: 130, type: "triangle", dur: 0.11, gain: 0.11 });
  },
  // 全隊倒下（暗色下行）→ 廣場復活（亮色上行），一次排完整個序列。
  死亡復活: (c, o) => {
    播音符(c, o, { freq: 440, endFreq: 415, dur: 0.4, gain: 0.09, type: "triangle" });
    播音符(c, o, { freq: 349, endFreq: 330, dur: 0.44, gain: 0.09, type: "triangle", at: 0.18 });
    播音符(c, o, { freq: 262, endFreq: 247, dur: 0.6, gain: 0.1, type: "triangle", at: 0.36 });
    播音符(c, o, { freq: 58, dur: 0.7, gain: 0.12, at: 0.36 });
    // 復活鐘聲（1.15s 起）
    播音符(c, o, { freq: 523, dur: 0.18, gain: 0.08, at: 1.15 });
    播音符(c, o, { freq: 659, dur: 0.18, gain: 0.08, at: 1.27 });
    播音符(c, o, { freq: 784, dur: 0.2, gain: 0.08, at: 1.39 });
    播音符(c, o, { freq: 1046, dur: 0.5, gain: 0.09, at: 1.51, attack: 0.03 });
  },
  // 安全區收縮警告：雙音警報 ×3，壓力感的來源。
  縮圈警告: (c, o) => {
    for (let i = 0; i < 3; i += 1) {
      播音符(c, o, { freq: 622, type: "square", dur: 0.16, gain: 0.05, at: i * 0.42 });
      播音符(c, o, { freq: 466, type: "square", dur: 0.2, gain: 0.05, at: i * 0.42 + 0.18 });
    }
    播音符(c, o, { freq: 78, dur: 1.3, gain: 0.08, attack: 0.2 });
  },
  // 圈外持續掉血的灼燒提示（節流 0.9s）。
  縮圈灼傷: (c, o) => {
    播噪音(c, o, { dur: 0.3, gain: 0.05, filterType: "bandpass", freq: 2600, endFreq: 900, q: 2 });
    播音符(c, o, { freq: 116, dur: 0.2, gain: 0.08 });
  },
  // 商店/熔爐/工作台共用：開啟設施面板。
  設施開啟: (c, o) => {
    播音符(c, o, { freq: 330, endFreq: 440, type: "sine", dur: 0.2, gain: 0.1, attack: 0.02 });
    播音符(c, o, { freq: 1319, dur: 0.2, gain: 0.04, at: 0.1 });
  },
  // 買/賣成功：錢幣雙叮。
  交易成功: (c, o) => {
    播音符(c, o, { freq: 1175, dur: 0.09, gain: 0.08 });
    播音符(c, o, { freq: 1568, dur: 0.16, gain: 0.08, at: 0.07 });
  },
  // 錢不夠 / 條件不足：低沉拒絕（與藥水失敗同族、更低）。
  交易失敗: (c, o) => {
    播音符(c, o, { freq: 175, type: "square", dur: 0.1, gain: 0.055 });
    播音符(c, o, { freq: 147, type: "square", dur: 0.16, gain: 0.055, at: 0.14 });
  },
  // 熔煉完成：金屬淬響 + 餘燼滋滋。
  熔煉完成: (c, o) => {
    播音符(c, o, { freq: 880, endFreq: 660, type: "triangle", dur: 0.2, gain: 0.09 });
    播音符(c, o, { freq: 1320, endFreq: 990, type: "sine", dur: 0.26, gain: 0.05, at: 0.04 });
    播噪音(c, o, { dur: 0.34, gain: 0.04, filterType: "highpass", freq: 3200, at: 0.08 });
  },
  // 工作台升級完成：上行三連 + 火花。
  升級完成: (c, o) => {
    播音符(c, o, { freq: 523, dur: 0.09, gain: 0.08 });
    播音符(c, o, { freq: 659, dur: 0.09, gain: 0.08, at: 0.08 });
    播音符(c, o, { freq: 784, dur: 0.2, gain: 0.09, at: 0.16 });
    播噪音(c, o, { dur: 0.18, gain: 0.03, filterType: "highpass", freq: 4200, at: 0.16 });
  },
  // 雕像解鎖：隆重儀式，低湧 + 亮和弦 + 微光。
  雕像解鎖: (c, o) => {
    播音符(c, o, { freq: 131, endFreq: 196, type: "sine", dur: 0.7, gain: 0.13, attack: 0.08 });
    播音符(c, o, { freq: 523, dur: 0.5, gain: 0.07, at: 0.3 });
    播音符(c, o, { freq: 659, dur: 0.5, gain: 0.07, at: 0.38 });
    播音符(c, o, { freq: 784, dur: 0.6, gain: 0.07, at: 0.46 });
    播音符(c, o, { freq: 1568, dur: 0.7, gain: 0.04, at: 0.55, attack: 0.06 });
  },
  // 守護者祭壇 / COLA 裝配啟動：深沉號角 + 地鳴。
  祭壇召喚: (c, o) => {
    播音符(c, o, { freq: 110, endFreq: 165, type: "sawtooth", dur: 0.8, gain: 0.08, attack: 0.1 });
    播音符(c, o, { freq: 55, dur: 1.0, gain: 0.13, attack: 0.12 });
    播噪音(c, o, { dur: 0.9, gain: 0.03, filterType: "lowpass", freq: 320, at: 0.1 });
  },
  // 開箱成功：鎖扣 + 上行星光。
  寶箱開啟: (c, o) => {
    播音符(c, o, { freq: 240, endFreq: 180, type: "square", dur: 0.05, gain: 0.06 });
    播音符(c, o, { freq: 1046, dur: 0.09, gain: 0.07, at: 0.08 });
    播音符(c, o, { freq: 1318, dur: 0.09, gain: 0.07, at: 0.16 });
    播音符(c, o, { freq: 1568, dur: 0.2, gain: 0.08, at: 0.24 });
  },
  // 一般材料/原石入包。
  撿取: (c, o) => {
    播音符(c, o, { freq: 880, endFreq: 1046, dur: 0.06, gain: 0.06 });
  },
  // 重要掉落（死亡遺落回收、大堆資源）。
  撿取重要: (c, o) => {
    播音符(c, o, { freq: 784, dur: 0.08, gain: 0.08 });
    播音符(c, o, { freq: 1175, dur: 0.14, gain: 0.08, at: 0.07 });
  },
  // 世界守護者 / 最終 Boss 登場：低音威壓 + 不和諧重擊。
  Boss登場: (c, o) => {
    播音符(c, o, { freq: 55, endFreq: 82, type: "sawtooth", dur: 1.2, gain: 0.12, attack: 0.15 });
    播音符(c, o, { freq: 233, dur: 0.5, gain: 0.07, at: 0.42, type: "triangle" });
    播音符(c, o, { freq: 247, dur: 0.5, gain: 0.07, at: 0.42, type: "triangle" });
    播噪音(c, o, { dur: 0.5, gain: 0.07, filterType: "lowpass", freq: 700, endFreq: 150, at: 0.4 });
  },
  // 勝利結算：明亮小號角。
  勝利: (c, o) => {
    播音符(c, o, { freq: 523, dur: 0.14, gain: 0.09, type: "triangle" });
    播音符(c, o, { freq: 659, dur: 0.14, gain: 0.09, type: "triangle", at: 0.13 });
    播音符(c, o, { freq: 784, dur: 0.14, gain: 0.09, type: "triangle", at: 0.26 });
    播音符(c, o, { freq: 1046, dur: 0.5, gain: 0.11, type: "triangle", at: 0.39, attack: 0.02 });
    播音符(c, o, { freq: 262, dur: 0.9, gain: 0.08, at: 0.39, attack: 0.05 });
  },
};

// ============================================================
// 對外 API
// ============================================================

export function 播放音效(名稱: 音效名稱): void {
  if (靜音 || 音量 <= 0) return;
  const interval = 節流間隔[名稱];
  if (interval) {
    const now = performance.now();
    const last = 上次播放[名稱] ?? -Infinity;
    if (now - last < interval) return;
    上次播放[名稱] = now;
  }
  const c = 確保音訊環境();
  if (!c || !master || c.state !== "running") return;
  try {
    音色庫[名稱](c, master);
  } catch {
    // 單一音效失敗不影響遊戲
  }
}

export function 設定音效音量(next: number): void {
  音量 = Math.max(0, Math.min(音效音量上限, next));
  套用音量();
  寫入設定();
  通知();
}

/** 新量表：上一版上限 2.0 對應畫面 30%，新 100% 對應約 6.67。 */
export function 音效音量轉百分比(value: number): number {
  return Math.round((Math.max(0, Math.min(音效音量上限, value)) / 音效音量上限) * 100);
}

export function 音效百分比轉音量(percent: number): number {
  return Math.max(0, Math.min(100, percent)) / 100 * 音效音量上限;
}

export function 切換音效靜音(): void {
  靜音 = !靜音;
  套用音量();
  寫入設定();
  通知();
}

export function 取得音效狀態(): { volume: number; muted: boolean } {
  return { volume: 音量, muted: 靜音 };
}

export function 訂閱音效狀態(fn: () => void): () => void {
  監聽者.add(fn);
  return () => {
    監聽者.delete(fn);
  };
}

// ============================================================
// 集中掛載：解鎖、全域點擊、狀態轉場
// ============================================================

function 嘗試解鎖(): void {
  if (已解鎖) return;
  已解鎖 = true;
  const c = 確保音訊環境();
  if (!c) return;
  // 開遊戲第一聲：首次手勢解鎖時，若還在主畫面就補上進場音
  //（瀏覽器不允許無手勢自動出聲，這是能做到的最早時機）。
  const 播進場 = () => {
    if (已播進場音) return;
    已播進場音 = true;
    if (應用程式狀態.畫面.層 === "主畫面") 播放音效("主畫面進入");
  };
  if (c.state === "running") 播進場();
  else void c.resume().then(播進場).catch(() => {});
}

/** 全域儀式介面點擊：主畫面木牌、各級按鈕共用同一族點擊聲。 */
function 全域按鈕點擊(event: MouseEvent): void {
  const target = event.target as HTMLElement | null;
  if (!target) return;
  const button = target.closest("button");
  if (!button || button.disabled) return;
  播放音效("按鈕點擊");
}

interface 轉場快照 {
  層: string;
  主畫面子頁: string | null;
  圖鑑OOC: string | null;
  圖鑑IC: string | null;
  縮圈警戒: boolean;
  /** 目前開著的互動設施面板（不在互動分頁時為 null） */
  互動設施鍵: string | null;
}

function 拍轉場快照(): 轉場快照 {
  const 畫面 = 應用程式狀態.畫面 as { 層: string; 子頁?: string | null; 分頁?: string };
  return {
    層: 畫面.層,
    主畫面子頁: 畫面.層 === "主畫面" ? (畫面.子頁 ?? null) : null,
    圖鑑OOC: 應用程式狀態.額外.圖鑑選中條目ID_OOC,
    圖鑑IC: 應用程式狀態.額外.圖鑑選中條目ID_IC,
    縮圈警戒: 應用程式狀態.額外.縮圈警戒,
    互動設施鍵:
      畫面.層 === "管理介面" && 畫面.分頁 === "互動"
        ? (應用程式狀態.額外.互動選中設施 ?? null)
        : null,
  };
}

export function 啟動音效管理(): void {
  if (已啟動) return;
  已啟動 = true;

  window.addEventListener("pointerdown", 嘗試解鎖, { passive: true });
  window.addEventListener("keydown", 嘗試解鎖, { passive: true });
  // capture 階段掛點擊：即使元件內 stopPropagation 也還是聽得到。
  window.addEventListener("click", 全域按鈕點擊, true);

  // 隊長主動技能：成功施放才會發這個事件（能量/冷卻閘門在 HUD 端）。
  window.addEventListener("captain-active-cast", () => 播放音效("技能施放"));

  let 上次 = 拍轉場快照();
  應用程式狀態.訂閱(() => {
    const 目前 = 拍轉場快照();
    const prev = 上次;
    上次 = 目前;

    // 管理介面開/關（進出戰場）
    if (prev.層 !== "管理介面" && 目前.層 === "管理介面") 播放音效("管理開啟");
    else if (prev.層 === "管理介面" && 目前.層 === "操作頁面") 播放音效("管理關閉");
    // 終局結算（本作結算頁 = 擊敗 COLA 的勝利路徑）
    else if (prev.層 !== "結算頁" && 目前.層 === "結算頁") 播放音效("勝利");

    // 主畫面子頁展開/收回（像資料夾）
    if (目前.層 === "主畫面" && prev.層 === "主畫面") {
      if (prev.主畫面子頁 === null && 目前.主畫面子頁 !== null) 播放音效("子頁展開");
      else if (prev.主畫面子頁 !== null && 目前.主畫面子頁 === null) 播放音效("子頁收回");
      else if (prev.主畫面子頁 !== 目前.主畫面子頁 && 目前.主畫面子頁 !== null) 播放音效("子頁展開");
    }

    // 圖鑑條目選取（OOC / IC 共用）
    if ((目前.圖鑑OOC && 目前.圖鑑OOC !== prev.圖鑑OOC) || (目前.圖鑑IC && 目前.圖鑑IC !== prev.圖鑑IC)) {
      播放音效("圖鑑選取");
    }

    // 互動設施面板開啟（商店/熔爐/工作台/雕像/祭壇先共用同一聲）。
    // 用「值變化」判定，世界時鐘每秒重繪不會重複觸發。
    if (目前.互動設施鍵 && 目前.互動設施鍵 !== prev.互動設施鍵) 播放音效("設施開啟");

    // 縮圈警戒點亮：全場最重要的壓力訊號
    if (!prev.縮圈警戒 && 目前.縮圈警戒) 播放音效("縮圈警告");
  });
}
