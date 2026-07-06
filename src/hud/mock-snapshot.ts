/**
 * @file mock-snapshot.ts
 * @description 模擬戰鬥中的 HudSnapshot,用於 HUD 骨架獨立運行測試。
 *              提供會自動變動的狀態(血量起伏、能量回復、冷卻、充能、週期受擊),
 *              讓 HUD 所有元件都能被觀察到實際運作。
 *
 *              這是「測試用假資料來源」,正式戰鬥系統上線後會被取代。
 */

import type {
  HudSnapshot,
  PotionItem,
  PeriodicSkillState,
  RosterMember,
  WeaponGroupState,
  WeaponFamily,
} from "./types";
import { ACTIVE_SKILL_DEFS, CaptainActiveSkill } from "../captain/隊長主動技能";
import { EnergySystem } from "../skills/能量系統";

const LAYERS = ["inner", "middle", "outer"] as const;
const ROLES = ["protect", "firepower", "supply"] as const;

export class MockSnapshotSource {
  private hp = 0.85;
  private shield = 0.2;
  private moving = false;
  private lastHitAt = 0;
  private tickProgress = 0;
  private tickPulseAt = 0;
  private t = 0; // 模擬時間秒
  private readonly energySystem = new EnergySystem({
    max: 100,
    initial: 60,
    regenPerSecond: 5,
  });
  private readonly activeSkill = new CaptainActiveSkill(
    ACTIVE_SKILL_DEFS.conductor,
    this.energySystem,
  );

  private weapons: WeaponGroupState[] = [
    { family: "shield", star: 2, cooldownRatio: 0.6, active: true, disabledByRoster: false },
    { family: "straight", star: 1, cooldownRatio: 0.3, active: true, disabledByRoster: false },
    { family: "mine", star: 3, cooldownRatio: 0.9, active: true, disabledByRoster: false },
    { family: "multishot", star: 1, cooldownRatio: 0.1, active: false, disabledByRoster: true },
  ];

  private periodics: PeriodicSkillState[] = [
    { id: "p1", label: "狂暴狀態", chargeRatio: 0.3, kind: "periodic" },
    { id: "p2", label: "震盪波", chargeRatio: 0.85, kind: "periodic" },
    { id: "a1", label: "閃電連鎖", chargeRatio: 0.5, kind: "auto" },
    { id: "a2", label: "微縮風暴", chargeRatio: 1.0, kind: "auto" },
  ];

  private potions: PotionItem[] = [
    { id: "hp_s", label: "小生命藥水", size: "small", effect: "hp", count: 3 },
    { id: "hp_b", label: "大生命藥水", size: "big", effect: "hp", count: 1 },
    { id: "en_s", label: "小能量藥水", size: "small", effect: "energy", count: 2 },
    { id: "hy_b", label: "大混合藥水", size: "big", effect: "hybrid", count: 1 },
  ];

  private roster: RosterMember[] = [
    { id: "m1", label: "稜鏡", layer: "inner", role: "protect", hpCurrent: 1710, hpMax: 1900, hpRatio: 0.9, shielded: true, dead: false, ailments: [] },
    { id: "m2", label: "向量", layer: "middle", role: "firepower", hpCurrent: 810, hpMax: 1800, hpRatio: 0.45, shielded: false, dead: false, ailments: ["燃燒"] },
    { id: "m3", label: "節點", layer: "outer", role: "firepower", hpCurrent: 380, hpMax: 1900, hpRatio: 0.2, shielded: false, dead: false, ailments: [] },
    { id: "m4", label: "荊棘", layer: "outer", role: "protect", hpCurrent: 1330, hpMax: 1900, hpRatio: 0.7, shielded: false, dead: false, ailments: [] },
    { id: "m5", label: "孢粉", layer: "middle", role: "supply", hpCurrent: 0, hpMax: 1700, hpRatio: 0.0, shielded: false, dead: true, ailments: [] },
    { id: "m6", label: "光錐", layer: "inner", role: "supply", hpCurrent: 1520, hpMax: 1900, hpRatio: 0.8, shielded: false, dead: false, ailments: [] },
    { id: "m7", label: "閘門", layer: "outer", role: "protect", hpCurrent: 1045, hpMax: 1900, hpRatio: 0.55, shielded: false, dead: false, ailments: ["減速"] },
  ];

  /** 切換武器群組啟用狀態(由 toggle_weapon 事件觸發) */
  toggleWeapon(family: WeaponFamily): void {
    const w = this.weapons.find((x) => x.family === family);
    if (w && !w.disabledByRoster) w.active = !w.active;
  }

  /** 使用藥水(簡化:只扣數量) */
  usePotion(potionId: string): void {
    const p = this.potions.find((x) => x.id === potionId);
    if (!p || p.count <= 0) return;
    p.count -= 1;
    // 假裝生效
    if (p.effect === "hp") this.hp = Math.min(1, this.hp + (p.size === "big" ? 0.5 : 0.2));
    if (p.effect === "energy") this.energySystem.restore(p.size === "big" ? 75 : 30);
    if (p.effect === "hybrid") {
      this.hp = Math.min(1, this.hp + (p.size === "big" ? 0.4 : 0.15));
      this.energySystem.restore(p.size === "big" ? 50 : 20);
    }
  }

