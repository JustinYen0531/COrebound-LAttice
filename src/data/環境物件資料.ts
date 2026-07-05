/**
 * @file 環境物件資料.ts
 * @description 四大世界的戰場環境物件固定擺位資料層。
 *
 * 圖示來源：assets/{世界}物件.png 立繪參考圖，已裁切去背成獨立 PNG，
 * 放在 assets/images/props/environment_objects/{world}/，由 vite publicDir 直接served。
 *
 * 本輪先把戰場擺位改成固定版：每一種環境物件全地圖只放 1 個，
 * 並且四個世界都用均勻分散的錨點配置，避免同類物件擠在一起。
 */
import type { World } from "./成員型別";
import { MAP_OBJECTS } from "./地圖物件資料";

export type 環境物件類別 = "障礙物" | "資源礦物" | "環境機關";

export interface 環境物件圖鑑項 {
  id: string;
  world: World;
  category: 環境物件類別;
  nameZh: string;
  nameEn: string;
  iconPath: string;
  count: number;
  destructible: boolean;
  weight?: number; // 碰撞重量，無限重量(不可破壞)時省略
  mechanicText: string;
}

export interface EnvObjectInstance {
  id: string;
  catalogId: string;
  world: World;
  category: 環境物件類別;
  nameZh: string;
  iconPath: string;
  x: number;
  y: number;
  destructible: boolean;
  weight?: number;
  mechanicText: string;
}

