/**
 * @file 訓練道場狀態.ts
 * @description 訓練道場 / 沙盒專用的全域狀態。
 *              負責：
 *              - 隊長與 9 個小隊槽位的自由編排
 *              - 任意怪物的手動召喚 / 清場
 *              - 碰撞實驗用的生命值、接觸紀錄與即時摘要
 *
 *              刻意與正式對局狀態分離，避免把暫時性的測試資料污染主流程。
 */

import { MEMBERS } from "../data/成員資料庫";
import type { MemberDef, StarLevel, World } from "../data/成員型別";
import { statsAtStar } from "../data/成員型別";
import { monstersByWorld, type MonsterDef } from "../data/怪物資料庫";
import { captainStatsAtStar } from "../data/控制引擎";
import type { CaptainId } from "../data/戰鬥原語";

export interface 訓練小隊槽位 {
  slotId: number;
  memberId: string | null;
  star: StarLevel;
}

export interface 訓練召喚敵人 {
  id: string;
  monsterNo: number;
  monsterId: string;
  nameZh: string;
  world: World;
  tier: 0 | 1 | 2;
  spritePath: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  atk: number;
  weight: number;
  speed: number;
  ranged: boolean;
  attackRange: number;
  nonHostileInitially: boolean;
  spawnedAtMs: number;
}

export interface 訓練碰撞紀錄 {
  atMs: number;
  enemyIds: string[];
  enemyNames: string[];
  squadWeight: number;
  enemyWeight: number;
  squadDamage: number;
  enemyDamage: number;
}

export interface 訓練碰撞監測 {
  activeEnemyIds: string[];
  activeEnemyNames: string[];
  lastResolvedAtMs: number | null;
  collisionCount: number;
  totalSquadDamage: number;
  totalEnemyDamage: number;
}

export interface 訓練編隊預設 {
  id: string;
  label: string;
  captainId: CaptainId;
  slots: 訓練小隊槽位[];
}

interface 訓練道場內部狀態 {
  captainId: CaptainId;
  captainStar: 4;
  slots: 訓練小隊槽位[];
  selectedSlotId: number;
  selectedEnemyMonsterId: string;
  moveSpeedScale: number;
  activeEnemies: 訓練召喚敵人[];
  playerHp: number;
  playerMaxHp: number;
  lastCollision: 訓練碰撞紀錄 | null;
  collisionMonitor: 訓練碰撞監測;
  presetLoadouts: 訓練編隊預設[];
  activePresetId: string | null;
}

const 訓練世界清單: World[] = ["geometry", "organic", "fractal", "mechanical"];
const 全部可召喚怪物: MonsterDef[] = 訓練世界清單.flatMap((world) =>
  monstersByWorld(world).filter((monster) => monster.tier <= 2),
);

const 初始槽位: 訓練小隊槽位[] = Array.from({ length: 9 }, (_, slotId) => ({
  slotId,
  memberId: MEMBERS[slotId]?.id ?? null,
  star: 3,
}));

function 複製槽位(slots: 訓練小隊槽位[]): 訓練小隊槽位[] {
  return slots.map((slot) => ({ ...slot }));
}

function 建立預設編隊(id: string, label: string, captainId: CaptainId, memberIds: Array<string | null>): 訓練編隊預設 {
  return {
    id,
    label,
    captainId,
    slots: Array.from({ length: 9 }, (_, slotId) => ({
      slotId,
      memberId: memberIds[slotId] ?? null,
      star: 3,
    })),
  };
}

const 預設編隊列表: 訓練編隊預設[] = [
  建立預設編隊("preset_balance", "均衡試作", "architect", 初始槽位.map((slot) => slot.memberId)),
  建立預設編隊("preset_guard", "幾何防線", "conductor", [
    "m01_prism",
    "m03_vector",
    "m04_node",
    "m06_thorn",
    "m07_spore",
    "m05_lightcone",
    "m16_gate",
    "m11_snowglass",
    "m02_matrix",
  ]),
  建立預設編隊("preset_burst", "爆發火力", "launcher", [
    "m03_vector",
    "m17_shrapnel",
    "m12_bifurcation",
    "m05_lightcone",
    "m07_spore",
    "m13_lightning",
    "m09_fungus",
    "m18_needle",
    "m14_abyss",
  ]),
  建立預設編隊("preset_blank", "空白實驗", "operator", Array.from({ length: 9 }, () => null)),
];

