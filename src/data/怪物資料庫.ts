/**
 * @file 怪物資料庫.ts
 * @description 29 隻敵方單位(4 世界 × T0~T3 + T4 COLA)的完整戰鬥資料。
 *              對應「doc/角色與敵方/怪物圖鑑.md」§1~§5。
 *
 *              原則(怪物圖鑑 NOTE 區):
 *              - 怪物「直接照搬玩家的武器子彈、自動施法與自身被動」
 *              - 武器/附魔/控制引擎直接引用 武器與附魔.ts / 控制引擎.ts 的 id
 *              - 被動引用玩家成員的自動施法節點(成員資料庫.ts)
 *
 *              萬花筒六方位對稱渲染屬於視覺層,本檔不含(只定義戰鬥數值與邏輯)。
 */

import type { CaptainId, CombatStats, ControlEffect, ControlStar, EnemyTier, EnchantId, EnchantStar, WeaponFamily } from "./戰鬥原語";
import type { World } from "./成員型別";
import { controlForEnemy } from "./控制引擎";

// ============================================================
// 一、怪物戰鬥裝載(照搬玩家機制)
// ============================================================

/** 怪物的武器配裝:家族 + (若有的話)附魔星級 */
export interface MonsterWeapon {
  family: WeaponFamily;
  /** 附魔 id 與星級(T0/T1 無附魔,用 null) */
  enchant: { id: EnchantId; star: EnchantStar } | null;
}

/** 怪物照搬的被動/自動施法(引自玩家成員,用 memberNo 索引) */
export interface MonsterPassive {
  /** 引用來源:玩家成員編號(01~20) */
  fromMemberNo: number;
  /** 被動名稱(直接取自成員資料庫的 starNode 名稱,本檔以字串記錄供顯示) */
  name: string;
  /** 簡述 */
  description: string;
}

/** 怪物的位移技能(引自隊長主動位移) */
export interface MonsterDisplacement {
  /** 引用隊長技能名 */
  name: string;
  /** 觸發間隔(秒) */
  intervalSec: number;
  /** 機制說明 */
  description: string;
}

/** 完整的怪物戰鬥裝載 */
export interface MonsterArmament {
  /** 武器(可能多種混合,T3/T4 才有混合) */
  weapons: MonsterWeapon[];
  /** 控制引擎(照搬隊長,含星級) */
  control: { captain: CaptainId; star: ControlStar } | null;
  /** 被動/自動施法(0~2 個) */
  passives: MonsterPassive[];
  /** 位移技能(T3/T4 才有) */
  displacement: MonsterDisplacement | null;
}

// ============================================================
// 二、怪物完整定義
// ============================================================

export interface MonsterDef {
  /** 編號 01~29(對應怪物圖鑑 §1~§5) */
  no: number;
  id: string;
  nameZh: string;
  nameEn: string;
  world: World | "core";
  tier: EnemyTier;
  /** 基礎屬性 */
  stats: CombatStats;
  /** 戰鬥裝載(照搬玩家機制) */
  armament: MonsterArmament;
  /** 特殊行為(純文字,如 T0 逃跑、母圖形分裂等) */
  behavior: string;
  /** 開局是否非主動敵對(T2 精英,前 10 分鐘) */
  nonHostileInitially?: boolean;
}

// ============================================================
// 幫助:便捷產生照搬的控制引擎
// ============================================================
const ctrl = (captain: CaptainId, star: ControlStar): MonsterArmament["control"] => ({
  captain,
  star,
});
const passive = (fromMemberNo: number, name: string, description: string): MonsterPassive => ({
  fromMemberNo,
  name,
  description,
});

// ============================================================
// 1. 幾何世界(Geometry)— 模擬「直線/多發」小隊
// ============================================================

