/**
 * @file 陣型系統.ts
 * @description 管理小隊同心圓陣型的層位分配、保護/支援/火力職責配置、面積占比變化，
 *              以及陣型對移動速度與受擊順序的影響。
 *              對應「doc/介面流程/玩家介面_戰鬥HUD與操作骨架.md」§2（三層同心圓、藍/紅/黃職責）。
 *
 *              純演算：把「哪個成員在哪層哪職責」建成 3 層 × 3 職責的網格，並提供：
 *              - 受擊順序（由外而內：外層先受擊）
 *              - 每層總重量 → 半徑/面積占比（重量越大同心圓越大）
 *              - 各層防線的碰撞重量（供逐層穿透判定）
 */

/** 三層層位（由內而外）。 */
export type Layer = "inner" | "middle" | "outer";
export const LAYER_ORDER: Layer[] = ["inner", "middle", "outer"];
/** 受擊順序：由外而內。 */
export const HIT_ORDER: Layer[] = ["outer", "middle", "inner"];

/** 三職責。 */
export type Role = "protect" | "firepower" | "supply";
export const ROLE_ORDER: Role[] = ["protect", "firepower", "supply"];

/** 陣型中的一名成員。 */
export interface FormationMember {
  id: string;
  layer: Layer;
  role: Role;
  /** 目前生命值 */
  hp: number;
  maxHp: number;
  /** 攻擊力（供全隊 ATK 加總） */
  atk: number;
  /** 重量貢獻（影響該層面積與全隊移動） */
  weight: number;
  /** 是否有護盾 */
  shielded: boolean;
  dead: boolean;
}

/** 單一層位的彙總資訊。 */
export interface LayerSummary {
  layer: Layer;
  members: FormationMember[];
  /** 該層存活成員的重量加總 */
  totalWeight: number;
  /** 該層作為防線的碰撞重量（存活成員重量加總；全滅則 0，該層被視為破口） */
  defenseWeight: number;
  /** 同心圓半徑（由累計重量推出） */
  radius: number;
}

/** 由重量換算同心圓半徑的基礎係數（半徑 = 基底 + √累計重量 × 係數）。 */
export const RING_BASE_RADIUS = 40;
export const RING_WEIGHT_COEF = 6;

/**
 * 建立陣型網格：把成員依 layer 分組並計算每層彙總與半徑。
 * 半徑用「由內而外累計重量」推算，確保外層一定比內層大。
 */
export function buildFormation(members: readonly FormationMember[]): Record<Layer, LayerSummary> {
  const grid = {} as Record<Layer, LayerSummary>;
  let cumulativeWeight = 0;
  for (const layer of LAYER_ORDER) {
    const layerMembers = members.filter((m) => m.layer === layer);
    const alive = layerMembers.filter((m) => !m.dead);
    const totalWeight = alive.reduce((s, m) => s + m.weight, 0);
    cumulativeWeight += totalWeight;
    grid[layer] = {
      layer,
      members: layerMembers,
      totalWeight,
      defenseWeight: totalWeight,
      radius: RING_BASE_RADIUS + Math.sqrt(cumulativeWeight) * RING_WEIGHT_COEF,
    };
  }
  return grid;
}

/**
 * 受擊順序的防線重量陣列（由外而內），供 重量物理.resolvePenetration() 逐層穿透用。
 * 全滅的層 defenseWeight = 0，會被子彈直接穿過（破口）。
 */
export function defenseLayers(grid: Record<Layer, LayerSummary>): number[] {
  return HIT_ORDER.map((layer) => grid[layer].defenseWeight);
}

/**
 * 決定一次穿透中「傷害落在哪些成員身上」。
 * 子彈打穿到第 k 層（由外而內索引），沿途每層的存活成員分攤該次傷害。
 *
 * @param grid 陣型
 * @param layersBroken 由外而內被打穿的層數（來自 resolvePenetration）
 * @param stoppedAtLayer 卡住的層索引（-1 = 全貫穿）
 * @param damage 該次命中傷害
 */
export interface DamageAllocation {
  memberId: string;
  damage: number;
}

export function allocatePenetrationDamage(
  grid: Record<Layer, LayerSummary>,
  layersBroken: number,
  stoppedAtLayer: number,
  damage: number,
): DamageAllocation[] {
  const out: DamageAllocation[] = [];
  // 受擊到的層 = 被打穿的層 + （若被卡住）卡住的那一層
  const touchedCount = stoppedAtLayer >= 0 ? layersBroken + 1 : layersBroken;
  for (let i = 0; i < touchedCount && i < HIT_ORDER.length; i += 1) {
    const layer = HIT_ORDER[i];
    const alive = grid[layer].members.filter((m) => !m.dead);
    if (alive.length === 0) continue;
    const per = Math.round(damage / alive.length);
    for (const m of alive) out.push({ memberId: m.id, damage: per });
  }
  return out;
}

/** 全隊 ATK 加總（供 Tick 傷害結算）。 */
export function squadTotalAtk(members: readonly FormationMember[]): number {
  return members.filter((m) => !m.dead).reduce((s, m) => s + m.atk, 0);
}

/** 全隊存活重量加總（供移動系統計算拖累）。 */
export function squadTotalWeight(members: readonly FormationMember[]): number {
  return members.filter((m) => !m.dead).reduce((s, m) => s + m.weight, 0);
}

/** 職責統計（供 HUD 讀「這圈有沒有藍位/紅位/黃位」）。 */
export function roleTally(members: readonly FormationMember[]): Record<Role, number> {
  const t: Record<Role, number> = { protect: 0, firepower: 0, supply: 0 };
  for (const m of members) if (!m.dead) t[m.role] += 1;
  return t;
}
