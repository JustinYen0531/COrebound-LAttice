/**
 * @file 世界狂暴.ts
 * @description 監聽小怪與精英擊殺指標以召喚 T3 世界守護者；當世界守護者被擊敗時，
 *              觸發「本世界狂暴」（怪物傷害+30%/重量+20%、精英怪 30% 掉落 3★ 高）
 *              與「跨世界難度永久 +15% 強化」的狀態切換。
 *              對應「doc/系統機制/機制指南.md」§6.3（狂暴與跨世界連動）。
 *
 *              純演算：維護四世界的狂暴旗標，對外提供「某世界某怪物的當前修正後戰力」。
 */

import { CROSS_WORLD_SCALE, ENRAGE_MODIFIERS } from "../data/戰鬥原語";
import type { CombatStats } from "../data/戰鬥原語";
import type { World } from "../data/成員型別";

const WORLDS: World[] = ["geometry", "organic", "fractal", "mechanical"];

/** 全局狂暴狀態。 */
export class WorldEnrageState {
  /** 各世界是否已進入狂暴（守護者被擊敗） */
  private enraged: Record<World, boolean> = {
    geometry: false, organic: false, fractal: false, mechanical: false,
  };

  /** 已倒下的守護者數量 → 跨世界強化層數（每有一個 Boss 倒下，其他未通關世界 +15%） */
  private guardiansDown = 0;

  /** 標記某世界守護者被擊敗。 */
  defeatGuardian(world: World): void {
    if (this.enraged[world]) return;
    this.enraged[world] = true;
    this.guardiansDown += 1;
  }

  isEnraged(world: World): boolean {
    return this.enraged[world];
  }

  /** 四世界守護者是否全部倒下（可召喚 COLA 的前置）。 */
  allGuardiansDown(): boolean {
    return WORLDS.every((w) => this.enraged[w]);
  }

  /**
   * 跨世界強化的複利倍率：一個「尚未狂暴」的世界，會被「其他已倒下的守護者數」層層強化。
   * 已狂暴的世界不再累加跨世界（它自己就是強化來源）。
   */
  crossWorldLayers(world: World): number {
    // 對尚未狂暴的世界：受到「所有已倒下守護者」的強化
    if (this.enraged[world]) return 0;
    return this.guardiansDown;
  }

  /**
   * 取某世界某怪物「當前實際戰力」：
   * 1. 本世界狂暴：ATK ×1.3、Weight ×1.2。
   * 2. 跨世界連動：每層 HP ×1.15、ATK ×1.15（複利）。
   */
  effectiveStats(world: World, base: CombatStats): CombatStats {
    let hp = base.hp;
    let atk = base.atk;
    let weight = base.weight;

    if (this.enraged[world]) {
      atk *= ENRAGE_MODIFIERS.damageMult;
      weight *= ENRAGE_MODIFIERS.weightMult;
    }

    const layers = this.crossWorldLayers(world);
    if (layers > 0) {
      const hpMul = Math.pow(CROSS_WORLD_SCALE.hpMult, layers);
      const atkMul = Math.pow(CROSS_WORLD_SCALE.damageMult, layers);
      hp *= hpMul;
      atk *= atkMul;
    }

    return {
      hp: Math.round(hp),
      atk: Math.round(atk),
      weight: Math.round(weight),
      speed: base.speed,
    };
  }

  /** 該世界 T2 精英狂暴後額外掉 3★ 高級素材的機率（未狂暴為 0）。 */
  bonusFine3Chance(world: World): number {
    return this.enraged[world] ? ENRAGE_MODIFIERS.bonusFine3Chance : 0;
  }
}
