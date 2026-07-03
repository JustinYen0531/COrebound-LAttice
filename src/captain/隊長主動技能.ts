/**
 * @file 隊長主動技能.ts
 * @description 處理隊長主動位移技能的種類切換、施放條件、冷卻限制、能量消耗，以及與小隊本體移動行為之間的銜接。
 */

import type { CaptainId } from "../data/戰鬥原語";
import type { EnergySystem } from "../skills/能量系統";

export interface ActiveSkillDefinition {
  captainId: CaptainId;
  label: string;
  energyCost: number;
  cooldownSeconds: number;
  castLatencySeconds: number;
  moveVectorHint: string;
}

export interface ActiveSkillSnapshot {
  label: string;
  cooldownRatio: number;
  energyCost: number;
  energyEnough: boolean;
  castLatency: boolean;
  cooldownRemaining: number;
}

export const ACTIVE_SKILL_DEFS: Record<CaptainId, ActiveSkillDefinition> = {
  conductor: {
    captainId: "conductor",
    label: "加速",
    energyCost: 25,
    cooldownSeconds: 4,
    castLatencySeconds: 0.5,
    moveVectorHint: "短時間推進全隊移動節奏",
  },
  operator: {
    captainId: "operator",
    label: "傳送點",
    energyCost: 30,
    cooldownSeconds: 5,
    castLatencySeconds: 0.5,
    moveVectorHint: "瞬間挪移到目標安全點",
  },
  launcher: {
    captainId: "launcher",
    label: "鉤索拖曳",
    energyCost: 28,
    cooldownSeconds: 4.5,
    castLatencySeconds: 0.5,
    moveVectorHint: "強制拖曳隊伍切入新位置",
  },
  architect: {
    captainId: "architect",
    label: "減速領域",
    energyCost: 22,
    cooldownSeconds: 6,
    castLatencySeconds: 0.5,
    moveVectorHint: "放下緩速區並穩定重整陣形",
  },
};

export class CaptainActiveSkill {
  private cooldownRemaining = 0;
  private castLatencyRemaining = 0;

  constructor(
    private readonly definition: ActiveSkillDefinition,
    private readonly energySystem: EnergySystem,
  ) {}

  tick(dt: number): void {
    this.cooldownRemaining = Math.max(0, this.cooldownRemaining - dt);
    this.castLatencyRemaining = Math.max(0, this.castLatencyRemaining - dt);
  }

  tryCast(): boolean {
    if (this.cooldownRemaining > 0) return false;
    if (this.castLatencyRemaining > 0) return false;
    if (!this.energySystem.spend(this.definition.energyCost)) return false;

    this.cooldownRemaining = this.definition.cooldownSeconds;
    this.castLatencyRemaining = this.definition.castLatencySeconds;
    return true;
  }

  snapshot(): ActiveSkillSnapshot {
    const energyEnough = this.energySystem.canSpend(this.definition.energyCost);
    const cooldownRatio =
      this.definition.cooldownSeconds === 0
        ? 1
        : 1 - this.cooldownRemaining / this.definition.cooldownSeconds;

    return {
      label: this.definition.label,
      cooldownRatio: Math.max(0, Math.min(1, cooldownRatio)),
      energyCost: this.definition.energyCost,
      energyEnough,
      castLatency: this.castLatencyRemaining > 0,
      cooldownRemaining: this.cooldownRemaining,
    };
  }
}
