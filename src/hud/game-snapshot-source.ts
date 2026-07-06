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
import { statsAtStar } from "../data/成員型別";
import { captainStatsAtStar } from "../data/控制引擎";
import type { CaptainId, ControlStar, WeaponFamily } from "../data/戰鬥原語";
import { POTIONS, type PotionId } from "../economy/流浪商店";
import * as 背包 from "../economy/背包狀態";
import { 取得上陣養成, 當前隊長星級 } from "../progression/養成狀態";
import type {
  HudSnapshot,
  Layer,
  PartyVital,
  PeriodicSkillState,
  PotionItem,
  Role,
  RosterMember,
  WeaponGroupState,
} from "./types";
import { openChest, type ChestOpenResult, type ChestState } from "../economy/寶箱系統";
import { 應用程式狀態 } from "../ui/應用程式狀態";
import { 選文 } from "../ui/語系";

function 雙語(中文: string, 英文: string): string {
  return 選文(應用程式狀態.額外.語言, 中文, 英文);
}

function 藥水標籤(id: PotionId): string {
  return {
    hp_small: 雙語("小生命藥水", "Minor Life Potion"),
    hp_big: 雙語("大生命藥水", "Major Life Potion"),
    energy_small: 雙語("小能量藥水", "Minor Energy Potion"),
    energy_big: 雙語("大能量藥水", "Major Energy Potion"),
    hybrid_small: 雙語("小混合藥水", "Minor Hybrid Potion"),
    hybrid_big: 雙語("大混合藥水", "Major Hybrid Potion"),
  }[id];
}

function 成員顯示名(nameZh: string, nameEn: string): string {
  return 應用程式狀態.額外.語言 === "zh" ? nameZh : nameEn;
}

type SnapshotMode = "dojo" | "formal";

const LAYER_ORDER: Layer[] = ["inner", "middle", "outer"];
const ROLE_ORDER: Role[] = ["protect", "firepower", "supply"];
const FAMILY_ORDER: WeaponFamily[] = ["shield", "multishot", "straight", "mine", "laser"];
function 建立靜態藥水(): PotionItem[] {
  return [
    { id: "hp_small", label: 藥水標籤("hp_small"), size: "small", effect: "hp", count: 3 },
    { id: "hp_big", label: 藥水標籤("hp_big"), size: "big", effect: "hp", count: 1 },
    { id: "energy_small", label: 藥水標籤("energy_small"), size: "small", effect: "energy", count: 2 },
    { id: "hybrid_big", label: 藥水標籤("hybrid_big"), size: "big", effect: "hybrid", count: 1 },
  ];
}

interface RosterRuntime {
  playerHp: number;
  playerMaxHp: number;
  captainId: CaptainId;
  roster: RosterMember[];
  familyStars: Record<WeaponFamily, number[]>;
}

