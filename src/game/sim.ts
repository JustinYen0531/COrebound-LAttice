/**
 * @file sim.ts
 * @description 戰場模擬:小隊移動、武器自動開火、投射物、敵人 AI、掉落、
 *              侵蝕毒圈、守護者與 COLA。數值走 src/legacy 資料庫。
 */

import type { Family, World } from "../legacy/data/成員型別";
import type { CaptainId, ControlEffect } from "../legacy/data/戰鬥原語";
import { EROSION_DAMAGE_RATIO_PER_TICK, TIER_DROP } from "../legacy/data/戰鬥原語";
import { WEAPON_BASE } from "../legacy/data/武器與附魔";
import { MONSTERS, monstersByWorld, worldGuardian, finalBoss, resolveControl, type MonsterDef } from "../legacy/data/怪物資料庫";
import { 計算主動技能效果 } from "../legacy/captain/主動技能效果";
import { RunState, MAX_DEATHS, QUOTA_T1, QUOTA_T2 } from "./state";
import {
  MAP_W, MAP_H, CX, CY, PLAZA_R, WORLDS, QUADRANT_CENTER, CORE_R,
  worldAt, inPlaza, randomChestSpot, type MapLayout,
} from "./world";

// ============================================================
// 型別
// ============================================================

export interface Enemy {
  uid: number;
  def: MonsterDef;
  world: World | "core";
  x: number; y: number;
  homeX: number; homeY: number;
  hp: number; maxHp: number;
  radius: number;
  aggro: boolean;
  boss: "guardian" | "cola" | null;
  // 狀態
  slowUntil: number; slowMult: number;
  stunUntil: number; silenceUntil: number;
  dashUntil: number; dashVx: number; dashVy: number;
  kbVx: number; kbVy: number;
  wanderAng: number; wanderT: number;
  fireCd: number[];
  touchCd: number;
  dashCd: number;
  summonCd: number;
  fleeing: boolean;
  /** 戰力倍率(狂暴/跨世界連動) */
  dmgMult: number;
}

export interface Projectile {
  uid: number;
  side: "player" | "enemy";
  family: Family;
  kind: "bullet" | "wave" | "mine";
  x: number; y: number; vx: number; vy: number;
  damage: number; weight: number; r: number;
  age: number; life: number;
  control: ControlEffect | null;
  hit: Set<number>;
  // 附魔行為
  homingDeg?: number;
  snipeBonusPerStage?: number; travel?: number; baseDamage?: number;
  explodeFrags?: number; explodeRatio?: number;
  splinterCount?: number; splinterRatio?: number;
  fieldR?: number; fieldSlow?: number;
  chargeArmed?: boolean;
  arcSpan?: number; arcDir?: number;
}

export interface Drop {
  x: number; y: number;
  kind: "gems" | "material";
  amount: number;
  world?: World; star?: 1 | 2 | 3; rarity?: "common" | "fine";
  age: number;
}

export interface Chest { x: number; y: number; opened: boolean }

export interface FloatText { x: number; y: number; text: string; color: string; age: number }

export interface SlowField { x: number; y: number; r: number; until: number; mult: number; side: "player" | "enemy" }

export interface SimInput {
  moveX: number; moveY: number;
}

export type RunOutcome = { result: "victory" | "defeat" } | null;

const EROSION_START = 600;      // 侵蝕啟動秒數(重製版節奏,文件原值 900)
const EROSION_SHRINK = 15;      // px/s
/** 侵蝕收縮下限:保住四世界核心區與祭壇(文件意圖是逼玩家向核心推進,不是關死推圖路線) */
const EROSION_MIN_R = 3800;
const PROTECTION_SEC = 300;     // T2 新手保護期(重製版 5 分鐘,文件原值 10 分鐘)
const BULLET_SPEED_SCALE = 45;
/** 玩家武器全域傷害倍率:讓武器(而非碰撞)成為主要輸出,對應設計「武器家族=戰力主軸」 */
const PLAYER_WEAPON_MULT = 2.0;
const SKILL_ENERGY_COST = 40;
const SKILL_COOLDOWN = 5;
const CHEST_INTERVAL = 150;
const TIER_RADIUS = [44, 50, 70, 108, 150];
const TIER_GEMS = [3, 6, 25, 150, 0];

let UID = 1;

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================================
// 模擬主體
// ============================================================

export class Sim {
  state: RunState;
  layout: MapLayout;
  rnd: () => number;

  px = CX; py = CY;
  facingX = 0; facingY = -1;
  squadR = 108;
  moving = false;

  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  drops: Drop[] = [];
  chests: Chest[] = [];
  floats: FloatText[] = [];
  slowFields: SlowField[] = [];
  toasts: string[] = [];

  erosionR = Infinity;
  weaponCd: Partial<Record<Family, number>> = {};
  skillCd = 0;
  speedBuffUntil = 0; speedBuffMult = 1;
  pSlowUntil = 0; pSlowMult = 1;
  pStunUntil = 0; pSilenceUntil = 0;
  invulnUntil = 0;
  erosionTickAcc = 0;
  spawnTimer = 0;
  chestTimer = CHEST_INTERVAL;
  contactTickAcc = 0;
  /** 最後一次受傷時刻(脫戰回血用) */
  lastHurtAt = -999;

  outcome: RunOutcome = null;

  constructor(state: RunState, layout: MapLayout, seed: number) {
    this.state = state;
    this.layout = layout;
    this.rnd = mulberry32(seed ^ 0x9e3779b9);
    for (const w of WORLDS) this.populateWorld(w, true);
    // 開局三個寶箱
    for (let i = 0; i < 3; i++) {
      const s = randomChestSpot(this.rnd);
      this.chests.push({ x: s.x, y: s.y, opened: false });
    }
  }

