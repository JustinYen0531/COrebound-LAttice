/**
 * @file 戰鬥原語.ts
 * @description 戰鬥系統的共用型別與常數。
 *              對應「doc/系統機制/機制指南.md」§1(核心武器機制)、
 *              「doc/角色與敵方/怪物圖鑑.md」(敵方照搬玩家機制)。
 *
 *              本檔是戰鬥資料的「詞彙表」:
 *              - 家族 / 武器 / 附魔 / 控制效果 的識別字
 *              - 碰撞重量、Tick、發射週期等物理常數
 *              - 素材星級與稀有度
 *
 *              命名原則:家族(family)沿用 src/data/成員型別.ts 與 src/hud/types.ts,
 *              確保全專案同一套識別字。
 */

import type { Family } from "./成員型別";

// ============================================================
// 一、傷害結算 Tick(機制指南 §1.3)
// ============================================================

/**
 * 全隊傷害結算週期基準 = 1.0 秒/Tick(機制指南 §1.3)。
 * 武器發射週期以「每隔 X 次 Tick」描述,與此基準掛鉤。
 */
export const TICK_SECONDS = 1.0;

/** 首次出手延遲基準(機制指南 §1.3 註:角色圖鑑各隊長 0.05~0.3s) */
export const FIRST_STRIKE_DEFAULT = 0.2;

// ============================================================
// 二、武器家族與發射週期(機制指南 §2)
// ============================================================

export type WeaponFamily = Family; // 別名,語意上「武器家族 = 成員家族」

/** 四大實裝家族(Game Jam 階段,激光為預留) */
export const PLAYABLE_FAMILIES: WeaponFamily[] = ["shield", "multishot", "straight", "mine"];

/** 家族基礎發射週期(每隔幾次 Tick 結算一次)— 機制指南 §2.1~§2.4 */
export const FAMILY_FIRE_PERIOD: Record<WeaponFamily, number> = {
  shield: 3, // 每 3 Tick(3 秒)— §2.1
  multishot: 1, // 每 1 Tick(1 秒)— §2.2
  straight: 1, // 每 1 Tick(1 秒)— §2.3
  mine: 2, // 每 2 Tick(2 秒)— §2.4
  laser: 1, // 預留,持續射線無週期,暫以 1 標記
};

// ============================================================
// 三、附魔星級(機制指南 §2 各家族附魔表)
// ============================================================

export type EnchantStar = 1 | 2 | 3;

/** 附魔 id 列舉(對應機制指南 §2.1~§2.4 已綁定成員者 + §4 備用) */
export type EnchantId =
  // 護盾家族(§2.1)
  | "repel" // 反彈-稜鏡
  | "splinter" // 分裂-荊棘
  | "wide_angle" // 超廣角-雪鏡
  | "wind_zone" // 風域-閘門
  | "scorch" // 著火(備用)
  // 多發家族(§2.2)
  | "focus" // 收斂-矩陣
  | "kill_chain" // 擊殺連鎖-孢粉
  | "rapid_fire" // 連射-分叉
  | "recoil" // 後座力-彈片
  | "charged_burst" // 蓄力衝擊(備用)
  // 直線家族(§2.3)
  | "snipe" // 狙擊-向量
  | "homing" // 追蹤-藤蔓
  | "firework" // 煙火-閃電
  | "explosion" // 爆炸-鋼針
  | "diffuse" // 漫射(備用)
  // 地雷家族(§2.4)
  | "empowered_cast" // 強化一擊-節點
  | "gigantism" // 巨大化-真菌
  | "interception_field" // 擦彈護體-深淵
  | "charge" // 衝鋒-發條
  | "sentry"; // 砲台(備用)

// ============================================================
// 四、控制效果(機制指南 §3,隊長控制引擎 + 怪物照搬)
// ============================================================

export type ControlKind = "slow" | "knockback" | "stun" | "silence";

export const CONTROL_LABEL: Record<ControlKind, string> = {
  slow: "減速",
  knockback: "擊退",
  stun: "眩暈",
  silence: "沉默",
};

/** 控制引擎的所屬隊長(機制指南 §3.1~§3.4) */
export type CaptainId = "architect" | "conductor" | "launcher" | "operator";

export const CAPTAIN_CONTROL: Record<CaptainId, ControlKind> = {
  architect: "slow",
  conductor: "knockback",
  launcher: "stun",
  operator: "silence",
};

/** 控制引擎星級(怪物照搬時用 1★/2★/4★,4★ 為終極) */
export type ControlStar = 1 | 2 | 3 | 4;

// ============================================================
// 五、素材星級與稀有度(怪物圖鑑開頭 IMPORTANT 區)
// ============================================================

