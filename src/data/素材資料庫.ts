/**
 * @file 素材資料庫.ts
 * @description 25 種合成素材(24 生物材料 + 1 通關道具)的完整資料。
 *              對應「doc/角色與敵方/怪物圖鑑.md」素材圖鑑區(no.01~25)。
 *
 *              含:
 *              - 中英名、星級、稀有度、所屬世界
 *              - 外觀描述(供圖鑑頁用)
 *              - 用途(0→1★ / 1→2★ / 2→3★ 升星 / 通關)
 *              - 熔煉與販售價查詢(套用戰鬥原語常數)
 */

import type { World } from "./成員型別";
import {
  LOCAL_BONUS,
  MATERIAL_RARITY_LABEL,
  MATERIAL_SELL_PRICE,
  SHARD_YIELD,
  SHARD_SELL_PRICE,
  type MaterialRarity,
  type MaterialStar,
} from "./戰鬥原語";

// ============================================================
// 素材用途分類(對應升星配方階段)
// ============================================================

export type MaterialUse =
  | "unlock_0to1" // 用於 0→1★ 解鎖
  | "upgrade_1to2" // 用於 1→2★ 升星
  | "upgrade_2to3" // 用於 2→3★ 升星
  | "clear_game"; // 通關道具(COrebound 核心鑰匙)

export const MATERIAL_USE_LABEL: Record<MaterialUse, string> = {
  unlock_0to1: "0→1★ 解鎖",
  upgrade_1to2: "1→2★ 升星",
  upgrade_2to3: "2→3★ 升星",
  clear_game: "通關道具",
};

// ============================================================
// 素材定義
// ============================================================

export interface MaterialDef {
  /** 編號 01~25(對應怪物圖鑑素材圖鑑區) */
  no: number;
  id: string;
  nameZh: string;
  nameEn: string;
  /** 星級(通關道具標 3,作為「最高階」佔位) */
  star: MaterialStar;
  rarity: MaterialRarity;
  /** 所屬世界;通關道具為 "core"(不屬任一世界) */
  world: World | "core";
  /** 外觀描述 */
  visual: string;
  /** 用途 */
  use: MaterialUse;
}

// ============================================================
// 幾何世界素材(01~06)
// ============================================================

const mat01: MaterialDef = { no: 1, id: "g01_orbit", nameZh: "圓周晶軌", nameEn: "Circular Orbit", star: 1, rarity: "common", world: "geometry", visual: "發光且完美的藍色晶體同心細圓環。", use: "unlock_0to1" };
const mat02: MaterialDef = { no: 2, id: "g02_vertex", nameZh: "穩定銳角", nameEn: "Spiky Vertex", star: 1, rarity: "fine", world: "geometry", visual: "三個銳角向外刺出、線條俐落的幾何三角核心。", use: "unlock_0to1" };
const mat03: MaterialDef = { no: 3, id: "g03_path", nameZh: "幾何折線", nameEn: "Linear Path", star: 2, rarity: "common", world: "geometry", visual: "折返對稱、散發淡藍色光芒的規整折線晶片。", use: "upgrade_1to2" };
const mat04: MaterialDef = { no: 4, id: "g04_penrose", nameZh: "不可能幾何", nameEn: "Penrose Void", star: 2, rarity: "fine", world: "geometry", visual: "無法在三維空間中閉合、視覺扭曲的彭羅斯三角晶體。", use: "upgrade_1to2" };
const mat05: MaterialDef = { no: 5, id: "g05_disc", nameZh: "交疊圓盤", nameEn: "Overlapping Disc", star: 3, rarity: "common", world: "geometry", visual: "多個同心圓交疊、呈現神聖比例的魚形橢圓晶片。", use: "upgrade_2to3" };
const mat06: MaterialDef = { no: 6, id: "g06_core", nameZh: "神聖晶核", nameEn: "Sacred Core", star: 3, rarity: "fine", world: "geometry", visual: "結構極其繁複、發出金藍色強光的梅塔特隆立方體核心。", use: "upgrade_2to3" };

// ============================================================
// 有機世界素材(07~12)
// ============================================================