/** 01. 圓形 (Circle - T0) */
const e01: MonsterDef = {
  no: 1, id: "e01_circle", nameZh: "圓形", nameEn: "Circle", world: "geometry", tier: 0,
  stats: { hp: 100, atk: 0, weight: 1, speed: 250 },
  armament: { weapons: [], control: null, passives: [], displacement: null },
  behavior: "完全無武器、附魔、控制、被動。受到傷害時只會沿圓形弧線逃跑。",
};

/** 02. 三角形 (Triangle - T1) */
const e02: MonsterDef = {
  no: 2, id: "e02_triangle", nameZh: "三角形", nameEn: "Triangle", world: "geometry", tier: 1,
  stats: { hp: 150, atk: 15, weight: 2, speed: 250 },
  armament: {
    weapons: [{ family: "multishot", enchant: null }], // 基礎多發子彈
    control: ctrl("architect", 2), // 1★ 幾何減速:減速 20%,1.5s
    passives: [], displacement: null,
  },
  behavior: "使用基礎多發子彈,搭配 1★ 幾何減速控制引擎。",
};

/** 03. 正方形 (Square - T1) */
const e03: MonsterDef = {
  no: 3, id: "e03_square", nameZh: "正方形", nameEn: "Square", world: "geometry", tier: 1,
  stats: { hp: 450, atk: 20, weight: 10, speed: 70 },
  armament: {
    weapons: [{ family: "shield", enchant: null }], // 基礎護盾衝擊波(每 3 秒)
    control: ctrl("architect", 2), // 1★ 幾何減速
    passives: [], displacement: null,
  },
  behavior: "使用基礎護盾衝擊波(每 3 秒發射一次),搭配 1★ 幾何減速控制引擎。",
};

/** 04. 正六角形 (Hexagon - T1) */
const e04: MonsterDef = {
  no: 4, id: "e04_hexagon", nameZh: "正六角形", nameEn: "Hexagon", world: "geometry", tier: 1,
  stats: { hp: 250, atk: 40, weight: 4, speed: 140 },
  armament: {
    weapons: [{ family: "straight", enchant: null }], // 基礎直線子彈
    control: ctrl("architect", 2), // 1★ 幾何減速
    passives: [], displacement: null,
  },
  behavior: "使用基礎直線子彈,搭配 1★ 幾何減速控制引擎。",
};

/** 05. 彭羅斯三角 (Penrose Triangle - T2) — 開局 10 分鐘非主動敵對 */
const e05: MonsterDef = {
  no: 5, id: "e05_penrose", nameZh: "彭羅斯三角", nameEn: "Penrose Triangle", world: "geometry", tier: 2,
  stats: { hp: 900, atk: 40, weight: 15, speed: 110 },
  armament: {
    weapons: [{ family: "straight", enchant: { id: "repel", star: 2 } }], // 反彈 2★(反彈傷害 50%)
    control: ctrl("conductor", 2), // Conductor 2★ 擊退(1.0 距離)
    passives: [passive(1, "折射屏障", "每 4 秒生成一個折射盾,完全格擋下一次傷害。")],
    displacement: null,
  },
  behavior: "使用直線子彈(反彈 2★ 附魔),Conductor 2★ 擊退控制,被動引自 01. 稜鏡「折射屏障」。",
  nonHostileInitially: true,
};

/** 06. 生命之花 (Flower of Life - T2) — 開局 10 分鐘非主動敵對 */
const e06: MonsterDef = {
  no: 6, id: "e06_flower", nameZh: "生命之花", nameEn: "Flower of Life", world: "geometry", tier: 2,
  stats: { hp: 1200, atk: 15, weight: 22, speed: 90 },
  armament: {
    weapons: [{ family: "multishot", enchant: { id: "focus", star: 2 } }], // 收斂 2★(角度 -35%、Tick +40%)
    control: ctrl("architect", 2), // Architect 2★ 減速(20%,1.5s)
    passives: [passive(5, "光能聚焦", "持續傷害時,造成的傷害每秒遞增 15%,最多疊加 4 次。")],
    displacement: null,
  },
  behavior: "使用多發子彈(收斂 2★ 附魔),Architect 2★ 減速控制,被動引自 05. 光錐「光能聚焦」。",
  nonHostileInitially: true,
};