let 召喚流水號 = 1;

const 狀態: 訓練道場內部狀態 = {
  captainId: "architect",
  captainStar: 4,
  slots: 初始槽位.map((slot) => ({ ...slot })),
  selectedSlotId: 0,
  selectedEnemyMonsterId: 全部可召喚怪物[0]?.id ?? "",
  moveSpeedScale: 1,
  activeEnemies: [],
  playerHp: 0,
  playerMaxHp: 0,
  lastCollision: null,
  collisionMonitor: {
    activeEnemyIds: [],
    activeEnemyNames: [],
    lastResolvedAtMs: null,
    collisionCount: 0,
    totalSquadDamage: 0,
    totalEnemyDamage: 0,
  },
  presetLoadouts: 預設編隊列表.map((preset) => ({
    ...preset,
    slots: 複製槽位(preset.slots),
  })),
  activePresetId: "preset_balance",
};

function byId(memberId: string | null): MemberDef | null {
  if (!memberId) return null;
  return MEMBERS.find((member) => member.id === memberId) ?? null;
}

function spritePathForMonster(monster: MonsterDef): string {
  return `/images/enemies/${monster.world}/${monster.id}.png`;
}

function attackRangeForTier(tier: 0 | 1 | 2): number {
  switch (tier) {
    case 0:
      return 0;
    case 1:
      return 320;
    case 2:
      return 460;
  }
}

function isRanged(monster: MonsterDef): boolean {
  return monster.armament.weapons.length > 0;
}

export function 取得訓練小隊槽位(): 訓練小隊槽位[] {
  return 狀態.slots.map((slot) => ({ ...slot }));
}

export function 取得訓練小隊成員(): Array<{ slot: 訓練小隊槽位; member: MemberDef; stats: ReturnType<typeof statsAtStar> }> {
  return 狀態.slots
    .map((slot) => {
      const member = byId(slot.memberId);
      if (!member) return null;
      return { slot: { ...slot }, member, stats: statsAtStar(member.base, slot.star) };
    })
    .filter((entry): entry is { slot: 訓練小隊槽位; member: MemberDef; stats: ReturnType<typeof statsAtStar> } => entry !== null);
}

export function 取得訓練道場摘要() {
  const captain = captainStatsAtStar(狀態.captainId, 狀態.captainStar);
  const members = 取得訓練小隊成員();
  const totalHp = captain.hp + members.reduce((sum, entry) => sum + entry.stats.hp, 0);
  const totalAtk = captain.atk + members.reduce((sum, entry) => sum + entry.stats.atk, 0);
  const totalWeight = 12 + members.reduce((sum, entry) => sum + entry.stats.weight, 0);
  const avgSpeedContribution = members.length > 0 ? Math.round(members.reduce((sum, entry) => sum + entry.stats.speed, captain.speed) / (members.length + 1)) : captain.speed;
  const aliveEnemies = 狀態.activeEnemies.filter((enemy) => enemy.hp > 0).length;
  return {
    captainId: 狀態.captainId,
    captainStar: 狀態.captainStar,
    members,
    memberCount: members.length,
    totalHp,
    totalAtk,
    totalWeight,
    avgSpeedContribution,
    moveSpeedScale: 狀態.moveSpeedScale,
    playerHp: 狀態.playerHp,
    playerMaxHp: 狀態.playerMaxHp,
    aliveEnemies,
    selectedSlotId: 狀態.selectedSlotId,
    selectedEnemyMonsterId: 狀態.selectedEnemyMonsterId,
    lastCollision: 狀態.lastCollision,
    collisionMonitor: {
      ...狀態.collisionMonitor,
      activeEnemyIds: [...狀態.collisionMonitor.activeEnemyIds],
      activeEnemyNames: [...狀態.collisionMonitor.activeEnemyNames],
    },
    presetLoadouts: 狀態.presetLoadouts.map((preset) => ({
      ...preset,
      slots: 複製槽位(preset.slots),
    })),
    activePresetId: 狀態.activePresetId,
  };
}

