/**
 * @file 隊長週期技能.ts
 * @description 處理隊長依據走動距離累積充能、停止移動自動觸發的週期技能，
 *              以及其與戰鬥節奏和地圖操作的關聯。
 *              對應「doc/系統機制/機制指南.md」§3（隊長）與 HUD §4.4（週期/充能環）。
 *
 *              純演算：走動距離充能 → 滿了在「停止移動」的瞬間自動觸發。
 *              沉默（operator 控制）期間充能停滯、不可觸發。
 */

import { DistanceChargeMeter } from "../core/移動系統";
import type { CaptainId } from "../data/戰鬥原語";

/** 週期技能定義。 */
export interface PeriodicSkillDef {
  captainId: CaptainId;
  label: string;
  /** 充滿所需的累計移動距離（世界單位） */
  chargeDistance: number;
  /** 觸發後的效果說明（純文字，實際效果由戰鬥層消化） */
  effect: string;
}

/** 四隊長各一個週期技能（機制指南 §3 主題延伸；數值為演算佔位，可再調校）。 */
export const PERIODIC_SKILL_DEFS: Record<CaptainId, PeriodicSkillDef> = {
  architect: {
    captainId: "architect",
    label: "重整力場",
    chargeDistance: 600,
    effect: "停步瞬間在小隊周圍展開減速力場，降低周圍敵方移動速度。",
  },
  conductor: {
    captainId: "conductor",
    label: "衝擊波紋",
    chargeDistance: 550,
    effect: "停步瞬間向四周擴散一圈擊退波，將貼近的敵方推開。",
  },
  launcher: {
    captainId: "launcher",
    label: "定身脈衝",
    chargeDistance: 650,
    effect: "停步瞬間對周圍敵方施加短暫眩暈。",
  },
  operator: {
    captainId: "operator",
    label: "干擾場",
    chargeDistance: 620,
    effect: "停步瞬間對周圍敵方施加沉默，暫停其技能與充能。",
  },
};

/** 週期技能觸發事件。 */
export interface PeriodicTrigger {
  captainId: CaptainId;
  label: string;
  effect: string;
}

/**
 * 週期技能執行器。
 * 用法：每幀呼叫 update(本幀移動距離, 是否移動中, 是否被沉默)，
 * 在「充能已滿且本幀從『移動』轉為『停止』」時回傳觸發事件（否則 null）。
 */
export class CaptainPeriodicSkill {
  private readonly meter: DistanceChargeMeter;
  private charged = false;
  private wasMoving = false;

  constructor(private readonly def: PeriodicSkillDef) {
    this.meter = new DistanceChargeMeter(def.chargeDistance);
  }

  /**
   * @param movedDistance 本幀實際位移距離
   * @param moving 本幀是否移動中
   * @param silenced 是否被沉默（沉默時充能停滯、不可觸發）
   */
  update(movedDistance: number, moving: boolean, silenced: boolean): PeriodicTrigger | null {
    if (!silenced) {
      const triggers = this.meter.add(movedDistance);
      if (triggers > 0) this.charged = true;
    }

    let fired: PeriodicTrigger | null = null;
    // 由「移動中」轉為「停止」的瞬間，且已充滿、未被沉默 → 觸發
    const stoppedThisFrame = this.wasMoving && !moving;
    if (stoppedThisFrame && this.charged && !silenced) {
      fired = { captainId: this.def.captainId, label: this.def.label, effect: this.def.effect };
      this.charged = false;
      this.meter.reset();
    }

    this.wasMoving = moving;
    return fired;
  }

  /** 充能比例 0~1（供 HUD 週期技能累積環）。 */
  chargeRatio(): number {
    return this.charged ? 1 : this.meter.ratio();
  }

  isReady(): boolean {
    return this.charged;
  }
}