/** 07. 超立方體 (Tesseract - T3 Boss) */
const e07: MonsterDef = {
  no: 7, id: "e07_tesseract", nameZh: "超立方體", nameEn: "Tesseract", world: "geometry", tier: 3,
  stats: { hp: 8000, atk: 40, weight: 100, speed: 150 },
  armament: {
    weapons: [
      { family: "straight", enchant: { id: "repel", star: 3 } }, // 反彈 3★(80%,速度 +20%)
      { family: "multishot", enchant: { id: "focus", star: 3 } }, // 收斂 3★
    ],
    control: ctrl("architect", 4), // Architect 終極 4★(減速 50% + 易傷 +15%)
    passives: [
      passive(1, "折射屏障", "引自 01. 稜鏡:每 4 秒生成折射盾格擋下次傷害。"),
      passive(4, "網絡錨點", "引自 04. 節點:靜止發射時自身重量臨時 +50%。"),
    ],
    displacement: { name: "傳送點", intervalSec: 8, description: "每隔 8 秒投射光標,1.5 秒後瞬間移動過去(引自 Operator 主動位移)。" },
  },
  behavior: "T3 世界守護者。混合直線(反彈 3★)+ 多發(收斂 3★),Architect 4★ 控制,雙被動,具傳送點位移。",
};

// ============================================================
// 2. 有機世界(Organic)— 模擬「追蹤/連擊」小隊
// ============================================================

/** 08. 種子 (Seed - T0) */
const e08: MonsterDef = {
  no: 8, id: "e08_seed", nameZh: "種子", nameEn: "Seed", world: "organic", tier: 0,
  stats: { hp: 120, atk: 0, weight: 1, speed: 200 },
  armament: { weapons: [], control: null, passives: [], displacement: null },
  behavior: "完全無武器、附魔、控制、被動。受到傷害時獲得移速加成逃跑。",
};

/** 09. 葉脈 (Leaf Veins - T1) */
const e09: MonsterDef = {
  no: 9, id: "e09_leaf", nameZh: "葉脈", nameEn: "Leaf Veins", world: "organic", tier: 1,
  stats: { hp: 180, atk: 40, weight: 2, speed: 230 },
  armament: {
    weapons: [{ family: "straight", enchant: null }],
    control: ctrl("launcher", 2), // 1★ 有機眩暈:0.5s
    passives: [], displacement: null,
  },
  behavior: "使用基礎直線子彈,子彈命中小隊時使玩家陷入眩暈 0.5s。",
};

/** 10. 苔蘚 (Moss - T1) */
const e10: MonsterDef = {
  no: 10, id: "e10_moss", nameZh: "苔蘚", nameEn: "Moss", world: "organic", tier: 1,
  stats: { hp: 450, atk: 20, weight: 12, speed: 60 },
  armament: {
    weapons: [{ family: "shield", enchant: null }],
    control: ctrl("launcher", 2), // 1★ 有機眩暈
    passives: [], displacement: null,
  },
  behavior: "使用基礎護盾衝擊波(每 3 秒),子彈命中眩暈 0.5s。",
};

/** 11. 羽毛 (Feather - T1) */
const e11: MonsterDef = {
  no: 11, id: "e11_feather", nameZh: "羽毛", nameEn: "Feather", world: "organic", tier: 1,
  stats: { hp: 100, atk: 15, weight: 1, speed: 180 },
  armament: {
    weapons: [{ family: "multishot", enchant: null }],
    control: ctrl("launcher", 2), // 1★ 有機眩暈
    passives: [], displacement: null,
  },
  behavior: "使用基礎多發子彈,子彈命中眩暈 0.5s。",
};