export type MaterialStar = 1 | 2 | 3;
export type MaterialRarity = "common" | "fine"; // 普通 / 高級

export const MATERIAL_RARITY_LABEL: Record<MaterialRarity, string> = {
  common: "普通",
  fine: "高級",
};

/** 素材熔煉為家族碎片的轉化率(機制指南 §5.2) */
export const SHARD_YIELD: Record<MaterialStar, Record<MaterialRarity, number>> = {
  1: { common: 1, fine: 2 },
  2: { common: 3, fine: 5 },
  3: { common: 8, fine: 12 },
};

/** 素材販售原石價格(機制指南 §8.4) */
export const MATERIAL_SELL_PRICE: Record<MaterialStar, Record<MaterialRarity, number>> = {
  1: { common: 5, fine: 15 },
  2: { common: 25, fine: 60 },
  3: { common: 100, fine: 250 },
};

/** 世界地緣熔煉/販售加成(機制指南 §5.3、§8.4) */
export const LOCAL_BONUS = 0.2; // +20%

/** 家族碎片販售價(機制指南 §8.4) */
export const SHARD_SELL_PRICE = 2;

// ============================================================
// 六、階梯式交錯掉落鏈(怪物圖鑑開頭 IMPORTANT 區)
// ============================================================

export type EnemyTier = 0 | 1 | 2 | 3 | 4; // T0~T4

export const TIER_LABEL: Record<EnemyTier, string> = {
  0: "T0 非攻擊型資源怪",
  1: "T1 主動攻擊雜兵",
  2: "T2 中型精英怪",
  3: "T3 世界守護者 Boss",
  4: "T4 最終 Boss",
};

/**
 * 階梯式交錯掉落規則 — 怪物圖鑑 IMPORTANT 區。
 * 每階掉落的素材星級與稀有度(用於推導對應世界的具體素材)。
 */
export interface TierDropShape {
  /** 主掉落:星級 + 稀有度 */
  star: MaterialStar;
  rarity: MaterialRarity;
  /** 主掉落份數 */
  count: number;
  /** 是否有 T2 精英的 3★ 高級狂暴額外掉落(30%) */
  enragedBonusFine3?: boolean;
  /** 通關道具標記(T4) */
  clearsGame?: boolean;
}

export const TIER_DROP: Record<EnemyTier, TierDropShape> = {
  0: { star: 1, rarity: "common", count: 1 },
  1: { star: 1, rarity: "fine", count: 1 }, // 另含 2 份 2★ 普通,由 dropper 補
  2: { star: 2, rarity: "fine", count: 1, enragedBonusFine3: true },
  3: { star: 3, rarity: "fine", count: 2 },
  4: { star: 3, rarity: "fine", count: 1, clearsGame: true },
};

// ============================================================
// 七、世界狂暴修正(機制指南 §6.3)
// ============================================================

/** 世界守護者被擊敗後,本世界狂暴修正 */
export const ENRAGE_MODIFIERS = {
  /** 本世界怪物傷害 +30% */
  damageMult: 1.3,
  /** 本世界怪物重量 +20% */
  weightMult: 1.2,
  /** 精英怪狂暴後額外掉 3★ 高級素材機率 */
  bonusFine3Chance: 0.3,
} as const;

/** 跨世界連動:任一世界 Boss 倒下後,其他未通關世界怪物戰力全局強化 */
export const CROSS_WORLD_SCALE = {
  hpMult: 1.15,
  damageMult: 1.15,
} as const;

// ============================================================
// 八、新手保護期與毒圈(機制指南 §6.1、§9.2)
// ============================================================

/** 新手保護期:前 10 分鐘 T2 精英不主動攻擊(機制指南 §6.1) */
export const NEW_PLAYER_PROTECTION_SECONDS = 600;

/** 晶格侵蝕(毒圈)15 分鐘啟動(機制指南 §9.2) */
export const EROSION_START_SECOND = 900;

/** 毒圈每秒造成最大生命 5% 真實傷害(機制指南 §9.2) */
export const EROSION_DAMAGE_RATIO_PER_TICK = 0.05;

// ============================================================
// 九、共用:單位屬性結構(玩家小隊 / 怪物共用)
// ============================================================

/** 任何戰鬥單位的基礎屬性 */
export interface CombatStats {
  hp: number;
  atk: number;
  weight: number;
  /** 移動速度(0 = 不移動,如閘門) */
  speed: number;
}

/** 控制效果實例(附加在攻擊上) */
export interface ControlEffect {
  kind: ControlKind;
  star: ControlStar;
  /** 數值(減速比例/擊退距離/眩暈秒/沉默秒),依 kind 語意不同 */
  magnitude: number;
  /** 持續時間(秒);擊退為瞬發,此欄為 0 */
  duration: number;
}
