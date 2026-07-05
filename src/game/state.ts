/**
 * @file state.ts
 * @description 單局狀態:小隊、資源、配額、印記、死亡數。
 *              數值來源全部走 src/legacy(舊專案資料庫),縮減決策見 AUDIT.md 第四節。
 */

import type { World, StarLevel, Family, MemberDef } from "../legacy/data/成員型別";
import { MEMBERS, findMember, memberStatsAtStar, STAR_RECIPE } from "../legacy/data/成員資料庫";
import type { CaptainId, MaterialRarity, MaterialStar } from "../legacy/data/戰鬥原語";
import { captainStatsAtStar, controlEffectAtStar } from "../legacy/data/控制引擎";
import type { ControlEffect } from "../legacy/data/戰鬥原語";
import { findMaterialBySpec, shardFromMaterial, sellPriceOfMaterial, type MaterialDef } from "../legacy/data/素材資料庫";
import { EnergySystem } from "../legacy/skills/能量系統";
import { WORLDS } from "./world";

// ============================================================
// 小隊
// ============================================================

export interface SquadMember {
  def: MemberDef;
  star: StarLevel;
}

/** 家族武器啟用門檻(機制指南 §1.1):人數 / 累計星級 */
const WEAPON_GATE: Array<{ star: 1 | 2 | 3; members: number; totalStars: number }> = [
  { star: 3, members: 4, totalStars: 9 },
  { star: 2, members: 3, totalStars: 5 },
  { star: 1, members: 2, totalStars: 2 },
];

/** 隊長進化門檻(重製版微調:比機制指南提早一階,讓單人局更快解鎖控制效果) */
const CAPTAIN_EVOLVE_TOTALS = [5, 10, 15]; // 達標 → 2★/3★/4★

export type PotionKind = "hpS" | "hpL" | "enS" | "enL";
export const POTION_DEFS: Record<PotionKind, { name: string; price: number; hpRatio: number; enRatio: number }> = {
  hpS: { name: "小生命藥水", price: 30, hpRatio: 0.2, enRatio: 0 },
  hpL: { name: "大生命藥水", price: 80, hpRatio: 0.5, enRatio: 0 },
  enS: { name: "小能量藥水", price: 35, hpRatio: 0, enRatio: 0.3 },
  enL: { name: "大能量藥水", price: 95, hpRatio: 0, enRatio: 0.75 },
};

export interface WorldProgress {
  t1Kills: number;
  t2Kills: number;
  guardianSummoned: boolean;
  guardianDefeated: boolean;
  enraged: boolean;
}

/** 守護者召喚配額(重製版節奏:雜兵 10 / 精英 2;文件原值 15/3) */
export const QUOTA_T1 = 10;
export const QUOTA_T2 = 2;

export const MAX_DEATHS = 3;

export interface RunStats {
  kills: number;
  bossKills: number;
  damageDealt: number;
  damageTaken: number;
  gemsEarned: number;
  chestsOpened: number;
  membersUnlocked: number;
  starUps: number;
}

export class RunState {
  captainId: CaptainId;
  captainStar: 1 | 2 | 3 | 4 = 1;
  members: SquadMember[] = [];

  hp: number;
  maxHp: number;
  energy: EnergySystem;

  gems = 60;
  /** 生物材料庫存:materialId → count */
  materials = new Map<string, number>();
  /** 家族碎片:family → count */
  shards = new Map<Family, number>();
  potions: Record<PotionKind, number> = { hpS: 1, hpL: 0, enS: 0, enL: 0 };

  progress: Record<World, WorldProgress>;
  sigils = 0;
  deaths = 0;
  timeSec = 0;
  colaSummoned = false;
  colaDefeated = false;

  stats: RunStats = {
    kills: 0, bossKills: 0, damageDealt: 0, damageTaken: 0,
    gemsEarned: 0, chestsOpened: 0, membersUnlocked: 0, starUps: 0,
  };

  constructor(captainId: CaptainId) {
    this.captainId = captainId;
    this.maxHp = this.computeMaxHp();
    this.hp = this.maxHp;
    this.energy = new EnergySystem({ max: 100, initial: 100, regenPerSecond: 6 });
    this.progress = Object.fromEntries(
      WORLDS.map((w) => [w, { t1Kills: 0, t2Kills: 0, guardianSummoned: false, guardianDefeated: false, enraged: false }]),
    ) as Record<World, WorldProgress>;
  }

  // ---------- 小隊數值 ----------

  captainStats() {
    return captainStatsAtStar(this.captainId, this.captainStar);
  }

  /** 隊長控制效果(2★ 起解鎖,附加在所有子彈上) */
  captainControl(): ControlEffect | null {
    return controlEffectAtStar(this.captainId, this.captainStar);
  }