/** 12. 蟲巢 (Insect Nest - T2) — 開局 10 分鐘非主動敵對 */
const e12: MonsterDef = {
  no: 12, id: "e12_nest", nameZh: "蟲巢", nameEn: "Insect Nest", world: "organic", tier: 2,
  stats: { hp: 900, atk: 15, weight: 15, speed: 100 },
  armament: {
    weapons: [{ family: "multishot", enchant: { id: "kill_chain", star: 2 } }], // 擊殺連鎖 2★(威力 50%)
    control: ctrl("operator", 2), // Operator 2★ 沉默(1.5s)
    passives: [passive(7, "分裂孢子", "每隔 3 秒噴灑 4 顆懸浮孢子,被碰撞時向四周彈開大量擊退孢子。")],
    displacement: null,
  },
  behavior: "使用多發子彈(擊殺連鎖 2★ 附魔),Operator 2★ 沉默控制,被動引自 07. 孢粉「分裂孢子」。",
  nonHostileInitially: true,
};

/** 13. 珊瑚 (Coral - T2) — 開局 10 分鐘非主動敵對 */
const e13: MonsterDef = {
  no: 13, id: "e13_coral", nameZh: "珊瑚", nameEn: "Coral", world: "organic", tier: 2,
  stats: { hp: 1100, atk: 40, weight: 25, speed: 120 },
  armament: {
    weapons: [{ family: "straight", enchant: { id: "homing", star: 2 } }], // 追蹤 2★(偏轉角 30°)
    control: ctrl("launcher", 2), // Launcher 2★ 眩暈(0.5s)
    passives: [passive(6, "荊棘反噬", "當玩家小隊碰撞時,珊瑚自動反噬造成其 20% 碰撞重量的反射傷害。")],
    displacement: null,
  },
  behavior: "使用直線子彈(追蹤 2★ 附魔),Launcher 2★ 眩暈控制,被動引自 06. 荊棘「荊棘反噬」。",
  nonHostileInitially: true,
};

/** 14. 根系系統 (Root System - T3 Boss) */
const e14: MonsterDef = {
  no: 14, id: "e14_root", nameZh: "根系系統", nameEn: "Root System", world: "organic", tier: 3,
  stats: { hp: 9000, atk: 40, weight: 120, speed: 120 },
  armament: {
    weapons: [
      { family: "straight", enchant: { id: "homing", star: 3 } }, // 追蹤 3★(偏轉角 50°)
      { family: "multishot", enchant: { id: "kill_chain", star: 3 } }, // 擊殺連鎖 3★(威力 70%)
    ],
    control: ctrl("launcher", 4), // Launcher 終極 4★(眩暈 1.5s + 解眩後爆裂波 1.5 距離)
    passives: [
      passive(8, "荊棘反噬", "引自 06. 荊棘:碰撞反噬 20% 碰撞重量反射傷害。"),
      passive(7, "孢粉連鎖", "引自 07. 孢粉:每隔 4 秒發射花粉塵,受波及的小隊成員技能冷卻拉長 2 秒。"),
    ],
    displacement: { name: "鉤索拖曳", intervalSec: 9, description: "每隔 9 秒發射藤蔓將 Boss 拉向玩家(引自 Launcher 主動位移)。" },
  },
  behavior: "T3 世界守護者。混合直線(追蹤 3★)+ 多發(擊殺連鎖 3★),Launcher 4★ 控制,雙被動,具鉤索拖曳位移。",
};

// ============================================================
// 3. 分形世界(Fractal)— 模擬「地雷/分裂」小隊
// ============================================================

/** 15. 母圖形 (Mother Pattern - T0) */
const e15: MonsterDef = {
  no: 15, id: "e15_mother", nameZh: "母圖形", nameEn: "Mother Pattern", world: "fractal", tier: 0,
  stats: { hp: 150, atk: 0, weight: 1, speed: 160 },
  armament: { weapons: [], control: null, passives: [], displacement: null },
  behavior: "完全無武器、附魔、控制、被動。死亡時分裂成 3 個小分身。",
};

