/**
 * @file world.ts
 * @description 大地圖佈局:四象限世界 + 中央廣場 + 設施/雕像/環境物件擺放。
 *              世界分區沿用舊文件「世界觀與視覺圖鑑」:幾何/有機/分形/機械。
 */

import type { World } from "../legacy/data/成員型別";
import { membersByWorld } from "../legacy/data/成員資料庫";

export const MAP_W = 7200;
export const MAP_H = 7200;
export const CX = MAP_W / 2;
export const CY = MAP_H / 2;
/** 中央廣場半徑 */
export const PLAZA_R = 760;

export const WORLDS: World[] = ["geometry", "organic", "fractal", "mechanical"];

/** 象限配置:幾何 NW、有機 NE、分形 SW、機械 SE */
export function worldAt(x: number, y: number): World {
  if (x < CX) return y < CY ? "geometry" : "fractal";
  return y < CY ? "organic" : "mechanical";
}

export function inPlaza(x: number, y: number): boolean {
  return Math.hypot(x - CX, y - CY) <= PLAZA_R;
}

/** 各世界主色(HUD、小地圖、地板色調) */
export const WORLD_TINT: Record<World, string> = {
  geometry: "#5aa9e6",
  organic: "#63b56a",
  fractal: "#a184d8",
  mechanical: "#c08a52",
};

export const WORLD_NAME: Record<World, string> = {
  geometry: "幾何世界",
  organic: "有機世界",
  fractal: "分形世界",
  mechanical: "機械世界",
};

/** 象限中心點(核心區,T2 精英出沒) */
export const QUADRANT_CENTER: Record<World, { x: number; y: number }> = {
  geometry: { x: MAP_W * 0.25, y: MAP_H * 0.25 },
  organic: { x: MAP_W * 0.75, y: MAP_H * 0.25 },
  fractal: { x: MAP_W * 0.25, y: MAP_H * 0.75 },
  mechanical: { x: MAP_W * 0.75, y: MAP_H * 0.75 },
};

/** 核心區半徑(T2 只在這裡生成) */
export const CORE_R = 1100;

// ============================================================
// 設施
// ============================================================

export type FacilityKind = "altar" | "workshop" | "shop" | "statue" | "cola" | "chest";

export interface Facility {
  id: string;
  kind: FacilityKind;
  world: World | "core";
  x: number;
  y: number;
  /** 顯示半徑(px) */
  r: number;
  /** 雕像:對應成員 id;寶箱:是否已開 */
  memberId?: string;
  opened?: boolean;
}

/** 世界工坊用的熔爐圖(視覺上每世界一族,功能通用) */
export const WORKSHOP_IMG: Record<World, string> = {
  geometry: "family_furnace_shield",
  organic: "family_furnace_multishot",
  fractal: "family_furnace_straight",
  mechanical: "family_furnace_mine",
};

export const PROP_NAMES: Record<World, string[]> = {
  geometry: ["euclidean_pillar", "impossible_prism", "lattice_mineral_node", "refraction_mirror"],
  organic: ["ancient_timber_ore", "giant_ancient_root", "predatory_spore_pod", "venus_flytrap_launcher"],
  fractal: ["fractal_branch_tree", "fractal_cluster_ore", "gravity_vortex", "recursive_gateway"],
  mechanical: ["active_gearing_block", "scrap_iron_pile", "steam_vent_valve", "welded_blast_shield"],
};

export interface PropInstance {
  world: World;
  name: string;
  x: number;
  y: number;
  size: number;
}

export interface MapLayout {
  facilities: Facility[];
  props: PropInstance[];
}

/** 簡單可重現的偽隨機(每局固定佈局的變化版) */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 產生一局的地圖佈局 */
export function generateLayout(seed: number): MapLayout {
  const rnd = mulberry32(seed);
  const facilities: Facility[] = [];
  const props: PropInstance[] = [];

  // 中央 COLA 裝配儀
  facilities.push({ id: "cola-platform", kind: "cola", world: "core", x: CX, y: CY, r: 130 });

  for (const w of WORLDS) {
    const qc = QUADRANT_CENTER[w];
    // 守護者祭壇:核心區中心
    facilities.push({ id: `altar-${w}`, kind: "altar", world: w, x: qc.x, y: qc.y, r: 120 });
    // 工坊(熔爐+合成台合併,見 AUDIT 縮減決策)
    facilities.push({
      id: `workshop-${w}`, kind: "workshop", world: w,
      x: qc.x + 620, y: qc.y - 260, r: 100,
    });
    // 商店
    facilities.push({
      id: `shop-${w}`, kind: "shop", world: w,
      x: qc.x - 620, y: qc.y + 300, r: 100,
    });
    // 五座成員雕像:繞象限中心一圈
    const members = membersByWorld(w);
    members.forEach((m, i) => {
      const ang = (i / members.length) * Math.PI * 2 + rnd() * 0.5;
      const dist = 1500 + rnd() * 700;
      let x = qc.x + Math.cos(ang) * dist;
      let y = qc.y + Math.sin(ang) * dist;
      x = Math.max(300, Math.min(MAP_W - 300, x));
      y = Math.max(300, Math.min(MAP_H - 300, y));
      // 雕像必須留在自己世界的象限裡
      if (worldAt(x, y) !== w || inPlaza(x, y)) {
        x = qc.x + Math.cos(ang) * 900;
        y = qc.y + Math.sin(ang) * 900;
      }
      facilities.push({ id: `statue-${m.id}`, kind: "statue", world: w, x, y, r: 84, memberId: m.id });
    });
    // 環境物件(裝飾)
    for (let i = 0; i < 10; i++) {
      const name = PROP_NAMES[w][Math.floor(rnd() * PROP_NAMES[w].length)];
      let x = 0, y = 0, tries = 0;
      do {
        x = qc.x + (rnd() - 0.5) * 3200;
        y = qc.y + (rnd() - 0.5) * 3200;
        tries++;
      } while ((worldAt(x, y) !== w || inPlaza(x, y) || x < 200 || y < 200 || x > MAP_W - 200 || y > MAP_H - 200) && tries < 12);
      if (tries >= 12) continue;
      props.push({ world: w, name, x, y, size: 150 + rnd() * 130 });
    }
  }
  return { facilities, props };
}

/** 禪繞寶箱刷新位置 */
export function randomChestSpot(rnd: () => number): { x: number; y: number } {
  const w = WORLDS[Math.floor(rnd() * 4)];
  const qc = QUADRANT_CENTER[w];
  let x = 0, y = 0, tries = 0;
  do {
    x = qc.x + (rnd() - 0.5) * 3000;
    y = qc.y + (rnd() - 0.5) * 3000;
    tries++;
  } while ((inPlaza(x, y) || x < 250 || y < 250 || x > MAP_W - 250 || y > MAP_H - 250) && tries < 10);
  return { x, y };
}
