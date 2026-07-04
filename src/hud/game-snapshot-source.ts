import { ACTIVE_SKILL_DEFS, CaptainActiveSkill } from "../captain/隊長主動技能";
import { EnergySystem } from "../skills/能量系統";
import { 隊長清單 } from "../ui/資料/隊長清單";
import {
  手動設定訓練玩家生命,
  取得訓練道場摘要,
} from "../ui/訓練道場狀態";
import {
  手動設定正式玩家生命,
  取得正式小隊摘要,
} from "../ui/正式對局小隊狀態";
import { MEMBERS } from "../data/成員資料庫";
import type { CaptainId, WeaponFamily } from "../data/戰鬥原語";
import type {
  HudSnapshot,
  Layer,
  PeriodicSkillState,
  PotionItem,
  Role,
  RosterMember,
  WeaponGroupState,
} from "./types";

type SnapshotMode = "dojo" | "formal";

const LAYER_ORDER: Layer[] = ["inner", "middle", "outer"];
const ROLE_ORDER: Role[] = ["protect", "firepower", "supply"];
const FAMILY_ORDER: WeaponFamily[] = ["shield", "multishot", "straight", "mine", "laser"];
const STATIC_POTIONS: PotionItem[] = [
  { id: "hp_s", label: "小生命藥水", size: "small", effect: "hp", count: 3 },
  { id: "hp_b", label: "大生命藥水", size: "big", effect: "hp", count: 1 },
  { id: "en_s", label: "小能量藥水", size: "small", effect: "energy", count: 2 },
  { id: "hy_b", label: "大混合藥水", size: "big", effect: "hybrid", count: 1 },
];

interface RosterRuntime {
  playerHp: number;
  playerMaxHp: number;
  captainId: CaptainId;
  roster: RosterMember[];
  familyStars: Record<WeaponFamily, number[]>;
}

function captainColor(captainId: CaptainId): string {
  return 隊長清單.find((captain) => captain.id === captainId)?.代表色 ?? "#3b82f6";
}

function slotToLayerRole(slotId: number): { layer: Layer; role: Role } {
  const layer = LAYER_ORDER[Math.max(0, Math.min(2, Math.floor(slotId / 3)))] ?? "outer";
  const role = ROLE_ORDER[slotId % 3] ?? "protect";
  return { layer, role };
}

export class GameSnapshotSource {
  private moving = false;
  private lastHitAt = 0;
  private lastPlayerHp = 0;
  private captainId: CaptainId = "conductor";
  private readonly energySystem = new EnergySystem({
    max: 100,
    initial: 60,
    regenPerSecond: 5,
  });
  private activeSkill = new CaptainActiveSkill(ACTIVE_SKILL_DEFS.conductor, this.energySystem);
  private weapons: WeaponGroupState[] = FAMILY_ORDER.map((family, index) => ({
    family,
    star: (index < 4 ? (1 + (index % 3)) : 1) as 1 | 2 | 3,
    cooldownRatio: 1,
    active: family !== "laser",
    disabledByRoster: family === "laser",
  }));
  private readonly periodics: PeriodicSkillState[] = [
    { id: "p_move", label: "步調循環", chargeRatio: 0.2, kind: "periodic" },
    { id: "p_guard", label: "陣形維持", chargeRatio: 0.55, kind: "periodic" },
    { id: "a_auto", label: "自動施法", chargeRatio: 0.35, kind: "auto" },
    { id: "a_focus", label: "武裝連動", chargeRatio: 0.8, kind: "auto" },
  ];
  private readonly potions: PotionItem[] = STATIC_POTIONS.map((potion) => ({ ...potion }));

  setMoving(moving: boolean): void {
    this.moving = moving;
  }

