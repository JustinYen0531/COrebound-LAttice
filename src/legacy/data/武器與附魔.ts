/**
 * @file 武器與附魔.ts
 * @description 四大家族的武器基礎屬性(1★ 基準)+ 16 種已綁定附魔的星級效果。
 *              對應「doc/系統機制/機制指南.md」§2.1~§2.4 + §4(備用附魔)。
 *
 *              怪物圖鑑明確規範:「敵方怪物直接照搬玩家的武器子彈、
 *              成員多樣性升級中的自動施法與自身被動」(怪物圖鑑 NOTE 區)。
 *              因此本檔同時供玩家武器與怪物武器查用。
 */

import {
  FAMILY_FIRE_PERIOD,
  type EnchantId,
  type EnchantStar,
  type WeaponFamily,
} from "./戰鬥原語";

// ============================================================
// 一、武器基礎屬性(1★ 基準)— 機制指南 §2.1~§2.4
// ============================================================

export interface WeaponBase {
  family: WeaponFamily;
  /** 單次/單顆傷害 */
  damage: number;
  /** 碰撞重量(霸體級 = 9999) */
  weight: number;
  /** 彈道速度 */
  speed: number;
  /** 每次發射的子彈數量(多發家族用,其他為 1) */
  pelletCount: number;
  /** 發射週期(每隔幾次 Tick) */
  firePeriodTicks: number;
  /** 持續時間(地雷滯留秒,其他為 0) */
  lingerSeconds: number;
  /** 機制說明 */
  description: string;
}

export const WEAPON_BASE: Record<WeaponFamily, WeaponBase> = {
  shield: {
    family: "shield",
    damage: 20,
    weight: 9999, // 霸體級判定 — §2.1
    speed: 4,
    pelletCount: 1,
    firePeriodTicks: FAMILY_FIRE_PERIOD.shield, // 3
    lingerSeconds: 0,
    description: "發射扇形衝擊波。極巨大重量幾乎可阻擋所有子彈,具備防守與大範圍清屏實用性。",
  },
  multishot: {
    family: "multishot",
    damage: 15,
    weight: 5,
    speed: 12,
    pelletCount: 5,
    firePeriodTicks: FAMILY_FIRE_PERIOD.multishot, // 1
    lingerSeconds: 0,
    description: "一次發射多顆擴散子彈。散射特性使越接近小隊本體,重疊命中傷害越高。",
  },
  straight: {
    family: "straight",
    damage: 40,
    weight: 15,
    speed: 18,
    pelletCount: 1,
    firePeriodTicks: FAMILY_FIRE_PERIOD.straight, // 1
    lingerSeconds: 0,
    description: "最基礎且泛用的彈藥類型,擁有標準的重量、射程與速度。",
  },
  mine: {
    family: "mine",
    damage: 70,
    weight: 50,
    speed: 6, // 初始速度,0.5 秒內衰減至 0 — §2.4
    pelletCount: 1,
    firePeriodTicks: FAMILY_FIRE_PERIOD.mine, // 2
    lingerSeconds: 5, // 滯留 5 秒
    description: "發射後飛行速度迅速衰減至零並滯留原地,陣地防禦型。",
  },
  laser: {
    // 預留,Game Jam 未實裝(機制指南 §10)
    family: "laser",
    damage: 0,
    weight: 0,
    speed: 0,
    pelletCount: 0,
    firePeriodTicks: FAMILY_FIRE_PERIOD.laser,
    lingerSeconds: 0,
    description: "預留:持續性射線判定,瞬間速度極快且無視部分低碰撞重量子彈。",
  },
};

// ============================================================
// 二、附魔效果庫(機制指南 §2.1~§2.4 + §4)
// ============================================================

/**
 * 附魔在指定星級的效果數值。
 * 一個 EnchantDef 內含 1★/2★/3★ 三階效果。
 */
export interface EnchantDef {
  id: EnchantId;
  family: WeaponFamily;
  nameZh: string;
  nameEn: string;
  /** 機制總綱描述 */
  mechanic: string;
  /** 各星級效果描述與關鍵數值(供戰鬥邏輯讀取) */
  levels: Record<
    EnchantStar,
    {
      description: string;
      /** 結構化關鍵參數(選填,供戰鬥系統直接讀) */
      params?: Record<string, number>;
    }
  >;
  /** 綁定成員 no(機制指南 §2 各附魔標註「XX 專屬」) */
  boundMemberNo?: number;
}