  toast(msg: string): void {
    this.toasts.push(msg);
  }

  // ---------- 生成 ----------

  private makeEnemy(def: MonsterDef, x: number, y: number, boss: Enemy["boss"] = null): Enemy {
    const prog = def.world !== "core" ? this.state.progress[def.world as World] : null;
    let hpMult = 1, dmgMult = 1;
    if (prog?.enraged) dmgMult *= 1.3;
    // 跨世界連動:每個其他世界的守護者被擊敗,未通關世界怪物 +15%
    if (def.world !== "core" && !prog?.guardianDefeated) {
      const defeatedElsewhere = WORLDS.filter((w) => w !== def.world && this.state.progress[w].guardianDefeated).length;
      hpMult *= Math.pow(1.15, defeatedElsewhere);
      dmgMult *= Math.pow(1.15, defeatedElsewhere);
    }
    // 世界韌性(機制指南 §9.1:Boss 無法被輕易平推)
    if (boss === "guardian") hpMult *= 2.2;
    if (boss === "cola") hpMult *= 1.35;
    const maxHp = Math.round(def.stats.hp * hpMult);
    return {
      uid: UID++, def, world: def.world, x, y, homeX: x, homeY: y,
      hp: maxHp, maxHp, radius: TIER_RADIUS[def.tier], aggro: def.tier === 1 || def.tier >= 3,
      boss,
      slowUntil: 0, slowMult: 1, stunUntil: 0, silenceUntil: 0,
      dashUntil: 0, dashVx: 0, dashVy: 0, kbVx: 0, kbVy: 0,
      wanderAng: this.rnd() * Math.PI * 2, wanderT: 0,
      fireCd: def.armament.weapons.map(() => 1 + this.rnd() * 2),
      touchCd: 0, dashCd: 6 + this.rnd() * 3, summonCd: 12,
      fleeing: false, dmgMult,
    };
  }

  private populateWorld(w: World, initial: boolean): void {
    const defs = monstersByWorld(w);
    const t0 = defs.filter((d) => d.tier === 0);
    const t1 = defs.filter((d) => d.tier === 1);
    const t2 = defs.filter((d) => d.tier === 2);
    const alive = { 0: 0, 1: 0, 2: 0 } as Record<number, number>;
    for (const e of this.enemies) {
      if (e.world === w && e.def.tier <= 2) alive[e.def.tier]++;
    }
    const caps = { 0: 5, 1: 7, 2: 3 };
    const qc = QUADRANT_CENTER[w];
    const trySpawn = (def: MonsterDef, core: boolean) => {
      for (let i = 0; i < 8; i++) {
        const ang = this.rnd() * Math.PI * 2;
        const d = core ? this.rnd() * (CORE_R - 150) : 400 + this.rnd() * 2300;
        const x = qc.x + Math.cos(ang) * d;
        const y = qc.y + Math.sin(ang) * d;
        if (x < 200 || y < 200 || x > MAP_W - 200 || y > MAP_H - 200) continue;
        if (worldAt(x, y) !== w || inPlaza(x, y)) continue;
        if (!initial && dist(x, y, this.px, this.py) < 750) continue;
        this.enemies.push(this.makeEnemy(def, x, y));
        return;
      }
    };
    for (let t = 0 as 0 | 1 | 2; t <= 2; t++) {
      const pool = t === 0 ? t0 : t === 1 ? t1 : t2;
      if (pool.length === 0) continue;
      const want = caps[t] - alive[t];
      for (let i = 0; i < want; i++) {
        trySpawn(pool[Math.floor(this.rnd() * pool.length)], t === 2);
      }
    }
  }

  // ---------- 主更新 ----------

  update(dt: number, input: SimInput): void {
    if (this.outcome) return;
    const st = this.state;
    st.timeSec += dt;
    const now = st.timeSec;

    st.energy.tick(dt);
    this.skillCd = Math.max(0, this.skillCd - dt);

    // 脫戰回血(重製版新增:6 秒未受傷後每秒回 2.5%,讓單人局不靠藥水也能恢復)
    if (now - this.lastHurtAt > 6 && st.hp < st.maxHp && st.hp > 0) {
      st.hp = Math.min(st.maxHp, st.hp + st.maxHp * 0.025 * dt);
    }

    // ----- 玩家移動 -----
    const stunned = now < this.pStunUntil;
    let mx = input.moveX, my = input.moveY;
    const len = Math.hypot(mx, my);
    this.moving = len > 0.01 && !stunned;
    if (this.moving) {
      mx /= len; my /= len;
      this.facingX = mx; this.facingY = my;
      let spd = st.moveSpeed();
      if (now < this.speedBuffUntil) spd *= this.speedBuffMult;
      if (now < this.pSlowUntil) spd *= this.pSlowMult;
      for (const f of this.slowFields) {
        if (f.side === "enemy" && now < f.until && dist(this.px, this.py, f.x, f.y) < f.r) spd *= f.mult;
      }
      this.px = Math.max(this.squadR, Math.min(MAP_W - this.squadR, this.px + mx * spd * dt));
      this.py = Math.max(this.squadR, Math.min(MAP_H - this.squadR, this.py + my * spd * dt));
    }

    // ----- 侵蝕毒圈 -----
    if (now >= EROSION_START) {
      const full = Math.hypot(MAP_W, MAP_H) / 2;
      this.erosionR = Math.max(EROSION_MIN_R, full - (now - EROSION_START) * EROSION_SHRINK);
      if (dist(this.px, this.py, CX, CY) > this.erosionR) {
        this.erosionTickAcc += dt;
        if (this.erosionTickAcc >= 1) {
          this.erosionTickAcc -= 1;
          this.damagePlayer(st.maxHp * EROSION_DAMAGE_RATIO_PER_TICK, true);
          this.floats.push({ x: this.px, y: this.py - 130, text: "侵蝕!", color: "#e14646", age: 0 });
        }
      } else this.erosionTickAcc = 0;
    }

    // ----- 武器自動開火 -----
    this.updateWeapons(dt, now);

    // ----- 投射物 -----
    this.updateProjectiles(dt, now);

    // ----- 敵人 -----
    this.updateEnemies(dt, now);

    // ----- 掉落物磁吸 -----
    for (const d of this.drops) {
      d.age += dt;
      const dd = dist(d.x, d.y, this.px, this.py);
      if (dd < 170) {
        if (d.kind === "gems") {
          st.gems += d.amount;
          st.stats.gemsEarned += d.amount;
        } else if (d.world && d.star && d.rarity) {
          st.addMaterial(d.world, d.star, d.rarity, d.amount);
        }
        d.age = 999;
      }
    }
    this.drops = this.drops.filter((d) => d.age < 90);

    // ----- 補怪與寶箱 -----
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawnTimer = 5;
      for (const w of WORLDS) this.populateWorld(w, false);
    }
    this.chestTimer -= dt;
    if (this.chestTimer <= 0) {
      this.chestTimer = CHEST_INTERVAL;
      if (this.chests.filter((c) => !c.opened).length < 4) {
        const s = randomChestSpot(this.rnd);
        this.chests.push({ x: s.x, y: s.y, opened: false });
        this.toast("✨ 新的禪繞寶箱出現了");
      }
    }