// ============================================================
// 一、各世界物件圖鑑（4 類 × 4 世界 = 16 項），數量取自世界觀與視覺圖鑑.md §9.3
// ============================================================
export const 環境物件圖鑑: 環境物件圖鑑項[] = [
  // ---- 幾何世界 ----
  {
    id: "euclidean_pillar",
    world: "geometry",
    category: "障礙物",
    nameZh: "幾何晶體石柱",
    nameEn: "Euclidean Pillar",
    iconPath: "/images/props/environment_objects/geometry/euclidean_pillar.png",
    count: 20,
    destructible: true,
    weight: 30,
    mechanicText: "中等碰撞重量，子彈撞擊扣減重量直至消散，可被 1★ 稜鏡附魔反彈。",
  },
  {
    id: "impossible_prism",
    world: "geometry",
    category: "障礙物",
    nameZh: "不可能稜鏡",
    nameEn: "Impossible Prism",
    iconPath: "/images/props/environment_objects/geometry/impossible_prism.png",
    count: 8,
    destructible: false,
    mechanicText: "永久不可破壞，子彈或碰撞體擊中時以 90°／120° 精確偏轉折射。",
  },
  {
    id: "lattice_mineral_node",
    world: "geometry",
    category: "資源礦物",
    nameZh: "幾何晶格礦脈",
    nameEn: "Lattice Mineral Node",
    iconPath: "/images/props/environment_objects/geometry/lattice_mineral_node.png",
    count: 15,
    destructible: true,
    mechanicText: "擊碎必定掉落幾何世界合成原石與 1 星晶體材料。",
  },
  {
    id: "refraction_mirror",
    world: "geometry",
    category: "環境機關",
    nameZh: "折射鏡面陷阱",
    nameEn: "Refraction Mirror",
    iconPath: "/images/props/environment_objects/geometry/refraction_mirror.png",
    count: 6,
    destructible: false,
    mechanicText: "撞擊鏡面時子彈改變為當前垂直折射軌跡，小隊經過受輕微物理反推力。",
  },

  // ---- 有機世界 ----
  {
    id: "giant_ancient_root",
    world: "organic",
    category: "障礙物",
    nameZh: "巨型古木樹根",
    nameEn: "Giant Ancient Root",
    iconPath: "/images/props/environment_objects/organic/giant_ancient_root.png",
    count: 18,
    destructible: true,
    weight: 60,
    mechanicText: "堅韌障礙，小隊藏身後方可抵擋大量直線子彈的逐層穿透。",
  },
  {
    id: "predatory_spore_pod",
    world: "organic",
    category: "障礙物",
    nameZh: "捕食者孢子囊",
    nameEn: "Predatory Spore Pod",
    iconPath: "/images/props/environment_objects/organic/predatory_spore_pod.png",
    count: 12,
    destructible: true,
    weight: 20,
    mechanicText: "受撞擊破裂時生成持續 3 次傷害 Tick 的毒霧區，區內移動速度降低 30%。",
  },
  {
    id: "ancient_timber_ore",
    world: "organic",
    category: "資源礦物",
    nameZh: "古木原石礦",
    nameEn: "Ancient Timber Ore",
    iconPath: "/images/props/environment_objects/organic/ancient_timber_ore.png",
    count: 15,
    destructible: true,
    mechanicText: "擊碎必定掉落有機原石與 1 星孢子／菌絲材料。",
  },
  {
    id: "venus_flytrap_launcher",
    world: "organic",
    category: "環境機關",
    nameZh: "捕蠅草彈射板",
    nameEn: "Venus Flytrap Launcher",
    iconPath: "/images/props/environment_objects/organic/venus_flytrap_launcher.png",
    count: 8,
    destructible: false,
    mechanicText: "踏上草瓣會被瞬間合攏並朝葉尖方向彈射 5 距離單位，可用於快速位移或逃生。",
  },

  // ---- 分形世界 ----
  {
    id: "fractal_branch_tree",
    world: "fractal",
    category: "障礙物",
    nameZh: "分形結晶樹",
    nameEn: "Fractal Branch Tree",
    iconPath: "/images/props/environment_objects/fractal/fractal_branch_tree.png",
    count: 22,
    destructible: true,
    weight: 30,
    mechanicText: "每受打擊會朝被擊方向兩側發射 2 顆自相似碎冰子彈（主彈 20% 傷害）。",
  },
  {
    id: "recursive_gateway",
    world: "fractal",
    category: "障礙物",
    nameZh: "遞歸石門",
    nameEn: "Recursive Gateway",
    iconPath: "/images/props/environment_objects/fractal/recursive_gateway.png",
    count: 10,
    destructible: true,
    weight: 50,
    mechanicText: "只阻擋大於門框尺寸的巨型子彈，體積小於 50% 的微型子彈可無損穿過。",
  },
  {
    id: "fractal_cluster_ore",
    world: "fractal",
    category: "資源礦物",
    nameZh: "分形源石簇",
    nameEn: "Fractal Cluster Ore",
    iconPath: "/images/props/environment_objects/fractal/fractal_cluster_ore.png",
    count: 15,
    destructible: true,
    mechanicText: "擊碎必定掉落分形原石與 1 星分形冰晶材料。",
  },
  {
    id: "gravity_vortex",
    world: "fractal",
    category: "環境機關",
    nameZh: "重力扭曲漩渦",
    nameEn: "Gravity Vortex",
    iconPath: "/images/props/environment_objects/fractal/gravity_vortex.png",
    count: 5,
    destructible: false,
    mechanicText: "每隔 1 次傷害 Tick 將半徑 3 內的敵方單位與子彈向中心吸攏，適合聚怪與封鎖彈道。",
  },

  // ---- 機械世界 ----
  {
    id: "welded_blast_shield",
    world: "mechanical",
    category: "障礙物",
    nameZh: "防爆焊接擋板",
    nameEn: "Welded Blast Shield",
    iconPath: "/images/props/environment_objects/mechanical/welded_blast_shield.png",
    count: 16,
    destructible: true,
    weight: 100,
    mechanicText: "極高碰撞耐久，阻擋一切子彈逐層穿透，被閘門撞擊時提供廢鐵回收度。",
  },
  {
    id: "active_gearing_block",
    world: "mechanical",
    category: "障礙物",
    nameZh: "嚙合大型齒輪組",
    nameEn: "Active Gearing Block",
    iconPath: "/images/props/environment_objects/mechanical/active_gearing_block.png",
    count: 8,
    destructible: false,
    mechanicText: "無法破壞，擊中齒輪側邊會沿旋轉切線方向受到強力擊退與位移控制。",
  },
  {
    id: "scrap_iron_pile",
    world: "mechanical",
    category: "資源礦物",
    nameZh: "廢鐵提煉堆",
    nameEn: "Scrap Iron Pile",
    iconPath: "/images/props/environment_objects/mechanical/scrap_iron_pile.png",
    count: 15,
    destructible: true,
    mechanicText: "擊碎必定掉落機械原石與 1 星廢鐵／金屬零件材料。",
  },
  {
    id: "steam_vent_valve",
    world: "mechanical",
    category: "環境機關",
    nameZh: "高壓蒸汽閥門",
    nameEn: "Steam Vent Valve",
    iconPath: "/images/props/environment_objects/mechanical/steam_vent_valve.png",
    count: 8,
    destructible: false,
    mechanicText: "每隔 3 次傷害 Tick 噴射蒸汽 1 秒，順向通過獲得 25% 瞬時加速，敵方則受灼傷。",
  },
];

