/**
 * @file types.ts
 * @description 戰鬥 HUD 的型別定義、規格常數與互動狀態機型別。
 *              所有數值常數嚴格對應「玩家介面_戰鬥HUD與操作骨架.md」。
 *
 *              本檔只放型別與常數,不放實作邏輯。
 */

// ============================================================
// 一、尺寸常數(對應規格 §1.2,以 1920×1080 為設計基準)
// ============================================================

export const SIZE = {
  /** 隊長頭像直徑 (px) — 規格 §1.2 */
  AVATAR_DIAMETER: 96,
  /** 生命條寬 (px) — 規格 §1.2 */
  HEALTH_BAR_W: 200,
  /** 生命條高 (px) — 規格 §1.2 */
  HEALTH_BAR_H: 40,
  /** 能量條寬 (px) — 規格 §1.2 */
  ENERGY_BAR_W: 200,
  /** 能量條高 (px) — 規格 §1.2 */
  ENERGY_BAR_H: 40,
  /** 核心區距螢幕底部 (px) — 規格 §1.2 */
  CORE_BOTTOM: 40,
  /** 武器群組小圖示尺寸 (px) — 規格 §4.3 */
  WEAPON_ICON: 36,
  /** 週期/自動施法小圖示尺寸 (px) — 規格 §4.4 */
  PERIODIC_ICON: 32,
} as const;

// ============================================================
// 二、展開時序常數(對應規格 §2.1)
// ============================================================

export const TIMING = {
  /** 停留多久後開始展開 (ms) — 規格 §2.1 階段1 */
  HOVER_TO_EXPAND: 500,
  /** 單圈淡入時長 (ms) — 規格 §2.1 */
  RING_FADE_MS: 250,
  /** 兩圈之間的延遲 (ms) — 規格 §2.1 */
  RING_GAP_MS: 200,
  /** 離開後的收回緩衝 (ms) — 規格 §2.1 */
  RETRACT_BUFFER_MS: 300,
  /** 單圈收回時長 (ms) — 規格 §2.1 */
  RING_RETRACT_MS: 150,
} as const;

// ============================================================
// 三、滑動與防誤觸門檻(對應規格 §3.3、§6.2)
// ============================================================

export const THRESHOLD = {
  /** 「視為不動」的最大位移 (px) — 規格 §3.2、§6.2 */
  HOLD_TOLERANCE: 8,
  /** 點擊 vs 拖曳分界 (px) — 規格 §6.2 */
  CLICK_VS_DRAG: 8,
  /** 滑動完全無反應帶上界 (px) — 規格 §3.3 */
  SWIPE_DEAD: 8,
  /** 滑動觸發鎖定門檻 (px) — 規格 §3.3 */
  SWIPE_LOCK: 40,
  /** 抽屜自動吸附的分界 (0~1,展開比例) — 規格 §3.3 */
  DRAWER_SNAP: 0.5,
} as const;

// ============================================================
// 四、自動收回時序(對應規格 §3.5、§6.6)
// ============================================================

export const AUTO_DISMISS = {
  /** 開始移動後延多久收回抽屜 (ms) — 規格 §3.5 */
  AFTER_MOVE_MS: 500,
  /** 滑鼠離開 HUD 區多久後收回 (ms) — 規格 §3.5、§6.6 */
  AFTER_LEAVE_MS: 3000,
  /** 戰鬥抑制(受擊後多久內禁止展開)(ms) — 規格 §6.3 */
  COMBAT_SUPPRESS_MS: 1000,
} as const;

// ============================================================
// 五、生命條階梯(對應規格 §1.3)
// ============================================================

export const HEALTH_STAGE = {
  FULL: 1.0,
  WARN: 0.7,
  DANGER: 0.3,
} as const;

// ============================================================
// 六、職責槽位顏色(對應規格 §2.2 — 採藍/紅/黃補充版)
// ============================================================

export type Role = "protect" | "firepower" | "supply";

// 與 src/style.css 的 --role-protect / --role-fire / --role-supply 同值，
// 確保 HUD 與地圖圖層的職責色標全專案統一。
export const ROLE_COLOR: Record<Role, string> = {
  protect: "#4d8dff", // 藍 — 保護位
  firepower: "#ff4d5e", // 紅 — 火力位
  supply: "#ffd24d", // 黃 — 補給位
};

export const ROLE_LABEL: Record<Role, string> = {
  protect: "保護",
  firepower: "火力",
  supply: "補給",
};

/** 槽位在圈內的順時針排列順序 — 規格 §2.2 */
export const ROLE_ORDER: Role[] = ["protect", "firepower", "supply"];

// ============================================================
// 七、層位
// ============================================================

export type Layer = "inner" | "middle" | "outer";

export const LAYER_RADIUS = {
  /** 最內圈半徑 = 頭像半徑 + 48 — 規格 §2.2 */
  inner: 96,
  /** 中間圈半徑 — 規格 §2.2 */
  middle: 136,
  /** 最外圈半徑 — 規格 §2.2 */
  outer: 176,
} as const;

/** 各層旋轉方向(相鄰相反)— 規格 §2.3 */
export const LAYER_SPIN: Record<Layer, { dir: 1 | -1; speed: number }> = {
  inner: { dir: 1, speed: 8 }, // 順時針,最慢
  middle: { dir: -1, speed: 14 }, // 逆時針,中
  outer: { dir: 1, speed: 22 }, // 順時針,最快
};

// ============================================================
// 八、技能種類(對應規格 §4)
// ============================================================

export type WeaponFamily = "shield" | "multishot" | "straight" | "mine" | "laser";

export const FAMILY_LABEL: Record<WeaponFamily, string> = {
  shield: "護盾",
  multishot: "多發",
  straight: "直線",
  mine: "地雷",
  laser: "激光",
};

