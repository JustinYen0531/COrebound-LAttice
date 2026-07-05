import legacyManagementCss from "./legacy-management.css?raw";
import type { Sim } from "./sim";
import type { RunState } from "./state";
import type { World } from "../data/成員型別";
import type { 互動設施, 管理介面分頁 } from "../ui/共用型別";
import { MATERIALS } from "../data/素材資料庫";
import * as 舊背包 from "../economy/背包狀態";
import { 應用程式狀態 as 舊應用程式狀態 } from "../ui/應用程式狀態";
import { 渲染管理介面 } from "../ui/頁面/管理介面";
import { 設定正式玩家位置 } from "../ui/正式戰場狀態";
import { 重置對局進度, 標記守護者已召喚, 擊敗守護者, 記錄世界擊殺, 標記COLA已召喚 } from "../ui/對局進度狀態";

let 已訂閱 = false;
let 已啟動世界時鐘 = false;
let 目前重繪: (() => void) | null = null;
const LEGACY_STYLE_ID = "legacy-management-global-style";

const 藥水映射 = {
  hpS: "hp_small",
  hpL: "hp_big",
  enS: "energy_small",
  enL: "energy_big",
} as const;

function worldKeys(): World[] {
  return ["geometry", "organic", "fractal", "mechanical"];
}

function mapFacilityToLegacyTab(kind: "workshop" | "shop" | "altar" | "statue" | "cola" | null): 互動設施 | null {
  if (kind === "workshop") return "合成";
  if (kind === "shop") return "商店";
  if (kind === "statue") return "雕像";
  if (kind === "altar" || kind === "cola") return "召喚";
  return null;
}

function detectNearbyFacility(sim: Sim): 互動設施 | null {
  for (const facility of sim.layout.facilities) {
    const d = Math.hypot(facility.x - sim.px, facility.y - sim.py);
    if (d < facility.r + sim.squadR + 40) {
      return mapFacilityToLegacyTab(facility.kind === "cola" ? "cola" : facility.kind);
    }
  }
  return null;
}

function hydrateLegacyBag(state: RunState): void {
  舊背包.重置背包(state.gems);
  for (const material of MATERIALS) {
    const count = state.materials.get(material.id) ?? 0;
    if (count > 0) 舊背包.加入材料(material.no, count);
  }
  for (const family of ["shield", "multishot", "straight", "mine", "laser"] as const) {
    const count = state.shards.get(family) ?? 0;
    if (count > 0) 舊背包.加入碎片(family, count);
  }
  for (const [key, id] of Object.entries(藥水映射) as Array<[keyof typeof 藥水映射, (typeof 藥水映射)[keyof typeof 藥水映射]]>) {
    const count = state.potions[key];
    if (count > 0) 舊背包.加入藥水(id, count);
  }
}

function hydrateLegacyProgress(state: RunState): void {
  重置對局進度();
  for (const world of worldKeys()) {
    const progress = state.progress[world];
    for (let i = 0; i < progress.t1Kills; i += 1) 記錄世界擊殺(world, 1);
    for (let i = 0; i < progress.t2Kills; i += 1) 記錄世界擊殺(world, 2);
    if (progress.guardianSummoned || progress.guardianDefeated) 標記守護者已召喚(world);
    if (progress.guardianDefeated) 擊敗守護者(world);
  }
  if (state.colaSummoned) 標記COLA已召喚();
}

function hydrateLegacyUiState(sim: Sim, state: RunState, initialTab: 管理介面分頁): void {
  舊應用程式狀態.畫面 = { 層: "管理介面", 分頁: initialTab, 訓練道場: false };
  舊應用程式狀態.額外.選中隊長 = state.captainId;
  舊應用程式狀態.額外.世界時鐘秒數 = Math.floor(state.timeSec);
  舊應用程式狀態.額外.縮圈警戒 = sim.erosionStartsIn() <= 0;
  舊應用程式狀態.額外.靠近的互動設施 = detectNearbyFacility(sim);
  舊應用程式狀態.額外.互動選中設施 = 舊應用程式狀態.額外.靠近的互動設施;
  設定正式玩家位置({ x: sim.px, y: sim.py });
}

export function 掛載舊管理介面(host: HTMLElement, sim: Sim, state: RunState, onExit: () => void): void {
  let styleTag = document.getElementById(LEGACY_STYLE_ID) as HTMLStyleElement | null;
  if (!styleTag) {
    styleTag = document.createElement("style");
    styleTag.id = LEGACY_STYLE_ID;
    styleTag.textContent = legacyManagementCss;
    document.head.appendChild(styleTag);
  }

  host.innerHTML = "";
  const root = document.createElement("div");
  root.className = "legacy-management-root-host";
  host.appendChild(root);

  if (!已訂閱) {
    舊應用程式狀態.訂閱(() => {
      目前重繪?.();
    });
    已訂閱 = true;
  }
  if (!已啟動世界時鐘) {
    舊應用程式狀態.啟動世界時鐘();
    已啟動世界時鐘 = true;
  }

  const 重繪 = () => {
    if (舊應用程式狀態.畫面.層 !== "管理介面") {
      onExit();
      return;
    }
    hydrateLegacyBag(state);
    hydrateLegacyProgress(state);
    hydrateLegacyUiState(sim, state, 舊應用程式狀態.畫面.分頁);
    渲染管理介面(root);
  };

  目前重繪 = 重繪;
  hydrateLegacyBag(state);
  hydrateLegacyProgress(state);
  hydrateLegacyUiState(sim, state, "小隊");
  渲染管理介面(root);
}
