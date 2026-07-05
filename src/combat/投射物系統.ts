/**
 * @file 投射物系統.ts
 * @description 負責四大家族武器的子彈生成、發射節奏接軌、飛行軌跡更新、命中後消散，
 *              以及交由其他系統處理附魔與碰撞結果。
 *              對應「doc/系統機制/機制指南.md」§2（四家族基礎屬性與發射週期）、§1.3（Tick）。
 *
 *              純演算/資料模型：本檔維護一個投射物池，每個 Tick 由外部呼叫
 *              spawnFromFamily() 生成、每幀呼叫 advance() 推進飛行與生命週期。
 *              重量對抗、傷害結算由 碰撞解析.ts 消化；附魔改寫由 附魔系統.ts 施加。
 */

import { WEAPON_BASE } from "../data/武器與附魔";
import { STAR_MULTIPLIER, type StarLevel } from "../data/成員型別";
import type { WeaponFamily } from "../data/戰鬥原語";
import type { Vec2 } from "../core/移動系統";

let projectileSeq = 0;

/** 投射物運動型態。 */
export type ProjectileMotion =
  | "linear" // 直線等速（直線/多發/護盾衝擊波）
  | "decaying" // 速度衰減至 0 後滯留（地雷）
  | "homing"; // 會轉向（追蹤附魔改寫後）

/** 陣營：玩家小隊或敵方。碰撞解析用來判斷誰打誰。 */
export type Faction = "player" | "enemy";

/** 一顆在場的投射物。 */
export interface Projectile {
  id: number;
  family: WeaponFamily;
  faction: Faction;
  position: Vec2;
  /** 單位方向向量 */
  direction: Vec2;
  /** 目前速度（世界單位/秒） */
  speed: number;
  /** 傷害 */
  damage: number;
  /** 剩餘碰撞重量 */
  remainingWeight: number;
  /** 運動型態 */
  motion: ProjectileMotion;
  /** 剩餘存活時間（秒）；<=0 時消散 */
  lifeRemaining: number;
  /** 已飛行距離（供狙擊等隨距離增益的附魔使用） */
  traveled: number;
  /** 最大飛行距離（0 = 不以距離限制，改由 lifeRemaining 限制） */
  maxRange: number;
  /** 地雷等：速度衰減率（單位/秒²，僅 decaying 用） */
  decel: number;
  /** 是否為滯留中的地雷（速度已歸零） */
  lingering: boolean;
  /** 掛在此投射物上的附魔標記（id → 星級），供附魔系統於各生命週期事件觸發 */
  enchants: Record<string, StarLevel>;
  /** 任意附加參數（附魔會寫入，如 homing 的 turnRate、firework 的計時器） */
  meta: Record<string, number>;
}

/** 生成投射物的請求。 */
export interface SpawnRequest {
  family: WeaponFamily;
  faction: Faction;
  origin: Vec2;
  /** 發射方向（未必正規化） */
  aim: Vec2;
  /** 發射者的家族武器星級（影響傷害/重量倍率） */
  weaponStar: StarLevel;
  /** 隊長控制/全隊增益疊加的傷害倍率（預設 1） */
  damageMult?: number;
  /** 掛載附魔（id → 星級） */
  enchants?: Record<string, StarLevel>;
}

/** 護盾扇形基礎半張角（度）；wide_angle 附魔在此基礎上加成。 */
export const SHIELD_BASE_HALF_ANGLE = 35;
/** 多發家族基礎散射半張角（度）；focus 附魔在此基礎上收斂。 */
export const MULTISHOT_BASE_HALF_ANGLE = 30;
/** 一般子彈的存活秒數（未特別指定 maxRange 時的壽命）。 */
export const DEFAULT_LIFE_SECONDS = 3;

function normalize(v: Vec2): Vec2 {
  const len = Math.hypot(v.x, v.y);
  if (len <= 1e-6) return { x: 0, y: -1 };
  return { x: v.x / len, y: v.y / len };
}