/** 16. 初級分形 (First-order Fractal - T1) */
const e16: MonsterDef = {
  no: 16, id: "e16_first", nameZh: "初級分形", nameEn: "First-order Fractal", world: "fractal", tier: 1,
  stats: { hp: 220, atk: 70, weight: 3, speed: 160 },
  armament: {
    weapons: [{ family: "mine", enchant: null }], // 基礎地雷
    control: ctrl("operator", 2), // 1★ 分形沉默:1.5s
    passives: [], displacement: null,
  },
  behavior: "使用基礎地雷,子彈命中時使玩家陷入沉默 1.5s。",
};

/** 17. 科赫雪花 (Koch Snowflake - T1) */
const e17: MonsterDef = {
  no: 17, id: "e17_koch", nameZh: "科赫雪花", nameEn: "Koch Snowflake", world: "fractal", tier: 1,
  stats: { hp: 180, atk: 15, weight: 2, speed: 200 },
  armament: {
    weapons: [{ family: "multishot", enchant: null }],
    control: ctrl("operator", 2), // 1★ 分形沉默
    passives: [], displacement: null,
  },
  behavior: "使用基礎多發子彈,子彈命中沉默 1.5s。",
};

/** 18. 龍形曲線 (Dragon Curve - T1) */
const e18: MonsterDef = {
  no: 18, id: "e18_dragon", nameZh: "龍形曲線", nameEn: "Dragon Curve", world: "fractal", tier: 1,
  stats: { hp: 160, atk: 40, weight: 2, speed: 250 },
  armament: {
    weapons: [{ family: "straight", enchant: null }],
    control: ctrl("operator", 2), // 1★ 分形沉默
    passives: [], displacement: null,
  },
  behavior: "使用基礎直線子彈,子彈命中沉默 1.5s。",
};

/** 19. 謝爾賓斯基三角形 (Sierpinski Triangle - T2) — 開局 10 分鐘非主動敵對 */
const e19: MonsterDef = {
  no: 19, id: "e19_sierpinski", nameZh: "謝爾賓斯基三角形", nameEn: "Sierpinski Triangle", world: "fractal", tier: 2,
  stats: { hp: 1300, atk: 40, weight: 30, speed: 80 },
  armament: {
    weapons: [{ family: "straight", enchant: { id: "firework", star: 2 } }], // 煙火 2★(左右 25% 副彈)
    control: ctrl("conductor", 2), // Conductor 2★ 擊退(1.0)
    passives: [passive(12, "分流彈藥", "每隔 5 次射擊,朝左右兩側額外射出兩束平行的分裂子彈。")],
    displacement: null,
  },
  behavior: "使用直線子彈(煙火 2★ 附魔),Conductor 2★ 擊退控制,被動引自 12. 分叉「分流彈藥」。",
  nonHostileInitially: true,
};

/** 20. 希爾伯特曲線 (Hilbert Curve - T2) — 開局 10 分鐘非主動敵對 */
const e20: MonsterDef = {
  no: 20, id: "e20_hilbert", nameZh: "希爾伯特曲線", nameEn: "Hilbert Curve", world: "fractal", tier: 2,
  stats: { hp: 1000, atk: 70, weight: 15, speed: 100 },
  armament: {
    weapons: [{ family: "mine", enchant: { id: "interception_field", star: 2 } }], // 擦彈護體 2★(減速 35%)
    control: ctrl("operator", 2), // Operator 2★ 沉默(1.5s)
    passives: [passive(15, "極光帷幕", "受重擊或碰撞時,自身虛化隱形 1.5 秒(期間不可選定,碰撞傷害減半)。")],
    displacement: null,
  },
  behavior: "使用地雷(擦彈護體 2★ 附魔),Operator 2★ 沉默控制,被動引自 15. 極光「極光帷幕」。",
  nonHostileInitially: true,
};