  computeMaxHp(): number {
    const cap = captainStatsAtStar(this.captainId, this.captainStar);
    let hp = cap.hp;
    for (const m of this.members) hp += memberStatsAtStar(m.def, m.star).hp;
    return hp;
  }

  /** 小隊碰撞總攻擊(每 Tick 對接觸敵人) */
  contactAtk(): number {
    const cap = captainStatsAtStar(this.captainId, this.captainStar);
    let atk = cap.atk;
    for (const m of this.members) atk += memberStatsAtStar(m.def, m.star).atk;
    return atk;
  }

  /** 移動速度(px/s):隊長 1★ 基準速,進化小幅提升 */
  moveSpeed(): number {
    const base = captainStatsAtStar(this.captainId, 1).speed; // 300~400
    return base * (1 + (this.captainStar - 1) * 0.12);
  }

  totalMemberStars(): number {
    return this.members.reduce((s, m) => s + m.star, 0);
  }

  /** 依累計星級自動進化隊長(回傳是否升星) */
  refreshCaptainStar(): boolean {
    const total = this.totalMemberStars();
    let star: 1 | 2 | 3 | 4 = 1;
    for (let i = 0; i < CAPTAIN_EVOLVE_TOTALS.length; i++) {
      if (total >= CAPTAIN_EVOLVE_TOTALS[i]) star = (i + 2) as 2 | 3 | 4;
    }
    if (star > this.captainStar) {
      const beforeHp = this.computeMaxHp();
      this.captainStar = star;
      const afterHp = this.computeMaxHp();
      this.maxHp = afterHp;
      this.hp = Math.min(this.maxHp, this.hp + (afterHp - beforeHp));
      return true;
    }
    return false;
  }

  /** 家族武器目前星級(0 = 未啟用) */
  weaponStar(family: Family): 0 | 1 | 2 | 3 {
    const fam = this.members.filter((m) => m.def.family === family);
    const count = fam.length;
    const totalStars = fam.reduce((s, m) => s + m.star, 0);
    for (const gate of WEAPON_GATE) {
      if (count >= gate.members && totalStars >= gate.totalStars) return gate.star;
    }
    return 0;
  }

  /** 該家族目前最高星成員的專屬附魔(重製版:取最高星者生效) */
  activeEnchant(family: Family): { id: string; star: StarLevel } | null {
    const fam = this.members.filter((m) => m.def.family === family);
    if (fam.length === 0) return null;
    fam.sort((a, b) => b.star - a.star);
    const top = fam[0];
    if (!top.def.enchant) return null;
    return { id: top.def.enchant, star: top.star };
  }

  // ---------- 材料 ----------

  addMaterial(world: World, star: MaterialStar, rarity: MaterialRarity, count = 1): void {
    const mat = findMaterialBySpec(world, star, rarity);
    if (!mat) return;
    this.materials.set(mat.id, (this.materials.get(mat.id) ?? 0) + count);
  }

  materialCount(world: World, star: MaterialStar, rarity: MaterialRarity): number {
    const mat = findMaterialBySpec(world, star, rarity);
    return mat ? this.materials.get(mat.id) ?? 0 : 0;
  }

  private takeMaterial(world: World, star: MaterialStar, rarity: MaterialRarity, count: number): boolean {
    const mat = findMaterialBySpec(world, star, rarity);
    if (!mat) return false;
    const have = this.materials.get(mat.id) ?? 0;
    if (have < count) return false;
    this.materials.set(mat.id, have - count);
    return true;
  }

  // ---------- 雕像解鎖(0→1★)----------

  /** 解鎖成本:該世界 1★ 普通 ×3 + 1★ 高級 ×1(STAR_RECIPE[1],重製版免碎片) */
  canUnlock(memberId: string): { ok: boolean; reason?: string } {
    const def = findMember(memberId);
    if (!def) return { ok: false, reason: "查無成員" };
    if (this.members.some((m) => m.def.id === memberId)) return { ok: false, reason: "已在小隊中" };
    if (this.members.length >= 8) return { ok: false, reason: "小隊已滿(8 名)" };
    const r = STAR_RECIPE[1];
    if (this.materialCount(def.world, 1, "common") < r.commonCurrent) return { ok: false, reason: `需要 ${def.world && ""}1★ 普通材料 ×${r.commonCurrent}` };
    if (this.materialCount(def.world, 1, "fine") < r.fineCurrent) return { ok: false, reason: `需要 1★ 高級材料 ×${r.fineCurrent}` };
    return { ok: true };
  }

  unlockMember(memberId: string): boolean {
    const check = this.canUnlock(memberId);
    const def = findMember(memberId);
    if (!check.ok || !def) return false;
    const r = STAR_RECIPE[1];
    this.takeMaterial(def.world, 1, "common", r.commonCurrent);
    this.takeMaterial(def.world, 1, "fine", r.fineCurrent);
    this.members.push({ def, star: 1 });
    const before = this.maxHp;
    this.maxHp = this.computeMaxHp();
    this.hp = Math.min(this.maxHp, this.hp + (this.maxHp - before));
    this.stats.membersUnlocked++;
    this.refreshCaptainStar();
    return true;
  }