function captainPortraitUrl(captainId: CaptainId): string {
  if (captainId === "conductor") return "/assets/images/ui/hud/conductor-codex-head.png";
  return `/assets/transparent-portraits/captains/${captainId}_form4_head.png`;
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
    { id: "p_move", label: 雙語("步調循環", "Motion Loop"), chargeRatio: 0.2, kind: "periodic" },
    { id: "p_guard", label: 雙語("陣形維持", "Formation Hold"), chargeRatio: 0.55, kind: "periodic" },
    { id: "a_auto", label: 雙語("自動施法", "Auto Cast"), chargeRatio: 0.35, kind: "auto" },
    { id: "a_focus", label: 雙語("武裝連動", "Weapon Link"), chargeRatio: 0.8, kind: "auto" },
  ];
  private readonly potions: PotionItem[] = 建立靜態藥水().map((potion) => ({ ...potion }));
  private tickProgress = 0;
  private tickPulseAt = 0;
  private activeRoleIndex = 0;

  setMoving(moving: boolean): void {
    this.moving = moving;
  }

  /** 每次正式局或訓練局進場時，清除上一局的戰鬥消耗與冷卻。 */
  resetForRun(): void {
    this.moving = false;
    this.lastHitAt = 0;
    this.lastPlayerHp = 0;
    this.energySystem.reset();
    this.activeSkill = new CaptainActiveSkill(ACTIVE_SKILL_DEFS[this.captainId], this.energySystem);
    this.weapons.forEach((weapon) => {
      const index = FAMILY_ORDER.indexOf(weapon.family);
      weapon.star = (index < 4 ? (1 + (index % 3)) : 1) as 1 | 2 | 3;
      weapon.cooldownRatio = 1;
      weapon.active = weapon.family !== "laser";
      weapon.disabledByRoster = weapon.family === "laser";
    });
    const periodicRatios = [0.2, 0.55, 0.35, 0.8];
    this.periodics.forEach((periodic, index) => {
      periodic.chargeRatio = periodicRatios[index] ?? 0;
    });
    this.potions.splice(0, this.potions.length, ...建立靜態藥水().map((potion) => ({ ...potion })));
    this.tickProgress = 0;
    this.tickPulseAt = 0;
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

  setCombatTickProgress(progress: number): void {
    this.tickProgress = Math.max(0, Math.min(1, progress));
  }

  pulseCombatTick(): void {
    this.tickProgress = 0;
    this.tickPulseAt = Date.now();
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
    const id = potionId as PotionId;
    const def = POTIONS[id];
    if (!def) return;

    if (mode === "dojo") {
      const potion = this.potions.find((entry) => entry.id === potionId);
      if (!potion || potion.count <= 0) return;
      potion.count -= 1;
    } else if (!背包.花費藥水(id, 1)) {
      return;
    }

    if (def.energyRatio > 0) {
      this.energySystem.restore(this.energySystem.snapshot().max * def.energyRatio);
    }

    const current = mode === "dojo" ? 取得訓練道場摘要() : 取得正式小隊摘要();
    const currentHp = current.playerHp;
    const currentMax = current.playerMaxHp;
    if (def.hpRatio > 0) {
      const recovered = Math.round(currentMax * def.hpRatio);
      const nextHp = Math.min(currentMax, currentHp + recovered);
      if (mode === "dojo") 手動設定訓練玩家生命(nextHp);
      else 手動設定正式玩家生命(nextHp);
    }
  }

  cycleRosterRole(_mode: SnapshotMode, direction: -1 | 1): void {
    const next = this.activeRoleIndex + direction;
    this.activeRoleIndex = ((next % ROLE_ORDER.length) + ROLE_ORDER.length) % ROLE_ORDER.length;
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

  /** 以 HUD 使用中的同一份能量池開啟世界寶箱。 */
  openWorldChest(chest: ChestState): ChestOpenResult {
    const energy = this.energySystem.snapshot();
    const result = openChest(chest, energy.current, energy.max);
    if (result.ok) this.energySystem.spend(result.energySpent);
    return result;
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
    const energy = this.energySystem.snapshot();
    const captainStar = 當前隊長星級();
    const layerRoster = this.buildLayerRoster(runtime.roster);
    const partyVitals = this.buildPartyVitals(runtime, captainStar);
    return {
      captainId: runtime.captainId,
      captainColor: captainColor(runtime.captainId),
      captainPortraitUrl: captainPortraitUrl(runtime.captainId),
      captainStar,
      hpCurrent: runtime.playerHp,
      hpMax: runtime.playerMaxHp,
      hpRatio,
      shieldRatio: 0,
      energyCurrent: energy.current,
      energyMax: energy.max,
      energyRatio: energy.ratio,
      active: this.activeSkill.snapshot(),
      weapons: this.weapons.map((weapon) => ({ ...weapon })),
      periodics: this.periodics.map((periodic) => ({ ...periodic })),
      formation: this.buildFormation(runtime.roster, hpRatio),
      lastHitAt: this.lastHitAt,
      moving: this.moving,
      tickProgress: this.tickProgress,
      tickPulseAt: this.tickPulseAt,
      potions: mode === "formal"
        ? this.buildFormalPotions()
        : this.potions.filter((potion) => potion.count > 0).map((potion) => ({ ...potion })),
      roster: runtime.roster.map((member) => ({ ...member, ailments: [...member.ailments] })),
      layerRoster,
      partyVitals,
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
        const hpMax = stats.hp;
        const hpCurrent = Math.round(stats.hp * (summary.playerHp / (summary.playerMaxHp || 1)));
        return {
          id: member.id,
          label: 成員顯示名(member.nameZh, member.nameEn),
          star: slot.star,
          layer,
          role,
          hpCurrent,
          hpMax,
          hpRatio: hpMax > 0 ? hpCurrent / hpMax : 0,
          shielded: member.family === "shield",
          dead: hpCurrent <= 0,
          ailments: summary.lastCollision ? [雙語("碰撞中", "In Contact")] : [],
        } satisfies RosterMember as RosterMember;
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
    const formalSquad = 取得上陣養成();
    const roster = formalSquad
      .map((entry) => {
        const member = MEMBERS.find((candidate) => candidate.no === entry.memberNo);
        if (!member) return null;
        familyStars[member.family].push(entry.star);
        const stats = statsAtStar(member.base, entry.star);
        const hpCurrent = Math.round(stats.hp * hpRatio(summary.playerHp, summary.playerMaxHp));
        return {
          id: member.id,
          label: 成員顯示名(member.nameZh, member.nameEn),
          star: entry.star,
          layer: entry.layer as any,
          role: entry.role as any,
          hpCurrent,
          hpMax: stats.hp,
          hpRatio: stats.hp > 0 ? hpCurrent / stats.hp : 0,
          shielded: member.family === "shield",
          dead: hpCurrent <= 0,
          ailments: [] as string[],
        } satisfies RosterMember;
      })
      .filter((member): member is any => member !== null) as RosterMember[];

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

  private buildFormalPotions(): PotionItem[] {
    return (Object.keys(POTIONS) as PotionId[])
      .map((id) => {
        const count = 背包.取藥水(id);
        if (count <= 0) return null;
        const def = POTIONS[id];
        const effect: PotionItem["effect"] =
          def.hpRatio > 0 && def.energyRatio > 0 ? "hybrid" : def.hpRatio > 0 ? "hp" : "energy";
        return {
          id,
          label: 藥水標籤(id),
          size: def.big ? "big" : "small",
          effect,
          count,
        } satisfies PotionItem;
      })
      .filter((potion): potion is any => potion !== null) as PotionItem[];
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

  private buildLayerRoster(roster: RosterMember[]): Record<Layer, RosterMember | null> {
    return {
      inner: this.resolveLayerRoster(roster, "inner"),
      middle: this.resolveLayerRoster(roster, "middle"),
      outer: this.resolveLayerRoster(roster, "outer"),
    };
  }

  private resolveLayerRoster(roster: RosterMember[], layer: Layer): RosterMember | null {
    const activeRole = ROLE_ORDER[this.activeRoleIndex] ?? "protect";
    return roster.find((member) => member.layer === layer && member.role === activeRole) ?? null;
  }

  private buildPartyVitals(runtime: RosterRuntime, captainStar: ControlStar): PartyVital[] {
    const captainStats = captainStatsAtStar(runtime.captainId, captainStar);
    const captainCurrent = Math.max(
      0,
      Math.min(captainStats.hp, Math.round(runtime.playerHp / Math.max(runtime.playerMaxHp, 1) * captainStats.hp)),
    );
    const captain: PartyVital = {
      id: runtime.captainId,
      label: 雙語("隊長", "Captain"),
      current: captainCurrent,
      max: captainStats.hp,
      ratio: captainStats.hp > 0 ? captainCurrent / captainStats.hp : 0,
      star: captainStar,
      isCaptain: true,
    };

    const members = runtime.roster.map((member) => ({
      id: member.id,
      label: member.label,
      current: member.hpCurrent,
      max: member.hpMax,
      ratio: member.hpRatio,
      star: member.star ?? 1,
      isCaptain: false,
      layer: member.layer,
      role: member.role,
    }));
    return [captain, ...members];
  }
}

function hpRatio(current: number, max: number): number {
  return max > 0 ? current / max : 0;
}