/** 21. 無盡維度 (Infinite Recursion - T3 Boss) */
const e21: MonsterDef = {
  no: 21, id: "e21_infinite", nameZh: "無盡維度", nameEn: "Infinite Recursion", world: "fractal", tier: 3,
  stats: { hp: 8500, atk: 70, weight: 100, speed: 110 },
  armament: {
    weapons: [
      { family: "mine", enchant: { id: "interception_field", star: 3 } }, // 擦彈護體 3★(減速 50%)
      { family: "straight", enchant: { id: "firework", star: 3 } }, // 煙火 3★
    ],
    control: ctrl("operator", 4), // Operator 終極 4★(沉默 4.0s + 技能冷卻停滯 + 移速 -20%)
    passives: [
      passive(15, "極光帷幕", "引自 15. 極光:受重擊時虛化隱形 1.5 秒。"),
      passive(13, "連鎖電弧", "引自 13. 閃電:每隔 4 秒自動釋放連鎖閃電彈跳 3 次造成 80 傷害。"),
    ],
    displacement: { name: "減速領域", intervalSec: 10, description: "每隔 10 秒啟動持續 4 秒的減速場,降低玩家移速 40%(引自 Architect 主動位移)。" },
  },
  behavior: "T3 世界守護者。混合地雷(擦彈護體 3★)+ 直線(煙火 3★),Operator 4★ 控制,雙被動,具減速領域位移。",
};

// ============================================================
// 4. 機械世界(Mechanical)— 模擬「護盾/工業爆炸」小隊
// ============================================================

/** 22. 軸承 (Bearing - T0) */
const e22: MonsterDef = {
  no: 22, id: "e22_bearing", nameZh: "軸承", nameEn: "Bearing", world: "mechanical", tier: 0,
  stats: { hp: 160, atk: 0, weight: 2, speed: 260 },
  armament: { weapons: [], control: null, passives: [], displacement: null },
  behavior: "完全無武器、附魔、控制、被動。受到傷害時轉化為滾動狀態高速逃跑。",
};

/** 23. 齒輪 (Gear - T1) */
const e23: MonsterDef = {
  no: 23, id: "e23_gear", nameZh: "齒輪", nameEn: "Gear", world: "mechanical", tier: 1,
  stats: { hp: 200, atk: 15, weight: 3, speed: 180 },
  armament: {
    weapons: [{ family: "multishot", enchant: null }],
    control: ctrl("conductor", 2), // 1★ 機械擊退:1.0 距離
    passives: [], displacement: null,
  },
  behavior: "使用基礎多發子彈,子彈命中時將玩家小隊向飛行反方向擊退 1.0 距離。",
};

/** 24. 螺帽 (Nut - T1) */
const e24: MonsterDef = {
  no: 24, id: "e24_nut", nameZh: "螺帽", nameEn: "Nut", world: "mechanical", tier: 1,
  stats: { hp: 500, atk: 20, weight: 12, speed: 70 },
  armament: {
    weapons: [{ family: "shield", enchant: null }],
    control: ctrl("conductor", 2), // 1★ 機械擊退
    passives: [], displacement: null,
  },
  behavior: "使用基礎護盾衝擊波(每 3 秒),子彈命中擊退 1.0 距離。",
};

/** 25. 線圈 (Coil - T1) */
const e25: MonsterDef = {
  no: 25, id: "e25_coil", nameZh: "線圈", nameEn: "Coil", world: "mechanical", tier: 1,
  stats: { hp: 180, atk: 40, weight: 2, speed: 150 },
  armament: {
    weapons: [{ family: "straight", enchant: null }],
    control: ctrl("conductor", 2), // 1★ 機械擊退
    passives: [], displacement: null,
  },
  behavior: "使用基礎直線子彈,子彈命中擊退 1.0 距離。",
};

