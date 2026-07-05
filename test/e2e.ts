/**
 * @file e2e.ts
 * @description 端到端自動通關測試:一個簡單 bot 直接驅動 Sim,
 *              走完「發育 → 解鎖成員 → 升星 → 四守護者 → COLA → 勝利」全鏈。
 *              目的:證明重製版可完整通關(不是 prototype)。
 *
 *              執行:npm run test:e2e
 */

import { RunState, QUOTA_T1, QUOTA_T2, type PotionKind } from "../src/game/state";
import { Sim, type Enemy } from "../src/game/sim";
import { generateLayout, WORLDS, QUADRANT_CENTER, CX, CY, type Facility } from "../src/game/world";
import type { World } from "../src/legacy/data/成員型別";
import { findMember } from "../src/legacy/data/成員資料庫";
import { MATERIALS } from "../src/legacy/data/素材資料庫";

const SEED = Number(process.env.SEED ?? 20260705);

/** 每種「星級_稀有度」的保留量:必須 ≥ 升星配方單次需求(5-3-1) */
const RESERVE: Record<string, number> = { "1_common": 8, "1_fine": 6, "2_common": 4, "2_fine": 6, "3_common": 4, "3_fine": 2 };
const DT = 1 / 30;
const TIME_BUDGET = 45 * 60; // 模擬 45 分鐘上限
const NEAR = 190; // 設施互動距離(相當於玩家按 E 的範圍)

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

function log(msg: string): void {
  console.log(msg);
}

// ============================================================
// Bot
// ============================================================

class Bot {
  sim: Sim;
  st: RunState;
  dest: { x: number; y: number } | null = null;
  lastLog = -60;
  retreating = false;
  lastWorkshopAt = -999;

  constructor(sim: Sim, st: RunState) {
    this.sim = sim;
    this.st = st;
  }

  facilities(kind: Facility["kind"]): Facility[] {
    return this.sim.layout.facilities.filter((f) => f.kind === kind);
  }

  nearestOf(list: Array<{ x: number; y: number }>): { x: number; y: number } | null {
    let best = null as { x: number; y: number } | null;
    let bd = Infinity;
    for (const o of list) {
      const d = dist(o.x, o.y, this.sim.px, this.sim.py);
      if (d < bd) { bd = d; best = o; }
    }
    return best;
  }