const ENV_WORLD_ANCHORS: Record<World, Array<{ x: number; y: number }>> = {
  geometry: [
    { x: 980, y: -1180 },
    { x: 2860, y: -1540 },
    { x: 1640, y: -3340 },
    { x: 4380, y: -4180 },
  ],
  organic: [
    { x: -980, y: 1180 },
    { x: -2860, y: 1540 },
    { x: -1640, y: 3340 },
    { x: -4380, y: 4180 },
  ],
  fractal: [
    { x: -980, y: -1180 },
    { x: -2860, y: -1540 },
    { x: -1640, y: -3340 },
    { x: -4380, y: -4180 },
  ],
  mechanical: [
    { x: 980, y: 1180 },
    { x: 2860, y: 1540 },
    { x: 1640, y: 3340 },
    { x: 4380, y: 4180 },
  ],
};

function buildEnvObjects(): EnvObjectInstance[] {
  const usedPoints: Array<{ x: number; y: number }> = MAP_OBJECTS.map((o) => ({ x: o.x, y: o.y }));
  const instances: EnvObjectInstance[] = [];
  const worldAnchorCursor: Record<World, number> = {
    geometry: 0,
    organic: 0,
    fractal: 0,
    mechanical: 0,
  };

  const takeAnchor = (world: World): { x: number; y: number } | null => {
    const anchors = ENV_WORLD_ANCHORS[world];
    while (worldAnchorCursor[world] < anchors.length) {
      const point = anchors[worldAnchorCursor[world]];
      worldAnchorCursor[world] += 1;
      const isClear = usedPoints.every((used) => Math.hypot(used.x - point.x, used.y - point.y) >= 620);
      if (!isClear) continue;
      usedPoints.push(point);
      return point;
    }
    return null;
  };

  for (const catalog of 環境物件圖鑑) {
    const point = takeAnchor(catalog.world);
    if (!point) continue;
    instances.push({
      id: `${catalog.id}_1`,
      catalogId: catalog.id,
      world: catalog.world,
      category: catalog.category,
      nameZh: catalog.nameZh,
      iconPath: catalog.iconPath,
      x: point.x,
      y: point.y,
      destructible: catalog.destructible,
      weight: catalog.weight,
      mechanicText: catalog.mechanicText,
    });
  }

  return instances;
}

export const ENV_OBJECTS: readonly EnvObjectInstance[] = buildEnvObjects();

export function envObjectsByWorld(world: World): EnvObjectInstance[] {
  return ENV_OBJECTS.filter((o) => o.world === world);
}

export const ENV_OBJECT_EXPECTED_TOTAL = ENV_OBJECTS.length;