// ============================================================
// 九、互動狀態(對應規格 §3.6 狀態機)
// ============================================================

export type HudState =
  | "idle" // 平常,只見核心三件組
  | "hover_hint" // 滑鼠進入核心區,顯示可滑提示
  | "ring_expanding" // 同心圓展開中
  | "ring_full" // 三層全開
  | "left_open" // 左滑抽屜開
  | "right_open"; // 右滑抽屜開

// ============================================================
// 十、HUD 對外讀取的「遊戲狀態」介面
//   (本檔只定義形狀;實際由模擬層或未來戰鬥系統提供)
// ============================================================

export interface MemberSlot {
  /** 該層該職責是否有人 */
  occupied: boolean;
  /** 該成員當前生命比例 0~1(無人則忽略) */
  hpRatio: number;
  /** 是否有護盾 — 規格 §2.2(有護盾 → 槽位外框轉灰) */
  shielded: boolean;
  /** 該成員是否已死亡(死亡 → 虛線外框) */
  dead: boolean;
  /** 小頭像文字標記(例如成員編號或縮寫) */
  label: string;
}

/** 三層 × 三職責 = 9 個槽位的快照 */
export type FormationGrid = Record<Layer, Record<Role, MemberSlot>>;

/** 武器群組技能狀態(規格 §4.3) */
export interface WeaponGroupState {
  family: WeaponFamily;
  star: 1 | 2 | 3;
  /** 冷卻進度 0~1(1 = 冷卻完成) */
  cooldownRatio: number;
  /** 是否啟用中 */
  active: boolean;
  /** 是否因家族人數不足被強制停用 */
  disabledByRoster: boolean;
}

/** 週期/自動施法技能狀態(規格 §4.4) */
export interface PeriodicSkillState {
  id: string;
  label: string;
  /** 充能/累積進度 0~1(1 = 滿,即將觸發) */
  chargeRatio: number;
  /** 是否為週期(靠移動距離)還是自動施法(靠 Tick) */
  kind: "periodic" | "auto";
}

/** 隊長主動技能狀態(規格 §4.2) */
export interface ActiveSkillState {
  label: string;
  /** 冷卻進度 0~1(1 = 可施放) */
  cooldownRatio: number;
  energyCost: number;
  /** 能量是否足夠 */
  energyEnough: boolean;
  /** 施放延遲(防連發)是否進行中 */
  castLatency: boolean;
  cooldownRemaining: number;
}

export interface PartyVital {
  id: string;
  label: string;
  current: number;
  max: number;
  ratio: number;
  star: 1 | 2 | 3 | 4;
  isCaptain: boolean;
  layer?: Layer;
  role?: Role;
}

/** 完整的 HUD 資料快照,每幀由上層推入 */
export interface HudSnapshot {
  captainId: string;
  /** 隊長代表色(影響生命條與頭像主色) */
  captainColor: string;
  captainPortraitUrl?: string;
  captainStar: 1 | 2 | 3 | 4;
  hpCurrent: number;
  hpMax: number;
  /** 當前生命比例 0~1 */
  hpRatio: number;
  /** 護盾比例 0~1(相對於最大生命) */
  shieldRatio: number;
  energyCurrent: number;
  energyMax: number;
  /** 當前能量比例 0~1 */
  energyRatio: number;
  /** 主動技能 */
  active: ActiveSkillState;
  /** 武器群組(最多 4 個) */
  weapons: WeaponGroupState[];
  /** 週期/自動施法技能 */
  periodics: PeriodicSkillState[];
  /** 三層陣型槽位 */
  formation: FormationGrid;
  /** 最近一次受擊時間戳(ms);用於戰鬥抑制 — 規格 §6.3 */
  lastHitAt: number;
  /** 小隊是否正在移動(影響展開/旋轉) */
  moving: boolean;
  tickProgress: number;
  tickPulseAt: number;
  /** 背包:可拖曳藥水(右滑抽屜用) */
  potions: PotionItem[];
  /** 隊員狀態條資料(右滑抽屜用) */
  roster: RosterMember[];
  /** 三層狀態卡目前顯示中的隊員 */
  layerRoster: Record<Layer, RosterMember | null>;
  /** 生命值面板懸浮時顯示的全隊明細 */
  partyVitals: PartyVital[];
}

export interface PotionItem {
  id: string;
  label: string;
  /** "small" 不需確認; "big" 需要 3s 確認 — 規格 §6.5 */
  size: "small" | "big";
  /** 作用類型 */
  effect: "hp" | "energy" | "hybrid";
  /** 剩餘數量 */
  count: number;
}

export interface RosterMember {
  id: string;
  label: string;
  /** 頭像使用的成員星級。 */
  star?: 1 | 2 | 3;
  layer: Layer;
  role: Role;
  hpCurrent: number;
  hpMax: number;
  hpRatio: number;
  shielded: boolean;
  dead: boolean;
  /** 異常狀態 */
  ailments: string[];
}

// ============================================================
// 十一、回呼事件(HUD → 遊戲)
// ============================================================

export type HudEvent =
  | { type: "cast_active" } // 玩家施放隊長主動技能
  | { type: "toggle_weapon"; family: WeaponFamily } // 左滑抽屜內切換武器群組
  | { type: "use_potion"; potionId: string; onMemberId: string | null } // 使用藥水(null=隊長)
  | { type: "cycle_roster_role"; direction: -1 | 1 } // 三層同步切換防守、進攻、效果位
  | { type: "open_management"; focusMemberId?: string } // 點圓圈進管理介面
  | { type: "interact_prompt" }; // 驚嘆號被點(本骨架僅記錄)