const mat07: MaterialDef = { no: 7, id: "o07_germ", nameZh: "發光胚芽", nameEn: "Glowing Germ", star: 1, rarity: "common", world: "organic", visual: "一顆微小的發光圓形孢子,外圈有柔軟的花粉線條。", use: "unlock_0to1" };
const mat08: MaterialDef = { no: 8, id: "o08_sap", nameZh: "管道汁液", nameEn: "Vein Sap", star: 1, rarity: "fine", world: "organic", visual: "在透明植物導管中緩慢流動的亮綠色能量精華。", use: "unlock_0to1" };
const mat09: MaterialDef = { no: 9, id: "o09_spore", nameZh: "密集孢子包", nameEn: "Mossy Spore", star: 2, rarity: "common", world: "organic", visual: "密集點狀花紋聚集在一起的深綠色苔蘚孢子包。", use: "upgrade_1to2" };
const mat10: MaterialDef = { no: 10, id: "o10_nest", nameZh: "多孔巢脾", nameEn: "Porous Nest", star: 2, rarity: "fine", world: "organic", visual: "呈有機放射性分佈、布滿細密孔洞的蜂巢狀生物硬殼。", use: "upgrade_1to2" };
const mat11: MaterialDef = { no: 11, id: "o11_shell", nameZh: "鈣化骨架", nameEn: "Calcified Shell", star: 3, rarity: "common", world: "organic", visual: "具有完美分叉結構的灰白色鈣化珊瑚骨架。", use: "upgrade_2to3" };
const mat12: MaterialDef = { no: 12, id: "o12_heart", nameZh: "有機核心", nameEn: "Bio-Heart", star: 3, rarity: "fine", world: "organic", visual: "被無數發光葉脈與藤蔓緊緊包裹、緩慢搏動的紅色囊體心臟。", use: "upgrade_2to3" };

// ============================================================
// 分形世界素材(13~18)
// ============================================================

const mat13: MaterialDef = { no: 13, id: "f13_origin", nameZh: "分形起點", nameEn: "Fractal Origin", star: 1, rarity: "common", world: "fractal", visual: "一個簡潔對稱的金色五角星冰晶發生器。", use: "unlock_0to1" };
const mat14: MaterialDef = { no: 14, id: "f14_dust", nameZh: "分角星塵", nameEn: "Branching Dust", star: 1, rarity: "fine", world: "fractal", visual: "從尖角處分裂出更小星芒的淡藍色冰晶粉塵。", use: "unlock_0to1" };
const mat15: MaterialDef = { no: 15, id: "f15_snowflake", nameZh: "雪花結晶", nameEn: "Snowflake Crystal", star: 2, rarity: "common", world: "fractal", visual: "邊緣呈鋸齒狀三角化分形、結構精緻的科赫雪花結晶。", use: "upgrade_1to2" };
const mat16: MaterialDef = { no: 16, id: "f16_lattice", nameZh: "鏤空金格", nameEn: "Hollow Lattice", star: 2, rarity: "fine", world: "fractal", visual: "在金色三角形內不斷挖空嵌套反向三角形的精美幾何金屬片。", use: "upgrade_1to2" };
const mat17: MaterialDef = { no: 17, id: "f17_fold", nameZh: "龍脊折痕", nameEn: "Dragon Fold", star: 3, rarity: "common", world: "fractal", visual: "由無數次對摺折疊而成的龍形曲線狀彩虹色結晶條。", use: "upgrade_2to3" };
const mat18: MaterialDef = { no: 18, id: "f18_abyss", nameZh: "深淵核心", nameEn: "Abyssal Core", star: 3, rarity: "fine", world: "fractal", visual: "一個呈螺旋狀無限收縮、將周圍光線扭曲吸入的黑色幾何透鏡。", use: "upgrade_2to3" };

// ============================================================
// 機械世界素材(19~24)
// ============================================================

