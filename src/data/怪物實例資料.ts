/**
 * @file 怪物實例資料.ts
 * @description 把「怪物資料庫」中各世界的自由活動怪物（T0 資源怪 / T1 雜兵 / T2 精英）
 *              實體化成散佈在大地圖上的實例，供世界地圖層渲染與 AI 驅動。
 *
 *              圖示來源：assets/{世界}怪物.png 立繪，已裁切去背（白邊）成獨立 PNG，
 *              放在 assets/images/enemies/{world}/{id}.png，由 vite publicDir served。
 *
 *              數量沿用 敵人生成系統.WORLD_SPAWN_QUOTA 的「展示密度」縮放版，
 *              確保每種怪物都在場上、可自由移動，但不至於一次塞滿數百個 DOM。
 *              散佈邏輯沿用 地圖物件資料.ts 的 placePoint()／createRandom()，
 *              並把功能設施＋環境物件座標納入避讓。
 */

import {
  MAP_OBJECTS,
  MAP_SEED,
  MAP_VERTICAL_DIVIDER,
  MAP_HORIZONTAL_DIVIDER,
  createRandom,
  placePoint,
} from "./地圖物件資料";
import { ENV_OBJECTS } from "./環境物件資料";
import { monstersByWorld } from "./怪物資料庫";
import type { MonsterDef } from "./怪物資料庫";
import type { World } from "./成員型別";
import type { EnemyTier } from "./戰鬥原語";

/** 自由活動怪物的世界（不含 core/最終 Boss）。 */
const ROAMING_WORLDS: World[] = ["geometry", "organic", "fractal", "mechanical"];

/**
 * 各 Tier 的「展示密度」——每種怪物在該世界要放幾隻。
 * 比機制指南的完整配額（T0×15、T1×10、T2×3）縮小，兼顧「全部放出來且會動」與效能。
 */
export const ROAMING_DENSITY: Record<0 | 1 | 2, number> = {
  0: 4, // 每種 T0 資源怪 4 隻
  1: 3, // 每種 T1 雜兵 3 隻
  2: 2, // 每種 T2 精英 2 隻
};

/** 一隻在場怪物的靜態定義 + 初始座標（可變狀態如 hp/pos 由地圖層自行持有）。 */
export interface MonsterInstance {
  /** 唯一實例 id */
  id: string;
  /** 對應怪物編號 01~28 */
  monsterNo: number;
  world: World;
  tier: EnemyTier;
  nameZh: string;
  nameEn: string;
  /** 去背立繪路徑 */
  spritePath: string;
  /** 初始世界座標 */
  x: number;
  y: number;
  /** 基礎屬性（來自怪物資料庫；狂暴修正由世界狂暴系統另行套用） */
  hp: number;
  maxHp: number;
  atk: number;
  weight: number;
  speed: number;
  /** 是否為遠程（有武器則視為可射擊；純資源怪為近身/無攻擊） */
  ranged: boolean;
  /** 攻擊射程（世界座標） */
  attackRange: number;
  /** 開局是否非主動敵對(T2 精英,前 10 分鐘) */
  nonHostileInitially: boolean;
}

/** 由 tier 推一個合理的攻擊射程（純演算佔位；資源怪 0）。 */
function attackRangeForTier(tier: EnemyTier): number {
  switch (tier) {
    case 0: return 0;
    case 1: return 320;
    case 2: return 460;
    default: return 520;
  }
}

/** 該怪物是否有攻擊手段（有武器 = 遠程可射）。 */
function isRanged(def: MonsterDef): boolean {
  return def.armament.weapons.length > 0;
}

function spritePathFor(def: MonsterDef): string {
  return `/images/enemies/${def.world}/${def.id}.png`;
}

/** 生成全世界自由活動怪物實例。 */
function buildMonsterInstances(): MonsterInstance[] {
  // 用與環境物件不同的種子偏移，讓怪物散佈序列獨立，但同一次載入穩定。
  const random = createRandom(MAP_SEED ^ 0x1234abcd);

  // 已佔用座標：功能設施 + 環境物件，避免怪物初始就疊在建物/障礙上。
  const usedPoints: Array<{ x: number; y: number }> = [
    ...MAP_OBJECTS.map((o) => ({ x: o.x, y: o.y })),
    ...ENV_OBJECTS.map((o) => ({ x: o.x, y: o.y })),
  ];
  const verticalDivider = [...MAP_VERTICAL_DIVIDER];
  const horizontalDivider = [...MAP_HORIZONTAL_DIVIDER];

  const instances: MonsterInstance[] = [];

  for (const world of ROAMING_WORLDS) {
    const monsters = monstersByWorld(world).filter((m) => m.tier <= 2);
    for (const def of monsters) {
      const count = ROAMING_DENSITY[def.tier as 0 | 1 | 2];
      for (let i = 0; i < count; i += 1) {
        const point = placePoint(usedPoints, world, verticalDivider, horizontalDivider, random, 260);
        if (!point) continue; // 找不到合法落點（極少數）就略過這一隻
        instances.push({
          id: `${def.id}_${i + 1}`,
          monsterNo: def.no,
          world,
          tier: def.tier,
          nameZh: def.nameZh,
          nameEn: def.nameEn,
          spritePath: spritePathFor(def),
          x: point.x,
          y: point.y,
          hp: def.stats.hp,
          maxHp: def.stats.hp,
          atk: def.stats.atk,
          weight: def.stats.weight,
          speed: def.stats.speed,
          ranged: isRanged(def),
          attackRange: attackRangeForTier(def.tier),
          nonHostileInitially: def.nonHostileInitially ?? def.tier === 2,
        });
      }
    }
  }

  return instances;
}

export const MONSTER_INSTANCES: readonly MonsterInstance[] = buildMonsterInstances();

/** 每個戰場必須使用獨立副本，避免扣血直接污染下一局的模板資料。 */
export function 建立怪物實例副本(): MonsterInstance[] {
  return MONSTER_INSTANCES.map((monster) => ({ ...monster }));
}

export function monsterInstancesByWorld(world: World): MonsterInstance[] {
  return MONSTER_INSTANCES.filter((m) => m.world === world);
}

export const MONSTER_INSTANCE_TOTAL = MONSTER_INSTANCES.length;