  // ---------- 升星(工坊)----------

  upgradeCost(member: SquadMember): { recipe: typeof STAR_RECIPE[2]; nextStar: StarLevel } | null {
    if (member.star >= 3) return null;
    const nextStar = (member.star + 1) as 2 | 3;
    return { recipe: STAR_RECIPE[nextStar], nextStar };
  }

  canUpgrade(member: SquadMember): { ok: boolean; reason?: string } {
    const cost = this.upgradeCost(member);
    if (!cost) return { ok: false, reason: "已達 3★ 上限" };
    const { recipe, nextStar } = cost;
    const w = member.def.world;
    const star = nextStar as MaterialStar;
    if (this.materialCount(w, star, "fine") < recipe.fineCurrent) return { ok: false, reason: `缺 ${nextStar}★ 高級 ×${recipe.fineCurrent}` };
    if (this.materialCount(w, star, "common") < recipe.commonCurrent) return { ok: false, reason: `缺 ${nextStar}★ 普通 ×${recipe.commonCurrent}` };
    if (recipe.finePrev > 0 && this.materialCount(w, (nextStar - 1) as MaterialStar, "fine") < recipe.finePrev) {
      return { ok: false, reason: `缺 ${nextStar - 1}★ 高級 ×${recipe.finePrev}` };
    }
    const shardHave = this.shards.get(member.def.family) ?? 0;
    if (shardHave < recipe.shards) return { ok: false, reason: `缺${member.def.family}家族碎片 ×${recipe.shards}(現有 ${shardHave})` };
    return { ok: true };
  }

  upgradeMember(member: SquadMember): boolean {
    const check = this.canUpgrade(member);
    const cost = this.upgradeCost(member);
    if (!check.ok || !cost) return false;
    const { recipe, nextStar } = cost;
    const w = member.def.world;
    this.takeMaterial(w, nextStar as MaterialStar, "fine", recipe.fineCurrent);
    this.takeMaterial(w, nextStar as MaterialStar, "common", recipe.commonCurrent);
    if (recipe.finePrev > 0) this.takeMaterial(w, (nextStar - 1) as MaterialStar, "fine", recipe.finePrev);
    this.shards.set(member.def.family, (this.shards.get(member.def.family) ?? 0) - recipe.shards);
    member.star = nextStar;
    const before = this.maxHp;
    this.maxHp = this.computeMaxHp();
    this.hp = Math.min(this.maxHp, this.hp + (this.maxHp - before));
    this.stats.starUps++;
    this.refreshCaptainStar();
    return true;
  }

  // ---------- 熔煉 / 販售 ----------

  /** 把一份材料熔成指定家族碎片(地緣加成:材料屬於玩家目前所在世界) */
  meltMaterial(mat: MaterialDef, family: Family, localBonus: boolean): boolean {
    const have = this.materials.get(mat.id) ?? 0;
    if (have <= 0) return false;
    this.materials.set(mat.id, have - 1);
    const yielded = shardFromMaterial(mat, localBonus);
    this.shards.set(family, (this.shards.get(family) ?? 0) + yielded);
    return true;
  }

  sellMaterial(mat: MaterialDef, localBonus: boolean): boolean {
    const have = this.materials.get(mat.id) ?? 0;
    if (have <= 0) return false;
    this.materials.set(mat.id, have - 1);
    const price = sellPriceOfMaterial(mat, localBonus);
    this.gems += price;
    this.stats.gemsEarned += price;
    return true;
  }

  buyPotion(kind: PotionKind): boolean {
    const def = POTION_DEFS[kind];
    if (this.gems < def.price) return false;
    this.gems -= def.price;
    this.potions[kind]++;
    return true;
  }

  usePotion(kind: PotionKind): boolean {
    if (this.potions[kind] <= 0) return false;
    const def = POTION_DEFS[kind];
    if (def.hpRatio > 0 && this.hp >= this.maxHp) return false;
    if (def.enRatio > 0 && this.energy.snapshot().ratio >= 1) return false;
    this.potions[kind]--;
    if (def.hpRatio > 0) this.hp = Math.min(this.maxHp, this.hp + this.maxHp * def.hpRatio);
    if (def.enRatio > 0) this.energy.restore(this.energy.snapshot().max * def.enRatio);
    return true;
  }

  // ---------- 死亡 ----------

  /** 死亡懲罰:扣 30% 原石(機制指南 §9.1;材料遺落機制在重製版省略) */
  applyDeathPenalty(): void {
    this.deaths++;
    this.gems = Math.floor(this.gems * 0.7);
  }

  allMembers(): readonly MemberDef[] {
    return MEMBERS;
  }
}