const mat19: MaterialDef = { no: 19, id: "k19_ball", nameZh: "拋光鋼珠", nameEn: "Steel Ball", star: 1, rarity: "common", world: "mechanical", visual: "高精度拋光、折射出銀白色金屬寒光的軸承鋼珠。", use: "unlock_0to1" };
const mat20: MaterialDef = { no: 20, id: "k20_cog", nameZh: "黃銅齒距", nameEn: "Brass Cog", star: 1, rarity: "fine", world: "mechanical", visual: "外緣帶有規整嚙合齒距、黃銅質地的精密小齒輪。", use: "unlock_0to1" };
const mat21: MaterialDef = { no: 21, id: "k21_thread", nameZh: "精鋼螺紋", nameEn: "Steel Thread", star: 2, rarity: "common", world: "mechanical", visual: "刻有均勻螺旋螺紋溝槽的厚重精鋼六角螺帽零件。", use: "upgrade_1to2" };
const mat22: MaterialDef = { no: 22, id: "k22_link", nameZh: "鉸鏈連桿", nameEn: "Hinge Linkage", star: 2, rarity: "fine", world: "mechanical", visual: "帶有工業焊接焊縫、液壓鉸鏈與傳動桿的活動關節機構。", use: "upgrade_1to2" };
const mat23: MaterialDef = { no: 23, id: "k23_loop", nameZh: "漆包線圈", nameEn: "Copper Loop", star: 3, rarity: "common", world: "mechanical", visual: "密集成圈纏繞、邊緣閃爍著電火花的亮橙色銅線圈。", use: "upgrade_2to3" };
const mat24: MaterialDef = { no: 24, id: "k24_heart", nameZh: "工業心臟", nameEn: "Industrial Heart", star: 3, rarity: "fine", world: "mechanical", visual: "由曲柄、連桿與微型氣缸組裝而成,伴隨氣壓運作發出規律震動的鑄鐵機構。", use: "upgrade_2to3" };

// ============================================================
// 通關道具(25)
// ============================================================

const mat25: MaterialDef = { no: 25, id: "core_key", nameZh: "COrebound 核心鑰匙", nameEn: "Core Key", star: 3, rarity: "fine", world: "core", visual: "結合了四大繪畫風格紋路(幾何、有機、分形、機械)的同心圓密鑰。", use: "clear_game" };

// ============================================================
// 主資料表
// ============================================================

export const MATERIALS: readonly MaterialDef[] = [
  mat01, mat02, mat03, mat04, mat05, mat06,
  mat07, mat08, mat09, mat10, mat11, mat12,
  mat13, mat14, mat15, mat16, mat17, mat18,
  mat19, mat20, mat21, mat22, mat23, mat24,
  mat25,
];

// ============================================================
// 查詢 API
// ============================================================

export function findMaterial(no: number): MaterialDef | undefined {
  return MATERIALS.find((m) => m.no === no);
}
export function findMaterialById(id: string): MaterialDef | undefined {
  return MATERIALS.find((m) => m.id === id);
}
export function materialsByWorld(world: World): MaterialDef[] {
  return MATERIALS.filter((m) => m.world === world);
}
export function materialsByUse(use: MaterialUse): MaterialDef[] {
  return MATERIALS.filter((m) => m.use === use);
}

/** 取得指定世界、星級、稀有度的素材(升星配方查表用) */
export function findMaterialBySpec(
  world: World,
  star: MaterialStar,
  rarity: MaterialRarity,
): MaterialDef | undefined {
  return MATERIALS.find((m) => m.world === world && m.star === star && m.rarity === rarity);
}

// ============================================================
// 經濟:熔煉與販售計算
// ============================================================

/**
 * 熔煉素材 → 家族碎片數量(機制指南 §5.2)。
 * @param localBonus 是否為同世界地緣熔煉(+20%,機制指南 §5.3)
 */
export function shardFromMaterial(mat: MaterialDef, localBonus = false): number {
  if (mat.world === "core") return 0; // 通關道具不可熔煉
  const base = SHARD_YIELD[mat.star][mat.rarity];
  return localBonus ? Math.round(base * (1 + LOCAL_BONUS)) : base;
}

/**
 * 販售素材 → 原石數量(機制指南 §8.4)。
 * @param localBonus 是否為同世界地緣販售(+20%)
 */
export function sellPriceOfMaterial(mat: MaterialDef, localBonus = false): number {
  if (mat.world === "core") return 0; // 通關道具不可販售
  const base = MATERIAL_SELL_PRICE[mat.star][mat.rarity];
  return localBonus ? Math.round(base * (1 + LOCAL_BONUS)) : base;
}

/** 販售家族碎片 → 原石(機制指南 §8.4) */
export function sellPriceOfShard(count: number): number {
  return count * SHARD_SELL_PRICE;
}

/** 完整描述字串(供圖鑑頁用) */
export function describeMaterial(mat: MaterialDef): string {
  const rarity = MATERIAL_RARITY_LABEL[mat.rarity];
  return `${mat.no}. ${mat.nameZh} (${mat.nameEn}) [${mat.star}★ ${rarity}]`;
}
