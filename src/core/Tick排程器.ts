/**
 * @file Tick排程器.ts
 * @description 負責全遊戲戰鬥結算的心跳週期 (Tick)。每 1.0 秒進行一次小隊上陣成員 ATK 加總傷害結算，並依據倍數觸發各家族武器發射週期。
 */

export interface TickFrame {
  nowMs: number;
  dt: number;
  elapsed: number;
  tickCount: number;
}

export type TickListener = (frame: TickFrame) => void;

/**
 * 最小可跑版戰鬥心跳。
 *
 * 目前先服務 HUD / 能量 / 主動技能這三塊：
 * - `advance()` 由外部 RAF 或測試主迴圈手動推進
 * - 內部會累積總經過時間與邏輯 Tick 次數
 * - 每次推進都通知訂閱者，讓各系統自行消化 dt
 */
export class TickScheduler {
  private readonly listeners = new Set<TickListener>();
  private lastNowMs: number | null = null;
  private elapsed = 0;
  private tickCount = 0;
  private running = false;

  subscribe(listener: TickListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  reset(): void {
    this.lastNowMs = null;
    this.elapsed = 0;
    this.tickCount = 0;
  }

  start(nowMs = performance.now()): void {
    this.running = true;
    this.lastNowMs = nowMs;
  }

  stop(): void {
    this.running = false;
    this.lastNowMs = null;
  }

  advance(nowMs = performance.now()): TickFrame | null {
    if (!this.running) {
      this.start(nowMs);
      return null;
    }

    if (this.lastNowMs === null) {
      this.lastNowMs = nowMs;
      return null;
    }

    const dt = Math.max(0, Math.min(0.05, (nowMs - this.lastNowMs) / 1000));
    this.lastNowMs = nowMs;
    this.elapsed += dt;
    this.tickCount += 1;

    const frame: TickFrame = {
      nowMs,
      dt,
      elapsed: this.elapsed,
      tickCount: this.tickCount,
    };

    for (const listener of this.listeners) listener(frame);
    return frame;
  }
}
