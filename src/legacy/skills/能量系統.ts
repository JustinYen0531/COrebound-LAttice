/**
 * @file 能量系統.ts
 * @description 計算小隊發射武器、釋放主動技能時的能量 (Mana/Energy) 扣除、冷卻限制、以及時間上的自然能量回復。
 */

export interface EnergyConfig {
  max: number;
  initial: number;
  regenPerSecond: number;
}

export interface EnergySnapshot {
  current: number;
  max: number;
  ratio: number;
  regenPerSecond: number;
}

export class EnergySystem {
  private readonly max: number;
  private readonly initial: number;
  private readonly regenPerSecond: number;
  private current: number;

  constructor(config: EnergyConfig) {
    this.max = config.max;
    this.initial = Math.max(0, Math.min(config.max, config.initial));
    this.current = this.initial;
    this.regenPerSecond = config.regenPerSecond;
  }

  tick(dt: number): void {
    this.restore(this.regenPerSecond * dt);
  }

  canSpend(amount: number): boolean {
    return this.current >= amount;
  }

  spend(amount: number): boolean {
    if (!this.canSpend(amount)) return false;
    this.current = Math.max(0, this.current - amount);
    return true;
  }

  restore(amount: number): void {
    this.current = Math.min(this.max, this.current + Math.max(0, amount));
  }

  reset(): void {
    this.current = this.initial;
  }

  snapshot(): EnergySnapshot {
    return {
      current: this.current,
      max: this.max,
      ratio: this.max === 0 ? 0 : this.current / this.max,
      regenPerSecond: this.regenPerSecond,
    };
  }
}