/** 26. 活塞曲柄 (Piston & Crank - T2) — 開局 10 分鐘非主動敵對 */
const e26: MonsterDef = {
  no: 26, id: "e26_piston", nameZh: "活塞曲柄", nameEn: "Piston & Crank", world: "mechanical", tier: 2,
  stats: { hp: 1400, atk: 15, weight: 35, speed: 90 },
  armament: {
    weapons: [{ family: "multishot", enchant: { id: "recoil", star: 2 } }], // 後座力 2★(位移 2.5,+10%)
    control: ctrl("conductor", 2), // Conductor 2★ 擊退(1.0)
    passives: [passive(19, "彈簧衝刺", "每隔 5 秒獲得一次無消耗的彈簧高速衝鋒。")],
    displacement: null,
  },
  behavior: "使用多發子彈(後座力 2★ 附魔),Conductor 2★ 擊退控制,被動引自 19. 發條「彈簧衝刺」。",
  nonHostileInitially: true,
};

/** 27. 自動砲塔 (Sentry Turret - T2) — 開局 10 分鐘非主動敵對 */
const e27: MonsterDef = {
  no: 27, id: "e27_turret", nameZh: "自動砲塔", nameEn: "Sentry Turret", world: "mechanical", tier: 2,
  stats: { hp: 1000, atk: 40, weight: 20, speed: 80 },
  armament: {
    weapons: [{ family: "straight", enchant: { id: "explosion", star: 2 } }], // 爆炸 2★(6 顆碎片)
    control: ctrl("launcher", 2), // Launcher 2★ 眩暈(0.5s)
    passives: [passive(17, "碎片散落", "消散死亡時,朝四周環形發射 8 顆高速金屬碎片,每顆造成 40 傷害。")],
    displacement: null,
  },
  behavior: "使用直線子彈(爆炸 2★ 附魔),Launcher 2★ 眩暈控制,被動引自 17. 彈片「碎片散落」。",
  nonHostileInitially: true,
};

/** 28. 超級工廠 (Super Factory - T3 Boss) */
const e28: MonsterDef = {
  no: 28, id: "e28_factory", nameZh: "超級工廠", nameEn: "Super Factory", world: "mechanical", tier: 3,
  stats: { hp: 9500, atk: 40, weight: 150, speed: 80 },
  armament: {
    weapons: [
      { family: "shield", enchant: { id: "wind_zone", star: 3 } }, // 風域 3★
      { family: "straight", enchant: { id: "explosion", star: 3 } }, // 爆炸 3★
    ],
    control: ctrl("conductor", 4), // Conductor 終極 4★(擊退 2.5 + 破防 -20%)
    passives: [
      passive(19, "彈簧衝刺", "引自 19. 發條:每隔 5 秒彈簧高速衝鋒。"),
      passive(20, "高壓過載", "引自 20. 電弧:HP 低於 40% 時在周圍生成沉默電氣力場,每秒造成 30 傷害。"),
    ],
    displacement: { name: "衝刺擊退", intervalSec: 7, description: "每隔 7 秒啟動液壓衝刺,擊退並傷害路徑小隊(引自 Conductor 備用主動位移)。" },
  },
  behavior: "T3 世界守護者。混合護盾(風域 3★)+ 直線(爆炸 3★),Conductor 4★ 控制,雙被動,具衝刺擊退位移。",
};

// ============================================================
// 5. 最終 Boss — T4 COLA(怪物圖鑑 §5)
// ============================================================