  /** 每 0.5 秒做一次決策 */
  decide(): void {
    const { sim, st } = this;
    const now = st.timeSec;

    // ---- 藥水 ----
    if (st.hp / st.maxHp < 0.45) {
      (["hpL", "hpS"] as PotionKind[]).some((k) => st.usePotion(k));
    }
    // ---- 主動技能:有敵人接近就放 ----
    const nearEnemy = sim.enemies.some((e) => e.hp > 0 && dist(e.x, e.y, sim.px, sim.py) < 700);
    if (nearEnemy) sim.castActiveSkill();

    // ---- 設施機會主義 ----
    for (const f of sim.layout.facilities) {
      const d = dist(f.x, f.y, sim.px, sim.py);
      if (d > NEAR) continue;
      if (f.kind === "statue" && f.memberId && st.canUnlock(f.memberId).ok) {
        st.unlockMember(f.memberId);
        const def = findMember(f.memberId)!;
        log(`  [${fmt(now)}] 解鎖成員 ${def.nameZh}(${def.family})— 小隊 ${st.members.length} 人,總星 ${st.totalMemberStars()}`);
      }
      if (f.kind === "workshop") this.doWorkshop(f.world as World, now);
      if (f.kind === "shop") this.doShop();
    }

    // ---- 撤退邏輯:血量低就拉開距離等脫戰回血(Boss 戰不撤,靠藥水硬扛)----
    const boss = sim.enemies.find((e) => e.boss && e.hp > 0);
    const hpRatio = st.hp / st.maxHp;
    if (!boss) {
      if (this.retreating && hpRatio > 0.85) this.retreating = false;
      if (!this.retreating && hpRatio < 0.5) this.retreating = true;
      if (this.retreating) {
        const foe = this.nearestOf(sim.enemies.filter((e) => e.hp > 0 && e.aggro));
        if (foe) {
          const dx = sim.px - foe.x, dy = sim.py - foe.y;
          const d = Math.hypot(dx, dy) || 1;
          this.dest = {
            x: Math.max(300, Math.min(6900, sim.px + (dx / d) * 900)),
            y: Math.max(300, Math.min(6900, sim.py + (dy / d) * 900)),
          };
          return;
        }
        this.dest = null;
        return;
      }
    }

    // ---- Boss 優先:繞圈風箏(Boss 近身極痛,武器會自動開火)----
    if (boss) {
      const ang = Math.atan2(sim.py - boss.y, sim.px - boss.x) + 0.5;
      this.dest = { x: boss.x + Math.cos(ang) * 640, y: boss.y + Math.sin(ang) * 640 };
      return;
    }

    // ---- COLA 召喚(等成型再開,對應建議總星)----
    const dmgFamilies = (["multishot", "straight", "mine"] as const).filter((f) => st.weaponStar(f) > 0).length;
    if (st.sigils >= 4 && !st.colaSummoned && st.totalMemberStars() >= 12 && dmgFamilies >= 2) {
      this.dest = { x: CX, y: CY };
      if (dist(CX, CY, sim.px, sim.py) < NEAR + 130) {
        sim.summonCola();
        log(`  [${fmt(now)}] 召喚 COLA!小隊:${st.members.length} 人 / 總星 ${st.totalMemberStars()} / HP ${Math.round(st.hp)}/${st.maxHp}`);
      }
      return;
    }

    // ---- 世界推進:先掃各世界配額(順便跨世界收材料/成員),有輸出武器後回頭打守護者 ----
    // 只有護盾波(低 DPS)不足以打穿 Boss 韌性;要求至少一個輸出系家族啟用
    const hasWeapon =
      (["multishot", "straight", "mine"] as const).some((f) => st.weaponStar(f) > 0) &&
      st.totalMemberStars() >= 6;
    const quotaUnmet = WORLDS.filter((w) => {
      const q = st.progress[w];
      return !q.guardianDefeated && (q.t1Kills < QUOTA_T1 || q.t2Kills < QUOTA_T2);
    });
    const summonable = WORLDS.find((w) => {
      const q = st.progress[w];
      return !q.guardianDefeated && !q.guardianSummoned && q.t1Kills >= QUOTA_T1 && q.t2Kills >= QUOTA_T2;
    });

    // 可召喚且已有武器 → 去祭壇
    if (summonable && hasWeapon) {
      const altar = this.facilities("altar").find((f) => f.world === summonable)!;
      this.dest = { x: altar.x, y: altar.y };
      if (dist(altar.x, altar.y, sim.px, sim.py) < NEAR) {
        sim.summonGuardian(summonable);
        log(`  [${fmt(now)}] 召喚 ${summonable} 守護者(總星 ${st.totalMemberStars()},HP ${Math.round(st.hp)}/${st.maxHp})`);
      }
      return;
    }

    // 否則挑下一個配額未滿的世界農(自然帶動跨世界解鎖)
    const targetWorld = quotaUnmet[0] ?? WORLDS.find((w) => !st.progress[w].guardianDefeated);
    if (!targetWorld) return;
    const p = st.progress[targetWorld];

    // ---- 升星可行/有可熔材料時才跑工坊(避免在工坊旁無限震盪)----
    const upgradable = st.members.some((m) => st.canUpgrade(m).ok);
    const meltable = this.meltableSurplus();
    const workshopCooldown = now - this.lastWorkshopAt < 45;
    if (upgradable || (meltable > 10 && !workshopCooldown)) {
      const ws = this.nearestOf(this.facilities("workshop"));
      if (ws && dist(ws.x, ws.y, sim.px, sim.py) > NEAR * 0.8) {
        this.dest = ws;
        return;
      }
    }

    // ---- 可解鎖成員 → 跑對應雕像 ----
    const unlockTarget = this.pickUnlockStatue();
    if (unlockTarget) { this.dest = unlockTarget; return; }

    // ---- 農怪:優先打「落單」目標,避免一頭撞進怪堆 ----
    const wantT2 = p.t1Kills >= QUOTA_T1;
    const candidates = sim.enemies.filter((e) => {
      if (e.hp <= 0 || e.world !== targetWorld) return false;
      if (wantT2) return e.def.tier === 2 || e.def.tier === 0;
      return e.def.tier <= 1;
    });
    const isolation = (e: Enemy) =>
      sim.enemies.filter((o) => o !== e && o.hp > 0 && o.def.tier >= 1 && dist(o.x, o.y, e.x, e.y) < 420).length;
    candidates.sort((a, b) => {
      const ia = isolation(a), ib = isolation(b);
      if (ia !== ib) return ia - ib;
      return dist(a.x, a.y, sim.px, sim.py) - dist(b.x, b.y, sim.px, sim.py);
    });
    if (candidates.length > 0) { this.dest = candidates[0]; return; }
    // 沒怪:走去象限中心等刷
    this.dest = QUADRANT_CENTER[targetWorld];
  }

  /** 超出保留量、真正可熔的材料份數 */
  meltableSurplus(): number {
    let total = 0;
    for (const m of MATERIALS) {
      const key = `${m.star}_${m.rarity}`;
      const keep = RESERVE[key] ?? 2;
      total += Math.max(0, (this.st.materials.get(m.id) ?? 0) - keep);
    }
    return total;
  }