export function 重算訓練玩家生命(保留目前百分比 = true): void {
  const summary = 取得訓練道場摘要();
  const oldMax = 狀態.playerMaxHp || summary.totalHp;
  const ratio = oldMax > 0 ? 狀態.playerHp / oldMax : 1;
  狀態.playerMaxHp = summary.totalHp;
  狀態.playerHp = 保留目前百分比 ? Math.max(1, Math.round(summary.totalHp * Math.max(0, Math.min(1, ratio)))) : summary.totalHp;
}

export function 設定訓練隊長(captainId: CaptainId): void {
  狀態.captainId = captainId;
  重算訓練玩家生命();
}

export function 設定訓練選中槽位(slotId: number): void {
  狀態.selectedSlotId = Math.max(0, Math.min(8, slotId));
}

export function 設定訓練槽位成員(slotId: number, memberId: string | null): void {
  const slot = 狀態.slots.find((entry) => entry.slotId === slotId);
  if (!slot) return;
  slot.memberId = memberId;
  重算訓練玩家生命();
}

export function 設定訓練槽位星級(slotId: number, star: StarLevel): void {
  const slot = 狀態.slots.find((entry) => entry.slotId === slotId);
  if (!slot) return;
  slot.star = star;
  重算訓練玩家生命();
}

export function 交換訓練槽位(sourceSlotId: number, targetSlotId: number): void {
  if (sourceSlotId === targetSlotId) return;
  const source = 狀態.slots.find((entry) => entry.slotId === sourceSlotId);
  const target = 狀態.slots.find((entry) => entry.slotId === targetSlotId);
  if (!source || !target) return;
  const nextSource = { memberId: target.memberId, star: target.star };
  target.memberId = source.memberId;
  target.star = source.star;
  source.memberId = nextSource.memberId;
  source.star = nextSource.star;
  狀態.selectedSlotId = targetSlotId;
  重算訓練玩家生命();
}

export function 切換訓練槽位星級(slotId: number): void {
  const slot = 狀態.slots.find((entry) => entry.slotId === slotId);
  if (!slot) return;
  slot.star = slot.star === 3 ? 1 : ((slot.star + 1) as StarLevel);
  重算訓練玩家生命();
}

export function 清空訓練小隊(): void {
  狀態.slots.forEach((slot) => {
    slot.memberId = null;
    slot.star = 3;
  });
  重算訓練玩家生命(false);
}

export function 套用訓練預設小隊(): void {
  初始槽位.forEach((seed, index) => {
    狀態.slots[index].memberId = seed.memberId;
    狀態.slots[index].star = seed.star;
  });
  狀態.activePresetId = "preset_balance";
  重算訓練玩家生命(false);
}

export function 取得訓練編隊預設列表(): 訓練編隊預設[] {
  return 狀態.presetLoadouts.map((preset) => ({
    ...preset,
    slots: 複製槽位(preset.slots),
  }));
}

export function 套用訓練編隊預設(presetId: string): void {
  const preset = 狀態.presetLoadouts.find((entry) => entry.id === presetId);
  if (!preset) return;
  狀態.captainId = preset.captainId;
  狀態.slots = 複製槽位(preset.slots);
  狀態.activePresetId = preset.id;
  重算訓練玩家生命(false);
}

export function 保存目前為訓練編隊預設(presetId: string): void {
  const preset = 狀態.presetLoadouts.find((entry) => entry.id === presetId);
  if (!preset) return;
  preset.captainId = 狀態.captainId;
  preset.slots = 複製槽位(狀態.slots);
  狀態.activePresetId = preset.id;
}

export function 取得可召喚怪物圖鑑(): MonsterDef[] {
  return 全部可召喚怪物;
}

export function 設定訓練預選怪物(monsterId: string): void {
  狀態.selectedEnemyMonsterId = monsterId;
}