/** 29. COLA (T4 最終 Boss) */
const e29: MonsterDef = {
  no: 29, id: "e29_cola", nameZh: "COLA", nameEn: "Central Organic Lattice Assembly", world: "core", tier: 4,
  stats: { hp: 30000, atk: 40, weight: 500, speed: 130 },
  armament: {
    // 全套武器混合發射:幾何直線 + 有機多發 + 分形地雷 + 機械護盾
    weapons: [
      { family: "straight", enchant: { id: "snipe", star: 3 } }, // 狙擊 3★
      { family: "multishot", enchant: { id: "rapid_fire", star: 3 } }, // 連射 3★
      { family: "mine", enchant: { id: "charge", star: 3 } }, // 衝鋒 3★
      { family: "shield", enchant: { id: "wind_zone", star: 3 } }, // 風域 3★
    ],
    // 四大控制引擎同時疊加(4★ 終極版本)
    control: ctrl("architect", 4), // 主控制(實際疊加四種,以 architect 為首)
    passives: [
      passive(1, "折射屏障 & 荊棘反噬", "幾何與有機融合:折射格擋 + 碰撞反噬。"),
      passive(15, "極光帷幕 & 孢粉連鎖", "生態與分形融合:虛化隱形 + 花粉冷卻拉長。"),
      passive(20, "高壓過載自毀", "機械過載:HP 低於 20% 自毀狂暴,電氣場傷害翻倍,移速 +60%,衝撞 +80%。"),
    ],
    displacement: { name: "輪流位移", intervalSec: 6, description: "每 6 秒輪流釋放:傳送點 ➔ 鉤索拖曳 ➔ 衝刺擊退 ➔ 減速領域。" },
  },
  behavior: "T4 最終 Boss。全套四家族武器混合(各 3★ 附魔),四大控制引擎同時疊加(4★ 終極),三組融合被動,位移技能輪流切換。HP 30000,重量 500。",
};

// ============================================================
// 主資料表
// ============================================================

const MONSTER_HP_MULTIPLIER = 2;
const MONSTER_ATK_MULTIPLIER = 2;

const BASE_MONSTERS: readonly MonsterDef[] = [
  e01, e02, e03, e04, e05, e06, e07,
  e08, e09, e10, e11, e12, e13, e14,
  e15, e16, e17, e18, e19, e20, e21,
  e22, e23, e24, e25, e26, e27, e28,
  e29,
];

export const MONSTERS: readonly MonsterDef[] = BASE_MONSTERS.map((monster) => ({
  ...monster,
  stats: {
    ...monster.stats,
    hp: Math.round(monster.stats.hp * MONSTER_HP_MULTIPLIER),
    atk: Math.round(monster.stats.atk * MONSTER_ATK_MULTIPLIER),
  },
}));

// ============================================================
// 查詢 API
// ============================================================

export function findMonster(no: number): MonsterDef | undefined {
  return MONSTERS.find((m) => m.no === no);
}
export function findMonsterById(id: string): MonsterDef | undefined {
  return MONSTERS.find((m) => m.id === id);
}
export function monstersByWorld(world: World | "core"): MonsterDef[] {
  return MONSTERS.filter((m) => m.world === world);
}
export function monstersByTier(tier: EnemyTier): MonsterDef[] {
  return MONSTERS.filter((m) => m.tier === tier);
}

/** 取得某世界的 T3 世界守護者 */
export function worldGuardian(world: World): MonsterDef | undefined {
  return MONSTERS.find((m) => m.world === world && m.tier === 3);
}

/** 取得最終 Boss COLA */
export function finalBoss(): MonsterDef {
  return MONSTERS.find((m) => m.tier === 4)!;
}

/** 解析怪物的控制效果實例(從 armament.control 推導出 ControlEffect) */
export function resolveControl(m: MonsterDef): ControlEffect | null {
  if (!m.armament.control) return null;
  return controlForEnemy(m.armament.control.captain, m.armament.control.star);
}

/** 世界守護者被擊敗後,本世界怪物的狂暴修正值套用(機制指南 §6.3) */
export function enragedStats(m: MonsterDef): CombatStats {
  // 僅本世界怪物受狂暴(跨世界用 CROSS_WORLD_SCALE,由世界狂暴模組管)
  return {
    hp: m.stats.hp,
    atk: Math.round(m.stats.atk * 1.3), // 傷害 +30%
    weight: Math.round(m.stats.weight * 1.2), // 重量 +20%
    speed: m.stats.speed,
  };
}