  pickUnlockStatue(): { x: number; y: number } | null {
    const { st } = this;
    if (st.members.length >= 8) return null;
    // 優先:讓某家族湊到 2 人啟用武器
    const famCount = new Map<string, number>();
    for (const m of st.members) famCount.set(m.def.family, (famCount.get(m.def.family) ?? 0) + 1);
    const statues = this.facilities("statue").filter((f) => f.memberId && st.canUnlock(f.memberId).ok);
    if (statues.length === 0) return null;
    const score = (f: Facility): number | null => {
      const fam = findMember(f.memberId!)!.family;
      if (fam === "laser") return null; // 激光家族本階段無武器,bot 不收(人類玩家可收作數值補強)
      const n = famCount.get(fam) ?? 0;
      if (n === 1) return 0; // 湊到 2 人啟用武器,最優先
      if (n === 0) return 1;
      return 2;
    };
    const scored = statues.filter((f) => score(f) !== null);
    if (scored.length === 0) return null;
    statues.length = 0;
    statues.push(...scored);
    statues.sort((a, b) => {
      const sa = score(a)!, sb = score(b)!;
      if (sa !== sb) return sa - sb;
      return dist(a.x, a.y, this.sim.px, this.sim.py) - dist(b.x, b.y, this.sim.px, this.sim.py);
    });
    return statues[0];
  }

  doWorkshop(world: World, now: number): void {
    const { st } = this;
    this.lastWorkshopAt = now;
    // 熔煉:保留每世界基本配方量,其餘熔給「星級最低成員」的家族
    const lowest = [...st.members].sort((a, b) => a.star - b.star)[0];
    const fam = lowest?.def.family ?? "straight";
    for (const mat of MATERIALS) {
      const key = `${mat.star}_${mat.rarity}`;
      let have = st.materials.get(mat.id) ?? 0;
      const keep = RESERVE[key] ?? 2;
      while (have > keep) {
        if (!st.meltMaterial(mat, fam, mat.world === world)) break;
        have--;
      }
    }
    // 升星
    for (const m of st.members) {
      while (st.canUpgrade(m).ok) {
        st.upgradeMember(m);
        log(`  [${fmt(now)}] ${m.def.nameZh} 升至 ${m.star}★(隊長 ${st.captainStar}★,總星 ${st.totalMemberStars()})`);
      }
    }
  }

  doShop(): void {
    const { st } = this;
    while (st.gems > 260 && st.potions.hpL < 3) {
      if (!st.buyPotion("hpL")) break;
    }
    while (st.gems > 120 && st.potions.hpS < 3) {
      if (!st.buyPotion("hpS")) break;
    }
  }

  input(): { moveX: number; moveY: number } {
    if (!this.dest) return { moveX: 0, moveY: 0 };
    const dx = this.dest.x - this.sim.px;
    const dy = this.dest.y - this.sim.py;
    const d = Math.hypot(dx, dy);
    if (d < 40) return { moveX: 0, moveY: 0 };
    return { moveX: dx / d, moveY: dy / d };
  }
}

function fmt(sec: number): string {
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ============================================================
// 主測試
// ============================================================

function runVictoryTest(): boolean {
  log(`\n=== E2E 通關測試(seed ${SEED})===`);
  const st = new RunState("conductor");
  const sim = new Sim(st, generateLayout(SEED), SEED);
  const bot = new Bot(sim, st);

  let steps = 0;
  while (st.timeSec < TIME_BUDGET && !sim.outcome) {
    if (steps % 15 === 0) bot.decide();
    sim.update(DT, bot.input());
    sim.toasts.length = 0;
    steps++;
    if (st.timeSec - bot.lastLog >= 120) {
      bot.lastLog = st.timeSec;
      const q = WORLDS.map((w) => {
        const p = st.progress[w];
        return `${w.slice(0, 3)}:${p.guardianDefeated ? "✓" : `${p.t1Kills}/${QUOTA_T1},${p.t2Kills}/${QUOTA_T2}`}`;
      }).join(" ");
      log(`[${fmt(st.timeSec)}] HP ${Math.round(st.hp)}/${st.maxHp} 隊${st.members.length} 星${st.totalMemberStars()} 死${st.deaths} 💎${st.gems} 印${st.sigils} | ${q}`);
    }
  }

  const oc = sim.outcome;
  log(`\n結果:${oc ? oc.result : "超時未分勝負"} @ ${fmt(st.timeSec)}`);
  log(`統計:擊殺 ${st.stats.kills}(Boss ${st.stats.bossKills})· 成員 ${st.members.length} · 總星 ${st.totalMemberStars()} · 死亡 ${st.deaths} · 升星 ${st.stats.starUps}`);
  return oc?.result === "victory";
}

function runDefeatTest(): boolean {
  log(`\n=== E2E 敗北測試 ===`);
  const st = new RunState("architect");
  const sim = new Sim(st, generateLayout(SEED + 1), SEED + 1);
  for (let i = 0; i < 3; i++) {
    sim.update(DT, { moveX: 0, moveY: 0 });
    sim.damagePlayer(st.maxHp + 1, true);
  }
  const ok = sim.outcome?.result === "defeat" && st.deaths === 3;
  log(`三次全滅 → ${sim.outcome?.result}(死亡數 ${st.deaths})${ok ? " ✓" : " ✗"}`);
  return ok;
}

const defeatOk = runDefeatTest();
const victoryOk = runVictoryTest();
if (!defeatOk || !victoryOk) {
  console.error(`\n測試失敗:defeat=${defeatOk} victory=${victoryOk}`);
  process.exit(1);
}
console.log("\n✅ 全部通過:重製版可通關、可敗北、勝敗迴路成立。");