export function 設定訓練移動倍率(scale: number): void {
  狀態.moveSpeedScale = Math.max(0.25, Math.min(3, Number.isFinite(scale) ? scale : 1));
}

export function 取得訓練召喚敵群(): 訓練召喚敵人[] {
  return 狀態.activeEnemies.map((enemy) => ({ ...enemy }));
}

export function 手動設定訓練玩家生命(hp: number): void {
  狀態.playerHp = Math.max(0, Math.min(狀態.playerMaxHp, Math.round(hp)));
}

export function 回滿訓練玩家生命(): void {
  狀態.playerHp = 狀態.playerMaxHp;
}

export function 召喚訓練敵人(monsterId: string, count: number, around: { x: number; y: number }): void {
  const monster = 全部可召喚怪物.find((entry) => entry.id === monsterId);
  if (!monster) return;

  const amount = Math.max(1, Math.min(12, Math.floor(count)));
  for (let index = 0; index < amount; index += 1) {
    const angle = (Math.PI * 2 * index) / amount;
    const distance = 220 + (index % 3) * 92;
    狀態.activeEnemies.push({
      id: `dojo_${monster.id}_${召喚流水號++}`,
      monsterNo: monster.no,
      monsterId: monster.id,
      nameZh: monster.nameZh,
      world: monster.world as World,
      tier: monster.tier as 0 | 1 | 2,
      spritePath: spritePathForMonster(monster),
      x: around.x + Math.cos(angle) * distance,
      y: around.y + Math.sin(angle) * distance,
      hp: monster.stats.hp,
      maxHp: monster.stats.hp,
      atk: monster.stats.atk,
      weight: monster.stats.weight,
      speed: monster.stats.speed,
      ranged: isRanged(monster),
      attackRange: attackRangeForTier(monster.tier as 0 | 1 | 2),
      nonHostileInitially: monster.nonHostileInitially ?? monster.tier === 2,
      spawnedAtMs: Date.now(),
    });
  }
}

export function 清空訓練敵人(): void {
  狀態.activeEnemies = [];
  狀態.lastCollision = null;
  狀態.collisionMonitor.activeEnemyIds = [];
  狀態.collisionMonitor.activeEnemyNames = [];
}

export function 移除訓練敵人(enemyId: string): void {
  狀態.activeEnemies = 狀態.activeEnemies.filter((enemy) => enemy.id !== enemyId);
}

export function 更新訓練敵人(enemyId: string, patch: Partial<訓練召喚敵人>): void {
  const enemy = 狀態.activeEnemies.find((entry) => entry.id === enemyId);
  if (!enemy) return;
  Object.assign(enemy, patch);
}

export function 覆蓋訓練敵群(enemies: 訓練召喚敵人[]): void {
  狀態.activeEnemies = enemies.map((enemy) => ({ ...enemy }));
}

export function 記錄訓練碰撞(result: 訓練碰撞紀錄 | null): void {
  狀態.lastCollision = result ? { ...result, enemyIds: [...result.enemyIds], enemyNames: [...result.enemyNames] } : null;
  if (!result) return;
  狀態.collisionMonitor.lastResolvedAtMs = result.atMs;
  狀態.collisionMonitor.collisionCount += 1;
  狀態.collisionMonitor.totalSquadDamage += result.squadDamage;
  狀態.collisionMonitor.totalEnemyDamage += result.enemyDamage;
}

export function 設定訓練碰撞接觸中(enemyIds: string[], enemyNames: string[]): void {
  狀態.collisionMonitor.activeEnemyIds = [...enemyIds];
  狀態.collisionMonitor.activeEnemyNames = [...enemyNames];
}

export function 重置訓練碰撞統計(): void {
  狀態.lastCollision = null;
  狀態.collisionMonitor = {
    activeEnemyIds: [],
    activeEnemyNames: [],
    lastResolvedAtMs: null,
    collisionCount: 0,
    totalSquadDamage: 0,
    totalEnemyDamage: 0,
  };
}

export function 初始化訓練道場(): void {
  if (狀態.playerMaxHp <= 0) {
    重算訓練玩家生命(false);
  }
}

初始化訓練道場();
