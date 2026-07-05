/**
 * @file 成員型別.ts
 * @description 小隊成員(20 名)的強型別結構定義。
 *              對應「doc/角色與敵方/成員圖鑑.md」的數值與機制。
 *
 *              命名原則:
 *              - 家族(family) 沿用 src/hud/types.ts 的 WeaponFamily,確保全專案一致
 *              - 上升星級倍率遵循 §2(1★=1.0x / 2★=2.0x / 3★=3.0x)
 *              - 「多樣性機制類別」對應 GDD §3.2 的四大類
 *
 *              本檔只放型別與列舉,不放實際成員資料(資料在 成員資料庫.ts)。
 */

// ============================================================
// 一、基本列舉
// ============================================================

/** 四大世界 — 對應成員圖鑑 §一、家族與世界矩陣 */
export type World = "geometry" | "organic" | "fractal" | "mechanical";

export const WORLD_LABEL: Record<World, string> = {
  geometry: "幾何",
  organic: "有機",
  fractal: "分形",
  mechanical: "機械",
};

/**
 * 五大戰術家族 — 沿用 src/hud/types.ts 的 WeaponFamily 名稱,
 * 確保 HUD、戰鬥、資料庫用同一套識別字。
 */
export type Family = "shield" | "multishot" | "straight" | "mine" | "laser";

export const FAMILY_LABEL: Record<Family, string> = {
  shield: "護盾",
  multishot: "多發",
  straight: "直線",
  mine: "地雷",
  laser: "激光",
};

/**
 * 多樣性機制類別 — 對應 GDD §3.2 四大類
 * 成員圖鑑中每位成員標註的所屬類別。
 */
export type DiversityClass =
  | "buffer" // 整體戰力數值提升 (Squad Buffers)
  | "auto_caster" // 自動施法 (Auto-Casters)
  | "resource" // 資源類之增益 (Resource Providers)
  | "specialist"; // 個體機制 (Individual Specialists)

export const DIVERSITY_LABEL: Record<DiversityClass, string> = {
  buffer: "整體戰力數值提升",
  auto_caster: "自動施法",
  resource: "資源類之增益",
  specialist: "個體機制",
};

// ============================================================
// 二、星級
// ============================================================

/** 成員星級,最高 3★ — 成員圖鑑 §2 */
export type StarLevel = 1 | 2 | 3;

/**
 * 升星屬性倍率 — 成員圖鑑 §2
 * 1★=1.0x / 2★=2.0x / 3★=3.0x(套用於 HP、ATK、Weight)
 */
export const STAR_MULTIPLIER: Record<StarLevel, number> = {
  1: 1.0,
  2: 2.0,
  3: 3.0,
};

/** 對應等級區間 — 成員圖鑑 §2(1★:0~5 級 / 2★:5~10 / 3★:10~20) */
export const STAR_LEVEL_RANGE: Record<StarLevel, [number, number]> = {
  1: [0, 5],
  2: [5, 10],
  3: [10, 20],
};

/** 各星級解鎖的附魔插槽數量 — 成員圖鑑 §2 */
export const STAR_ENCHANT_SLOTS: Record<StarLevel, number> = {
  1: 1,
  2: 2,
  3: 3,
};

// ============================================================
// 三、基礎數值(1★)
// ============================================================

/**
 * 成員的 1★ 基礎數值。
 * 2★/3★ 依 STAR_MULTIPLIER 自動倍乘(資料庫只存 1★,取用時運算)。
 */
export interface BaseStats {
  /** 生命值 */
  hp: number;
  /** 攻擊力 */
  atk: number;
  /** 速度加成(貢獻到小隊移動速度) */
  speed: number;
  /** 重量貢獻(影響小隊同心圓面積與移動速度) */
  weight: number;
}

// ============================================================
// 四、附魔變異(已綁定成員)
// ============================================================

/**
 * 附魔變異名稱 — 對應機制指南 §2 各家族附魔。
 * 字串形態以便與「附魔系統.ts」日後對接。
 */
export type EnchantId = string;

// ============================================================
// 五、星級成長節點
// ============================================================

/**
 * 單一星級節點的機制描述。
 * 每位成員在 1★/2★/3★ 各有一個節點。
 *
 * - 1★ 節點通常是「特色機制」或被動
 * - 2★ 節點為純數值強化(套倍率)
 * - 3★ 節點為「質變效果」或「分支進化」(branch)
 */
export interface StarNode {
  /** 節點名稱(例如「折射防線」、「數值強化」、「光譜護佑」) */
  name: string;
  /** 機制說明文字(直接取自成員圖鑑) */
  description: string;
  /**
   * 3★ 是否為分支選擇。
   * 若 branch = true,則 branches 必須提供;effect 為空。
   * 成員圖鑑明確標註「3★ 質變效果」(單一)與「3★ 質變分支」(A/B 兩選一)。
   */
  branch?: boolean;
  /** 分支進化選項(僅 branch=true 時存在) */
  branches?: { key: "A" | "B"; name: string; description: string }[];
}

// ============================================================
// 六、完整成員資料
// ============================================================

/**
 * 一名小隊成員的完整定義。
 * 對應成員圖鑑中每位成員的所有欄位:基礎數值、視覺、定位、附魔、角色概念、
 * 多樣性類別、星級成長。
 */
export interface MemberDef {
  /** 穩定識別字(例如 "m01_prism"),全專案用此查詢 */
  id: string;
  /** 編號 01~20 — 成員圖鑑列表順序 */
  no: number;
  /** 中文名 */
  nameZh: string;
  /** 英文名 */
  nameEn: string;
  /** 所屬世界 */
  world: World;
  /** 所屬家族 */
  family: Family;
  /** 視覺外觀描述(對應圖鑑「視覺」欄) */
  visual: string;
  /** 戰術定位(對應圖鑑「定位」欄) */
  role: string;
  /** 專屬附魔變異(對應圖鑑「專屬附魔變異」欄,null = 無,如激光家族尚未實裝附魔者) */
  enchant: EnchantId | null;
  /** 角色概念描述(對應圖鑑「角色概念」欄) */
  soulConcept: string;
  /** 多樣性機制類別(對應圖鑑「多樣性機制類別」欄) */
  diversity: DiversityClass;
  /** 1★ 基礎數值 */
  base: BaseStats;
  /** 星級成長節點(1★/2★/3★) */
  starNodes: Record<StarLevel, StarNode>;
}

// ============================================================
// 七、查詢輔助(由資料庫模組使用)
// ============================================================

/** 依星級與基礎數值算出實際數值(套倍率) */
export function statsAtStar(base: BaseStats, star: StarLevel): BaseStats {
  const m = STAR_MULTIPLIER[star];
  return {
    hp: Math.round(base.hp * m),
    atk: Math.round(base.atk * m),
    speed: Math.round(base.speed * m),
    weight: Math.round(base.weight * m),
  };
}