  tick(dt: number): void {
    this.energySystem.tick(dt);
    this.activeSkill.tick(dt);
    for (const weapon of this.weapons) {
      if (weapon.active && !weapon.disabledByRoster) {
        weapon.cooldownRatio = (weapon.cooldownRatio + dt * 0.35) % 1;
      } else if (weapon.disabledByRoster) {
        weapon.cooldownRatio = Math.min(weapon.cooldownRatio, 0.15);
      }
    }
    for (const periodic of this.periodics) {
      const speed = periodic.kind === "periodic" ? (this.moving ? 0.42 : 0.18) : 0.14;
      periodic.chargeRatio += dt * speed;
      if (periodic.chargeRatio >= 1) periodic.chargeRatio -= 1;
    }
  }

  syncFromGame(mode: SnapshotMode): void {
    const runtime = this.readRuntime(mode);
    if (runtime.captainId !== this.captainId) {
      this.captainId = runtime.captainId;
      this.activeSkill = new CaptainActiveSkill(ACTIVE_SKILL_DEFS[this.captainId], this.energySystem);
    }
    if (this.lastPlayerHp > 0 && runtime.playerHp < this.lastPlayerHp) {
      this.lastHitAt = Date.now();
    }
    this.lastPlayerHp = runtime.playerHp;
    this.syncWeapons(runtime.familyStars);
  }

  toggleWeapon(family: WeaponFamily): void {
    const weapon = this.weapons.find((entry) => entry.family === family);
    if (weapon && !weapon.disabledByRoster) weapon.active = !weapon.active;
  }

  usePotion(mode: SnapshotMode, potionId: string): void {
    const potion = this.potions.find((entry) => entry.id === potionId);
    if (!potion || potion.count <= 0) return;
    potion.count -= 1;

    const isBig = potion.size === "big";
    if (potion.effect === "energy" || potion.effect === "hybrid") {
      this.energySystem.restore(isBig ? 50 : 25);
    }

    const current = mode === "dojo" ? 取得訓練道場摘要() : 取得正式小隊摘要();
    const currentHp = current.playerHp;
    const currentMax = current.playerMaxHp;
    if (potion.effect === "hp" || potion.effect === "hybrid") {
      const recovered = Math.round(currentMax * (isBig ? 0.45 : 0.2));
      const nextHp = Math.min(currentMax, currentHp + recovered);
      if (mode === "dojo") 手動設定訓練玩家生命(nextHp);
      else 手動設定正式玩家生命(nextHp);
    }
  }

  /**
   * 嘗試施放隊長主動技能。冷卻/能量的閘門在此（activeSkill.tryCast），
   * 成功後發出 `captain-active-cast` 事件，讓世界地圖層去套用實際效果（位移/拉近/減速/加速）。
   * @returns 是否真的放出（供呼叫端回饋 UI）。
   */
  castActive(): boolean {
    const ok = this.activeSkill.tryCast();
    if (ok) {
      window.dispatchEvent(
        new CustomEvent("captain-active-cast", { detail: { captainId: this.captainId } }),
      );
    }
    return ok;
  }

  /** 給驗收控制台顯示：目前隊長主動技能的能量/冷卻讀數。 */
  活動技能讀數() {
    const active = this.activeSkill.snapshot();
    const energy = this.energySystem.snapshot();
    return {
      captainId: this.captainId,
      label: active.label,
      energyRatio: energy.ratio,
      energyCurrent: energy.current,
      energyMax: energy.max,
      energyCost: active.energyCost,
      energyEnough: active.energyEnough,
      cooldownRatio: active.cooldownRatio,
      cooldownRemaining: active.cooldownRemaining,
      castable: active.energyEnough && active.cooldownRemaining <= 0 && !active.castLatency,
    };
  }

