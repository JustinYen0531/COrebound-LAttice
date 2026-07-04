/**
 * @file 最終Boss可樂.ts
 * @description 專責最終 Boss「COLA」的召喚條件、四世界混合攻擊模式、階段轉換、過載狂暴，
 *              以及通關掉落演出。
 *              對應「doc/系統機制/機制指南.md」§6.4、§9.3（四印記召喚 COLA）。
 *
 *              純演算：印記集齊判定 → 召喚 → 依血量比例切換攻擊階段（輪替四世界武器）→
 *              低血量過載狂暴 → 擊敗判定為通關。
 */

import { finalBoss } from "../data/怪物資料庫";
import { WORLD_SIGIL } from "../world/守護者祭壇";
import type { World } from "../data/成員型別";
import type { WeaponFamily } from "../data/戰鬥原語";

/** 召喚 COLA 需要集齊的四枚世界印記。 */
export const REQUIRED_SIGILS: string[] = Object.values(WORLD_SIGIL);

/** 是否集齊四印記可召喚 COLA（§9.3）。 */
export function canSummonCola(ownedSigils: readonly string[]): boolean {
  const owned = new Set(ownedSigils);
  return REQUIRED_SIGILS.every((s) => owned.has(s));
}

/** COLA 戰鬥階段。血量比例由高到低切換，各階段主打不同世界的武器組。 */
export type ColaPhase = 1 | 2 | 3 | 4 | 5;

/** 各階段輪替主打的世界武器主題（四世界 + 最終過載）。 */
export const PHASE_WORLD_THEME: Record<ColaPhase, World | "overload"> = {
  1: "geometry",
  2: "organic",
  3: "fractal",
  4: "mechanical",
  5: "overload",
};

/** 各世界主題對應的主要武器家族（混合攻擊模式）。 */
export const WORLD_THEME_FAMILY: Record<World, WeaponFamily> = {
  geometry: "straight",
  organic: "multishot",
  fractal: "mine",
  mechanical: "shield",
};

/** 依當前血量比例決定階段（每 20% 一段，最後 20% 進入過載）。 */
export function phaseForHpRatio(hpRatio: number): ColaPhase {
  const r = Math.max(0, Math.min(1, hpRatio));
  if (r > 0.8) return 1;
  if (r > 0.6) return 2;
  if (r > 0.4) return 3;
  if (r > 0.2) return 4;
  return 5; // 過載狂暴
}

/** 過載狂暴修正（最後一階段，攻擊/發射頻率強化）。 */
export const COLA_OVERLOAD = {
  /** 傷害倍率 */
  damageMult: 1.5,
  /** 發射週期縮短比例（0.3 = 快 30%） */
  firePeriodCut: 0.3,
} as const;

/** COLA 戰鬥控制器：追蹤血量、輸出目前階段與該用哪些武器。 */
export class ColaEncounter {
  private readonly maxHp: number;
  private hp: number;
  private defeated = false;

  constructor() {
    this.maxHp = finalBoss().stats.hp;
    this.hp = this.maxHp;
  }

  /** 承受傷害，回傳是否於此擊被擊敗。 */
  takeDamage(amount: number): boolean {
    if (this.defeated) return false;
    this.hp = Math.max(0, this.hp - Math.max(0, amount));
    if (this.hp <= 0) {
      this.defeated = true;
      return true;
    }
    return false;
  }

  hpRatio(): number {
    return this.maxHp === 0 ? 0 : this.hp / this.maxHp;
  }

  phase(): ColaPhase {
    return phaseForHpRatio(this.hpRatio());
  }

  /** 目前階段該主打的武器家族（過載階段回傳全部四家族輪替）。 */
  activeFamilies(): WeaponFamily[] {
    const theme = PHASE_WORLD_THEME[this.phase()];
    if (theme === "overload") return Object.values(WORLD_THEME_FAMILY);
    return [WORLD_THEME_FAMILY[theme]];
  }

  isOverloaded(): boolean {
    return this.phase() === 5;
  }

  isDefeated(): boolean {
    return this.defeated;
  }

  /** 擊敗 COLA = 通關（§6.4）。 */
  clearsGame(): boolean {
    return this.defeated;
  }
}