export const ENCHANTS: Record<EnchantId, EnchantDef> = {
  // ---------- 護盾家族(§2.1)----------
  repel: {
    id: "repel", family: "shield", nameZh: "反彈", nameEn: "Repel",
    mechanic: "在重量完全碾壓敵方子彈時,可將該子彈反彈為己方攻擊。",
    boundMemberNo: 1,
    levels: {
      1: { description: "將敵方子彈反彈為己方,反彈子彈傷害降為原先的 30%。", params: { damageRatio: 0.30 } },
      2: { description: "反彈子彈傷害降為原先的 50%。", params: { damageRatio: 0.50 } },
      3: { description: "反彈子彈傷害提升為原先的 80%,且反彈後子彈飛行速度額外提升 20%。", params: { damageRatio: 0.80, speedBonus: 0.20 } },
    },
  },
  splinter: {
    id: "splinter", family: "shield", nameZh: "分裂", nameEn: "Splinter",
    mechanic: "當護盾消散或被特定機制破壞時,分裂成多個衝擊波繼續前進。",
    boundMemberNo: 6,
    levels: {
      1: { description: "分裂出 2 個微型衝擊波,繼承母彈 30% 的重量與 40% 的傷害。", params: { count: 2, weightRatio: 0.30, damageRatio: 0.40 } },
      2: { description: "分裂出 3 個微型衝擊波,繼承母彈 40% 的重量與 50% 的傷害。", params: { count: 3, weightRatio: 0.40, damageRatio: 0.50 } },
      3: { description: "分裂出 4 個微型衝擊波,繼承母彈 50% 的重量與 60% 的傷害。", params: { count: 4, weightRatio: 0.50, damageRatio: 0.60 } },
    },
  },
  wide_angle: {
    id: "wide_angle", family: "shield", nameZh: "超廣角", nameEn: "Wide Angle",
    mechanic: "擴大衝擊波發射的扇形範圍與寬度。",
    boundMemberNo: 11,
    levels: {
      1: { description: "護盾扇形張開角度擴大 15%。", params: { angleBonus: 0.15 } },
      2: { description: "護盾扇形張開角度擴大 30%。", params: { angleBonus: 0.30 } },
      3: { description: "護盾扇形張開角度擴大 50%。", params: { angleBonus: 0.50 } },
    },
  },
  wind_zone: {
    id: "wind_zone", family: "shield", nameZh: "風域", nameEn: "Wind Zone",
    mechanic: "在衝擊波後方生成大範圍的風力加速地帶,可用作小隊移動屏障。",
    boundMemberNo: 16,
    levels: {
      1: { description: "生成與護盾同寬的風場,小隊經過時移動速度 +15%,風場持續 2 次傷害 Tick。", params: { speedBonus: 0.15, durationTicks: 2 } },
      2: { description: "移動速度 +25%,風場持續 3 次傷害 Tick。", params: { speedBonus: 0.25, durationTicks: 3 } },
      3: { description: "移動速度 +40%,風場持續 4.5 次傷害 Tick。", params: { speedBonus: 0.40, durationTicks: 4.5 } },
    },
  },
  scorch: {
    id: "scorch", family: "shield", nameZh: "著火", nameEn: "Scorch",
    mechanic: "衝擊波掃過之處留下無法熄滅的燃燒火焰地帶,造成持續傷害與領域限制。",
    levels: {
      1: { description: "火焰留存 1.5s,每隔 0.5s 造成子彈傷害的 10%。", params: { duration: 1.5, interval: 0.5, damageRatio: 0.10 } },
      2: { description: "火焰留存 2.5s,每隔 0.5s 造成子彈傷害的 15%。", params: { duration: 2.5, interval: 0.5, damageRatio: 0.15 } },
      3: { description: "火焰留存 4.0s,每隔 0.5s 造成子彈傷害的 20%。", params: { duration: 4.0, interval: 0.5, damageRatio: 0.20 } },
    },
  },

  // ---------- 多發家族(§2.2)----------
  focus: {
    id: "focus", family: "multishot", nameZh: "收斂", nameEn: "Focus",
    mechanic: "使子彈發射角度更集中,並延長射程與子彈存活時間。",
    boundMemberNo: 2,
    levels: {
      1: { description: "散射角度縮小 20%,子彈存活持續 Tick 增加 25%。", params: { angleShrink: 0.20, tickBonus: 0.25 } },
      2: { description: "散射角度縮小 35%,子彈持續 Tick 增加 40%。", params: { angleShrink: 0.35, tickBonus: 0.40 } },
      3: { description: "散射角度縮小 50%,子彈持續 Tick 增加 60%,飛行速度 +20%。", params: { angleShrink: 0.50, tickBonus: 0.60, speedBonus: 0.20 } },
    },
  },
  kill_chain: {
    id: "kill_chain", family: "multishot", nameZh: "擊殺連鎖", nameEn: "Kill Chain",
    mechanic: "當子彈擊殺地圖上的敵人或物件時,以該物件為新發射點,對最近目標再次發射相同彈幕。",
    boundMemberNo: 7,
    levels: {
      1: { description: "擊殺時觸發連鎖,發射相同彈幕,威力為原先的 35%。", params: { damageRatio: 0.35 } },
      2: { description: "連鎖發射威力為原先的 50%。", params: { damageRatio: 0.50 } },
      3: { description: "連鎖發射威力為原先的 70%,且連鎖彈幕速度額外 +20%。", params: { damageRatio: 0.70, speedBonus: 0.20 } },
    },
  },
  rapid_fire: {
    id: "rapid_fire", family: "multishot", nameZh: "連射", nameEn: "Rapid Fire",
    mechanic: "在相同發射方向,於短時間內自動追加數輪發射。",
    boundMemberNo: 12,
    levels: {
      1: { description: "首發後自動追加 1 輪發射,追加子彈傷害為原先的 40%。", params: { extraRounds: 1, damageRatio: 0.40 } },
      2: { description: "追加 1 輪發射,追加子彈傷害為原先的 60%。", params: { extraRounds: 1, damageRatio: 0.60 } },
      3: { description: "自動追加 2 輪發射,追加子彈傷害分別為原先的 80% 與 60%。", params: { extraRounds: 2, damageRatios: "0.80,0.60" as unknown as number } },
    },
  },
  recoil: {
    id: "recoil", family: "multishot", nameZh: "後座力", nameEn: "Recoil",
    mechanic: "每次發射時,小隊會受到反方向的作用力產生位移。",
    boundMemberNo: 17,
    levels: {
      1: { description: "發射時產生反向推力,位移 1.5 距離單位。", params: { pushDistance: 1.5 } },
      2: { description: "位移 2.5 距離單位,且位移後 1 次傷害 Tick 內移動速度 +10%。", params: { pushDistance: 2.5, speedBonus: 0.10, speedTicks: 1 } },
      3: { description: "位移 4.0 距離單位,且位移後 1.5 次傷害 Tick 內移動速度 +20%。", params: { pushDistance: 4.0, speedBonus: 0.20, speedTicks: 1.5 } },
    },
  },
  charged_burst: {
    id: "charged_burst", family: "multishot", nameZh: "蓄力衝擊", nameEn: "Charged Burst",
    mechanic: "不攻擊維持一段時間後,下次發射獲得爆發性蓄力彈。",
    levels: {
      1: { description: "不攻擊維持 3s,下次發射傷害/體積 +30%。", params: { idleSeconds: 3.0, bonus: 0.30 } },
      2: { description: "不攻擊維持 2.5s,下次發射傷害/體積 +50%。", params: { idleSeconds: 2.5, bonus: 0.50 } },
      3: { description: "不攻擊維持 2.0s,下次發射傷害/體積 +80%。", params: { idleSeconds: 2.0, bonus: 0.80 } },
    },
  },

  // ---------- 直線家族(§2.3)----------
  snipe: {
    id: "snipe", family: "straight", nameZh: "狙擊", nameEn: "Snipe",
    mechanic: "子彈強度隨飛行距離逐步提升,適合遠距離狙殺。",
    boundMemberNo: 3,
    levels: {
      1: { description: "子彈飛行距離每達總射程 1/2,傷害與重量增加 15%(上限 +30%),速度提升 10%。", params: { stepRatio: 0.15, cap: 0.30, speedBonus: 0.10 } },
      2: { description: "傷害與重量每階段增加 25%(上限 +50%),速度提升 15%。", params: { stepRatio: 0.25, cap: 0.50, speedBonus: 0.15 } },
      3: { description: "傷害與重量每階段增加 40%(上限 +80%),速度提升 25%。", params: { stepRatio: 0.40, cap: 0.80, speedBonus: 0.25 } },
    },
  },
  homing: {
    id: "homing", family: "straight", nameZh: "追蹤", nameEn: "Homing",
    mechanic: "子彈會隨時間逐步向最近的敵方目標偏轉。",
    boundMemberNo: 8,
    levels: {
      1: { description: "子彈獲得每秒最大 15° 的自動追蹤偏轉角。", params: { turnRate: 15 } },
      2: { description: "自動追蹤偏轉角提升至每秒 30°。", params: { turnRate: 30 } },
      3: { description: "自動追蹤偏轉角提升至每秒 50°,且鎖定目標的偵測半徑增加 50%。", params: { turnRate: 50, detectBonus: 0.50 } },
    },
  },
  firework: {
    id: "firework", family: "straight", nameZh: "煙火", nameEn: "Firework",
    mechanic: "子彈在行進路徑中,不斷向側向拋射微型副子彈。",
    boundMemberNo: 13,
    levels: {
      1: { description: "每隔 0.3 秒向左右兩側各發射 1 顆迷你副彈,造成主彈 15% 的傷害。", params: { interval: 0.3, damageRatio: 0.15 } },
      2: { description: "每隔 0.25 秒發射一次,造成主彈 25% 的傷害。", params: { interval: 0.25, damageRatio: 0.25 } },
      3: { description: "每隔 0.2 秒發射一次,造成主彈 35% 的傷害,且副彈繼承主彈 10% 的重量。", params: { interval: 0.2, damageRatio: 0.35, weightRatio: 0.10 } },
    },
  },
  explosion: {
    id: "explosion", family: "straight", nameZh: "爆炸", nameEn: "Explosion",
    mechanic: "當子彈飛行結束、到達最大距離或碰撞時觸發範圍爆炸。",
    boundMemberNo: 18,
    levels: {
      1: { description: "引爆並朝環形發射 4 顆碎片子彈,每顆造成 30% 的主彈傷害。", params: { fragments: 4, damageRatio: 0.30 } },
      2: { description: "發射 6 顆碎片子彈,每顆造成 40% 傷害,並附加中度擊退效果。", params: { fragments: 6, damageRatio: 0.40, knockback: 1 } },
      3: { description: "發射 8 顆碎片子彈,每顆造成 50% 傷害,附帶強度擊退與 10% 的碰撞重量。", params: { fragments: 8, damageRatio: 0.50, knockback: 1, weightRatio: 0.10 } },
    },
  },
  diffuse: {
    id: "diffuse", family: "straight", nameZh: "漫射", nameEn: "Diffuse",
    mechanic: "在主彈道左右側平行發射平行子彈,增大覆蓋面。",
    levels: {
      1: { description: "兩側平行發射 1 顆平行彈(傷害為 25%,無碰撞重量)。", params: { parallelCount: 1, damageRatio: 0.25, weightRatio: 0 } },
      2: { description: "平行彈傷害提升至 40%,且平行彈繼承主彈 20% 的重量。", params: { parallelCount: 1, damageRatio: 0.40, weightRatio: 0.20 } },
      3: { description: "增加為各 2 顆,單顆傷害為 50%,且平行彈繼承主彈 30% 的重量。", params: { parallelCount: 2, damageRatio: 0.50, weightRatio: 0.30 } },
    },
  },

  // ---------- 地雷家族(§2.4)----------
  empowered_cast: {
    id: "empowered_cast", family: "mine", nameZh: "強化一擊", nameEn: "Empowered Cast",
    mechanic: "每累積發射一定次數的地雷,下一次發射將同時投擲多顆地雷。",
    boundMemberNo: 4,
    levels: {
      1: { description: "每發射 4 次地雷後,下一發自動變為一次發射 2 顆地雷。", params: { triggerEvery: 4, count: 2 } },
      2: { description: "每發射 3 次地雷後,下一發自動變為一次發射 2 顆地雷。", params: { triggerEvery: 3, count: 2 } },
      3: { description: "每發射 3 次地雷後,下一發自動變為一次發射 3 顆呈扇形分佈的地雷。", params: { triggerEvery: 3, count: 3, fan: 1 } },
    },
  },
  gigantism: {
    id: "gigantism", family: "mine", nameZh: "巨大化", nameEn: "Gigantism",
    mechanic: "顯著增加地雷的碰撞體積與碰撞耐久度。",
    boundMemberNo: 9,
    levels: {
      1: { description: "地雷碰撞與感應半徑增加 25%,碰撞重量 +30%。", params: { radiusBonus: 0.25, weightBonus: 0.30 } },
      2: { description: "碰撞半徑增加 45%,碰撞重量 +50%。", params: { radiusBonus: 0.45, weightBonus: 0.50 } },
      3: { description: "碰撞半徑增加 70%,碰撞重量 +80%。", params: { radiusBonus: 0.70, weightBonus: 0.80 } },
    },
  },
  interception_field: {
    id: "interception_field", family: "mine", nameZh: "擦彈護體", nameEn: "Interception Field",
    mechanic: "地雷在自身周圍生成一圈強烈的減速偏轉力場。",
    boundMemberNo: 14,
    levels: {
      1: { description: "以地雷為中心,生成 2 倍半徑的干擾領域,使進入領域的敵方單位與其子彈速度降低 20%。", params: { radiusMult: 2.0, slowRatio: 0.20 } },
      2: { description: "領域範圍擴大為 2.5 倍半徑,減速效果提升至 35%。", params: { radiusMult: 2.5, slowRatio: 0.35 } },
      3: { description: "領域範圍擴大為 3.0 倍半徑,減速效果提升至 50%。", params: { radiusMult: 3.0, slowRatio: 0.50 } },
    },
  },
  charge: {
    id: "charge", family: "mine", nameZh: "衝鋒", nameEn: "Charge",
    mechanic: "地雷即將消散前,會以死相搏衝向附近的敵人。",
    boundMemberNo: 19,
    levels: {
      1: { description: "在持續時間結束前 1s,以 1.5 倍速度衝擊,爆炸傷害 +20%。", params: { windUpSec: 1.0, speedMult: 1.5, damageBonus: 0.20 } },
      2: { description: "在持續時間結束前 1.5s,以 2.0 倍速度衝擊,爆炸傷害 +40%。", params: { windUpSec: 1.5, speedMult: 2.0, damageBonus: 0.40 } },
      3: { description: "在持續時間結束前 2s,以 2.5 倍速度衝擊,爆炸傷害 +60%。", params: { windUpSec: 2.0, speedMult: 2.5, damageBonus: 0.60 } },
    },
  },
  sentry: {
    id: "sentry", family: "mine", nameZh: "砲台", nameEn: "Sentry",
    mechanic: "地雷靜止部署後化為自動防禦砲台,定時向最近敵方發射小彈丸。",
    levels: {
      1: { description: "每隔 0.8s 向最近敵方發射一顆小彈丸,造成基礎爆炸傷害的 15%。", params: { interval: 0.8, damageRatio: 0.15 } },
      2: { description: "發射頻率提升至每隔 0.6s,造成基礎爆炸傷害的 25%。", params: { interval: 0.6, damageRatio: 0.25 } },
      3: { description: "發射頻率提升至每隔 0.4s,造成基礎爆炸傷害的 35%。", params: { interval: 0.4, damageRatio: 0.35 } },
    },
  },
};

// ============================================================
// 查詢 API
// ============================================================

export function findEnchant(id: EnchantId): EnchantDef | undefined {
  return ENCHANTS[id];
}

export function enchantsByFamily(family: WeaponFamily): EnchantDef[] {
  return Object.values(ENCHANTS).filter((e) => e.family === family);
}