  snapshot(mode: SnapshotMode): HudSnapshot {
    const runtime = this.readRuntime(mode);
    const hpRatio = runtime.playerMaxHp > 0 ? runtime.playerHp / runtime.playerMaxHp : 0;
    return {
      captainColor: captainColor(runtime.captainId),
      hpRatio,
      shieldRatio: 0,
      energyRatio: this.energySystem.snapshot().ratio,
      active: this.activeSkill.snapshot(),
      weapons: this.weapons.map((weapon) => ({ ...weapon })),
      periodics: this.periodics.map((periodic) => ({ ...periodic })),
      formation: this.buildFormation(runtime.roster, hpRatio),
      lastHitAt: this.lastHitAt,
      moving: this.moving,
      potions: this.potions.filter((potion) => potion.count > 0).map((potion) => ({ ...potion })),
      roster: runtime.roster.map((member) => ({ ...member, ailments: [...member.ailments] })),
    };
  }

  private readRuntime(mode: SnapshotMode): RosterRuntime {
    if (mode === "dojo") {
      const summary = 取得訓練道場摘要();
      const familyStars = FAMILY_ORDER.reduce(
        (acc, family) => ({ ...acc, [family]: [] as number[] }),
        {} as Record<WeaponFamily, number[]>,
      );
      const roster = summary.members.map(({ slot, member, stats }) => {
        const { layer, role } = slotToLayerRole(slot.slotId);
        familyStars[member.family].push(slot.star);
        return {
          id: member.id,
          label: member.nameZh,
          layer,
          role,
          hpRatio: summary.playerMaxHp > 0 ? summary.playerHp / summary.playerMaxHp : 0,
          shielded: member.family === "shield",
          dead: summary.playerHp <= 0,
          ailments: summary.lastCollision ? ["碰撞中"] : [],
        } satisfies RosterMember;
      });
      return {
        playerHp: summary.playerHp,
        playerMaxHp: summary.playerMaxHp,
        captainId: summary.captainId,
        roster,
        familyStars,
      };
    }

    const summary = 取得正式小隊摘要();
    const familyStars = FAMILY_ORDER.reduce(
      (acc, family) => ({ ...acc, [family]: [] as number[] }),
      {} as Record<WeaponFamily, number[]>,
    );
    const roster = Array.from({ length: 9 }, (_, slotId) => slotId)
      .map((slotId) => {
        const member = MEMBERS[slotId];
        if (!member) return null;
        const { layer, role } = slotToLayerRole(slotId);
        familyStars[member.family].push(3);
        return {
          id: member.id,
          label: member.nameZh,
          layer,
          role,
          hpRatio: summary.playerMaxHp > 0 ? summary.playerHp / summary.playerMaxHp : 0,
          shielded: member.family === "shield",
          dead: summary.playerHp <= 0,
          ailments: [] as string[],
        } satisfies RosterMember;
      })
      .filter((member): member is RosterMember => member !== null);

    return {
      playerHp: summary.playerHp,
      playerMaxHp: summary.playerMaxHp,
      captainId: summary.captainId,
      roster,
      familyStars,
    };
  }

  private syncWeapons(familyStars: Record<WeaponFamily, number[]>): void {
    for (const weapon of this.weapons) {
      const stars = familyStars[weapon.family] ?? [];
      weapon.disabledByRoster = stars.length === 0;
      if (stars.length > 0) {
        weapon.star = Math.max(...stars) as 1 | 2 | 3;
      } else {
        weapon.star = 1;
        weapon.active = false;
      }
    }
  }

  private buildFormation(roster: RosterMember[], hpRatio: number): HudSnapshot["formation"] {
    const formation = {} as HudSnapshot["formation"];
    for (const layer of LAYER_ORDER) {
      formation[layer] = {} as HudSnapshot["formation"][Layer];
      for (const role of ROLE_ORDER) {
        const member = roster.find((entry) => entry.layer === layer && entry.role === role);
        formation[layer][role] = member
          ? {
              occupied: true,
              hpRatio: member.hpRatio,
              shielded: member.shielded,
              dead: member.dead,
              label: member.label.slice(0, 2),
            }
          : {
              occupied: false,
              hpRatio,
              shielded: false,
              dead: false,
              label: "",
            };
      }
    }
    return formation;
  }
}