    // ----- 浮字/欄位清理 -----
    for (const f of this.floats) f.age += dt;
    this.floats = this.floats.filter((f) => f.age < 1.4);
    this.slowFields = this.slowFields.filter((f) => now < f.until);
  }

  // ---------- 武器 ----------

  private updateWeapons(dt: number, now: number): void {
    const st = this.state;
    const families: Family[] = ["shield", "multishot", "straight", "mine"];
    // Boss 優先鎖定:守護者/COLA 在射程內時集火,否則打最近的敵人
    const bossInRange = this.enemies.find(
      (e) => e.boss && e.hp > 0 && dist(e.x, e.y, this.px, this.py) - e.radius < 1150,
    );
    const target = bossInRange ?? this.nearestEnemy(1150);
    for (const fam of families) {
      const star = st.weaponStar(fam);
      this.weaponCd[fam] = Math.max(0, (this.weaponCd[fam] ?? 0) - dt);
      if (star === 0 || !target) continue;
      if ((this.weaponCd[fam] ?? 0) > 0) continue;
      const base = WEAPON_BASE[fam];
      this.weaponCd[fam] = base.firePeriodTicks;
      this.fireFamily(fam, star, target, now);
    }
  }

  private fireFamily(fam: Family, star: 1 | 2 | 3, target: Enemy, now: number, damageRatio = 1): void {
    const st = this.state;
    const base = WEAPON_BASE[fam];
    const control = st.captainControl();
    const enchant = st.activeEnchant(fam);
    const dmg = base.damage * star * damageRatio * PLAYER_WEAPON_MULT;
    const dirX = target.x - this.px, dirY = target.y - this.py;
    const dLen = Math.hypot(dirX, dirY) || 1;
    const nx = dirX / dLen, ny = dirY / dLen;
    const spd = base.speed * BULLET_SPEED_SCALE;

    const mk = (ang: number, kind: Projectile["kind"], extra?: Partial<Projectile>): Projectile => {
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const vx = (nx * ca - ny * sa) * spd;
      const vy = (nx * sa + ny * ca) * spd;
      return {
        uid: UID++, side: "player", family: fam, kind,
        x: this.px + nx * (this.squadR + 10), y: this.py + ny * (this.squadR + 10),
        vx, vy, damage: dmg, weight: base.weight * star, r: kind === "wave" ? 68 : kind === "mine" ? 30 : 12,
        age: 0, life: kind === "wave" ? 2.0 : kind === "mine" ? 5.5 : 1.6,
        control, hit: new Set(),
        ...extra,
      };
    };

    switch (fam) {
      case "straight": {
        const p = mk(0, "bullet");
        p.baseDamage = dmg; p.travel = 0;
        if (enchant?.id === "snipe") p.snipeBonusPerStage = [0.15, 0.25, 0.4][enchant.star - 1];
        if (enchant?.id === "homing") p.homingDeg = [15, 30, 50][enchant.star - 1];
        if (enchant?.id === "explosion") { p.explodeFrags = [4, 6, 8][enchant.star - 1]; p.explodeRatio = [0.3, 0.4, 0.5][enchant.star - 1]; }
        this.projectiles.push(p);
        break;
      }
      case "multishot": {
        let spread = 0.42;
        let life = 0.95;
        if (enchant?.id === "focus") { spread *= 1 - [0.2, 0.35, 0.5][enchant.star - 1]; life *= 1 + [0.25, 0.4, 0.6][enchant.star - 1]; }
        for (let i = 0; i < base.pelletCount; i++) {
          const ang = (i / (base.pelletCount - 1) - 0.5) * spread * 2;
          const p = mk(ang, "bullet");
          p.life = life;
          this.projectiles.push(p);
        }
        if (enchant?.id === "rapid_fire") {
          // 追加一輪(緊貼首輪,傷害 40/60/80%)
          const ratio = [0.4, 0.6, 0.8][enchant.star - 1];
          for (let i = 0; i < base.pelletCount; i++) {
            const ang = (i / (base.pelletCount - 1) - 0.5) * spread * 2;
            const p = mk(ang, "bullet", { damage: dmg * ratio });
            p.life = life * 0.85;
            p.x -= nx * 26; p.y -= ny * 26;
            this.projectiles.push(p);
          }
        }
        if (enchant?.id === "recoil") {
          const push = [60, 100, 160][enchant.star - 1];
          this.px = Math.max(this.squadR, Math.min(MAP_W - this.squadR, this.px - nx * push * 0.5));
          this.py = Math.max(this.squadR, Math.min(MAP_H - this.squadR, this.py - ny * push * 0.5));
        }
        break;
      }
      case "shield": {
        let span = Math.PI * 0.5;
        if (enchant?.id === "wide_angle") span *= 1 + [0.15, 0.3, 0.5][enchant.star - 1];
        const p = mk(0, "wave", { arcSpan: span, arcDir: Math.atan2(ny, nx) });
        if (enchant?.id === "splinter") { p.splinterCount = [2, 3, 4][enchant.star - 1]; p.splinterRatio = [0.4, 0.5, 0.6][enchant.star - 1]; }
        this.projectiles.push(p);
        break;
      }
      case "mine": {
        let count = 1;
        if (enchant?.id === "empowered_cast") {
          // 簡化:固定每次多投(1★/2★ 兩顆機率、3★ 三顆扇形)
          count = enchant.star >= 3 ? 3 : 2;
        }
        for (let i = 0; i < count; i++) {
          const ang = count === 1 ? 0 : (i / (count - 1) - 0.5) * 0.5;
          const p = mk(ang, "mine");
          if (enchant?.id === "gigantism") {
            const gr = [0.25, 0.45, 0.7][enchant.star - 1];
            p.r *= 1 + gr; p.weight *= 1 + [0.3, 0.5, 0.8][enchant.star - 1];
          }
          if (enchant?.id === "interception_field") {
            p.fieldR = p.r * [2, 2.5, 3][enchant.star - 1] * 2.2;
            p.fieldSlow = 1 - [0.2, 0.35, 0.5][enchant.star - 1];
          }
          if (enchant?.id === "charge") p.chargeArmed = true;
          this.projectiles.push(p);
        }
        break;
      }
      default:
        break;
    }
  }

  private nearestEnemy(range: number): Enemy | null {
    let best: Enemy | null = null;
    let bd = range;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const d = dist(e.x, e.y, this.px, this.py) - e.radius;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  // ---------- 投射物 ----------

  private updateProjectiles(dt: number, now: number): void {
    const st = this.state;
    for (const p of this.projectiles) {
      p.age += dt;
      // 追蹤
      if (p.homingDeg && p.side === "player") {
        const t = this.nearestEnemyTo(p.x, p.y, 700);
        if (t) {
          const want = Math.atan2(t.y - p.y, t.x - p.x);
          const cur = Math.atan2(p.vy, p.vx);
          let diff = want - cur;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const maxTurn = (p.homingDeg * Math.PI / 180) * dt * 3;
          const turn = Math.max(-maxTurn, Math.min(maxTurn, diff));
          const spd = Math.hypot(p.vx, p.vy);
          const na = cur + turn;
          p.vx = Math.cos(na) * spd; p.vy = Math.sin(na) * spd;
        }
      }
      // 地雷減速滯留
      if (p.kind === "mine" && p.age < 0.5) {
        p.vx *= Math.pow(0.02, dt / 0.5); p.vy *= Math.pow(0.02, dt / 0.5);
      } else if (p.kind === "mine") {
        p.vx = 0; p.vy = 0;
        // 衝鋒:消散前撲向最近敵人
        if (p.chargeArmed && p.life - p.age < 1.2) {
          const t = p.side === "player" ? this.nearestEnemyTo(p.x, p.y, 500) : null;
          if (t) {
            const d = dist(p.x, p.y, t.x, t.y) || 1;
            p.vx = ((t.x - p.x) / d) * 500; p.vy = ((t.y - p.y) / d) * 500;
            p.chargeArmed = false;
          }
        }
        // 擦彈護體減速場
        if (p.fieldR && p.side === "player") {
          this.slowFields.push({ x: p.x, y: p.y, r: p.fieldR, until: now + 0.15, mult: p.fieldSlow ?? 0.8, side: "enemy" });
        }
      }
      // 狙擊成長
      if (p.snipeBonusPerStage && p.baseDamage !== undefined) {
        p.travel = (p.travel ?? 0) + Math.hypot(p.vx, p.vy) * dt;
        const stage = Math.min(2, Math.floor((p.travel / 1300) * 2));
        p.damage = p.baseDamage * (1 + p.snipeBonusPerStage * stage);
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
    }

    // --- 玩家投射物 vs 敵人 ---
    for (const p of this.projectiles) {
      if (p.side !== "player" || p.age > p.life) continue;
      for (const e of this.enemies) {
        if (e.hp <= 0 || p.hit.has(e.uid)) continue;
        let hitTest = false;
        if (p.kind === "wave") {
          const d = dist(p.x, p.y, e.x, e.y);
          hitTest = d < p.r + e.radius;
        } else {
          hitTest = dist(p.x, p.y, e.x, e.y) < p.r + e.radius;
        }
        if (!hitTest) continue;
        p.hit.add(e.uid);
        this.damageEnemy(e, p.damage, now);
        this.applyControlToEnemy(e, p.control, now, p);
        // 重量穿透:扣除敵方重量,歸零即消失(重量物理簡化版)
        p.weight -= e.def.stats.weight;
        if (p.weight <= 0 && p.kind !== "wave") { p.age = p.life + 1; break; }
      }
    }

    // --- 敵人投射物 vs 小隊 ---
    for (const p of this.projectiles) {
      if (p.side !== "enemy" || p.age > p.life) continue;
      if (dist(p.x, p.y, this.px, this.py) < p.r + this.squadR * 0.92) {
        this.damagePlayer(p.damage);
        if (p.control) this.applyControlToPlayer(p.control, now);
        p.age = p.life + 1;
      }
    }

    // --- 護盾波 vs 敵方子彈(重量壓制) ---
    for (const w of this.projectiles) {
      if (w.side !== "player" || w.kind !== "wave" || w.age > w.life) continue;
      for (const b of this.projectiles) {
        if (b.side !== "enemy" || b.kind === "wave" || b.age > b.life) continue;
        if (dist(w.x, w.y, b.x, b.y) < w.r + b.r + 18) {
          b.age = b.life + 1; // 霸體重量,直接消除
          const ench = this.state.activeEnchant("shield");
          if (ench?.id === "repel") {
            // 反彈為己方子彈
            const ratio = [0.3, 0.5, 0.8][ench.star - 1];
            this.projectiles.push({
              uid: UID++, side: "player", family: "straight", kind: "bullet",
              x: b.x, y: b.y, vx: -b.vx * 1.1, vy: -b.vy * 1.1,
              damage: b.damage * ratio, weight: 8, r: 10, age: 0, life: 1.2,
              control: null, hit: new Set(),
            });
          }
        }
      }
    }
    // --- 地雷 vs 敵方子彈(吸收) ---
    for (const m of this.projectiles) {
      if (m.side !== "player" || m.kind !== "mine" || m.age > m.life) continue;
      for (const b of this.projectiles) {
        if (b.side !== "enemy" || b.kind === "wave" || b.age > b.life) continue;
        if (dist(m.x, m.y, b.x, b.y) < m.r + b.r) {
          m.weight -= b.weight;
          b.age = b.life + 1;
          if (m.weight <= 0) m.age = m.life + 1;
        }
      }
    }

    // --- 到期處理(爆炸/分裂) ---
    const spawned: Projectile[] = [];
    for (const p of this.projectiles) {
      if (p.age <= p.life) continue;
      if (p.side === "player" && p.explodeFrags && p.explodeRatio) {
        for (let i = 0; i < p.explodeFrags; i++) {
          const a = (i / p.explodeFrags) * Math.PI * 2;
          spawned.push({
            uid: UID++, side: "player", family: "straight", kind: "bullet",
            x: p.x, y: p.y, vx: Math.cos(a) * 480, vy: Math.sin(a) * 480,
            damage: (p.baseDamage ?? p.damage) * p.explodeRatio, weight: 5, r: 9,
            age: 0, life: 0.5, control: null, hit: new Set(),
          });
        }
        p.explodeFrags = 0;
      }
      if (p.side === "player" && p.splinterCount && p.splinterRatio && p.kind === "wave") {
        const dir = p.arcDir ?? 0;
        for (let i = 0; i < p.splinterCount; i++) {
          const a = dir + (i / (p.splinterCount - 1 || 1) - 0.5) * 1.2;
          spawned.push({
            uid: UID++, side: "player", family: "shield", kind: "wave",
            x: p.x, y: p.y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260,
            damage: p.damage * p.splinterRatio, weight: 999, r: 34,
            age: 0, life: 0.9, control: p.control, hit: new Set(),
            arcSpan: 0.8, arcDir: a,
          });
        }
        p.splinterCount = 0;
      }
    }
    this.projectiles = this.projectiles.filter((p) => p.age <= p.life).concat(spawned);
  }

  private nearestEnemyTo(x: number, y: number, range: number): Enemy | null {
    let best: Enemy | null = null;
    let bd = range;
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const d = dist(e.x, e.y, x, y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  // ---------- 控制效果 ----------

  private applyControlToEnemy(e: Enemy, c: ControlEffect | null, now: number, p: Projectile): void {
    if (!c) return;
    switch (c.kind) {
      case "slow":
        e.slowUntil = now + c.duration;
        e.slowMult = 1 - c.magnitude;
        break;
      case "knockback": {
        const d = Math.hypot(p.vx, p.vy) || 1;
        e.kbVx += (p.vx / d) * c.magnitude * 220;
        e.kbVy += (p.vy / d) * c.magnitude * 220;
        break;
      }
      case "stun":
        e.stunUntil = now + c.magnitude; // magnitude 即秒數
        break;
      case "silence":
        e.silenceUntil = now + c.magnitude;
        break;
    }
  }

  private applyControlToPlayer(c: ControlEffect, now: number): void {
    switch (c.kind) {
      case "slow":
        this.pSlowUntil = now + c.duration;
        this.pSlowMult = 1 - c.magnitude;
        break;
      case "knockback":
        break; // 小隊不吃位移(重量太大),忽略
      case "stun":
        this.pStunUntil = now + Math.min(1, c.magnitude);
        break;
      case "silence":
        this.pSilenceUntil = now + c.magnitude;
        break;
    }
  }

  // ---------- 敵人 AI ----------

  private updateEnemies(dt: number, now: number): void {
    const st = this.state;
    const protection = now < PROTECTION_SEC;

    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      const dp = dist(e.x, e.y, this.px, this.py);
      const stunned = now < e.stunUntil;
      let spd = e.def.stats.speed;
      if (now < e.slowUntil) spd *= e.slowMult;
      for (const f of this.slowFields) {
        if (f.side === "enemy" && dist(e.x, e.y, f.x, f.y) < f.r) spd *= f.mult;
      }

      // 行為
      let wantX = 0, wantY = 0;
      const tier = e.def.tier;
      if (stunned) {
        // 原地
      } else if (tier === 0) {
        // 資源怪:被靠近就逃
        if (dp < 460) {
          e.fleeing = true;
          wantX = (e.x - this.px) / dp; wantY = (e.y - this.py) / dp;
        } else {
          e.fleeing = false;
          e.wanderT -= dt;
          if (e.wanderT <= 0) { e.wanderT = 2 + this.rnd() * 2; e.wanderAng = this.rnd() * Math.PI * 2; }
          wantX = Math.cos(e.wanderAng) * 0.4; wantY = Math.sin(e.wanderAng) * 0.4;
        }
      } else {
        const hostile = e.boss !== null || tier === 1 || tier === 3 ||
          (tier === 2 && (e.aggro || !protection || !e.def.nonHostileInitially));
        const aggroRange = e.boss ? 99999 : e.aggro ? 950 : tier === 2 ? 700 : 620;
        if (hostile && dp < aggroRange) {
          e.aggro = true;
          if (dp > e.radius + this.squadR - 26) {
            wantX = (this.px - e.x) / dp; wantY = (this.py - e.y) / dp;
          }
        } else {
          e.wanderT -= dt;
          if (e.wanderT <= 0) { e.wanderT = 2.5 + this.rnd() * 2; e.wanderAng = this.rnd() * Math.PI * 2; }
          const dh = dist(e.x, e.y, e.homeX, e.homeY);
          if (dh > 500) { wantX = (e.homeX - e.x) / dh; wantY = (e.homeY - e.y) / dh; }
          else { wantX = Math.cos(e.wanderAng) * 0.35; wantY = Math.sin(e.wanderAng) * 0.35; }
        }

        // 開火(有武器者;沉默時停火)。低階怪射速大幅放緩,避免前期彈幕壓死單隊長。
        if (e.aggro && now >= e.silenceUntil && !stunned && dp < 1250) {
          const periodMult = e.boss === "cola" ? 1.0 : e.boss === "guardian" ? 1.2 : tier === 2 ? 1.9 : 2.6;
          e.def.armament.weapons.forEach((w, i) => {
            e.fireCd[i] -= dt;
            if (e.fireCd[i] > 0) return;
            const base = WEAPON_BASE[w.family];
            e.fireCd[i] = base.firePeriodTicks * periodMult;
            this.enemyFire(e, w.family, now);
          });
        }

        // 守護者衝刺 / COLA 召喚
        if (e.boss) {
          e.dashCd -= dt;
          if (e.boss === "guardian" && e.dashCd <= 0 && dp > 380) {
            e.dashCd = 6.5;
            e.dashUntil = now + 0.55;
            e.dashVx = ((this.px - e.x) / dp) * spd * 3.4;
            e.dashVy = ((this.py - e.y) / dp) * spd * 3.4;
            this.floats.push({ x: e.x, y: e.y - e.radius - 30, text: "衝擊!", color: "#ffb347", age: 0 });
          }
          if (e.boss === "cola") {
            e.summonCd -= dt;
            if (e.summonCd <= 0) {
              e.summonCd = 12;
              for (let i = 0; i < 2; i++) {
                const w = WORLDS[Math.floor(this.rnd() * 4)];
                const t1s = monstersByWorld(w).filter((d) => d.tier === 1);
                const def = t1s[Math.floor(this.rnd() * t1s.length)];
                const a = this.rnd() * Math.PI * 2;
                const m = this.makeEnemy(def, e.x + Math.cos(a) * 260, e.y + Math.sin(a) * 260);
                m.aggro = true;
                this.enemies.push(m);
              }
              this.toast("⚠ COLA 召喚了晶格眷屬!");
            }
          }
        }
      }

      // 位移
      if (now < e.dashUntil) {
        e.x += e.dashVx * dt; e.y += e.dashVy * dt;
      } else if (!stunned) {
        e.x += wantX * spd * dt; e.y += wantY * spd * dt;
      }
      // 擊退衰減
      e.x += e.kbVx * dt; e.y += e.kbVy * dt;
      e.kbVx *= Math.pow(0.01, dt); e.kbVy *= Math.pow(0.01, dt);
      e.x = Math.max(e.radius, Math.min(MAP_W - e.radius, e.x));
      e.y = Math.max(e.radius, Math.min(MAP_H - e.radius, e.y));

      // 接觸傷害(每秒 1 Tick,雙向)
      e.touchCd -= dt;
      const touching = dist(e.x, e.y, this.px, this.py) < e.radius + this.squadR;
      if (touching && e.touchCd <= 0) {
        e.touchCd = 1;
        // Boss 近身極痛(逼走位),小隊碰撞對 Boss 有韌性折減(逼用武器輸出)
        const contactAtk = e.boss === "cola" ? 420 : e.boss === "guardian" ? 260 : e.def.stats.atk;
        if (contactAtk > 0) this.damagePlayer(contactAtk * e.dmgMult);
        this.damageEnemy(e, st.contactAtk() * (e.boss ? 0.3 : 0.8), now);
        if (e.def.tier === 0 || e.def.tier === 2) e.aggro = true;
      }
    }

    // 敵人彼此輕度分離
    for (let i = 0; i < this.enemies.length; i++) {
      const a = this.enemies[i];
      if (a.hp <= 0) continue;
      for (let j = i + 1; j < this.enemies.length; j++) {
        const b = this.enemies[j];
        if (b.hp <= 0) continue;
        const d = dist(a.x, a.y, b.x, b.y);
        const min = (a.radius + b.radius) * 0.85;
        if (d > 0 && d < min) {
          const push = (min - d) / 2;
          const nx = (b.x - a.x) / d, ny = (b.y - a.y) / d;
          a.x -= nx * push; a.y -= ny * push;
          b.x += nx * push; b.y += ny * push;
        }
      }
    }

    this.enemies = this.enemies.filter((e) => e.hp > 0);
  }

  private enemyFire(e: Enemy, family: Family, now: number): void {
    const base = WEAPON_BASE[family];
    const control = resolveControl(e.def);
    const dx = this.px - e.x, dy = this.py - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const nx = dx / d, ny = dy / d;
    const spd = Math.min(base.speed * BULLET_SPEED_SCALE, 640);
    // 低階怪的子彈傷害折減:單發武器數值是照玩家基準搬的,直接用會壓死前期單隊長
    const tierDmgMult = e.def.tier <= 1 ? 0.38 : e.def.tier === 2 ? 0.7 : e.def.tier === 3 ? 1.3 : 1.6;
    const dmg = base.damage * e.dmgMult * tierDmgMult;
    const push = (ang: number, kind: Projectile["kind"], r: number, life: number) => {
      const ca = Math.cos(ang), sa = Math.sin(ang);
      this.projectiles.push({
        uid: UID++, side: "enemy", family, kind,
        x: e.x + nx * (e.radius + 8), y: e.y + ny * (e.radius + 8),
        vx: (nx * ca - ny * sa) * spd, vy: (nx * sa + ny * ca) * spd,
        damage: dmg, weight: base.weight, r, age: 0, life,
        control, hit: new Set(),
        arcDir: kind === "wave" ? Math.atan2(ny, nx) + ang : undefined,
        arcSpan: kind === "wave" ? 0.9 : undefined,
      });
    };
    switch (family) {
      case "multishot":
        for (let i = 0; i < 5; i++) push((i / 4 - 0.5) * 0.8, "bullet", 11, 1.1);
        break;
      case "straight":
        push(0, "bullet", 12, 1.7);
        break;
      case "shield":
        push(0, "wave", 52, 2.2);
        break;
      case "mine":
        push((this.rnd() - 0.5) * 0.6, "mine", 26, 4.5);
        break;
      default:
        push(0, "bullet", 12, 1.5);
    }
  }

  // ---------- 傷害與死亡 ----------

  damageEnemy(e: Enemy, dmg: number, now: number): void {
    if (e.hp <= 0) return;
    e.hp -= dmg;
    this.state.stats.damageDealt += dmg;
    this.floats.push({ x: e.x + (this.rnd() - 0.5) * 40, y: e.y - e.radius - 8, text: String(Math.round(dmg)), color: "#ffe08a", age: 0 });
    if (e.def.tier === 0 || (e.def.tier === 2 && e.def.nonHostileInitially)) e.aggro = true;
    if (e.hp <= 0) this.onEnemyKilled(e, now);
  }

  private onEnemyKilled(e: Enemy, now: number): void {
    const st = this.state;
    st.stats.kills++;
    const tier = e.def.tier;
    // 原石
    const gems = TIER_GEMS[tier] + Math.floor(this.rnd() * 4);
    if (gems > 0) this.drops.push({ x: e.x, y: e.y, kind: "gems", amount: gems, age: 0 });
    // 生物材料(階梯掉落,見 戰鬥原語 TIER_DROP + AUDIT 縮減)
    const w = (e.world === "core" ? null : e.world) as World | null;
    if (w) {
      const shape = TIER_DROP[tier];
      // T0 是核心發育資源(怪物圖鑑 §T0),掉 2 份 1★ 普通
      const mainCount = tier === 0 ? 2 : shape.count;
      this.drops.push({ x: e.x + 20, y: e.y, kind: "material", amount: mainCount, world: w, star: shape.star, rarity: shape.rarity, age: 0 });
      if (tier === 1) {
        this.drops.push({ x: e.x - 22, y: e.y + 10, kind: "material", amount: 1, world: w, star: 2, rarity: "common", age: 0 });
        this.drops.push({ x: e.x + 6, y: e.y + 22, kind: "material", amount: 1, world: w, star: 1, rarity: "common", age: 0 });
      }
      if (tier === 2) {
        this.drops.push({ x: e.x - 22, y: e.y + 8, kind: "material", amount: 2, world: w, star: 1, rarity: "fine", age: 0 });
        if (st.progress[w].enraged) {
          if (this.rnd() < 0.3) this.drops.push({ x: e.x, y: e.y - 18, kind: "material", amount: 1, world: w, star: 3, rarity: "common", age: 0 });
          if (this.rnd() < 0.15) this.drops.push({ x: e.x + 8, y: e.y - 30, kind: "material", amount: 1, world: w, star: 3, rarity: "fine", age: 0 });
        }
      }
      if (tier === 3) {
        this.drops.push({ x: e.x - 30, y: e.y, kind: "material", amount: 2, world: w, star: 3, rarity: "common", age: 0 });
        this.drops.push({ x: e.x, y: e.y + 24, kind: "material", amount: 3, world: w, star: 2, rarity: "fine", age: 0 });
      }
      // 擊殺配額
      if (tier === 1) st.progress[w].t1Kills++;
      if (tier === 2) st.progress[w].t2Kills++;
    }

    if (e.boss === "guardian" && w) {
      st.progress[w].guardianDefeated = true;
      st.progress[w].enraged = true;
      st.sigils++;
      st.stats.bossKills++;
      this.toast(`🏆 擊敗${WORLD_LABEL_LOCAL[w]}守護者!取得晶核印記(${st.sigils}/4)。本世界進入狂暴狀態!`);
      if (st.sigils >= 4) this.toast("💠 四枚印記到手!前往中央廣場的 COLA 裝配儀,召喚最終 Boss!");
    }
    if (e.boss === "cola") {
      st.colaDefeated = true;
      st.stats.bossKills++;
      this.outcome = { result: "victory" };
    }
  }

  damagePlayer(dmg: number, ignoreInvuln = false): void {
    const st = this.state;
    if (!ignoreInvuln && st.timeSec < this.invulnUntil) return;
    st.hp -= dmg;
    this.lastHurtAt = st.timeSec;
    st.stats.damageTaken += dmg;
    if (st.hp <= 0) {
      st.applyDeathPenalty();
      if (st.deaths >= MAX_DEATHS) {
        st.hp = 0;
        this.outcome = { result: "defeat" };
        return;
      }
      // 中央廣場復活
      st.hp = st.maxHp;
      this.px = CX; this.py = CY + 140;
      this.invulnUntil = st.timeSec + 3;
      this.toast(`💀 小隊潰散!扣除 30% 原石,於中央廣場重新凝聚(剩餘機會 ${MAX_DEATHS - st.deaths})`);
    }
  }

  // ---------- 主動技能(Space) ----------

  castActiveSkill(): boolean {
    const st = this.state;
    const now = st.timeSec;
    if (this.skillCd > 0 || now < this.pSilenceUntil) return false;
    if (!st.energy.spend(SKILL_ENERGY_COST)) return false;
    this.skillCd = SKILL_COOLDOWN;
    const fx = 計算主動技能效果({
      captainId: st.captainId,
      playerPos: { x: this.px, y: this.py },
      facing: { x: this.facingX, y: this.facingY },
      monsters: this.enemies.map((e) => ({ pos: { x: e.x, y: e.y }, hp: e.hp })),
      nowMs: now * 1000,
    });
    if (fx.playerTeleportTo) {
      this.px = Math.max(this.squadR, Math.min(MAP_W - this.squadR, fx.playerTeleportTo.x));
      this.py = Math.max(this.squadR, Math.min(MAP_H - this.squadR, fx.playerTeleportTo.y));
    }
    if (fx.speedBuff) {
      this.speedBuffUntil = now + fx.speedBuff.durationMs / 1000;
      this.speedBuffMult = fx.speedBuff.mult;
    }
    if (fx.slowField) {
      this.slowFields.push({
        x: fx.slowField.center.x, y: fx.slowField.center.y,
        r: fx.slowField.radius, until: now + fx.slowField.durationMs / 1000,
        mult: fx.slowField.mult, side: "enemy",
      });
    }
    if (fx.pulls) {
      for (const pull of fx.pulls) {
        const e = this.enemies[pull.index];
        if (e) { e.x = pull.to.x; e.y = pull.to.y; }
      }
    }
    this.floats.push({ x: this.px, y: this.py - this.squadR - 40, text: fx.label, color: "#9fd8ff", age: 0 });
    return true;
  }

  // ---------- 設施互動 ----------

  /** 召喚世界守護者(在祭壇按 E) */
  summonGuardian(w: World): boolean {
    const st = this.state;
    const p = st.progress[w];
    if (p.guardianSummoned || p.guardianDefeated) return false;
    if (p.t1Kills < QUOTA_T1 || p.t2Kills < QUOTA_T2) return false;
    const def = worldGuardian(w);
    if (!def) return false;
    p.guardianSummoned = true;
    const qc = QUADRANT_CENTER[w];
    const g = this.makeEnemy(def, qc.x + 200, qc.y + 200, "guardian");
    g.aggro = true;
    this.enemies.push(g);
    this.toast(`🔥 ${WORLD_LABEL_LOCAL[w]}守護者「${def.nameZh}」降臨!`);
    return true;
  }

  /** 召喚 COLA(中央裝配儀按 E,需四印記) */
  summonCola(): boolean {
    const st = this.state;
    if (st.colaSummoned || st.sigils < 4) return false;
    st.colaSummoned = true;
    const def = finalBoss();
    const c = this.makeEnemy(def, CX, CY - 320, "cola");
    c.aggro = true;
    this.enemies.push(c);
    this.toast("👁 中央生命晶格組裝體 COLA 甦醒了 —— 擊敗它,終結這場輪迴!");
    return true;
  }

  /** 開啟禪繞寶箱(消耗 50% 最大能量) */
  openChest(c: Chest): boolean {
    const st = this.state;
    const snap = st.energy.snapshot();
    const cost = snap.max * 0.5;
    if (!st.energy.spend(cost)) {
      this.toast("能量不足(需要最大能量的 50%)");
      return false;
    }
    c.opened = true;
    const gems = 150 + Math.floor(this.rnd() * 151);
    st.gems += gems;
    st.stats.gemsEarned += gems;
    st.stats.chestsOpened++;
    const w = worldAt(c.x, c.y);
    const star = this.rnd() < 0.5 ? 1 : 2;
    st.addMaterial(w, star as 1 | 2, this.rnd() < 0.5 ? "common" : "fine", 2);
    this.toast(`📦 禪繞寶箱:+${gems} 原石、+2 份${WORLD_LABEL_LOCAL[w]}材料`);
    return true;
  }

  /** 目前遊戲階段(音樂/HUD 用) */
  phase(): "early" | "mid" | "late" | "showdown" {
    if (this.state.colaSummoned && !this.state.colaDefeated) return "showdown";
    if (this.state.timeSec >= EROSION_START) return "late";
    if (this.state.timeSec >= 270 || this.state.sigils >= 1) return "mid";
    return "early";
  }

  erosionStartsIn(): number {
    return Math.max(0, EROSION_START - this.state.timeSec);
  }
}

const WORLD_LABEL_LOCAL: Record<World, string> = {
  geometry: "幾何世界", organic: "有機世界", fractal: "分形世界", mechanical: "機械世界",
};