function rotate(v: Vec2, deg: number): Vec2 {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

/**
 * 依家族與星級把「一次發射」展開成 1~N 顆投射物。
 * 多發家族依 pelletCount 扇形展開；護盾為單一寬扇形衝擊波（以一顆高重量投射物代表）；
 * 地雷為 decaying 運動；直線為單顆等速。
 */
export function spawnFromFamily(req: SpawnRequest): Projectile[] {
  const base = WEAPON_BASE[req.family];
  const mult = STAR_MULTIPLIER[req.weaponStar];
  const dmgMult = req.damageMult ?? 1;
  const dir = normalize(req.aim);
  const enchants = req.enchants ?? {};

  const makeOne = (direction: Vec2, extra?: Partial<Projectile>): Projectile => {
    const motion: ProjectileMotion = req.family === "mine" ? "decaying" : "linear";
    return {
      id: projectileSeq++,
      family: req.family,
      faction: req.faction,
      position: { ...req.origin },
      direction,
      speed: base.speed,
      damage: Math.round(base.damage * mult * dmgMult),
      remainingWeight: Math.round(base.weight * mult),
      motion,
      lifeRemaining: req.family === "mine" ? base.lingerSeconds : DEFAULT_LIFE_SECONDS,
      traveled: 0,
      maxRange: 0,
      // 地雷 §2.4：初速 6，0.5 秒衰減至 0 → decel = 初速 / 0.5
      decel: req.family === "mine" ? base.speed / 0.5 : 0,
      lingering: false,
      enchants: { ...enchants },
      meta: {},
      ...extra,
    };
  };

  if (req.family === "multishot" && base.pelletCount > 1) {
    const half = MULTISHOT_BASE_HALF_ANGLE;
    const n = base.pelletCount;
    const out: Projectile[] = [];
    for (let i = 0; i < n; i += 1) {
      // 在 [-half, +half] 均勻鋪開
      const t = n === 1 ? 0.5 : i / (n - 1);
      const deg = -half + t * 2 * half;
      out.push(makeOne(rotate(dir, deg)));
    }
    return out;
  }

  // 護盾以單顆高重量投射物代表整片扇形衝擊波
  return [makeOne(dir)];
}

/** 推進一顆投射物一幀；回傳是否仍存活。 */
export function advanceProjectile(p: Projectile, dt: number): boolean {
  // 生命週期
  p.lifeRemaining -= dt;

  if (p.motion === "decaying") {
    if (!p.lingering) {
      p.speed = Math.max(0, p.speed - p.decel * dt);
      if (p.speed <= 0) {
        p.speed = 0;
        p.lingering = true; // 進入滯留（地雷佈署完成）
      }
    }
    // 滯留期間不移動，但持續倒數 lifeRemaining
  }

  if (p.speed > 0) {
    const step = p.speed * dt;
    p.position.x += p.direction.x * step;
    p.position.y += p.direction.y * step;
    p.traveled += step;
  }

  // 距離上限
  if (p.maxRange > 0 && p.traveled >= p.maxRange) return false;
  return p.lifeRemaining > 0;
}

/**
 * 投射物池：集中管理在場的所有投射物。
 * 外部每 Tick 呼叫 spawn* 生成，每幀 advance() 推進並自動回收消散者。
 */
export class ProjectilePool {
  private projectiles: Projectile[] = [];

  spawn(req: SpawnRequest): Projectile[] {
    const created = spawnFromFamily(req);
    this.projectiles.push(...created);
    return created;
  }

  addExisting(p: Projectile): void {
    this.projectiles.push(p);
  }

  /** 推進一幀，回收 lifeRemaining/maxRange 到期者。回傳仍存活的投射物。 */
  advance(dt: number): Projectile[] {
    const alive: Projectile[] = [];
    for (const p of this.projectiles) {
      if (advanceProjectile(p, dt)) alive.push(p);
    }
    this.projectiles = alive;
    return alive;
  }

  /** 主動移除（碰撞消散、重量歸零）。 */
  remove(id: number): void {
    this.projectiles = this.projectiles.filter((p) => p.id !== id);
  }

  all(): readonly Projectile[] {
    return this.projectiles;
  }

  byFaction(faction: Faction): Projectile[] {
    return this.projectiles.filter((p) => p.faction === faction);
  }

  clear(): void {
    this.projectiles = [];
  }

  get count(): number {
    return this.projectiles.length;
  }
}