  /** 觸發主動技能(由 cast_active 事件觸發) */
  castActive(): void {
    this.activeSkill.tryCast();
  }

  /** 設定移動狀態(WASD 測試) */
  setMoving(m: boolean): void {
    this.moving = m;
  }

  /** 模擬一次受擊 */
  takeHit(): void {
    this.hp = Math.max(0, this.hp - 0.08);
    this.lastHitAt = Date.now();
  }

  /** 產生當前快照 */
  snapshot(): HudSnapshot {
    const energy = this.energySystem.snapshot();
    const active = this.activeSkill.snapshot();

    return {
      captainId: "conductor",
      captainColor: "#3b82f6",
      captainPortraitUrl: "/assets/images/ui/hud/conductor-codex-head.png",
      captainStar: 1,
      hpCurrent: Math.round(this.hp * 1000),
      hpMax: 1000,
      hpRatio: this.hp,
      shieldRatio: this.shield,
      energyCurrent: energy.current,
      energyMax: energy.max,
      energyRatio: energy.ratio,
      active,
      weapons: this.weapons.map((w) => ({ ...w })),
      periodics: this.periodics.map((p) => ({ ...p })),
      formation: this.buildFormation(),
      lastHitAt: this.lastHitAt,
      moving: this.moving,
      tickProgress: this.tickProgress,
      tickPulseAt: this.tickPulseAt,
      potions: this.potions.filter((p) => p.count > 0).map((p) => ({ ...p })),
      roster: this.roster.map((m) => ({ ...m })),
      layerRoster: {
        inner: this.roster.find((member) => member.layer === "inner") ?? null,
        middle: this.roster.find((member) => member.layer === "middle") ?? null,
        outer: this.roster.find((member) => member.layer === "outer") ?? null,
      },
      partyVitals: [
        { id: "conductor", label: "隊長", current: Math.round(this.hp * 1000), max: 1000, ratio: this.hp, star: 1, isCaptain: true },
        ...this.roster.map((member) => ({
          id: member.id,
          label: member.label,
          current: member.hpCurrent,
          max: member.hpMax,
          ratio: member.hpRatio,
          star: member.star ?? 1,
          isCaptain: false,
          layer: member.layer,
          role: member.role,
        })),
      ],
    };
  }

  private buildFormation(): HudSnapshot["formation"] {
    const grid = {} as HudSnapshot["formation"];
    for (const layer of LAYERS) {
      grid[layer] = {} as any;
      for (const role of ROLES) {
        const m = this.roster.find(
          (r) => r.layer === layer && r.role === role && !r.dead,
        );
        grid[layer][role] = m
          ? {
              occupied: true,
              hpRatio: m.hpRatio,
              shielded: m.shielded,
              dead: false,
              label: m.label.slice(0, 2),
            }
          : // 模擬「曾有但已死」的虛線槽位(只標記一個位置)
            layer === "outer" && role === "supply"
            ? { occupied: true, hpRatio: 0, shielded: false, dead: true, label: "" }
            : { occupied: false, hpRatio: 0, shielded: false, dead: false, label: "" };
      }
    }
    return grid;
  }

  /** 每幀推進模擬(dt 秒) */
  tick(dt: number): void {
    this.t += dt;
    this.energySystem.tick(dt);
    this.activeSkill.tick(dt);
    // 武器冷卻循環
    for (const w of this.weapons) {
      if (w.active && !w.disabledByRoster) {
        w.cooldownRatio = (w.cooldownRatio + dt * 0.4) % 1;
      }
    }
    // 週期充能循環
    for (const p of this.periodics) {
      const speed = p.kind === "periodic" ? 0.25 : 0.18;
      p.chargeRatio = (p.chargeRatio + dt * speed) % 1.05;
      if (p.chargeRatio > 1) p.chargeRatio = 1; // 滿了等待觸發
    }
    this.tickProgress += dt;
    while (this.tickProgress >= 1) {
      this.tickProgress -= 1;
      this.tickPulseAt = Date.now();
      this.hp = Math.max(0, this.hp - 0.03);
      this.lastHitAt = this.tickPulseAt;
    }
    // 護盾緩慢衰減
    this.shield = Math.max(0, this.shield - dt * 0.01);
    // 模擬隊員生命緩慢浮動(讓狀態條看起來活生生)
    for (const m of this.roster) {
      if (m.dead) continue;
      // 不主動扣血(由 takeHit 控制),但有微小回復
      m.hpRatio = Math.min(1, m.hpRatio + dt * 0.005);
      m.hpCurrent = Math.round(m.hpMax * m.hpRatio);
    }
  }
}
