/**
 * @file 世界地圖層.ts
 * @description 戰鬥畫面的世界地圖檢視層。
 *
 *              本版改為：
 *              - 連續式移動(按住 WASD 持續位移)
 *              - 玩家固定在鏡頭中央，世界在後方滑動
 *              - 互動物件依程序生成結果散佈
 */

import { 應用程式狀態 } from "../應用程式狀態";
import {
  取得訓練召喚敵群,
  取得訓練道場摘要,
  手動設定訓練玩家生命,
  覆蓋訓練敵群,
  記錄訓練碰撞,
  設定訓練碰撞接觸中,
  type 訓練召喚敵人,
} from "../訓練道場狀態";
import {
  取得正式小隊摘要,
  手動設定正式玩家生命,
  回滿正式玩家生命,
  正式玩家已陣亡,
} from "../正式對局小隊狀態";
import { 取得訓練小隊成員 } from "../訓練道場狀態";
import { ProjectilePool, type Projectile } from "../../combat/投射物系統";
import { detectHits, resolveProjectileHit } from "../../combat/碰撞解析";
import { PLAYABLE_FAMILIES, FAMILY_FIRE_PERIOD } from "../../data/戰鬥原語";
import { STAR_MULTIPLIER, type StarLevel } from "../../data/成員型別";
import { computeFamilyWeaponStatus, type DeployedMember } from "../../skills/技能管理";
import { MEMBERS } from "../../data/成員資料庫";
import { findMonster } from "../../data/怪物資料庫";
import { rollMonsterDrop } from "../../economy/資源掉落系統";
import * as 背包 from "../../economy/背包狀態";
import {
  升星上陣隊員,
  取得上陣養成,
  小隊屬性摘要,
  隊員累計總星級,
  當前隊長星級,
} from "../../progression/養成狀態";
import { 刷新正式最大生命 } from "../正式對局小隊狀態";
import { smelt } from "../../economy/熔爐熔煉";
import { worldGuardian, finalBoss, type MonsterDef } from "../../data/怪物資料庫";
import {
  記錄世界擊殺,
  可召喚守護者,
  標記守護者已召喚,
  擊敗守護者,
  可召喚COLA,
  標記COLA已召喚,
  對局進度摘要,
} from "../對局進度狀態";
import { EROSION_DAMAGE_RATIO_PER_TICK } from "../../data/戰鬥原語";
import { controlEffectAtStar } from "../../data/控制引擎";
import {
  FACILITY_GLYPH,
  MAP_HORIZONTAL_DIVIDER,
  MAP_BOUNDS,
  MAP_OBJECTS,
  MAP_VERTICAL_DIVIDER,
  MAP_ZONES,
  PLAZA_RADIUS,
  REGION_DIRECTION,
  REGION_LABEL,
  nearbyObjects,
  type MapObject,
  type MapZone,
  type Region,
} from "../../data/地圖物件資料";
import { ENV_OBJECTS, type EnvObjectInstance } from "../../data/環境物件資料";
import type { MonsterInstance } from "../../data/怪物實例資料";
import { decideEnemyAction } from "../../enemies/敵人AI";
import { circlesOverlap, settleContactTick } from "../../combat/碰撞解析";
import { TICK_SECONDS } from "../../data/戰鬥原語";
import type { Family, World } from "../../data/成員型別";
import { buildEinsteinHatSupertile, type EinsteinPoint } from "../../world/愛因斯坦地板";
import { 建立玩家標記圖騰 } from "./玩家標記圖騰";
import { buildPenroseSupertile, type PenrosePoint } from "../../world/彭羅斯地板";
import { buildEscherBirdField, type EscherPoint } from "../../world/艾雪鳥地板";
import { buildCairoField, type CairoPoint } from "../../world/開羅五邊形地板";
import {
  標記驗收結果,
  記錄驗收擊殺,
  設定驗收事件,
} from "../驗收場狀態";
import type { CaptainId } from "../../data/戰鬥原語";
import { 計算主動技能效果, type 主動技能情境 } from "../../captain/主動技能效果";
import {
  結束對局,
  記錄守護者擊敗,
  記錄對局傷害,
  記錄對局掉落,
  記錄對局擊殺,
  記錄對局死亡,
} from "../對局戰報狀態";
import type { ChestOpenResult } from "../../economy/寶箱系統";
import {
  取得未開世界寶箱,
  同步世界寶箱,
  標記世界寶箱已開啟,
  type WorldChestInstance,
} from "../世界寶箱狀態";
import {
  加入正式戰場怪物,
  取得正式戰場怪物,
  取得正式玩家位置,
  設定正式玩家位置,
  type 正式戰場怪物,
} from "../正式戰場狀態";
import {
  取得死亡遺落物,
  拾取死亡遺落物,
  新增死亡遺落物,
  type 死亡遺落物,
} from "../死亡遺落狀態";
import { 取出Boss召喚 } from "../Boss召喚佇列";

const WORLD_OBJECT_SIZE_AT_REFERENCE_ZOOM = 800;
const WORLD_OBJECT_FOOTPRINT_RADIUS = 150;

// 怪物 token 比場景物件小，依 Tier 微調：T2 精英最大、T0 資源怪最小。
const MONSTER_SIZE_AT_REFERENCE_ZOOM: Record<0 | 1 | 2, number> = {
  0: 300,
  1: 360,
  2: 440,
};
// 怪物 CombatStats.speed（約 200~300）換算成世界座標移動速度的比例，使其與玩家步速相當。
const MONSTER_SPEED_SCALE = 0.16;
// 只有距離玩家這麼近的怪物才跑 AI／移動，遠處待命，避免全圖 200 隻同時朝玩家聚集。
const MONSTER_ACTIVE_RADIUS = 2600;

const MOVE_SPEED = 42;
const MOVE_ACCELERATION = 860;
const MOVE_DECELERATION = 1280;
const VIEW_PADDING = 140;
// 正交斜俯視：只壓縮地面縱深，場景物件與 HUD 仍保持直立比例。
const GROUND_DEPTH_SCALE = 0.6;
const PLAYER_SIZE_AT_REFERENCE_ZOOM = 140;
const REFERENCE_CAMERA_ZOOM = 2.43;
const DEFAULT_CAMERA_ZOOM = 3.7;
const WORLD_OBJECT_REFERENCE_CAMERA_ZOOM = DEFAULT_CAMERA_ZOOM;
const MIN_CAMERA_ZOOM = 0.85;
const MAX_CAMERA_ZOOM = 4.0;
const ENABLE_DETAILED_WORLD_FLOORS = true;
const ENABLE_LIGHTWEIGHT_WRINKLE_FLOORS = true;
const ENABLE_DETAILED_FLOOR_TEXTURES = false;
let cameraZoom = DEFAULT_CAMERA_ZOOM;

const GUARDIAN_ALTAR_IMAGE: Record<World, string> = {
  geometry: "/images/props/facilities/altars/guardian_altar_geometry.png",
  organic: "/images/props/facilities/altars/guardian_altar_organic.png",
  fractal: "/images/props/facilities/altars/guardian_altar_fractal.png",
  mechanical: "/images/props/facilities/altars/guardian_altar_mechanical.png",
};

const FAMILY_FURNACE_IMAGE: Record<Family, string> = {
  shield: "/images/props/facilities/furnaces/family_furnace_shield.png",
  multishot: "/images/props/facilities/furnaces/family_furnace_multishot.png",
  straight: "/images/props/facilities/furnaces/family_furnace_straight.png",
  mine: "/images/props/facilities/furnaces/family_furnace_mine.png",
  laser: "/images/props/facilities/furnaces/family_furnace_laser.png",
};

// 工作台與流浪商店：全種類共用單張去背圖，不分家族／世界。
const WORKBENCH_IMAGE = "/images/props/facilities/workbenches/workbench.png";
const SHOP_IMAGE = "/images/props/facilities/shops/shop.png";

const LIGHTWEIGHT_WRINKLE_FLOOR_IMAGE: Record<World, string> = {
  geometry: "/images/maps/wrinkles/geometry.png",
  organic: "/images/maps/wrinkles/organic.png",
  fractal: "/images/maps/wrinkles/fractal.png",
  mechanical: "/images/maps/wrinkles/mechanical.png",
};

let playerPos = { x: 0, y: 0 };
let playerMoving = false;

type 可見怪物實例 = MonsterInstance | 訓練召喚敵人;

const BLOCKING_WORLD_OBJECTS = [
  ...MAP_OBJECTS.filter((object) => facilityImagePath(object) !== null).map((object) => ({
    x: object.x,
    y: object.y,
    radius: WORLD_OBJECT_FOOTPRINT_RADIUS,
  })),
  ...ENV_OBJECTS.map((env) => ({
    x: env.x,
    y: env.y,
    radius: WORLD_OBJECT_FOOTPRINT_RADIUS,
  })),
];

export function resetPlayerPos(): void {
  playerPos = { x: 0, y: 0 };
  playerMoving = false;
  cameraZoom = DEFAULT_CAMERA_ZOOM;
}

export function 讀取玩家位置(): { x: number; y: number } {
  return { ...playerPos };
}

export function 讀取玩家移動狀態(): boolean {
  return playerMoving;
}

function clampPlayerPosition(next: { x: number; y: number }): { x: number; y: number } {
  return {
    x: Math.max(MAP_BOUNDS.minX, Math.min(MAP_BOUNDS.maxX, next.x)),
    y: Math.max(MAP_BOUNDS.minY, Math.min(MAP_BOUNDS.maxY, next.y)),
  };
}

function keepOutsideBlockingGround(next: { x: number; y: number }, current: { x: number; y: number }): { x: number; y: number } {
  let safe = next;

  for (const zone of BLOCKING_WORLD_OBJECTS) {
    const dx = safe.x - zone.x;
    const dy = safe.y - zone.y;
    const distance = Math.hypot(dx, dy);
    if (distance >= zone.radius || distance === 0) {
      if (distance !== 0) continue;
      const fallbackDx = current.x - zone.x;
      const fallbackDy = current.y - zone.y;
      const fallbackDistance = Math.hypot(fallbackDx, fallbackDy);
      if (fallbackDistance === 0) {
        safe = { x: zone.x, y: zone.y + zone.radius };
      } else {
        safe = {
          x: zone.x + (fallbackDx / fallbackDistance) * zone.radius,
          y: zone.y + (fallbackDy / fallbackDistance) * zone.radius,
        };
      }
      continue;
    }

    safe = {
      x: zone.x + (dx / distance) * zone.radius,
      y: zone.y + (dy / distance) * zone.radius,
    };
  }

  return safe;
}

function clampTraversablePlayerPosition(next: { x: number; y: number }, current: { x: number; y: number }): { x: number; y: number } {
  return keepOutsideBlockingGround(clampPlayerPosition(next), current);
}

function syncNearbyToState(): void {
  const near = nearbyObjects(playerPos);
  const nearest = near[0] ?? null;
  if (
    應用程式狀態.額外.靠近的互動設施 !== (nearest?.kind ?? null) ||
    應用程式狀態.額外.靠近的地圖物件ID !== (nearest?.id ?? null)
  ) {
    應用程式狀態.模擬靠近設施(nearest?.kind ?? null, nearest?.id ?? null);
  }
}

function worldToScreen(
  point: { x: number; y: number },
  player: { x: number; y: number },
  viewport: { w: number; h: number },
): { x: number; y: number } {
  return {
    x: viewport.w / 2 + (point.x - player.x) * cameraZoom,
    y: viewport.h / 2 + (point.y - player.y) * GROUND_DEPTH_SCALE * cameraZoom,
  };
}

function isVisible(point: { x: number; y: number }, viewport: { w: number; h: number }): boolean {
  return (
    point.x >= -VIEW_PADDING &&
    point.x <= viewport.w + VIEW_PADDING &&
    point.y >= -VIEW_PADDING &&
    point.y <= viewport.h + VIEW_PADDING
  );
}

export function 建立世界地圖層(): HTMLElement {
  const 訓練道場中 =
    應用程式狀態.畫面.層 === "操作頁面" && 應用程式狀態.畫面.訓練道場;
  const 進度模式 = 訓練道場中 ? "dojo" : "formal";
  const root = document.createElement("div");
  root.className = "世界地圖層";
  if (!訓練道場中) playerPos = 取得正式玩家位置();

  const canvas = document.createElement("div");
  canvas.className = "世界地圖層-畫布";
  root.appendChild(canvas);

  const zoneLayer = document.createElement("div");
  zoneLayer.className = "世界地圖層-區域底色";
  canvas.appendChild(zoneLayer);

  const zoneSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  zoneSvg.setAttribute("class", "世界地圖層-區域圖");
  zoneSvg.setAttribute("width", "100%");
  zoneSvg.setAttribute("height", "100%");
  zoneSvg.setAttribute("preserveAspectRatio", "none");
  zoneLayer.appendChild(zoneSvg);

  // 環境物件層放在功能設施層「下面」：障礙物/資源礦/機關是場景裝飾與地形，
  // 熔爐/雕像/商店等互動設施圖示要疊在它們之上，不能被擋住。
  const envLayer = document.createElement("div");
  envLayer.className = "世界地圖層-環境物件圖層";
  canvas.appendChild(envLayer);

  const objectLayer = document.createElement("div");
  objectLayer.className = "世界地圖層-物件圖層";
  canvas.appendChild(objectLayer);

  const regionPaths = createRegionPaths(zoneSvg);
  if (ENABLE_LIGHTWEIGHT_WRINKLE_FLOORS) createLightweightWrinkleFloors(zoneSvg);
  const geometryCoreBoundaries = ENABLE_DETAILED_WORLD_FLOORS ? createGeometryEinsteinFloor(zoneSvg) : [];
  const fractalCoreBoundaries = ENABLE_DETAILED_WORLD_FLOORS ? createFractalPenroseFloor(zoneSvg) : [];
  const organicCoreBoundaries = ENABLE_DETAILED_WORLD_FLOORS ? createOrganicBirdFloor(zoneSvg) : [];
  const mechanicalCoreBoundaries = ENABLE_DETAILED_WORLD_FLOORS ? createMechanicalCairoFloor(zoneSvg) : [];
  const dividerPaths = createDividerPaths(zoneSvg);
  // 區域外框、分界線、地板花紋都是「世界座標固定」的靜態幾何，
  // 不會隨玩家移動改變；只在建圖時設定一次 d 屬性即可，
  // 之後每幀只靠 viewBox 平移鏡頭，避免反覆 setAttribute 觸發瀏覽器重算路徑幾何。
  initRegionPaths(regionPaths, dividerPaths);
  const zoneLabels = MAP_ZONES.map((zone) => createZoneLabel(zone, zoneLayer));
  const objectNodes = new Map<string, HTMLElement>();
  for (const object of MAP_OBJECTS) {
    const node = createObjectNode(object);
    objectLayer.appendChild(node);
    objectNodes.set(object.id, node);
  }

  const chestNodes = new Map<string, HTMLElement>();
  let worldChests: WorldChestInstance[] = [];
  let lastChestSyncSecond = -1;
  const deathDropNodes = new Map<string, HTMLElement>();
  let deathDrops: 死亡遺落物[] = [];

  const envNodes = new Map<string, HTMLElement>();
  for (const env of ENV_OBJECTS) {
    const node = createEnvObjectNode(env);
    envLayer.appendChild(node);
    envNodes.set(env.id, node);
  }

  // 怪物圖層：疊在環境物件之上、玩家之下。每隻怪物有自己的可變位置與 DOM 節點，
  // 由 tick() 依 敵人AI 決策移動，render() 換算成螢幕座標（與玩家共用同一套俯視鏡頭）。
  const monsterLayer = document.createElement("div");
  monsterLayer.className = "世界地圖層-怪物圖層";
  canvas.appendChild(monsterLayer);

  const 初始怪物狀態: Array<{ inst: 可見怪物實例; x: number; y: number; persistent?: 正式戰場怪物 }> = 訓練道場中
    ? 取得訓練召喚敵群().map((inst) => ({ inst, x: inst.x, y: inst.y }))
    : 取得正式戰場怪物().map((persistent) => ({
        inst: persistent.inst,
        x: persistent.x,
        y: persistent.y,
        persistent,
      }));
  const monsters: MonsterRuntime[] = 初始怪物狀態.map(({ inst, x, y, persistent }) => {
    const node = createMonsterNode(inst);
    monsterLayer.appendChild(node);
    return {
      inst,
      pos: { x, y },
      node,
      persistent,
      dropped: persistent?.dropped,
      bossKind: persistent?.bossKind,
      bossWorld: persistent?.bossWorld,
    };
  });

  const playerNode = document.createElement("div");
  playerNode.className = "世界地圖層-玩家";
  playerNode.appendChild(建立玩家標記圖騰({ size: 132, 旋轉: true }));
  playerNode.title = "小隊(玩家)· 中央隊長核心與外圍三環圖騰";
  canvas.appendChild(playerNode);

  const miniMap = document.createElement("div");
  miniMap.className = "世界地圖層-小地圖";
  canvas.appendChild(miniMap);

  const miniMapInner = document.createElement("div");
  miniMapInner.className = "世界地圖層-小地圖內層";
  miniMap.appendChild(miniMapInner);

  const miniSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  miniSvg.setAttribute("class", "世界地圖層-小地圖圖層");
  miniSvg.setAttribute("width", "100%");
  miniSvg.setAttribute("height", "100%");
  miniMapInner.appendChild(miniSvg);

  const miniRegionPaths = createMiniRegionPaths(miniSvg);
  const miniGeometryCore = createMiniGeometryCore(miniSvg);
  const miniFractalCore = createMiniFractalCore(miniSvg);
  const miniOrganicCore = createMiniOrganicCore(miniSvg);
  const miniMechanicalCore = createMiniMechanicalCore(miniSvg);
  const miniDividerPaths = createMiniDividerPaths(miniSvg);
  // 小地圖的區域外框、中央區邊界、分界線同樣是固定幾何，初始化時綁定一次即可，
  // 不再每幀重設 d（中央區邊界含數百個頂點，逐幀重設是移動卡頓的主因）。
  initMiniStaticPaths(
    miniRegionPaths,
    miniGeometryCore,
    geometryCoreBoundaries,
    miniFractalCore,
    fractalCoreBoundaries,
    miniOrganicCore,
    organicCoreBoundaries,
    miniMechanicalCore,
    mechanicalCoreBoundaries,
    miniDividerPaths,
  );
  const miniObjectNodes = new Map<string, HTMLElement>();
  for (const object of MAP_OBJECTS) {
    const node = document.createElement("div");
    node.className = `世界地圖層-小地圖點 世界地圖層-小地圖點-${object.kind}`;
    miniMapInner.appendChild(node);
    miniObjectNodes.set(object.id, node);
  }

  const miniPlayer = document.createElement("div");
  miniPlayer.className = "世界地圖層-小地圖玩家";
  miniMapInner.appendChild(miniPlayer);

  const zoomControl = document.createElement("div");
  zoomControl.className = "世界地圖層-縮放控制";
  zoomControl.title = "滑鼠滾輪或拖曳滑桿調整鏡頭距離";

  const zoomRatio = document.createElement("output");
  zoomRatio.className = "世界地圖層-縮放比例";
  zoomControl.appendChild(zoomRatio);

  const zoomSlider = document.createElement("input");
  zoomSlider.className = "世界地圖層-縮放滑桿";
  zoomSlider.type = "range";
  zoomSlider.min = String(MIN_CAMERA_ZOOM);
  zoomSlider.max = String(MAX_CAMERA_ZOOM);
  zoomSlider.step = "0.05";
  zoomSlider.value = String(cameraZoom);
  zoomSlider.setAttribute("aria-label", "鏡頭放大比例");
  zoomControl.appendChild(zoomSlider);

  const zoomLabel = document.createElement("span");
  zoomLabel.className = "世界地圖層-縮放標籤";
  zoomLabel.textContent = "鏡頭";
  zoomControl.appendChild(zoomLabel);
  canvas.appendChild(zoomControl);

  const exclaim = document.createElement("button");
  exclaim.className = "世界地圖層-驚嘆號";
  exclaim.innerHTML = "❗";
  exclaim.style.display = "none";
  exclaim.onclick = () => 應用程式狀態.點擊驚嘆號提示();
  canvas.appendChild(exclaim);

  const pressed = new Set<string>();
  let rafId = 0;
  let destroyed = false;
  let lastNow = performance.now();
  let playerVelocity = { x: 0, y: 0 };
  let collisionTickCarry = 0;

  // —— 隊長主動技能執行狀態（效果由 主動技能效果.ts 計算，這裡負責套用與時間管理）——
  let lastMoveDir = { x: 0, y: -1 }; // 玩家面向（傳送用），靜止時沿用最後方向
  let 速度增益倍率 = 1;
  let 速度增益到期 = 0;
  let 減速領域: { x: number; y: number; radius: number; until: number; mult: number } | null = null;

  // —— 投射物戰鬥（Batch 1 核心戰鬥迴圈）——
  // 小隊每個家族依發射週期自動朝最近怪物射擊；遠程怪物朝玩家回擊。
  // 子彈飛行、命中、扣血、死亡都走既有的 投射物系統 + 碰撞解析 + 重量物理。
  const projectileLayer = document.createElement("div");
  projectileLayer.className = "世界地圖層-投射物圖層";
  canvas.appendChild(projectileLayer);

  // 減速領域視覺圈：隨鏡頭縮放，套俯視壓縮，只在領域生效期間顯示。
  const slowFieldNode = document.createElement("div");
  slowFieldNode.className = "世界地圖層-減速領域";
  slowFieldNode.style.position = "absolute";
  slowFieldNode.style.left = "0";
  slowFieldNode.style.top = "0";
  slowFieldNode.style.borderRadius = "50%";
  slowFieldNode.style.border = "2px dashed rgba(63,111,73,0.85)";
  slowFieldNode.style.background =
    "radial-gradient(circle, rgba(63,111,73,0.18), rgba(63,111,73,0.05) 68%, transparent)";
  slowFieldNode.style.transform = "translate(var(--x, 0px), var(--y, 0px)) translate(-50%, -50%)";
  slowFieldNode.style.pointerEvents = "none";
  slowFieldNode.style.display = "none";
  slowFieldNode.style.zIndex = "1";
  canvas.appendChild(slowFieldNode);

  // 施放主動技能的螢幕提示（toast）。
  const skillToast = document.createElement("div");
  skillToast.className = "隊長技能提示";
  skillToast.style.position = "absolute";
  skillToast.style.left = "50%";
  skillToast.style.top = "36%";
  skillToast.style.transform = "translate(-50%, -50%)";
  skillToast.style.padding = "8px 18px";
  skillToast.style.background = "rgba(250,246,238,0.94)";
  skillToast.style.border = "1.5px solid #3f6f49";
  skillToast.style.color = "#1c1913";
  skillToast.style.fontWeight = "700";
  skillToast.style.letterSpacing = "0.04em";
  skillToast.style.pointerEvents = "none";
  skillToast.style.opacity = "0";
  skillToast.style.transition = "opacity 0.2s ease";
  skillToast.style.zIndex = "28";
  root.appendChild(skillToast);
  let skillToastTimer = 0;

  function syncWorldChests(force = false): void {
    if (訓練道場中) return;
    const elapsed = 應用程式狀態.額外.世界時鐘秒數 ?? 0;
    const second = Math.floor(elapsed);
    if (!force && second === lastChestSyncSecond) return;
    lastChestSyncSecond = second;
    同步世界寶箱(elapsed);
    worldChests = 取得未開世界寶箱();
    const liveIds = new Set(worldChests.map((chest) => chest.id));
    for (const chest of worldChests) {
      if (chestNodes.has(chest.id)) continue;
      const node = createWorldChestNode(chest);
      setProjectedNodePosition(node, chest);
      node.addEventListener("click", () => 嘗試開啟寶箱(chest));
      objectLayer.appendChild(node);
      chestNodes.set(chest.id, node);
    }
    for (const [id, node] of chestNodes) {
      if (liveIds.has(id)) continue;
      node.remove();
      chestNodes.delete(id);
    }
  }

  function 嘗試開啟寶箱(chest: WorldChestInstance): void {
    if (Math.hypot(chest.x - playerPos.x, chest.y - playerPos.y) > 190) {
      顯示技能提示("靠近寶箱後按 E 開啟");
      return;
    }
    let handled = false;
    window.dispatchEvent(
      new CustomEvent("request-open-world-chest", {
        detail: {
          chest: { id: chest.id, world: chest.world, opened: false },
          resolve: (result: ChestOpenResult) => {
            handled = true;
            處理寶箱結果(chest, result);
          },
        },
      }),
    );
    if (!handled) 顯示技能提示("能量系統尚未就緒");
  }

  function 處理寶箱結果(chest: WorldChestInstance, result: ChestOpenResult): void {
    if (!result.ok || !result.drop) {
      顯示技能提示(result.reason ?? "無法開啟寶箱");
      return;
    }
    const drop = result.drop;
    for (const entry of drop.materials) 背包.加入材料(entry.material.no, entry.count);
    背包.加入原石(drop.gems);
    記錄對局掉落(drop.gems, drop.materials.reduce((total, entry) => total + entry.count, 0));
    標記世界寶箱已開啟(chest.id);
    syncWorldChests(true);
    顯示技能提示(`禪繞寶箱｜原石 ${drop.gems}｜材料 ${drop.materials.reduce((total, entry) => total + entry.count, 0)}`);
  }

  function syncDeathDrops(): void {
    if (訓練道場中) return;
    deathDrops = 取得死亡遺落物();
    const liveIds = new Set(deathDrops.map((drop) => drop.id));
    for (const drop of deathDrops) {
      if (deathDropNodes.has(drop.id)) continue;
      const node = createDeathDropNode(drop);
      setProjectedNodePosition(node, drop);
      node.addEventListener("click", () => 嘗試拾取死亡遺落(drop));
      objectLayer.appendChild(node);
      deathDropNodes.set(drop.id, node);
    }
    for (const [id, node] of deathDropNodes) {
      if (liveIds.has(id)) continue;
      node.remove();
      deathDropNodes.delete(id);
    }
  }

  function 嘗試拾取死亡遺落(drop: 死亡遺落物): void {
    if (Math.hypot(drop.x - playerPos.x, drop.y - playerPos.y) > 190) {
      顯示技能提示("靠近遺落材料後按 E 取回");
      return;
    }
    const picked = 拾取死亡遺落物(drop.id);
    if (!picked) return;
    背包.取回遺落材料(picked.materials);
    const count = picked.materials.reduce((sum, item) => sum + item.count, 0);
    syncDeathDrops();
    顯示技能提示(`已取回遺落材料 ×${count}`);
  }

  syncWorldChests(true);
  syncDeathDrops();

  const projectilePool = new ProjectilePool();
  const projectileNodes = new Map<number, HTMLElement>();
  // 穿透彈可命中不同目標，但同一顆彈不能停留在碰撞圈內逐幀重複傷害同一目標。
  const projectileHitTargets = new Map<number, Set<string>>();
  // 每個家族的發射計時器（秒）
  const familyFireTimers: Record<Family, number> = {
    shield: 0, multishot: 0, straight: 0, mine: 0, laser: 0,
  };
  const FIRE_RANGE = 900; // 小隊武器索敵範圍（世界座標）
  const MONSTER_FIRE_CD = 1.4; // 遠程怪物開火冷卻（秒）
  // 武器 speed 是「設計單位」(straight=18)，但世界座標尺度極大（怪物在數百~數千）。
  // 乘上此比例把彈速換算到世界座標，讓子彈能在存活時間內真正飛到目標。
  const PROJECTILE_SPEED_SCALE = 40;
  let 已觸發陣亡 = false;
  let 復活保護到 = 0;

  /** 把剛生成的子彈速度（與地雷衰減率）換算到世界座標尺度。 */
  function 套用世界彈速(shots: Projectile[]): Projectile[] {
    for (const p of shots) {
      p.speed *= PROJECTILE_SPEED_SCALE;
      if (p.motion === "decaying") p.decel = p.speed / 0.5; // 維持 0.5 秒衰減到 0
    }
    return shots;
  }

  // —— 擊殺掉落與擊殺統計（Batch 2）——
  let 擊殺數 = 0;
  /** 各世界各 Tier 擊殺數（供守護者召喚進度，Batch 3 用）。 */
  const 擊殺統計: Record<string, number> = {};

  /**
   * 結算新死亡怪物的掉落：擲一次 資源掉落系統，材料/原石寫入背包，並累計擊殺數。
   * 每隻只結算一次（dropped 旗標）。訓練道場不計入正式掉落。
   */
  function 結算死亡掉落(): void {
    for (const m of monsters) {
      if (m.inst.hp > 0 || m.dropped) continue;
      m.dropped = true;
      if (m.persistent) m.persistent.dropped = true;
      m.node.style.display = "none";
      擊殺數 += 1;
      if (!訓練道場中) 記錄對局擊殺();

      // Boss 特殊結算：守護者 → 印記+狂暴；COLA → 勝利。
      if (m.bossKind === "guardian" && m.bossWorld) {
        const sigil = 擊敗守護者(m.bossWorld, 進度模式);
        if (sigil) {
          if (!訓練道場中) 記錄守護者擊敗();
          設定驗收事件(`${REGION_LABEL[m.bossWorld]}守護者已倒下，取得 ${sigil}。`);
        }
        continue;
      }
      if (m.bossKind === "cola") {
        if (!訓練道場中) {
          const drop = rollMonsterDrop(finalBoss(), true);
          for (const entry of drop.materials) 背包.加入材料(entry.material.no, entry.count);
          if (drop.keyItem) 背包.加入材料(drop.keyItem.no, 1);
          背包.加入原石(drop.gems);
          記錄對局掉落(
            drop.gems,
            drop.materials.reduce((total, entry) => total + entry.count, 0) + (drop.keyItem ? 1 : 0),
            Boolean(drop.keyItem),
          );
          結束對局("victory", "擊敗 COLA，取得 COrebound 核心鑰匙");
        }
        標記驗收結果("victory", "COLA 已被擊敗，整條驗收主線完成。");
        if (!訓練道場中) 應用程式狀態.觸發終局事件(); // 勝利進結算頁
        continue;
      }

      const def = findMonster(m.inst.monsterNo);
      if (!def) continue;
      擊殺統計[`${def.world}_T${def.tier}`] = (擊殺統計[`${def.world}_T${def.tier}`] ?? 0) + 1;
      記錄驗收擊殺(`${def.world}_T${def.tier}`, `${def.nameZh} 已被擊殺。`);
      if (訓練道場中) continue;
      if (def.world !== "core") {
        記錄世界擊殺(def.world, def.tier, def.id, 進度模式); // 累計守護者召喚進度
      }
      const enraged = def.world !== "core" && 世界已狂暴查詢(def.world);
      const drop = rollMonsterDrop(def, enraged);
      for (const entry of drop.materials) 背包.加入材料(entry.material.no, entry.count);
      背包.加入原石(drop.gems);
      if (!訓練道場中) {
        記錄對局掉落(drop.gems, drop.materials.reduce((total, entry) => total + entry.count, 0));
      }
    }
  }

  /** 查某世界是否狂暴（給掉落用；封裝以免直接依賴狀態物件）。 */
  function 世界已狂暴查詢(world: World): boolean {
    return 對局進度摘要(進度模式).守護者.find((g) => g.world === world)?.enraged ?? false;
  }

  /**
   * 網格侵蝕（毒圈）：縮圈警戒啟動後，安全半徑隨時間收縮；
   * 玩家在安全半徑外，每 Tick 扣最大生命 5%（真實傷害，無視防禦）。
   * 為方便驗收，這裡以 應用程式狀態.縮圈警戒 作為啟動訊號（世界時鐘 45s 觸發）。
   */
  function updateErosion(dt: number): void {
    if (訓練道場中) return;
    if (!應用程式狀態.額外.縮圈警戒) return;
    const 秒 = 應用程式狀態.額外.世界時鐘秒數 ?? 0;
    // 從警戒點(45s)起 120 秒內由地圖半徑收縮到中央廣場半徑。
    const t = Math.min(1, Math.max(0, (秒 - 45) / 120));
    const safeRadius = MAP_BOUNDS.maxX + (PLAZA_RADIUS - MAP_BOUNDS.maxX) * t;
    const distToCenter = Math.hypot(playerPos.x, playerPos.y);
    if (distToCenter <= safeRadius) return;
    const summary = 取得正式小隊摘要();
    const dmg = summary.playerMaxHp * EROSION_DAMAGE_RATIO_PER_TICK * dt;
    if (dmg > 0) {
      const applied = Math.min(summary.playerHp, dmg);
      手動設定正式玩家生命(summary.playerHp - applied);
      記錄對局傷害(0, applied);
    }
  }

  /**
   * 在玩家附近生成一隻怪物到場（守護者/COLA 召喚用）。
   * tier 對外部渲染統一以 2 呈現（最大 token），但保留真實 def 供結算。
   */
  function 生成Boss到場(def: MonsterDef, bossKind: "guardian" | "cola", bossWorld?: World): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = 520;
    const spawnX = Math.max(MAP_BOUNDS.minX, Math.min(MAP_BOUNDS.maxX, playerPos.x + Math.cos(angle) * dist));
    const spawnY = Math.max(MAP_BOUNDS.minY, Math.min(MAP_BOUNDS.maxY, playerPos.y + Math.sin(angle) * dist));
    const spritePath =
      def.world === "core"
        ? "/images/enemies/mechanical/e28_factory.png" // COLA 佔位圖（機械超級工廠）
        : `/images/enemies/${def.world}/${def.id}.png`;
    const inst: MonsterInstance = {
      id: `boss_${def.id}_${Date.now()}`,
      monsterNo: def.no,
      world: (def.world === "core" ? "mechanical" : def.world) as World,
      tier: 2, // 渲染/碰撞相容用；真實威脅由 hp/atk 體現
      nameZh: def.nameZh,
      spritePath,
      x: spawnX,
      y: spawnY,
      hp: def.stats.hp,
      maxHp: def.stats.hp,
      atk: def.stats.atk,
      weight: def.stats.weight,
      speed: def.stats.speed,
      ranged: true,
      attackRange: 620,
      nonHostileInitially: false,
    };
    const node = createMonsterNode(inst);
    node.classList.add("世界地圖層-怪物-boss");
    monsterLayer.appendChild(node);
    const persistent = 訓練道場中
      ? undefined
      : { inst, x: spawnX, y: spawnY, dropped: false, bossKind, bossWorld } satisfies 正式戰場怪物;
    if (persistent) 加入正式戰場怪物(persistent);
    monsters.push({ inst, pos: { x: spawnX, y: spawnY }, node, bossKind, bossWorld, persistent });
  }

  /** 目前上陣小隊的家族清單（含個人星級），供 技能管理 判定各家族可用武器星級。 */
  function 目前上陣成員(): DeployedMember[] {
    if (訓練道場中) {
      return 取得訓練小隊成員().map((entry) => ({
        family: entry.member.family,
        star: entry.slot.star,
      }));
    }
    // 正式對局預設編隊 = 前 8 名成員 @3★（與 正式對局小隊狀態 一致）。
    return MEMBERS.slice(0, 8).map((m) => ({ family: m.family, star: 3 as StarLevel }));
  }

  /** 找最近的存活怪物（限 FIRE_RANGE 內）。 */
  function 最近怪物(withinRange: number): MonsterRuntime | null {
    let best: MonsterRuntime | null = null;
    let bestD = withinRange;
    for (const m of monsters) {
      if (m.inst.hp <= 0) continue;
      const d = Math.hypot(m.pos.x - playerPos.x, m.pos.y - playerPos.y);
      if (d <= bestD) {
        bestD = d;
        best = m;
      }
    }
    return best;
  }

  function setCameraZoom(nextZoom: number): void {
    cameraZoom = Math.max(MIN_CAMERA_ZOOM, Math.min(MAX_CAMERA_ZOOM, nextZoom));
    const worldObjectSize = WORLD_OBJECT_SIZE_AT_REFERENCE_ZOOM * (cameraZoom / WORLD_OBJECT_REFERENCE_CAMERA_ZOOM);
    // 物件不是放在幾何中心，而是靠近磁磚前緣落地，底部仍保留少量白邊。
    const opticalOffset = worldObjectSize * 0.085;
    for (const node of objectNodes.values()) {
      node.style.setProperty("--world-object-size", `${worldObjectSize.toFixed(2)}px`);
      node.style.setProperty("--object-optical-y", `${opticalOffset.toFixed(2)}px`);
    }
    for (const node of envNodes.values()) {
      node.style.setProperty("--world-object-size", `${worldObjectSize.toFixed(2)}px`);
      node.style.setProperty("--object-optical-y", `${opticalOffset.toFixed(2)}px`);
    }
    for (const m of monsters) {
      const baseSize = MONSTER_SIZE_AT_REFERENCE_ZOOM[m.inst.tier as 0 | 1 | 2] ?? 360;
      const size = baseSize * (cameraZoom / WORLD_OBJECT_REFERENCE_CAMERA_ZOOM);
      m.node.style.setProperty("--monster-size", `${size.toFixed(2)}px`);
    }
    const playerSize = PLAYER_SIZE_AT_REFERENCE_ZOOM * (cameraZoom / REFERENCE_CAMERA_ZOOM);
    playerNode.style.setProperty("--player-world-size", `${playerSize.toFixed(2)}px`);
    updateStaticWorldNodePositions();
    zoomSlider.value = cameraZoom.toFixed(2);
    zoomRatio.value = `${Math.round(cameraZoom * 100)}%`;
    render();
  }

  function onWheel(event: WheelEvent): void {
    event.preventDefault();
    const zoomFactor = Math.exp(-event.deltaY * 0.001);
    setCameraZoom(cameraZoom * zoomFactor);
  }

  zoomSlider.addEventListener("input", () => setCameraZoom(Number(zoomSlider.value)));
  setCameraZoom(cameraZoom);

  function projectedWorldPosition(point: { x: number; y: number }): { x: number; y: number } {
    return {
      x: point.x * cameraZoom,
      y: point.y * GROUND_DEPTH_SCALE * cameraZoom,
    };
  }

  function setProjectedNodePosition(node: HTMLElement, point: { x: number; y: number }): void {
    const pos = projectedWorldPosition(point);
    node.style.setProperty("--x", `${pos.x.toFixed(2)}px`);
    node.style.setProperty("--y", `${pos.y.toFixed(2)}px`);
  }

  function updateWorldLayerOffsets(viewport: { w: number; h: number }): void {
    const x = viewport.w / 2 - playerPos.x * cameraZoom;
    const y = viewport.h / 2 - playerPos.y * GROUND_DEPTH_SCALE * cameraZoom;
    const transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    envLayer.style.transform = transform;
    objectLayer.style.transform = transform;
    monsterLayer.style.transform = transform;
    projectileLayer.style.transform = transform;
  }

  function updateStaticWorldNodePositions(): void {
    for (const env of ENV_OBJECTS) {
      const node = envNodes.get(env.id);
      if (node) setProjectedNodePosition(node, env);
    }
    for (const object of MAP_OBJECTS) {
      const node = objectNodes.get(object.id);
      if (node) setProjectedNodePosition(node, object);
    }
    for (const chest of worldChests) {
      const node = chestNodes.get(chest.id);
      if (node) setProjectedNodePosition(node, chest);
    }
    for (const drop of deathDrops) {
      const node = deathDropNodes.get(drop.id);
      if (node) setProjectedNodePosition(node, drop);
    }
  }

  function render(): void {
    const viewport = { w: canvas.clientWidth || window.innerWidth, h: canvas.clientHeight || window.innerHeight };
    const playerScreen = { x: viewport.w / 2, y: viewport.h / 2 };

    // 所有節點定位改用 CSS 變數 --x/--y + transform（GPU 合成，不觸發 layout 回流）。
    playerNode.style.setProperty("--x", `${playerScreen.x}px`);
    playerNode.style.setProperty("--y", `${playerScreen.y}px`);

    // 區域/分界線/地板的 d 已在建圖時固定，這裡只要平移鏡頭 viewBox。
    updateMapViewBox(zoneSvg, viewport);
    renderZoneLabels(zoneLabels, viewport);
    updateWorldLayerOffsets(viewport);

    for (const m of monsters) {
      if (m.dropped) { m.node.style.display = "none"; continue; }
      const screenPos = worldToScreen(m.pos, playerPos, viewport);
      const visible = isVisible(screenPos, viewport);
      setProjectedNodePosition(m.node, m.pos);
      m.node.style.display = visible ? "block" : "none";
      // 血條：只在可見且已受傷時顯示。
      if (visible && m.inst.hp > 0 && m.inst.hp < m.inst.maxHp) {
        const bar = m.node.lastElementChild as HTMLElement;
        const fill = bar.firstElementChild as HTMLElement;
        bar.style.display = "block";
        fill.style.width = `${Math.max(0, Math.min(100, (m.inst.hp / m.inst.maxHp) * 100))}%`;
      } else {
        (m.node.lastElementChild as HTMLElement).style.display = "none";
      }
    }

    // 投射物（佔位美術：小圓點，我方金色/敵方紅色），與其他物件共用同一套俯視鏡頭。
    for (const p of projectilePool.all()) {
      const node = projectileNodes.get(p.id);
      if (!node) continue;
      const screenPos = worldToScreen(p.position, playerPos, viewport);
      setProjectedNodePosition(node, p.position);
      node.style.display = isVisible(screenPos, viewport) ? "block" : "none";
    }

    const near = nearbyObjects(playerPos);
    const nearIds = new Set(near.map((object) => object.id));

    for (const object of MAP_OBJECTS) {
      const node = objectNodes.get(object.id);
      if (!node) continue;
      node.classList.toggle("靠近中", nearIds.has(object.id));
    }

    for (const chest of worldChests) {
      const node = chestNodes.get(chest.id);
      if (!node) continue;
      const screenPos = worldToScreen(chest, playerPos, viewport);
      node.style.display = isVisible(screenPos, viewport) ? "grid" : "none";
      node.style.filter = Math.hypot(chest.x - playerPos.x, chest.y - playerPos.y) <= 190 ? "brightness(1.35)" : "none";
    }

    for (const drop of deathDrops) {
      const node = deathDropNodes.get(drop.id);
      if (!node) continue;
      const screenPos = worldToScreen(drop, playerPos, viewport);
      node.style.display = isVisible(screenPos, viewport) ? "grid" : "none";
      node.style.filter = Math.hypot(drop.x - playerPos.x, drop.y - playerPos.y) <= 190 ? "brightness(1.4)" : "none";
    }

    const nearest = near[0];
    if (nearest) {
      exclaim.style.display = "flex";
      exclaim.style.setProperty("--x", `${playerScreen.x + 26}px`);
      exclaim.style.setProperty("--y", `${playerScreen.y - 36}px`);
      exclaim.title = `點擊開啟「${nearest.label}」互動`;
    } else {
      exclaim.style.display = "none";
    }

    // 減速領域圈：套用與地面相同的俯視鏡頭與縱深壓縮。
    if (減速領域 && performance.now() < 減速領域.until) {
      const center = worldToScreen(減速領域, playerPos, viewport);
      slowFieldNode.style.setProperty("--x", `${center.x}px`);
      slowFieldNode.style.setProperty("--y", `${center.y}px`);
      slowFieldNode.style.width = `${減速領域.radius * 2 * cameraZoom}px`;
      slowFieldNode.style.height = `${減速領域.radius * 2 * cameraZoom * GROUND_DEPTH_SCALE}px`;
      slowFieldNode.style.display = "block";
    } else {
      slowFieldNode.style.display = "none";
    }

    renderMiniMapDynamic(miniMapInner, miniObjectNodes, miniPlayer);
  }

  /**
   * 依 敵人AI 決策推進每隻怪物一幀。
   * 只有在玩家 MONSTER_ACTIVE_RADIUS 內的怪物才跑 AI／移動，遠處待命（省 CPU、避免全圖聚集）。
   * 待命（idle）的怪物給一個緩慢隨機游走，讓地圖有「自由活動」的生氣。
   */
  function updateMonsters(dt: number): void {
    const elapsedSeconds = 應用程式狀態.額外.世界時鐘秒數 ?? 0;
    const nowMs = performance.now();
    const fieldActive = 減速領域 !== null && nowMs < 減速領域.until;
    for (const m of monsters) {
      if (m.inst.hp <= 0) continue;
      // 建築師減速領域：站在圈內的敵人持續被減速（沿用既有 slowUntil/slowMult 機制）。
      if (fieldActive && 減速領域 && Math.hypot(m.pos.x - 減速領域.x, m.pos.y - 減速領域.y) <= 減速領域.radius) {
        m.slowUntil = nowMs + 260;
        m.slowMult = 減速領域.mult;
      }
      const dToPlayer = Math.hypot(m.pos.x - playerPos.x, m.pos.y - playerPos.y);
      const active = dToPlayer <= MONSTER_ACTIVE_RADIUS;

      let moveX = 0;
      let moveY = 0;
      // 隊長減速控制：受影響期間移速打折。
      const slowed = m.slowUntil !== undefined && performance.now() < m.slowUntil;
      const worldSpeed = m.inst.speed * MONSTER_SPEED_SCALE * (slowed ? (m.slowMult ?? 1) : 1);

      if (active) {
        const underFire = m.lastHitMs !== undefined && performance.now() - m.lastHitMs < 1500;
        const decision = decideEnemyAction({
          tier: m.inst.tier,
          selfPos: m.pos,
          playerPos,
          attackRange: m.inst.attackRange,
          ranged: m.inst.ranged,
          underFire,
          elapsedSeconds,
          nonHostileInitially: m.inst.nonHostileInitially,
          immobilized: false,
        });
        // 想開火且為遠程 → 朝玩家射擊（冷卻節流）。
        if (decision.wantsFire && m.inst.ranged) 怪物開火(m, dt);
        if (decision.moveDir.x !== 0 || decision.moveDir.y !== 0) {
          moveX = decision.moveDir.x;
          moveY = decision.moveDir.y;
        } else {
          // idle / attack（原地）→ 緩慢游走
          [moveX, moveY] = wanderStep(m, dt);
        }
      } else {
        // 遠處待命：仍給極慢游走，讓整張圖有活性
        [moveX, moveY] = wanderStep(m, dt);
      }

      if (moveX !== 0 || moveY !== 0) {
        const len = Math.hypot(moveX, moveY) || 1;
        const speed = worldSpeed * (active ? 1 : 0.35);
        m.pos.x = Math.max(MAP_BOUNDS.minX, Math.min(MAP_BOUNDS.maxX, m.pos.x + (moveX / len) * speed * dt));
        m.pos.y = Math.max(MAP_BOUNDS.minY, Math.min(MAP_BOUNDS.maxY, m.pos.y + (moveY / len) * speed * dt));
        if (m.persistent) {
          m.persistent.x = m.pos.x;
          m.persistent.y = m.pos.y;
        }
      }
    }
    if (訓練道場中) {
      覆蓋訓練敵群(
        monsters
          .filter((monster) => monster.inst.hp > 0)
          .map((monster) => ({
            ...(monster.inst as 訓練召喚敵人),
            x: monster.pos.x,
            y: monster.pos.y,
          })),
      );
    }
  }

  /** 緩慢游走：每隔一段時間換一個隨機方向。 */
  function wanderStep(m: MonsterRuntime, dt: number): [number, number] {
    m.wanderTimer = (m.wanderTimer ?? 0) - dt;
    if (m.wanderTimer <= 0 || m.wanderDir === undefined) {
      const a = Math.random() * Math.PI * 2;
      m.wanderDir = { x: Math.cos(a), y: Math.sin(a) };
      m.wanderTimer = 1.5 + Math.random() * 2.5;
    }
    return [m.wanderDir.x * 0.5, m.wanderDir.y * 0.5];
  }

  /** 依模式設定玩家生命（訓練/正式各自的生命池）。 */
  function 設當前玩家生命(hp: number): void {
    if (訓練道場中) 手動設定訓練玩家生命(hp);
    else 手動設定正式玩家生命(hp);
  }

  /**
   * 小隊自動開火（Batch 1）：對每個「已解鎖」的家族累計發射計時，
   * 到達該家族發射週期就朝最近怪物射出一發（多發家族會自動展成扇形）。
   * 家族可用星級由 技能管理 依上陣成員人數與累計星級判定。
   */
  function updateSquadFire(dt: number): void {
    const status = computeFamilyWeaponStatus(目前上陣成員());
    const unlocked = new Map(status.map((s) => [s.family, s.unlockedStar]));
    for (const family of PLAYABLE_FAMILIES) {
      const star = unlocked.get(family) ?? 0;
      if (star < 1) continue;
      familyFireTimers[family] += dt;
      const period = FAMILY_FIRE_PERIOD[family] * TICK_SECONDS;
      if (familyFireTimers[family] < period) continue;
      familyFireTimers[family] = 0;
      const target = 最近怪物(FIRE_RANGE);
      if (!target) continue;
      const aim = { x: target.pos.x - playerPos.x, y: target.pos.y - playerPos.y };
      套用世界彈速(
        projectilePool.spawn({
          family,
          faction: "player",
          origin: { ...playerPos },
          aim,
          weaponStar: star as StarLevel,
        }),
      );
    }
  }

  /** 遠程怪物朝玩家回擊（在 updateMonsters 內以冷卻節流呼叫）。 */
  function 怪物開火(m: MonsterRuntime, dt: number): void {
    m.fireCd = (m.fireCd ?? Math.random() * MONSTER_FIRE_CD) - dt;
    if (m.fireCd > 0) return;
    m.fireCd = MONSTER_FIRE_CD;
    const aim = { x: playerPos.x - m.pos.x, y: playerPos.y - m.pos.y };
    const shots = 套用世界彈速(
      projectilePool.spawn({
        family: "straight",
        faction: "enemy",
        origin: { ...m.pos },
        aim,
        weaponStar: 1,
      }),
    );
    // 敵彈傷害改用怪物自身 ATK（照搬機制但以單體 ATK 計），覆寫預設武器傷害。
    for (const proj of shots) proj.damage = Math.max(1, Math.round(m.inst.atk * 0.6));
  }

  /**
   * 推進所有子彈一幀，並結算命中：
   * - 我方子彈 vs 怪物：重量對抗 + 扣血 + 死亡。
   * - 敵方子彈 vs 玩家：扣小隊生命。
   * 命中後依重量對抗決定子彈是否消散（可穿透則續飛）。
   */
  function updateProjectiles(dt: number): void {
    projectilePool.advance(dt);

    const liveMonsters = monsters.filter((m) => m.inst.hp > 0);
    const monsterBodies = liveMonsters.map((m) => ({
      id: m.inst.id,
      position: m.pos,
      radius: 訓練敵人碰撞半徑(m.inst.tier as 0 | 1 | 2),
      hp: m.inst.hp,
      weight: m.inst.weight,
      dead: m.inst.hp <= 0,
    }));

    // 我方子彈打怪物
    const playerShots = projectilePool.byFaction("player");
    const consumedThisFrame = new Set<number>();
    for (const hit of detectHits(playerShots, monsterBodies)) {
      if (consumedThisFrame.has(hit.projectile.id)) continue;
      let hitTargets = projectileHitTargets.get(hit.projectile.id);
      if (!hitTargets) {
        hitTargets = new Set<string>();
        projectileHitTargets.set(hit.projectile.id, hitTargets);
      }
      if (hitTargets.has(hit.target.id)) continue;
      const m = liveMonsters.find((x) => x.inst.id === hit.target.id);
      if (!m || m.inst.hp <= 0) continue;
      const res = resolveProjectileHit(hit.projectile, {
        id: m.inst.id, position: m.pos, radius: 0, hp: m.inst.hp, weight: m.inst.weight,
      });
      const appliedDamage = Math.min(m.inst.hp, res.damage);
      m.inst.hp = Math.max(0, m.inst.hp - appliedDamage);
      hitTargets.add(m.inst.id);
      if (!訓練道場中) 記錄對局傷害(appliedDamage);
      m.lastHitMs = performance.now();
      // 隊長控制引擎：命中時套用（此處實作減速；其餘控制為 Batch 3 延伸）。
      const ctrl = controlEffectAtStar(小隊屬性摘要().captainId, 當前隊長星級());
      if (ctrl && ctrl.kind === "slow" && ctrl.duration > 0) {
        m.slowUntil = performance.now() + ctrl.duration * 1000;
        m.slowMult = 1 - ctrl.magnitude;
      }
      if (m.inst.hp <= 0) m.node.style.display = "none";
      if (res.projectileConsumed) {
        projectilePool.remove(hit.projectile.id);
        consumedThisFrame.add(hit.projectile.id);
        projectileHitTargets.delete(hit.projectile.id);
      } else {
        hit.projectile.remainingWeight = res.projectileRemainingWeight;
      }
    }

    // 敵方子彈打玩家（玩家為單一圓形碰撞體）
    const summary = 訓練道場中 ? 取得訓練道場摘要() : 取得正式小隊摘要();
    const playerBody = {
      id: "player",
      position: playerPos,
      radius: 訓練玩家碰撞半徑(summary.totalWeight),
      hp: summary.playerHp,
      weight: summary.totalWeight,
    };
    const enemyShots = projectilePool.byFaction("enemy");
    let 玩家承傷 = 0;
    for (const hit of detectHits(enemyShots, [playerBody])) {
      if (!訓練道場中 && performance.now() < 復活保護到) {
        projectilePool.remove(hit.projectile.id);
        continue;
      }
      玩家承傷 += hit.projectile.damage;
      projectilePool.remove(hit.projectile.id);
    }
    if (玩家承傷 > 0) {
      const appliedDamage = Math.min(summary.playerHp, 玩家承傷);
      設當前玩家生命(summary.playerHp - appliedDamage);
      if (!訓練道場中) 記錄對局傷害(0, appliedDamage);
    }

    // 同步子彈 DOM 節點：新增缺的、移除已消散的。
    const alive = new Set<number>();
    for (const p of projectilePool.all()) {
      alive.add(p.id);
      let node = projectileNodes.get(p.id);
      if (!node) {
        node = document.createElement("div");
        node.className = `世界地圖層-投射物 世界地圖層-投射物-${p.faction} 世界地圖層-投射物-${p.family}`;
        projectileLayer.appendChild(node);
        projectileNodes.set(p.id, node);
      }
    }
    for (const [id, node] of projectileNodes) {
      if (!alive.has(id)) {
        node.remove();
        projectileNodes.delete(id);
        projectileHitTargets.delete(id);
      }
    }

    if (訓練道場中) {
      if (!已觸發陣亡 && 取得訓練道場摘要().playerHp <= 0) {
        已觸發陣亡 = true;
        標記驗收結果("defeat", "隊長已倒下，本輪驗收以失敗收場。");
      }
    }
  }

  function 處理正式陣亡(): void {
    if (訓練道場中 || !正式玩家已陣亡()) return;
    const deathPosition = { ...playerPos };
    const penalty = 背包.套用死亡懲罰();
    新增死亡遺落物(deathPosition.x, deathPosition.y, penalty.遺落材料);
    記錄對局死亡();
    回滿正式玩家生命();
    playerPos = { x: 0, y: 0 };
    設定正式玩家位置(playerPos);
    playerVelocity = { x: 0, y: 0 };
    playerMoving = false;
    collisionTickCarry = 0;
    復活保護到 = performance.now() + 2200;
    projectilePool.clear();
    projectileHitTargets.clear();
    for (const node of projectileNodes.values()) node.remove();
    projectileNodes.clear();
    syncDeathDrops();
    syncNearbyToState();
    顯示技能提示(`中央廣場復活｜損失原石 ${penalty.原石損失}｜遺落材料 ${penalty.遺落材料.reduce((sum, item) => sum + item.count, 0)}`);
  }

  function 訓練玩家碰撞半徑(weight: number): number {
    return Math.max(96, Math.min(210, 82 + Math.sqrt(Math.max(0, weight)) * 9));
  }

  function 訓練敵人碰撞半徑(tier: 0 | 1 | 2): number {
    switch (tier) {
      case 0:
        return 56;
      case 1:
        return 78;
      case 2:
        return 108;
    }
  }

  function updateCollisions(dt: number): void {
    // 訓練道場與正式遊玩共用同一套碰撞結算邏輯（§1.3 Tick 傷害）。
    // 唯一差別在「全隊屬性」與「玩家生命」的資料來源：
    //   訓練道場 → 訓練道場狀態（可自由編排小隊）
    //   正式遊玩 → 正式對局小隊狀態（隊長 + 預設編隊）
    if (訓練道場中) {
      const summary = 取得訓練道場摘要();
      const playerRadius = 訓練玩家碰撞半徑(summary.totalWeight);
      const contacts = monsters.filter(
        (monster) =>
          monster.inst.hp > 0 &&
          circlesOverlap(
            playerPos,
            playerRadius,
            monster.pos,
            訓練敵人碰撞半徑(monster.inst.tier as 0 | 1 | 2),
          ),
      );

      if (contacts.length === 0) {
        設定訓練碰撞接觸中([], []);
        collisionTickCarry = 0;
        return;
      }

      設定訓練碰撞接觸中(
        contacts.map((monster) => monster.inst.id),
        contacts.map((monster) => monster.inst.nameZh),
      );

      collisionTickCarry += dt;
      while (collisionTickCarry >= TICK_SECONDS) {
        const resolutions = settleContactTick(
          summary.totalAtk,
          contacts.map((monster) => ({
            id: monster.inst.id,
            position: monster.pos,
            radius: 訓練敵人碰撞半徑(monster.inst.tier as 0 | 1 | 2),
            hp: monster.inst.hp,
            weight: monster.inst.weight,
            dead: monster.inst.hp <= 0,
          })),
        );

        let squadDamageTaken = 0;
        let enemyWeight = 0;
        for (const monster of contacts) {
          enemyWeight += monster.inst.weight;
          squadDamageTaken += monster.inst.atk;
        }

        let dealtTotal = 0;
        for (const result of resolutions) {
          const runtime = contacts.find((monster) => monster.inst.id === result.id);
          if (!runtime) continue;
          runtime.inst.hp = Math.max(0, runtime.inst.hp - result.damage);
          if (result.dead) runtime.node.style.display = "none";
          dealtTotal += result.damage;
        }

        手動設定訓練玩家生命(summary.playerHp - squadDamageTaken);
        記錄訓練碰撞({
          atMs: Date.now(),
          enemyIds: contacts.map((monster) => monster.inst.id),
          enemyNames: contacts.map((monster) => monster.inst.nameZh),
          squadWeight: summary.totalWeight,
          enemyWeight,
          squadDamage: dealtTotal,
          enemyDamage: squadDamageTaken,
        });

        覆蓋訓練敵群(
          monsters
            .filter((monster) => monster.inst.hp > 0)
            .map((monster) => ({
              ...(monster.inst as 訓練召喚敵人),
              x: monster.pos.x,
              y: monster.pos.y,
            })),
        );
        collisionTickCarry -= TICK_SECONDS;
      }
      return;
    }

    // —— 正式遊玩碰撞結算 ——
    if (performance.now() < 復活保護到) return;
    const summary = 取得正式小隊摘要();
    const playerRadius = 訓練玩家碰撞半徑(summary.totalWeight);
    const contacts = monsters.filter(
      (monster) =>
        monster.inst.hp > 0 &&
        circlesOverlap(
          playerPos,
          playerRadius,
          monster.pos,
          訓練敵人碰撞半徑(monster.inst.tier as 0 | 1 | 2),
        ),
    );

    if (contacts.length === 0) {
      collisionTickCarry = 0;
      return;
    }

    collisionTickCarry += dt;
    while (collisionTickCarry >= TICK_SECONDS) {
      const resolutions = settleContactTick(
        summary.totalAtk,
        contacts.map((monster) => ({
          id: monster.inst.id,
          position: monster.pos,
          radius: 訓練敵人碰撞半徑(monster.inst.tier as 0 | 1 | 2),
          hp: monster.inst.hp,
          weight: monster.inst.weight,
          dead: monster.inst.hp <= 0,
        })),
      );

      // 接觸期間，玩家每 Tick 承受所有接觸怪物的 ATK 加總（§1.3）。
      let squadDamageTaken = 0;
      for (const monster of contacts) {
        squadDamageTaken += monster.inst.atk;
      }

      for (const result of resolutions) {
        const runtime = contacts.find((monster) => monster.inst.id === result.id);
        if (!runtime) continue;
        const appliedDamage = Math.min(runtime.inst.hp, result.damage);
        runtime.inst.hp = Math.max(0, runtime.inst.hp - appliedDamage);
        記錄對局傷害(appliedDamage);
        if (result.dead) runtime.node.style.display = "none";
      }

      const appliedSquadDamage = Math.min(summary.playerHp, squadDamageTaken);
      手動設定正式玩家生命(summary.playerHp - appliedSquadDamage);
      記錄對局傷害(0, appliedSquadDamage);
      collisionTickCarry -= TICK_SECONDS;
    }
  }

  function tick(now: number): void {
    // 管理介面切換會直接移除整個操作頁。舊版依賴已淘汰的 DOM 移除事件，
    // 導致舊 RAF 與鍵盤監聽殘留；每次返回戰場就再疊一套更新迴圈。
    if (!root.isConnected) {
      cleanup();
      return;
    }
    // dt 上限放寬到 0.1 秒：掉幀時讓移動距離能補上，避免一頓一頓的「一波一波」感。
    // （原本 0.05 上限在掉幀時會截斷移動量，卡頓幀走得短，看起來像在跳格。）
    const dt = Math.min(0.1, (now - lastNow) / 1000);
    lastNow = now;

    if (應用程式狀態.畫面.層 === "操作頁面") {
      const moveScale = 訓練道場中 ? 取得訓練道場摘要().moveSpeedScale : 1;
      // 指導者加速：生效期間全隊移速倍率提升。
      const 速度增益 = now < 速度增益到期 ? 速度增益倍率 : 1;
      let axisX = 0;
      let axisY = 0;
      if (pressed.has("KeyA") || pressed.has("ArrowLeft")) axisX -= 1;
      if (pressed.has("KeyD") || pressed.has("ArrowRight")) axisX += 1;
      if (pressed.has("KeyW") || pressed.has("ArrowUp")) axisY -= 1;
      if (pressed.has("KeyS") || pressed.has("ArrowDown")) axisY += 1;

      const axisLength = Math.hypot(axisX, axisY);
      const targetVelocity =
        axisLength > 0
          ? {
              x: (axisX / axisLength) * MOVE_SPEED * moveScale * 速度增益,
              y: (axisY / axisLength) * MOVE_SPEED * moveScale * 速度增益,
            }
          : { x: 0, y: 0 };

      const velocityDeltaX = targetVelocity.x - playerVelocity.x;
      const velocityDeltaY = targetVelocity.y - playerVelocity.y;
      const velocityDelta = Math.hypot(velocityDeltaX, velocityDeltaY);
      const maxVelocityStep =
        (axisLength > 0 ? MOVE_ACCELERATION : MOVE_DECELERATION) * dt;

      if (velocityDelta <= maxVelocityStep || velocityDelta === 0) {
        playerVelocity = targetVelocity;
      } else {
        const ratio = maxVelocityStep / velocityDelta;
        playerVelocity = {
          x: playerVelocity.x + velocityDeltaX * ratio,
          y: playerVelocity.y + velocityDeltaY * ratio,
        };
      }

      if (Math.abs(playerVelocity.x) < 0.01) playerVelocity.x = 0;
      if (Math.abs(playerVelocity.y) < 0.01) playerVelocity.y = 0;
      playerMoving = playerVelocity.x !== 0 || playerVelocity.y !== 0;

      if (playerMoving) {
        const 速度 = Math.hypot(playerVelocity.x, playerVelocity.y) || 1;
        lastMoveDir = { x: playerVelocity.x / 速度, y: playerVelocity.y / 速度 };
        playerPos = clampTraversablePlayerPosition({
          x: playerPos.x + playerVelocity.x * dt,
          y: playerPos.y + playerVelocity.y * dt,
        }, playerPos);
        if (!訓練道場中) 設定正式玩家位置(playerPos);
        syncNearbyToState();

      }

      updateMonsters(dt);
      updateSquadFire(dt);
      updateProjectiles(dt);
      updateCollisions(dt);
      結算死亡掉落();
      updateErosion(dt);
      處理正式陣亡();
      syncWorldChests();
    }

    render();

    // 局部更新頂端世界時鐘，不重建地圖 DOM
    const clockEl = document.querySelector(".世界時鐘");
    if (clockEl) {
      const 額外 = 應用程式狀態.額外;
      clockEl.textContent = `世界時間：${額外.世界時鐘秒數}s${額外.縮圈警戒 ? " ⚠" : ""}`;
      if (額外.縮圈警戒) {
        clockEl.classList.add("警戒");
      } else {
        clockEl.classList.remove("警戒");
      }
    }

    rafId = window.requestAnimationFrame(tick);
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (應用程式狀態.畫面.層 !== "操作頁面") return;
    // Space：請求施放隊長主動技能（冷卻/能量閘門在 HUD 端，成功後才回送效果事件）。
    if (event.code === "Space") {
      event.preventDefault();
      if (!event.repeat) window.dispatchEvent(new CustomEvent("request-cast-active"));
      return;
    }
    if (event.code === "KeyE") {
      event.preventDefault();
      if (!event.repeat && !訓練道場中) {
        const nearestChest = worldChests
          .map((chest) => ({ chest, distance: Math.hypot(chest.x - playerPos.x, chest.y - playerPos.y) }))
          .filter((entry) => entry.distance <= 190)
          .sort((a, b) => a.distance - b.distance)[0];
        const nearestDrop = deathDrops
          .map((drop) => ({ drop, distance: Math.hypot(drop.x - playerPos.x, drop.y - playerPos.y) }))
          .filter((entry) => entry.distance <= 190)
          .sort((a, b) => a.distance - b.distance)[0];
        if (nearestDrop && (!nearestChest || nearestDrop.distance <= nearestChest.distance)) {
          嘗試拾取死亡遺落(nearestDrop.drop);
        } else if (nearestChest) {
          嘗試開啟寶箱(nearestChest.chest);
        }
      }
      return;
    }
    if (!["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowLeft", "ArrowDown", "ArrowRight"].includes(event.code)) {
      return;
    }
    event.preventDefault();
    pressed.add(event.code);
  }

  function onKeyUp(event: KeyboardEvent): void {
    pressed.delete(event.code);
  }

  function onObjectClick(object: MapObject): void {
    const dir = regionDirSafe(object.region);
    playerVelocity = { x: 0, y: 0 };
    const approachDistance = facilityImagePath(object) !== null ? WORLD_OBJECT_FOOTPRINT_RADIUS + 36 : 36;
    playerPos = clampTraversablePlayerPosition({
      x: object.x - dir.dx * approachDistance,
      y: object.y - dir.dy * approachDistance,
    }, playerPos);
    if (!訓練道場中) 設定正式玩家位置(playerPos);
    syncNearbyToState();
    render();
  }

  for (const object of MAP_OBJECTS) {
    const node = objectNodes.get(object.id);
    if (!node) continue;
    node.addEventListener("click", (event) => {
      event.stopPropagation();
      onObjectClick(object);
    });
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("resize", render);
  root.addEventListener("wheel", onWheel, { passive: false });

  function cleanup(): void {
    if (destroyed) return;
    destroyed = true;
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("resize", render);
    root.removeEventListener("wheel", onWheel);
    window.removeEventListener("dojo-acceptance-action", onDojoAcceptanceAction as EventListener);
    window.removeEventListener("captain-active-cast", onCaptainCast as EventListener);
    window.clearTimeout(skillToastTimer);
    window.cancelAnimationFrame(rafId);
    pressed.clear();
  }

  function 清空場上敵軍與彈體(): void {
    for (const monster of monsters) {
      monster.node.remove();
    }
    monsters.length = 0;
    if (訓練道場中) 覆蓋訓練敵群([]);
    projectilePool.clear();
    projectileHitTargets.clear();
    for (const node of projectileNodes.values()) node.remove();
    projectileNodes.clear();
  }

  function 召喚目前可用守護者(): void {
    let anySummoned = false;
    for (const g of 對局進度摘要(進度模式).守護者) {
      if (!可召喚守護者(g.world, 進度模式)) continue;
      const def = worldGuardian(g.world);
      if (!def) continue;
      生成Boss到場(def, "guardian", g.world);
      標記守護者已召喚(g.world, 進度模式);
      anySummoned = true;
    }
    if (anySummoned) 設定驗收事件("守護者已被召至場上。");
  }

  function 召喚COLABoss(): void {
    if (!可召喚COLA(進度模式)) return;
    生成Boss到場(finalBoss(), "cola");
    標記COLA已召喚(進度模式);
    設定驗收事件("COLA 已被召喚至場上。");
  }

  function 處理待召喚Boss(): void {
    if (訓練道場中) return;
    for (const request of 取出Boss召喚()) {
      if (request.kind === "cola") {
        生成Boss到場(finalBoss(), "cola");
        設定驗收事件("COLA 已由中央裝配儀召喚至場上。");
        continue;
      }
      const def = worldGuardian(request.world);
      if (!def) continue;
      生成Boss到場(def, "guardian", request.world);
      設定驗收事件(`${REGION_LABEL[request.world]}守護者已由祭壇召喚至場上。`);
    }
  }

  function 顯示技能提示(text: string): void {
    skillToast.textContent = text;
    skillToast.style.opacity = "1";
    window.clearTimeout(skillToastTimer);
    skillToastTimer = window.setTimeout(() => {
      skillToast.style.opacity = "0";
    }, 1100);
  }

  /**
   * 套用一次隊長主動技能效果到世界（位移玩家／拉近或減速敵人／加速全隊）。
   * 冷卻與能量已由 HUD 端（GameSnapshotSource）閘住，這裡只在成功施放後被事件驅動呼叫。
   */
  function 施放隊長主動技能(captainId: CaptainId): void {
    const live = monsters.filter((m) => m.inst.hp > 0);
    const ctx: 主動技能情境 = {
      captainId,
      playerPos: { ...playerPos },
      facing: lastMoveDir,
      monsters: live.map((m) => ({ pos: m.pos, hp: m.inst.hp })),
      nowMs: performance.now(),
    };
    const effect = 計算主動技能效果(ctx);

    if (effect.playerTeleportTo) {
      playerPos = clampTraversablePlayerPosition(effect.playerTeleportTo, playerPos);
      if (!訓練道場中) 設定正式玩家位置(playerPos);
      playerVelocity = { x: 0, y: 0 };
      syncNearbyToState();
    }
    if (effect.speedBuff) {
      速度增益倍率 = effect.speedBuff.mult;
      速度增益到期 = performance.now() + effect.speedBuff.durationMs;
    }
    if (effect.slowField) {
      減速領域 = {
        x: effect.slowField.center.x,
        y: effect.slowField.center.y,
        radius: effect.slowField.radius,
        mult: effect.slowField.mult,
        until: performance.now() + effect.slowField.durationMs,
      };
    }
    if (effect.pulls) {
      for (const pull of effect.pulls) {
        const target = live[pull.index];
        if (target) {
          target.pos.x = pull.to.x;
          target.pos.y = pull.to.y;
          if (target.persistent) {
            target.persistent.x = pull.to.x;
            target.persistent.y = pull.to.y;
          }
        }
      }
    }

    顯示技能提示(effect.label + (effect.affected > 1 ? ` ×${effect.affected}` : ""));
    設定驗收事件(`隊長主動技能｜${effect.logZh}`);
    render();
  }

  function onCaptainCast(raw: Event): void {
    const detail = (raw as CustomEvent<{ captainId?: CaptainId }>).detail;
    if (detail?.captainId) 施放隊長主動技能(detail.captainId);
  }

  function onDojoAcceptanceAction(raw: Event): void {
    if (!訓練道場中) return;
    const event = raw as CustomEvent<{ type?: string }>;
    switch (event.detail?.type) {
      case "summon_guardians":
        召喚目前可用守護者();
        render();
        break;
      case "summon_cola":
        召喚COLABoss();
        render();
        break;
      case "reset_battlefield":
        清空場上敵軍與彈體();
        render();
        break;
      default:
        break;
    }
  }

  window.addEventListener("dojo-acceptance-action", onDojoAcceptanceAction as EventListener);
  window.addEventListener("captain-active-cast", onCaptainCast as EventListener);

  處理待召喚Boss();
  syncNearbyToState();
  render();
  rafId = window.requestAnimationFrame(tick);
  return root;
}

/**
 * Batch 2 驗收面板：即時顯示背包資源、全隊戰力、擊殺數，並提供按鈕實際驅動
 * 經濟/養成模組（熔煉、升星、給資源），驗收「打怪→掉落→變強」閉環。UI 僅為佔位。
 */
interface 驗收面板回呼 {
  取擊殺數: () => number;
  取擊殺統計: () => Record<string, number>;
  召喚可用守護者: () => void;
  召喚COLA: () => void;
}

function 建立驗收面板(cb: 驗收面板回呼): HTMLElement {
  const { 取擊殺數, 取擊殺統計 } = cb;
  const panel = document.createElement("div");
  panel.className = "驗收面板";
  let timer = 0;

  const render = () => {
    const snap = 背包.背包快照();
    const squad = 小隊屬性摘要();
    const roster = 取得上陣養成();
    const 碎片列 = (Object.entries(snap.碎片) as [string, number][])
      .filter(([, n]) => n > 0)
      .map(([f, n]) => `${f}:${n}`)
      .join(" ") || "無";
    panel.innerHTML = "";

    const info = document.createElement("div");
    info.className = "驗收面板-資訊";
    info.innerHTML = `
      <div class="驗收面板-標題">驗收面板 · 經濟/養成閉環</div>
      <div>擊殺 <b>${取擊殺數()}</b> ｜ 原石 <b>${snap.原石}</b> ｜ 材料 <b>${snap.材料總數}</b></div>
      <div>碎片：${碎片列}</div>
      <div>全隊 ATK <b>${squad.totalAtk}</b> ｜ HP <b>${squad.totalHp}</b> ｜ 隊長 ${當前隊長星級()}★（累計 ${隊員累計總星級()}★）</div>
      <div class="驗收面板-隊員">${roster
        .map((r) => `${r.nameZh}${r.star}★`)
        .join("、")}</div>
    `;
    panel.appendChild(info);

    const 按鈕列 = document.createElement("div");
    按鈕列.className = "驗收面板-按鈕列";

    const 加按鈕 = (label: string, fn: () => void) => {
      const b = document.createElement("button");
      b.className = "三級按鈕";
      b.textContent = label;
      b.onclick = () => {
        fn();
        render();
      };
      按鈕列.appendChild(b);
    };

    // 給測試資源：直接灌入原石＋每種材料若干＋碎片，方便驗收升星/購買。
    加按鈕("給測試資源", () => {
      背包.加入原石(2000);
      for (const family of ["shield", "multishot", "straight", "mine", "laser"] as const) {
        背包.加入碎片(family, 100);
      }
      for (let no = 1; no <= 40; no += 1) 背包.加入材料(no, 20);
    });

    // 熔煉：把背包裡的所有材料丟進「直線熔爐（有機）」煉成碎片（示範熔爐熔煉）。
    加按鈕("熔煉材料→碎片", () => {
      const inputs = snap.材料明細.map((m) => ({ materialNo: m.no, count: m.count }));
      if (inputs.length === 0) return;
      const result = smelt({ furnace: { family: "straight", world: "organic" }, inputs });
      // 扣掉投入的材料、加入產出的碎片。
      for (const line of inputs) 背包.花費材料(line.materialNo, line.count);
      背包.加入碎片("straight", result.shards);
    });

    // 升星第一位可升的隊員（消耗背包資源；成功則刷新最大生命）。
    加按鈕("升星隊員", () => {
      for (let i = 0; i < roster.length; i += 1) {
        if (roster[i].star >= 3) continue;
        const r = 升星上陣隊員(i);
        if (r.ok) {
          刷新正式最大生命();
          break;
        }
      }
    });

    // 全員盡量升星（驗收「戰力大幅提升」）。
    加按鈕("全員升星", () => {
      let 有升 = false;
      for (let round = 0; round < 6; round += 1) {
        for (let i = 0; i < roster.length; i += 1) {
          if (升星上陣隊員(i).ok) 有升 = true;
        }
      }
      if (有升) 刷新正式最大生命();
    });

    panel.appendChild(按鈕列);

    // —— 推圖進度（Batch 3）——
    const prog = 對局進度摘要();
    const 推圖 = document.createElement("div");
    推圖.className = "驗收面板-推圖";
    const 守護者文 = prog.守護者
      .map((g) => {
        const 世界短 = { geometry: "幾", organic: "有", fractal: "分", mechanical: "機" }[g.world];
        const 狀 = g.defeated ? "✓倒" : g.ready ? "可召" : `${g.readiness.eliteKills}/3精`;
        return `${世界短}${g.enraged ? "🔥" : ""}${狀}`;
      })
      .join(" ");
    推圖.innerHTML = `<div class="驗收面板-標題">推圖進度</div><div>${守護者文}</div><div>印記 ${prog.印記數}/4 ｜ COLA ${prog.可召喚COLA ? "可召喚" : "未集齊"}</div>`;
    panel.appendChild(推圖);

    const 推圖按鈕 = document.createElement("div");
    推圖按鈕.className = "驗收面板-按鈕列";
    const 加推圖按鈕 = (label: string, fn: () => void) => {
      const b = document.createElement("button");
      b.className = "三級按鈕";
      b.textContent = label;
      b.onclick = () => { fn(); render(); };
      推圖按鈕.appendChild(b);
    };
    // 除錯：一鍵灌滿四世界守護者召喚條件（3 精英 + 3 種雜兵各 5）。
    加推圖按鈕("達成守護者條件", () => {
      for (const w of ["geometry", "organic", "fractal", "mechanical"] as const) {
        for (let k = 0; k < 3; k += 1) for (let n = 0; n < 5; n += 1) 記錄世界擊殺(w, 1, `t${k}`);
        for (let e = 0; e < 3; e += 1) 記錄世界擊殺(w, 2);
      }
    });
    加推圖按鈕("召喚守護者", () => cb.召喚可用守護者());
    加推圖按鈕("召喚COLA", () => cb.召喚COLA());
    panel.appendChild(推圖按鈕);

    const 進度 = document.createElement("div");
    進度.className = "驗收面板-進度";
    const 統計 = 取擊殺統計();
    const 統計文 = Object.entries(統計)
      .map(([k, v]) => `${k}:${v}`)
      .join(" ") || "尚無擊殺";
    進度.textContent = `擊殺分布 ${統計文}`;
    panel.appendChild(進度);
  };

  render();
  timer = window.setInterval(() => {
    if (!panel.isConnected) {
      window.clearInterval(timer);
      return;
    }
    render();
  }, 300);
  return panel;
}

function regionDirSafe(region: Region): { dx: number; dy: number } {
  if (region === "plaza") return { dx: 0, dy: 1 };
  return REGION_DIRECTION[region];
}

function createObjectNode(object: MapObject): HTMLElement {
  const node = document.createElement("div");
  node.className = `世界地圖層-物件 世界地圖層-物件-${object.kind}`;
  node.dataset.kind = object.kind;
  node.dataset.id = object.id;
  node.style.setProperty("--world-object-size", `${WORLD_OBJECT_SIZE_AT_REFERENCE_ZOOM}px`);
  const imagePath = facilityImagePath(object);

  const visualLayer = document.createElement("div");
  visualLayer.className = "世界地圖層-物件-視覺層";
  if (imagePath) visualLayer.classList.add("世界地圖層-視覺層-禁走地板");

  const shadowLayer = document.createElement("div");
  shadowLayer.className = "世界地圖層-物件-影子";

  const bodyLayer = document.createElement("div");
  bodyLayer.className = "世界地圖層-物件-主體";

  if (imagePath) {
    const shadowMask = document.createElement("div");
    shadowMask.className = "世界地圖層-物件-image-shadow";
    shadowMask.style.setProperty("--shadow-mask", `url("${imagePath}")`);
    shadowLayer.appendChild(shadowMask);

    const mainImg = document.createElement("img");
    mainImg.className = "世界地圖層-物件-image";
    mainImg.src = imagePath;
    mainImg.alt = object.label;
    mainImg.draggable = false;
    bodyLayer.appendChild(mainImg);
  } else {
    const shadowGlyph = document.createElement("span");
    shadowGlyph.className = "世界地圖層-物件-glyph 世界地圖層-物件-glyph-shadow";
    shadowGlyph.textContent = FACILITY_GLYPH[object.kind];
    shadowLayer.appendChild(shadowGlyph);

    const mainGlyph = document.createElement("span");
    mainGlyph.className = "世界地圖層-物件-glyph";
    mainGlyph.textContent = FACILITY_GLYPH[object.kind];
    bodyLayer.appendChild(mainGlyph);
  }

  visualLayer.append(shadowLayer, bodyLayer);

  const label = document.createElement("span");
  label.className = "世界地圖層-物件-label";
  label.textContent = object.label;

  node.append(visualLayer, label);
  node.title = object.detail ?? object.label;
  return node;
}

function facilityImagePath(object: MapObject): string | null {
  if (object.kind === "熔爐" && object.family) return FAMILY_FURNACE_IMAGE[object.family];
  if (object.kind === "召喚" && object.region !== "plaza") return GUARDIAN_ALTAR_IMAGE[object.region];
  return null;
}

function createEnvObjectNode(env: EnvObjectInstance): HTMLElement {
  const node = document.createElement("div");
  node.className = `世界地圖層-環境物件 世界地圖層-環境物件-${env.category}`;
  node.style.setProperty("--world-object-size", `${WORLD_OBJECT_SIZE_AT_REFERENCE_ZOOM}px`);

  const visualLayer = document.createElement("div");
  visualLayer.className = "世界地圖層-環境物件-視覺層";
  visualLayer.classList.add("世界地圖層-視覺層-禁走地板");

  const shadowLayer = document.createElement("div");
  shadowLayer.className = "世界地圖層-環境物件-影子";

  const shadowMask = document.createElement("div");
  shadowMask.className = "世界地圖層-環境物件-image-shadow";
  shadowMask.style.setProperty("--shadow-mask", `url("${env.iconPath}")`);

  const img = document.createElement("img");
  img.className = "世界地圖層-環境物件-image";
  img.src = env.iconPath;
  img.alt = env.nameZh;
  img.width = WORLD_OBJECT_SIZE_AT_REFERENCE_ZOOM;
  img.height = WORLD_OBJECT_SIZE_AT_REFERENCE_ZOOM;
  img.draggable = false;
  const 重量描述 = env.destructible ? `碰撞重量 ${env.weight ?? "?"}` : "不可破壞";
  node.title = `${env.nameZh}（${env.category}・${重量描述}）\n${env.mechanicText}`;
  shadowLayer.appendChild(shadowMask);
  visualLayer.append(shadowLayer, img);
  node.appendChild(visualLayer);
  return node;
}

/** 一隻在場怪物的執行期狀態：靜態定義 + 可變位置 + DOM 節點 + 游走狀態。 */
interface MonsterRuntime {
  inst: 可見怪物實例;
  pos: { x: number; y: number };
  node: HTMLElement;
  wanderDir?: { x: number; y: number };
  wanderTimer?: number;
  /** 敵方開火冷卻（秒）；<=0 時可再開火 */
  fireCd?: number;
  /** 最近被子彈命中的時間戳（供 AI underFire 判定 T0 逃跑用） */
  lastHitMs?: number;
  /** 死亡掉落是否已結算（避免重複掉落） */
  dropped?: boolean;
  /** Boss 標記：守護者 / COLA（死亡時走特殊結算，而非一般掉落） */
  bossKind?: "guardian" | "cola";
  /** 守護者所屬世界（bossKind="guardian" 時） */
  bossWorld?: World;
  /** 隊長減速控制：受影響到此時間戳（ms）為止，期間移速乘 slowMult */
  slowUntil?: number;
  slowMult?: number;
  /** 正式對局的跨頁持久狀態；訓練道場不使用。 */
  persistent?: 正式戰場怪物;
}

/** 建立一隻怪物的 DOM 節點（去背立繪 + 影子，比照環境物件的視覺結構）。 */
function createMonsterNode(inst: 可見怪物實例): HTMLElement {
  const node = document.createElement("div");
  node.className = `世界地圖層-怪物 世界地圖層-怪物-T${inst.tier}`;
  const baseSize = MONSTER_SIZE_AT_REFERENCE_ZOOM[inst.tier as 0 | 1 | 2] ?? 360;
  node.style.setProperty("--monster-size", `${baseSize}px`);

  const shadow = document.createElement("img");
  shadow.className = "世界地圖層-怪物-image 世界地圖層-怪物-image-shadow";
  shadow.src = inst.spritePath;
  shadow.alt = "";
  shadow.draggable = false;

  const img = document.createElement("img");
  img.className = "世界地圖層-怪物-image";
  img.src = inst.spritePath;
  img.alt = inst.nameZh;
  img.draggable = false;

  // 血條（佔位美術）：受傷後才顯示，讓子彈傷害在畫面上可見。
  const hpBar = document.createElement("div");
  hpBar.className = "世界地圖層-怪物-血條";
  hpBar.style.display = "none";
  const hpFill = document.createElement("div");
  hpFill.className = "世界地圖層-怪物-血條填充";
  hpBar.appendChild(hpFill);

  node.title = `${inst.nameZh}（T${inst.tier}）`;
  node.append(shadow, img, hpBar);
  return node;
}

function createWorldChestNode(chest: WorldChestInstance): HTMLElement {
  const node = document.createElement("button");
  node.type = "button";
  node.title = "禪繞寶箱｜靠近後按 E，消耗最大能量 50% 開啟";
  node.setAttribute("aria-label", `${chest.world} 禪繞寶箱`);
  Object.assign(node.style, {
    position: "absolute",
    left: "0",
    top: "0",
    width: "58px",
    height: "46px",
    transform: "translate(var(--x, 0px), var(--y, 0px)) translate(-50%, -78%)",
    placeItems: "center",
    border: "2px solid rgba(255,255,255,0.92)",
    borderRadius: "9px 9px 5px 5px",
    background: "linear-gradient(145deg, #2d3138 0 48%, #16191f 49% 100%)",
    boxShadow: "0 0 0 2px #737982, 0 9px 14px rgba(0,0,0,0.42), 0 0 18px rgba(220,230,235,0.58)",
    color: "#f8f8f4",
    font: "700 20px Georgia, serif",
    cursor: "pointer",
    zIndex: "4",
  });
  node.textContent = "◇";
  return node;
}

function createDeathDropNode(drop: 死亡遺落物): HTMLElement {
  const node = document.createElement("button");
  node.type = "button";
  const count = drop.materials.reduce((sum, item) => sum + item.count, 0);
  node.title = `死亡遺落材料 ×${count}｜靠近後按 E 取回`;
  node.setAttribute("aria-label", `死亡遺落材料 ${count} 份`);
  Object.assign(node.style, {
    position: "absolute",
    left: "0",
    top: "0",
    width: "54px",
    height: "42px",
    transform: "translate(var(--x, 0px), var(--y, 0px)) translate(-50%, -68%) rotate(-4deg)",
    placeItems: "center",
    border: "2px solid #eeeeea",
    borderRadius: "50% 44% 48% 42%",
    background: "radial-gradient(circle at 38% 32%, #b8bdc3, #565d66 62%, #252a30)",
    boxShadow: "0 8px 12px rgba(0,0,0,0.42), 0 0 16px rgba(190,198,205,0.55)",
    color: "#fff",
    font: "700 14px Georgia, serif",
    cursor: "pointer",
    zIndex: "4",
  });
  node.textContent = `×${count}`;
  return node;
}

function createZoneLabel(zone: MapZone, host: HTMLElement) {
  const label = document.createElement("div");
  label.className = `世界地圖層-區域標籤 世界地圖層-區域標籤-${zone.region}`;
  label.textContent = REGION_LABEL[zone.region];
  host.appendChild(label);

  return { zone, label };
}

function renderZoneLabels(
  labels: Array<{ zone: MapZone; label: HTMLElement }>,
  viewport: { w: number; h: number },
): void {
  for (const { zone, label } of labels) {
    const labelPos = worldToScreen({ x: zone.labelX, y: zone.labelY }, playerPos, viewport);
    label.style.left = `${labelPos.x}px`;
    label.style.top = `${labelPos.y}px`;
    label.style.display = isVisible(labelPos, viewport) ? "block" : "none";
  }
}

// 小地圖的區域外框、中央區邊界、分界線與物件點位都是「世界座標固定」的靜態內容，
// 在此一次性寫入 d / 位置，之後不再逐幀重設。
// 之所以獨立於 renderMiniMapDynamic，是因為中央區邊界含數百個頂點，
// 每幀重設 d 會迫使瀏覽器重建路徑幾何快取，是移動卡頓的主因。
function initMiniStaticPaths(
  regions: Record<World, SVGPathElement>,
  geometryCore: { path: SVGPathElement; label: SVGTextElement },
  geometryCoreBoundaries: EinsteinPoint[][],
  fractalCore: { path: SVGPathElement; label: SVGTextElement },
  fractalCoreBoundaries: PenrosePoint[][],
  organicCore: { path: SVGPathElement; label: SVGTextElement },
  organicCoreBoundaries: EscherPoint[][],
  mechanicalCore: { path: SVGPathElement; label: SVGTextElement },
  mechanicalCoreBoundaries: CairoPoint[][],
  dividers: { vertical: SVGPathElement; horizontal: SVGPathElement },
): void {
  // 小地圖的內層尺寸固定為 196px - padding，這裡取一個穩定值即可；
  // toMini 用同一個比例縮放，與舊 renderMiniMap 的行為一致。
  const width = 176;
  const height = 176;
  const toMini = (point: { x: number; y: number }) => ({
    x: ((point.x - MAP_BOUNDS.minX) / (MAP_BOUNDS.maxX - MAP_BOUNDS.minX)) * width,
    y: ((point.y - MAP_BOUNDS.minY) / (MAP_BOUNDS.maxY - MAP_BOUNDS.minY)) * height,
  });

  const polygons = buildRegionPolygons();
  (Object.keys(regions) as World[]).forEach((world) => {
    regions[world].setAttribute("d", polygonToPath(polygons[world], toMini));
  });
  geometryCore.path.setAttribute(
    "d",
    geometryCoreBoundaries.map((boundary) => polygonToPath(boundary, toMini)).join(" "),
  );
  const geometryZone = MAP_ZONES.find((zone) => zone.region === "geometry");
  if (geometryZone) {
    const coreCenter = toMini({ x: geometryZone.centerX, y: geometryZone.centerY });
    geometryCore.label.setAttribute("x", String(coreCenter.x));
    geometryCore.label.setAttribute("y", String(coreCenter.y));
  }
  fractalCore.path.setAttribute(
    "d",
    fractalCoreBoundaries.map((boundary) => polygonToPath(boundary, toMini)).join(" "),
  );
  const fractalZone = MAP_ZONES.find((zone) => zone.region === "fractal");
  if (fractalZone) {
    const coreCenter = toMini({ x: fractalZone.centerX, y: fractalZone.centerY });
    fractalCore.label.setAttribute("x", String(coreCenter.x));
    fractalCore.label.setAttribute("y", String(coreCenter.y));
  }
  organicCore.path.setAttribute(
    "d",
    organicCoreBoundaries.map((boundary) => polygonToPath(boundary, toMini)).join(" "),
  );
  const organicZone = MAP_ZONES.find((zone) => zone.region === "organic");
  if (organicZone) {
    const coreCenter = toMini({ x: organicZone.centerX, y: organicZone.centerY });
    organicCore.label.setAttribute("x", String(coreCenter.x));
    organicCore.label.setAttribute("y", String(coreCenter.y));
  }
  mechanicalCore.path.setAttribute(
    "d",
    mechanicalCoreBoundaries.map((boundary) => polygonToPath(boundary, toMini)).join(" "),
  );
  const mechanicalZone = MAP_ZONES.find((zone) => zone.region === "mechanical");
  if (mechanicalZone) {
    const coreCenter = toMini({ x: mechanicalZone.centerX, y: mechanicalZone.centerY });
    mechanicalCore.label.setAttribute("x", String(coreCenter.x));
    mechanicalCore.label.setAttribute("y", String(coreCenter.y));
  }
  dividers.vertical.setAttribute("d", polylineToPath(MAP_VERTICAL_DIVIDER, toMini));
  dividers.horizontal.setAttribute("d", polylineToPath(MAP_HORIZONTAL_DIVIDER, toMini));
}

// 每幀只需更新小地圖上「會動」的東西：玩家點位置。
// 區域/邊界/物件點位都在 initMiniStaticPaths 寫死，不再逐幀重算。
function renderMiniMapDynamic(
  host: HTMLElement,
  objectNodes: Map<string, HTMLElement>,
  playerNode: HTMLElement,
): void {
  const width = host.clientWidth || 176;
  const height = host.clientHeight || 176;
  const toMiniX = (x: number) => ((x - MAP_BOUNDS.minX) / (MAP_BOUNDS.maxX - MAP_BOUNDS.minX)) * width;
  const toMiniY = (y: number) => ((y - MAP_BOUNDS.minY) / (MAP_BOUNDS.maxY - MAP_BOUNDS.minY)) * height;

  // 物件點位同樣是固定的，但舊版每幀重寫；這裡改成只在首次繪製時設定一次，
  // 之後動態幀跳過，避免反覆寫 style 觸發 layout。
  for (const object of MAP_OBJECTS) {
    const node = objectNodes.get(object.id);
    if (!node) continue;
    if (node.dataset.placed === "1") continue;
    node.style.left = `${toMiniX(object.x)}px`;
    node.style.top = `${toMiniY(object.y)}px`;
    node.dataset.placed = "1";
  }

  const px = toMiniX(playerPos.x);
  const py = toMiniY(playerPos.y);
  playerNode.style.left = `${px}px`;
  playerNode.style.top = `${py}px`;
}

function createRegionPaths(host: SVGSVGElement): Record<World, SVGPathElement> {
  const regions = {} as Record<World, SVGPathElement>;
  (["geometry", "organic", "fractal", "mechanical"] as World[]).forEach((world) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("class", `世界地圖層-區域片 世界地圖層-區域片-${world}`);
    host.appendChild(path);
    regions[world] = path;
  });
  return regions;
}

function createLightweightWrinkleFloors(host: SVGSVGElement): void {
  const svgNamespace = "http://www.w3.org/2000/svg";
  const polygons = buildRegionPolygons();
  const defs = document.createElementNS(svgNamespace, "defs");
  const group = document.createElementNS(svgNamespace, "g");
  group.setAttribute("class", "世界地圖層-輕量折皺地板");

  const worldWidth = MAP_BOUNDS.maxX - MAP_BOUNDS.minX;
  const worldHeight = MAP_BOUNDS.maxY - MAP_BOUNDS.minY;

  (["geometry", "organic", "fractal", "mechanical"] as World[]).forEach((world) => {
    const clipId = `lightweight-wrinkle-floor-clip-${world}`;
    const clipPath = document.createElementNS(svgNamespace, "clipPath");
    clipPath.setAttribute("id", clipId);
    const clipShape = document.createElementNS(svgNamespace, "path");
    clipShape.setAttribute("d", polygonToPath(polygons[world], (point) => point));
    clipPath.appendChild(clipShape);
    defs.appendChild(clipPath);

    const image = document.createElementNS(svgNamespace, "image");
    image.setAttribute("class", `世界地圖層-輕量折皺地板圖 世界地圖層-輕量折皺地板圖-${world}`);
    image.setAttribute("href", LIGHTWEIGHT_WRINKLE_FLOOR_IMAGE[world]);
    image.setAttribute("x", String(MAP_BOUNDS.minX));
    image.setAttribute("y", String(MAP_BOUNDS.minY));
    image.setAttribute("width", String(worldWidth));
    image.setAttribute("height", String(worldHeight));
    image.setAttribute("preserveAspectRatio", "xMidYMid slice");
    image.setAttribute("clip-path", `url(#${clipId})`);
    group.appendChild(image);
  });

  host.append(defs, group);
}

function createGeometryEinsteinFloor(host: SVGSVGElement): EinsteinPoint[][] {
  const svgNamespace = "http://www.w3.org/2000/svg";
  const geometryPolygon = buildRegionPolygons().geometry;
  const geometryPath = polygonToPath(geometryPolygon, (point) => point);
  const geometryZone = MAP_ZONES.find((zone) => zone.region === "geometry");
  if (!geometryZone) return [];

  const definitions = document.createElementNS(svgNamespace, "defs");
  const clipPath = document.createElementNS(svgNamespace, "clipPath");
  clipPath.setAttribute("id", "geometry-world-floor-clip");
  const clipShape = document.createElementNS(svgNamespace, "path");
  clipShape.setAttribute("d", geometryPath);
  clipPath.appendChild(clipShape);
  definitions.appendChild(clipPath);

  if (ENABLE_DETAILED_FLOOR_TEXTURES) {
  if (ENABLE_DETAILED_FLOOR_TEXTURES) {
  for (const zone of ["outer", "core"] as const) {
    for (let variant = 0; variant < 6; variant += 1) {
      const pattern = document.createElementNS(svgNamespace, "pattern");
      pattern.setAttribute("id", `geometry-floor-${zone}-${variant}`);
      pattern.setAttribute("patternUnits", "objectBoundingBox");
      pattern.setAttribute("width", "1");
      pattern.setAttribute("height", "1");
      const halfStart = zone === "outer" ? 0 : 887;
      pattern.setAttribute("viewBox", `${halfStart} 0 887 887`);
      pattern.setAttribute("preserveAspectRatio", "xMidYMid slice");

      const image = document.createElementNS(svgNamespace, "image");
      image.setAttribute("href", "/images/maps/floors/geometry.png");
      image.setAttribute("width", "1774");
      image.setAttribute("height", "887");
      image.setAttribute("x", "0");
      image.setAttribute("y", "0");
      // 只使用不會露出方形角落的鏡射；原先的 60 度旋轉正是藍色缺口來源。
      const horizontalMirrorAxis = zone === "outer" ? 887 : 2661;
      const transforms = [
        "",
        `translate(${horizontalMirrorAxis} 0) scale(-1 1)`,
        "translate(0 887) scale(1 -1)",
        `translate(${horizontalMirrorAxis} 887) scale(-1 -1)`,
        "",
        `translate(${horizontalMirrorAxis} 0) scale(-1 1)`,
      ];
      image.setAttribute("transform", transforms[variant]);
      pattern.appendChild(image);

      const tint = document.createElementNS(svgNamespace, "rect");
      tint.setAttribute("x", String(halfStart));
      tint.setAttribute("y", "0");
      tint.setAttribute("width", "887");
      tint.setAttribute("height", "887");
      tint.setAttribute("fill", zone === "outer" ? "#315d91" : "#9bc9f2");
      tint.setAttribute("fill-opacity", zone === "outer" ? "0.86" : "0.78");
      tint.setAttribute("style", "mix-blend-mode: multiply");
      pattern.appendChild(tint);
      definitions.appendChild(pattern);
    }
  }
  }

  host.appendChild(definitions);

  const tileGroup = document.createElementNS(svgNamespace, "g");
  tileGroup.setAttribute("class", "世界地圖層-愛因斯坦地板");
  tileGroup.setAttribute("clip-path", "url(#geometry-world-floor-clip)");

  const supertile = buildEinsteinHatSupertile(2);
  const sourceTiles = supertile.tiles;
  const sourcePoints = sourceTiles.flatMap((tile) => tile.points);
  const sourceBounds = boundsOf(sourcePoints);
  const targetBounds = boundsOf(geometryPolygon);
  const sourceWidth = sourceBounds.maxX - sourceBounds.minX;
  const sourceHeight = sourceBounds.maxY - sourceBounds.minY;
  const targetWidth = targetBounds.maxX - targetBounds.minX;
  const targetHeight = targetBounds.maxY - targetBounds.minY;
  const sourceCenter = pointAtCenter(sourceBounds);
  const targetCenter = pointAtCenter(targetBounds);
  const initialScale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  // 保持單一合法超級拼塊，不複製、不疊放；把它放大到整個幾何區都落在外框內。
  const scale = findCoveringScale(
    supertile.boundary,
    geometryPolygon,
    sourceCenter,
    targetCenter,
    initialScale,
  );
  const transformedTiles = sourceTiles.map((tile) => ({
    ...tile,
    points: tile.points.map((point) => transformFloorPoint(point, sourceCenter, targetCenter, scale)),
    center: transformFloorPoint(tile.center, sourceCenter, targetCenter, scale),
  }));

  const regionArea = Math.abs(polygonArea(geometryPolygon));
  const coreRadius = Math.sqrt((regionArea * 0.3) / Math.PI);
  const coreTiles = transformedTiles.filter((tile) =>
    Math.hypot(tile.center.x - geometryZone.centerX, tile.center.y - geometryZone.centerY) <= coreRadius,
  );
  const coreBoundaries = buildTileBoundaryLoops(coreTiles.map((tile) => tile.points));

  // 吸附幾何世界物件到瓷磚中心
  const geometryObjects = [
    ...MAP_OBJECTS.filter((o) => o.region === "geometry"),
    ...ENV_OBJECTS.filter((o) => o.world === "geometry")
  ];
  const occupiedIndices = new Set<number>();
  for (const obj of geometryObjects) {
    let nearestIndex = -1;
    let minDistance = Infinity;
    for (let idx = 0; idx < transformedTiles.length; idx += 1) {
      if (occupiedIndices.has(idx)) continue;
      const tile = transformedTiles[idx];
      const dist = Math.hypot(tile.center.x - obj.x, tile.center.y - obj.y);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = idx;
      }
    }
    if (nearestIndex !== -1) {
      occupiedIndices.add(nearestIndex);
      (obj as any).x = transformedTiles[nearestIndex].center.x;
      (obj as any).y = transformedTiles[nearestIndex].center.y;
    }
  }

  for (let index = 0; index < transformedTiles.length; index += 1) {
    const tile = transformedTiles[index];
    const tilePath = polygonToPath(tile.points, (point) => point);
    const distanceToCore = Math.hypot(tile.center.x - geometryZone.centerX, tile.center.y - geometryZone.centerY);
    const floorZone = distanceToCore <= coreRadius ? "core" : "outer";
    const variant = stableTileVariant(tile.center, index);
    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", tilePath);
    applyDetailedTileFill(path, definitions, "geometry", floorZone, variant, index, tile.center, svgNamespace);
    path.setAttribute("class", `世界地圖層-愛因斯坦磁磚 世界地圖層-愛因斯坦磁磚-${floorZone}`);
    tileGroup.appendChild(path);

    // 障礙物與設施所在的整塊磁磚必須是純白，不混入底圖顏色。
    if (occupiedIndices.has(index)) {
      const mask = document.createElementNS(svgNamespace, "path");
      mask.setAttribute("d", tilePath);
      mask.setAttribute("fill", "#ffffff");
      mask.setAttribute("stroke", "#ffffff");
      mask.setAttribute("stroke-width", "2");
      mask.setAttribute("style", "pointer-events: none;");
      tileGroup.appendChild(mask);
    }
  }

  const coreDivider = document.createElementNS(svgNamespace, "path");
  coreDivider.setAttribute("class", "世界地圖層-幾何中央分界線");
  coreDivider.setAttribute("d", coreBoundaries.map((boundary) => polygonToPath(boundary, (point) => point)).join(" "));
  tileGroup.appendChild(coreDivider);
  host.appendChild(tileGroup);
  return coreBoundaries;
}

/**
 * 分形世界地板：架構完全比照 createGeometryEinsteinFloor，只把鋪磚來源換成
 * Penrose P3 菱形鋪磚（彭羅斯地板.ts），細分演算法保證無縫、不重疊。
 */
function createFractalPenroseFloor(host: SVGSVGElement): PenrosePoint[][] {
  const svgNamespace = "http://www.w3.org/2000/svg";
  const fractalPolygon = buildRegionPolygons().fractal;
  const fractalPath = polygonToPath(fractalPolygon, (point) => point);
  const fractalZone = MAP_ZONES.find((zone) => zone.region === "fractal");
  if (!fractalZone) return [];

  const definitions = document.createElementNS(svgNamespace, "defs");
  const clipPath = document.createElementNS(svgNamespace, "clipPath");
  clipPath.setAttribute("id", "fractal-world-floor-clip");
  const clipShape = document.createElementNS(svgNamespace, "path");
  clipShape.setAttribute("d", fractalPath);
  clipPath.appendChild(clipShape);
  definitions.appendChild(clipPath);

  if (ENABLE_DETAILED_FLOOR_TEXTURES) {
  for (const zone of ["outer", "core"] as const) {
    for (let variant = 0; variant < 6; variant += 1) {
      const pattern = document.createElementNS(svgNamespace, "pattern");
      pattern.setAttribute("id", `fractal-floor-${zone}-${variant}`);
      pattern.setAttribute("patternUnits", "objectBoundingBox");
      pattern.setAttribute("width", "1");
      pattern.setAttribute("height", "1");
      const halfStart = zone === "outer" ? 0 : 887;
      pattern.setAttribute("viewBox", `${halfStart} 0 887 887`);
      pattern.setAttribute("preserveAspectRatio", "xMidYMid slice");

        // 底層純色 bg 托底以維持顏色飽和
        const bg = document.createElementNS(svgNamespace, "rect");
        bg.setAttribute("x", String(halfStart));
        bg.setAttribute("y", "0");
        bg.setAttribute("width", "887");
        bg.setAttribute("height", "887");
        bg.setAttribute("fill", zone === "outer" ? "#b49bdc" : "#d0bdeb");
        bg.setAttribute("fill-opacity", "1.0");
        pattern.appendChild(bg);

        // 中間半透明 image 用以淡化強黑線
        const image = document.createElementNS(svgNamespace, "image");
        image.setAttribute("href", "/images/maps/floors/fractal.png");
        image.setAttribute("width", "1774");
        image.setAttribute("height", "887");
        image.setAttribute("x", "0");
        image.setAttribute("y", "0");
        image.setAttribute("opacity", "0.26"); // 稀釋黑線，降低存在感
        const horizontalMirrorAxis = zone === "outer" ? 887 : 2661;
        const transforms = [
          "",
          `translate(${horizontalMirrorAxis} 0) scale(-1 1)`,
          "translate(0 887) scale(1 -1)",
          `translate(${horizontalMirrorAxis} 887) scale(-1 -1)`,
          "",
          `translate(${horizontalMirrorAxis} 0) scale(-1 1)`,
        ];
        image.setAttribute("transform", transforms[variant]);
        pattern.appendChild(image);

        // 頂層正片疊底染墨層
        const tint = document.createElementNS(svgNamespace, "rect");
        tint.setAttribute("x", String(halfStart));
        tint.setAttribute("y", "0");
        tint.setAttribute("width", "887");
        tint.setAttribute("height", "887");
        tint.setAttribute("fill", zone === "outer" ? "#b49bdc" : "#d0bdeb");
        tint.setAttribute("fill-opacity", "0.6");
        tint.setAttribute("style", "mix-blend-mode: multiply");
        pattern.appendChild(tint);
      definitions.appendChild(pattern);
    }
  }
  }

  host.appendChild(definitions);

  const tileGroup = document.createElementNS(svgNamespace, "g");
  tileGroup.setAttribute("class", "世界地圖層-彭羅斯地板");
  tileGroup.setAttribute("clip-path", "url(#fractal-world-floor-clip)");

  const supertile = buildPenroseSupertile(4);
  const sourceTiles = supertile.tiles;
  const sourcePoints = sourceTiles.flatMap((tile) => tile.points);
  const sourceBounds = boundsOf(sourcePoints);
  const targetBounds = boundsOf(fractalPolygon);
  const sourceWidth = sourceBounds.maxX - sourceBounds.minX;
  const sourceHeight = sourceBounds.maxY - sourceBounds.minY;
  const targetWidth = targetBounds.maxX - targetBounds.minX;
  const targetHeight = targetBounds.maxY - targetBounds.minY;
  const sourceCenter = pointAtCenter(sourceBounds);
  const targetCenter = pointAtCenter(targetBounds);
  const initialScale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const scale = findCoveringScale(
    supertile.boundary,
    fractalPolygon,
    sourceCenter,
    targetCenter,
    initialScale,
  );
  const transformedTiles = sourceTiles.map((tile) => ({
    ...tile,
    points: tile.points.map((point) => transformFloorPoint(point, sourceCenter, targetCenter, scale)),
    center: transformFloorPoint(tile.center, sourceCenter, targetCenter, scale),
  }));

  const regionArea = Math.abs(polygonArea(fractalPolygon));
  const coreRadius = Math.sqrt((regionArea * 0.3) / Math.PI);
  const coreTiles = transformedTiles.filter((tile) =>
    Math.hypot(tile.center.x - fractalZone.centerX, tile.center.y - fractalZone.centerY) <= coreRadius,
  );
  const coreBoundaries = buildTileBoundaryLoops(coreTiles.map((tile) => tile.points));

  // 吸附分形世界物件到瓷磚中心
  const fractalObjects = [
    ...MAP_OBJECTS.filter((o) => o.region === "fractal"),
    ...ENV_OBJECTS.filter((o) => o.world === "fractal")
  ];
  const occupiedIndices = new Set<number>();
  for (const obj of fractalObjects) {
    let nearestIndex = -1;
    let minDistance = Infinity;
    for (let idx = 0; idx < transformedTiles.length; idx += 1) {
      if (occupiedIndices.has(idx)) continue;
      const tile = transformedTiles[idx];
      const dist = Math.hypot(tile.center.x - obj.x, tile.center.y - obj.y);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = idx;
      }
    }
    if (nearestIndex !== -1) {
      occupiedIndices.add(nearestIndex);
      (obj as any).x = transformedTiles[nearestIndex].center.x;
      (obj as any).y = transformedTiles[nearestIndex].center.y;
    }
  }

  for (let index = 0; index < transformedTiles.length; index += 1) {
    const tile = transformedTiles[index];
    const tilePath = polygonToPath(tile.points, (point) => point);
    const distanceToCore = Math.hypot(tile.center.x - fractalZone.centerX, tile.center.y - fractalZone.centerY);
    const floorZone = distanceToCore <= coreRadius ? "core" : "outer";
    const variant = stableTileVariant(tile.center, index);
    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", tilePath);
    applyDetailedTileFill(path, definitions, "fractal", floorZone, variant, index, tile.center, svgNamespace);
    path.setAttribute(
      "class",
      `世界地圖層-彭羅斯磁磚 世界地圖層-彭羅斯磁磚-${floorZone} 世界地圖層-彭羅斯磁磚-${tile.kind}`,
    );
    tileGroup.appendChild(path);

    // 障礙物與設施瓷磚疊加白色半透明遮罩
    if (occupiedIndices.has(index)) {
      const mask = document.createElementNS(svgNamespace, "path");
      mask.setAttribute("d", tilePath);
      mask.setAttribute("fill", "#ffffff");
      mask.setAttribute("stroke", "#ffffff");
      mask.setAttribute("stroke-width", "2");
      mask.setAttribute("style", "pointer-events: none;");
      tileGroup.appendChild(mask);
    }
  }

  host.appendChild(tileGroup);
  return coreBoundaries;
}

/**
 * 有機世界地板：架構比照 createFractalPenroseFloor，鋪磚來源換成艾雪鳥地板.ts。
 * 與 Hat／Penrose 不同的是，平移鑲嵌不需要「先生成一份固定拼塊再找縮放比例覆蓋區域」，
 * 直接依區域外框的世界座標範圍算出需要幾格鳥即可，密度由 cellSize 直接控制。
 */
function createOrganicBirdFloor(host: SVGSVGElement): EscherPoint[][] {
  const svgNamespace = "http://www.w3.org/2000/svg";
  const organicPolygon = buildRegionPolygons().organic;
  const organicPath = polygonToPath(organicPolygon, (point) => point);
  const organicZone = MAP_ZONES.find((zone) => zone.region === "organic");
  if (!organicZone) return [];

  const definitions = document.createElementNS(svgNamespace, "defs");
  const clipPath = document.createElementNS(svgNamespace, "clipPath");
  clipPath.setAttribute("id", "organic-world-floor-clip");
  const clipShape = document.createElementNS(svgNamespace, "path");
  clipShape.setAttribute("d", organicPath);
  clipPath.appendChild(clipShape);
  definitions.appendChild(clipPath);

  for (const zone of ["outer", "core"] as const) {
    for (let variant = 0; variant < 6; variant += 1) {
      const pattern = document.createElementNS(svgNamespace, "pattern");
      pattern.setAttribute("id", `organic-floor-${zone}-${variant}`);
      pattern.setAttribute("patternUnits", "objectBoundingBox");
      pattern.setAttribute("width", "1");
      pattern.setAttribute("height", "1");
      const halfStart = zone === "outer" ? 0 : 887;
      pattern.setAttribute("viewBox", `${halfStart} 0 887 887`);
      pattern.setAttribute("preserveAspectRatio", "xMidYMid slice");

        // 底層純色 bg 托底以維持顏色飽和
        const bg = document.createElementNS(svgNamespace, "rect");
        bg.setAttribute("x", String(halfStart));
        bg.setAttribute("y", "0");
        bg.setAttribute("width", "887");
        bg.setAttribute("height", "887");
        bg.setAttribute("fill", zone === "outer" ? "#1a4321" : "#5a9c5f");
        bg.setAttribute("fill-opacity", "1.0");
        pattern.appendChild(bg);

        // 中間半透明 image 用以淡化強黑線
        const image = document.createElementNS(svgNamespace, "image");
        image.setAttribute("href", "/images/maps/floors/organic.png");
        image.setAttribute("width", "1774");
        image.setAttribute("height", "887");
        image.setAttribute("x", "0");
        image.setAttribute("y", "0");
        image.setAttribute("opacity", "0.26"); // 稀釋黑線，降低存在感
        const horizontalMirrorAxis = zone === "outer" ? 887 : 2661;
        const transforms = [
          "",
          `translate(${horizontalMirrorAxis} 0) scale(-1 1)`,
          "translate(0 887) scale(1 -1)",
          `translate(${horizontalMirrorAxis} 887) scale(-1 -1)`,
          "",
          `translate(${horizontalMirrorAxis} 0) scale(-1 1)`,
        ];
        image.setAttribute("transform", transforms[variant]);
        pattern.appendChild(image);

        // 頂層正片疊底染墨層
        const tint = document.createElementNS(svgNamespace, "rect");
        tint.setAttribute("x", String(halfStart));
        tint.setAttribute("y", "0");
        tint.setAttribute("width", "887");
        tint.setAttribute("height", "887");
        tint.setAttribute("fill", zone === "outer" ? "#1a4321" : "#5a9c5f");
        tint.setAttribute("fill-opacity", "0.6");
        tint.setAttribute("style", "mix-blend-mode: multiply");
        pattern.appendChild(tint);
      definitions.appendChild(pattern);
    }
  }
  }

  host.appendChild(definitions);

  const tileGroup = document.createElementNS(svgNamespace, "g");
  tileGroup.setAttribute("class", "世界地圖層-艾雪鳥地板");
  tileGroup.setAttribute("clip-path", "url(#organic-world-floor-clip)");

  const targetBounds = boundsOf(organicPolygon);
  const field = buildEscherBirdField(targetBounds, 520);

  const regionArea = Math.abs(polygonArea(organicPolygon));
  const coreRadius = Math.sqrt((regionArea * 0.3) / Math.PI);
  const coreTiles = field.tiles.filter((tile) =>
    Math.hypot(tile.center.x - organicZone.centerX, tile.center.y - organicZone.centerY) <= coreRadius,
  );
  const coreBoundaries = buildTileBoundaryLoops(coreTiles.map((tile) => tile.points));

  // 吸附有機世界物件到瓷磚中心
  const organicObjects = [
    ...MAP_OBJECTS.filter((o) => o.region === "organic"),
    ...ENV_OBJECTS.filter((o) => o.world === "organic")
  ];
  const occupiedIndices = new Set<number>();
  for (const obj of organicObjects) {
    let nearestIndex = -1;
    let minDistance = Infinity;
    for (let idx = 0; idx < field.tiles.length; idx += 1) {
      if (occupiedIndices.has(idx)) continue;
      const tile = field.tiles[idx];
      const dist = Math.hypot(tile.center.x - obj.x, tile.center.y - obj.y);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = idx;
      }
    }
    if (nearestIndex !== -1) {
      occupiedIndices.add(nearestIndex);
      (obj as any).x = field.tiles[nearestIndex].center.x;
      (obj as any).y = field.tiles[nearestIndex].center.y;
    }
  }

  for (let index = 0; index < field.tiles.length; index += 1) {
    const tile = field.tiles[index];
    const tilePath = polygonToPath(tile.points, (point) => point);
    const distanceToCore = Math.hypot(tile.center.x - organicZone.centerX, tile.center.y - organicZone.centerY);
    const floorZone = distanceToCore <= coreRadius ? "core" : "outer";
    const variant = stableTileVariant(tile.center, index);
    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", tilePath);
    applyDetailedTileFill(path, definitions, "organic", floorZone, variant, index, tile.center, svgNamespace);
    path.setAttribute("class", `世界地圖層-艾雪鳥磁磚 世界地圖層-艾雪鳥磁磚-${floorZone}`);
    tileGroup.appendChild(path);

    // 障礙物與設施瓷磚疊加白色半透明遮罩
    if (occupiedIndices.has(index)) {
      const mask = document.createElementNS(svgNamespace, "path");
      mask.setAttribute("d", tilePath);
      mask.setAttribute("fill", "#ffffff");
      mask.setAttribute("stroke", "#ffffff");
      mask.setAttribute("stroke-width", "2");
      mask.setAttribute("style", "pointer-events: none;");
      tileGroup.appendChild(mask);
    }
  }

  host.appendChild(tileGroup);
  return coreBoundaries;
}

/**
 * 機械世界地板：架構比照 createOrganicBirdFloor，鋪磚來源換成 開羅五邊形地板.ts
 * 的開羅五邊形鑲嵌（4 片五邊形繞 90° 頂點轉成風車，風車單元再用正方形晶格純平移）。
 * 跟艾雪鳥地板一樣不需要「先生成固定拼塊再找縮放比例覆蓋區域」，直接用晶格步幅
 * 算出需要幾格即可。
 */
function createMechanicalCairoFloor(host: SVGSVGElement): EinsteinPoint[][] {
  const svgNamespace = "http://www.w3.org/2000/svg";
  const mechanicalPolygon = buildRegionPolygons().mechanical;
  const mechanicalPath = polygonToPath(mechanicalPolygon, (point) => point);
  const mechanicalZone = MAP_ZONES.find((zone) => zone.region === "mechanical");
  if (!mechanicalZone) return [];

  const definitions = document.createElementNS(svgNamespace, "defs");
  const clipPath = document.createElementNS(svgNamespace, "clipPath");
  clipPath.setAttribute("id", "mechanical-world-floor-clip");
  const clipShape = document.createElementNS(svgNamespace, "path");
  clipShape.setAttribute("d", mechanicalPath);
  clipPath.appendChild(clipShape);
  definitions.appendChild(clipPath);

  // 建立 6 種鏡射與方向變體，與分形、有機世界相同
  if (ENABLE_DETAILED_FLOOR_TEXTURES) {
  for (const zone of ["outer", "core"] as const) {
    for (let variant = 0; variant < 6; variant += 1) {
      const pattern = document.createElementNS(svgNamespace, "pattern");
      pattern.setAttribute("id", `mechanical-floor-${zone}-${variant}`);
      pattern.setAttribute("patternUnits", "objectBoundingBox");
      pattern.setAttribute("width", "1");
      pattern.setAttribute("height", "1");
      const halfStart = zone === "outer" ? 0 : 887;
      pattern.setAttribute("viewBox", `${halfStart} 0 887 887`);
      pattern.setAttribute("preserveAspectRatio", "xMidYMid slice");

      // 底層純色 bg 托底以維持顏色飽和；機械外層改為深棕，避免整片偏冷灰。
      const bg = document.createElementNS(svgNamespace, "rect");
      bg.setAttribute("x", String(halfStart));
      bg.setAttribute("y", "0");
      bg.setAttribute("width", "887");
      bg.setAttribute("height", "887");
      bg.setAttribute("fill", zone === "outer" ? "#4b3426" : "#c9a227");
      bg.setAttribute("fill-opacity", "1.0");
      pattern.appendChild(bg);

      // 中間半透明 image 用以淡化強黑線
      const image = document.createElementNS(svgNamespace, "image");
      image.setAttribute("href", "/images/maps/floors/mechanical.png");
      image.setAttribute("width", "1774");
      image.setAttribute("height", "887");
      image.setAttribute("x", "0");
      image.setAttribute("y", "0");
      image.setAttribute("opacity", "0.26"); // 稀釋黑線，降低存在感
      const horizontalMirrorAxis = zone === "outer" ? 887 : 2661;
      const transforms = [
        "",
        `translate(${horizontalMirrorAxis} 0) scale(-1 1)`,
        "translate(0 887) scale(1 -1)",
        `translate(${horizontalMirrorAxis} 887) scale(-1 -1)`,
        "",
        `translate(${horizontalMirrorAxis} 0) scale(-1 1)`,
      ];
      image.setAttribute("transform", transforms[variant]);
      pattern.appendChild(image);

      // 頂層正片疊底染墨層
      const tint = document.createElementNS(svgNamespace, "rect");
      tint.setAttribute("x", String(halfStart));
      tint.setAttribute("y", "0");
      tint.setAttribute("width", "887");
      tint.setAttribute("height", "887");
      tint.setAttribute("fill", zone === "outer" ? "#4b3426" : "#c9a227");
      tint.setAttribute("fill-opacity", "0.6");
      tint.setAttribute("style", "mix-blend-mode: multiply");
      pattern.appendChild(tint);
      definitions.appendChild(pattern);
    }
  }
  }

  host.appendChild(definitions);

  const tileGroup = document.createElementNS(svgNamespace, "g");
  tileGroup.setAttribute("class", "世界地圖層-開羅地板");
  tileGroup.setAttribute("clip-path", "url(#mechanical-world-floor-clip)");

  const targetBounds = boundsOf(mechanicalPolygon);
  
  // 建立正六邊形平鋪蜂巢網格
  const R = 300; // 六角形半徑加大，保留開羅磁磚語言但減少 DOM path 數量。
  const dx = 1.5 * R;
  const dy = Math.sqrt(3) * R;
  const tiles: Array<{ center: { x: number; y: number }; points: Array<{ x: number; y: number }> }> = [];

  for (let x = targetBounds.minX - R; x <= targetBounds.maxX + R; x += dx) {
    const col = Math.round((x - targetBounds.minX) / dx);
    for (let y = targetBounds.minY - R; y <= targetBounds.maxY + R; y += dy) {
      const cy = y + (col % 2 === 1 ? dy / 2 : 0);
      const center = { x, y: cy };
      if (pointInPolygon(center, mechanicalPolygon)) {
        const points: Array<{ x: number; y: number }> = [];
        for (let i = 0; i < 6; i++) {
          const rad = (i * 60 * Math.PI) / 180;
          points.push({ x: x + R * Math.cos(rad), y: cy + R * Math.sin(rad) });
        }
        tiles.push({ center, points });
      }
    }
  }

  const regionArea = Math.abs(polygonArea(mechanicalPolygon));
  const coreRadius = Math.sqrt((regionArea * 0.3) / Math.PI);
  const coreTiles = tiles.filter((tile) =>
    Math.hypot(tile.center.x - mechanicalZone.centerX, tile.center.y - mechanicalZone.centerY) <= coreRadius,
  );
  const coreBoundaries = buildTileBoundaryLoops(coreTiles.map((tile) => tile.points));

  // 吸附機械世界物件到瓷磚中心
  const mechanicalObjects = [
    ...MAP_OBJECTS.filter((o) => o.region === "mechanical"),
    ...ENV_OBJECTS.filter((o) => o.world === "mechanical")
  ];
  const occupiedIndices = new Set<number>();
  for (const obj of mechanicalObjects) {
    let nearestIndex = -1;
    let minDistance = Infinity;
    for (let idx = 0; idx < tiles.length; idx += 1) {
      if (occupiedIndices.has(idx)) continue;
      const tile = tiles[idx];
      const dist = Math.hypot(tile.center.x - obj.x, tile.center.y - obj.y);
      if (dist < minDistance) {
        minDistance = dist;
        nearestIndex = idx;
      }
    }
    if (nearestIndex !== -1) {
      occupiedIndices.add(nearestIndex);
      (obj as any).x = tiles[nearestIndex].center.x;
      (obj as any).y = tiles[nearestIndex].center.y;
    }
  }

  for (let index = 0; index < tiles.length; index += 1) {
    const tile = tiles[index];
    const tilePath = polygonToPath(tile.points, (point) => point);
    const distanceToCore = Math.hypot(
      tile.center.x - mechanicalZone.centerX,
      tile.center.y - mechanicalZone.centerY,
    );
    const floorZone = distanceToCore <= coreRadius ? "core" : "outer";
    const variant = stableTileVariant(tile.center, index);
    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", tilePath);
    applyDetailedTileFill(path, definitions, "mechanical", floorZone, variant, index, tile.center, svgNamespace);
    path.setAttribute("class", `世界地圖層-開羅磁磚 世界地圖層-開羅磁磚-${floorZone}`);
    tileGroup.appendChild(path);

    // 障礙物與設施瓷磚疊加白色半透明遮罩
    if (occupiedIndices.has(index)) {
      const mask = document.createElementNS(svgNamespace, "path");
      mask.setAttribute("d", tilePath);
      mask.setAttribute("fill", "#ffffff");
      mask.setAttribute("stroke", "#ffffff");
      mask.setAttribute("stroke-width", "2");
      mask.setAttribute("style", "pointer-events: none;");
      tileGroup.appendChild(mask);
    }
  }

  host.appendChild(tileGroup);
  return coreBoundaries;
}

function buildTileBoundaryLoops(tiles: EinsteinPoint[][]): EinsteinPoint[][] {
  const boundaryEdges = new Map<string, { a: EinsteinPoint; b: EinsteinPoint }>();
  for (const tile of tiles) {
    for (let index = 0; index < tile.length; index += 1) {
      const a = tile[index];
      const b = tile[(index + 1) % tile.length];
      const key = canonicalEdgeKey(a, b);
      if (boundaryEdges.has(key)) boundaryEdges.delete(key);
      else boundaryEdges.set(key, { a, b });
    }
  }

  const pending = [...boundaryEdges.values()];
  const loops: EinsteinPoint[][] = [];
  while (pending.length > 0) {
    const first = pending.pop()!;
    const loop = [first.a, first.b];
    const startKey = boundaryPointKey(first.a);
    let currentKey = boundaryPointKey(first.b);

    while (currentKey !== startKey) {
      const nextIndex = pending.findIndex((edge) =>
        boundaryPointKey(edge.a) === currentKey || boundaryPointKey(edge.b) === currentKey,
      );
      if (nextIndex < 0) break;
      const [nextEdge] = pending.splice(nextIndex, 1);
      const nextPoint = boundaryPointKey(nextEdge.a) === currentKey ? nextEdge.b : nextEdge.a;
      loop.push(nextPoint);
      currentKey = boundaryPointKey(nextPoint);
    }

    // 開放線段不可用 Z 強制閉合，否則會產生橫跨中央的灰色殘線。
    if (currentKey === startKey) {
      loop.pop();
      if (loop.length >= 3) loops.push(loop);
    }
  }
  return loops;
}

function boundaryPointKey(point: EinsteinPoint): string {
  return `${Math.round(point.x * 1000)},${Math.round(point.y * 1000)}`;
}

function canonicalEdgeKey(a: EinsteinPoint, b: EinsteinPoint): string {
  const first = boundaryPointKey(a);
  const second = boundaryPointKey(b);
  return first < second ? `${first}|${second}` : `${second}|${first}`;
}

function boundsOf(points: EinsteinPoint[]) {
  return points.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      maxX: Math.max(bounds.maxX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxY: Math.max(bounds.maxY, point.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );
}

function pointAtCenter(bounds: ReturnType<typeof boundsOf>): EinsteinPoint {
  return { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
}

function transformFloorPoint(
  source: EinsteinPoint,
  sourceCenter: EinsteinPoint,
  targetCenter: EinsteinPoint,
  scale: number,
): EinsteinPoint {
  return {
    x: targetCenter.x + (source.x - sourceCenter.x) * scale,
    y: targetCenter.y + (source.y - sourceCenter.y) * scale,
  };
}

function findCoveringScale(
  sourceBoundary: EinsteinPoint[],
  targetPolygon: EinsteinPoint[],
  sourceCenter: EinsteinPoint,
  targetCenter: EinsteinPoint,
  initialScale: number,
): number {
  let scale = initialScale;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const transformedBoundary = sourceBoundary.map((point) =>
      transformFloorPoint(point, sourceCenter, targetCenter, scale),
    );
    if (targetPolygon.every((point) => pointInPolygon(point, transformedBoundary))) {
      return scale * 1.015;
    }
    scale *= 1.06;
  }
  return scale;
}

function pointInPolygon(point: EinsteinPoint, polygon: EinsteinPoint[]): boolean {
  let inside = false;
  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
    const a = polygon[current];
    const b = polygon[previous];
    const crossesRay = (a.y > point.y) !== (b.y > point.y)
      && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (crossesRay) inside = !inside;
  }
  return inside;
}

function polygonArea(points: EinsteinPoint[]): number {
  return points.reduce((area, point, index) => {
    const next = points[(index + 1) % points.length];
    return area + point.x * next.y - next.x * point.y;
  }, 0) / 2;
}

function stableTileVariant(center: EinsteinPoint, index: number): number {
  const hash = Math.abs(Math.floor(center.x * 17 + center.y * 31 + index * 101));
  return hash % 6;
}

function stableTileOpacity(center: EinsteinPoint, index: number, floorZone: "outer" | "core"): number {
  const hash = Math.sin(center.x * 41.731 + center.y * 17.117 + index * 13.37) * 91827.645;
  const random = hash - Math.floor(hash);
  const mean = floorZone === "core" ? 0.91 : 0.78;
  const spread = floorZone === "core" ? 0.08 : 0.14;
  return mean + (random - 0.5) * spread;
}

function applyDetailedTileFill(
  path: SVGPathElement,
  definitions: SVGDefsElement,
  world: World,
  floorZone: "outer" | "core",
  variant: number,
  tileIndex: number,
  center: { x: number; y: number },
  svgNamespace: string,
): void {
  if (ENABLE_DETAILED_FLOOR_TEXTURES) {
    const uniqueId = 創建並綁定隨機偏移旋轉圖樣(definitions, world, floorZone, variant, tileIndex, center, svgNamespace);
    path.setAttribute("fill", `url(#${uniqueId})`);
    path.style.fillOpacity = String(stableTileOpacity(center, tileIndex, floorZone));
    return;
  }

  path.setAttribute("fill", detailedTileFlatFill(world, floorZone));
  path.style.fillOpacity = floorZone === "core" ? "0.34" : "0.22";
}

function detailedTileFlatFill(world: World, floorZone: "outer" | "core"): string {
  const fills: Record<World, Record<"outer" | "core", string>> = {
    geometry: { outer: "#315d91", core: "#9bc9f2" },
    organic: { outer: "#1a4321", core: "#5a9c5f" },
    fractal: { outer: "#b49bdc", core: "#d0bdeb" },
    mechanical: { outer: "#4b3426", core: "#c9a227" },
  };
  return fills[world][floorZone];
}

function 創建並綁定隨機偏移旋轉圖樣(
  definitions: SVGDefsElement,
  region: string,
  floorZone: string,
  variant: number,
  tileIndex: number,
  center: { x: number; y: number },
  svgNamespace: string
): string {
  const uniquePatternId = `${region}-tile-pat-${tileIndex}-${Math.floor(center.x)}-${Math.floor(center.y)}`;
  
  const uniquePattern = document.createElementNS(svgNamespace, "pattern");
  uniquePattern.setAttribute("id", uniquePatternId);
  uniquePattern.setAttribute("href", `#${region}-floor-${floorZone}-${variant}`);
  
  const hashX = Math.sin(center.x * 12.9898 + center.y * 78.233) * 43758.5453;
  const randOffset = hashX - Math.floor(hashX);
  
  const hashY = Math.sin(center.x * 37.719 + center.y * 91.327) * 54321.9876;
  const randRot = hashY - Math.floor(hashY);

  const hashS = Math.sin(center.x * 53.185 + center.y * 23.948) * 65432.1234;
  const randScale = hashS - Math.floor(hashS);
  
  // 偏移量：-40px 到 40px，旋轉角度：0 到 360 度
  const dx = (randOffset * 80) - 40;
  const dy = (randRot * 80) - 40;
  const rotateDeg = randRot * 360;
  // 縮放比例：1.3 到 1.6 倍隨機放大，讓細密禪繞畫/紋理圖線更容易被看清
  const scaleVal = 1.3 + randScale * 0.3;
  
  // 複合變換：先將坐標原點平移至瓷磚中心 center 點，進行隨機放大與旋轉，再套用平移偏移，最後平移回原位
  const cx = center.x;
  const cy = center.y;
  uniquePattern.setAttribute(
    "patternTransform",
    `translate(${cx + dx} ${cy + dy}) rotate(${rotateDeg}) scale(${scaleVal}) translate(${-cx} ${-cy})`
  );
  
  definitions.appendChild(uniquePattern);
  
  return uniquePatternId;
}

function createDividerPaths(host: SVGSVGElement) {
  const vertical = document.createElementNS("http://www.w3.org/2000/svg", "path");
  vertical.setAttribute("class", "世界地圖層-分界線");
  host.appendChild(vertical);

  const horizontal = document.createElementNS("http://www.w3.org/2000/svg", "path");
  horizontal.setAttribute("class", "世界地圖層-分界線");
  host.appendChild(horizontal);

  return { vertical, horizontal };
}

function createMiniRegionPaths(host: SVGSVGElement): Record<World, SVGPathElement> {
  const regions = {} as Record<World, SVGPathElement>;
  (["geometry", "organic", "fractal", "mechanical"] as World[]).forEach((world) => {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("class", `世界地圖層-小地圖片 世界地圖層-小地圖片-${world}`);
    host.appendChild(path);
    regions[world] = path;
  });
  return regions;
}

function createMiniGeometryCore(host: SVGSVGElement): { path: SVGPathElement; label: SVGTextElement } {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("class", "世界地圖層-小地圖中央區");
  host.appendChild(path);

  const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  label.setAttribute("class", "世界地圖層-小地圖中央區標籤");
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("dominant-baseline", "middle");
  label.textContent = "中央區";
  host.appendChild(label);
  return { path, label };
}

function createMiniFractalCore(host: SVGSVGElement): { path: SVGPathElement; label: SVGTextElement } {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("class", "世界地圖層-小地圖中央區 世界地圖層-小地圖中央區-fractal");
  host.appendChild(path);

  const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  label.setAttribute("class", "世界地圖層-小地圖中央區標籤 世界地圖層-小地圖中央區標籤-fractal");
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("dominant-baseline", "middle");
  label.textContent = "中央區";
  host.appendChild(label);
  return { path, label };
}

function createMiniOrganicCore(host: SVGSVGElement): { path: SVGPathElement; label: SVGTextElement } {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("class", "世界地圖層-小地圖中央區 世界地圖層-小地圖中央區-organic");
  host.appendChild(path);

  const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  label.setAttribute("class", "世界地圖層-小地圖中央區標籤 世界地圖層-小地圖中央區標籤-organic");
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("dominant-baseline", "middle");
  label.textContent = "中央區";
  host.appendChild(label);
  return { path, label };
}

function createMiniMechanicalCore(host: SVGSVGElement): { path: SVGPathElement; label: SVGTextElement } {
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("class", "世界地圖層-小地圖中央區 世界地圖層-小地圖中央區-mechanical");
  host.appendChild(path);

  const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  label.setAttribute("class", "世界地圖層-小地圖中央區標籤 世界地圖層-小地圖中央區標籤-mechanical");
  label.setAttribute("text-anchor", "middle");
  label.setAttribute("dominant-baseline", "middle");
  label.textContent = "中央區";
  host.appendChild(label);
  return { path, label };
}

function createMiniDividerPaths(host: SVGSVGElement) {
  const vertical = document.createElementNS("http://www.w3.org/2000/svg", "path");
  vertical.setAttribute("class", "世界地圖層-小地圖分界線");
  host.appendChild(vertical);

  const horizontal = document.createElementNS("http://www.w3.org/2000/svg", "path");
  horizontal.setAttribute("class", "世界地圖層-小地圖分界線");
  host.appendChild(horizontal);

  return { vertical, horizontal };
}

// 建圖時呼叫一次：把區域外框與分界線的 d 屬性寫死。
// 這些幾何是世界座標固定的，不隨玩家移動改變，所以不需要逐幀重設。
function initRegionPaths(
  regions: Record<World, SVGPathElement>,
  dividers: { vertical: SVGPathElement; horizontal: SVGPathElement },
): void {
  const polygons = buildRegionPolygons();
  (Object.keys(regions) as World[]).forEach((world) => {
    regions[world].setAttribute("d", polygonToPath(polygons[world], (point) => point));
  });
  dividers.vertical.setAttribute("d", polylineToPath(MAP_VERTICAL_DIVIDER, (point) => point));
  dividers.horizontal.setAttribute("d", polylineToPath(MAP_HORIZONTAL_DIVIDER, (point) => point));
}

// 每幀只平移鏡頭：靠 viewBox 把固定幾何平移到玩家所在位置，
// 不再重設任何 path 的 d，避免觸發瀏覽器重算路徑幾何快取。
function updateMapViewBox(
  host: SVGSVGElement,
  viewport: { w: number; h: number },
): void {
  const projectedWorldWidth = viewport.w / cameraZoom;
  const projectedWorldHeight = viewport.h / (GROUND_DEPTH_SCALE * cameraZoom);
  const viewLeft = playerPos.x - projectedWorldWidth / 2;
  const viewTop = playerPos.y - projectedWorldHeight / 2;
  host.setAttribute("viewBox", `${viewLeft} ${viewTop} ${projectedWorldWidth} ${projectedWorldHeight}`);
}

function buildRegionPolygons(): Record<World, Array<{ x: number; y: number }>> {
  const topLeft = { x: MAP_BOUNDS.minX, y: MAP_BOUNDS.minY };
  const topRight = { x: MAP_BOUNDS.maxX, y: MAP_BOUNDS.minY };
  const bottomLeft = { x: MAP_BOUNDS.minX, y: MAP_BOUNDS.maxY };
  const bottomRight = { x: MAP_BOUNDS.maxX, y: MAP_BOUNDS.maxY };
  const verticalMid = Math.floor(MAP_VERTICAL_DIVIDER.length / 2);
  const horizontalMid = Math.floor(MAP_HORIZONTAL_DIVIDER.length / 2);
  const verticalTopHalf = MAP_VERTICAL_DIVIDER.slice(0, verticalMid + 1);
  const verticalBottomHalf = MAP_VERTICAL_DIVIDER.slice(verticalMid);
  const horizontalLeftHalf = MAP_HORIZONTAL_DIVIDER.slice(0, horizontalMid + 1);
  const horizontalRightHalf = MAP_HORIZONTAL_DIVIDER.slice(horizontalMid);
  const verticalTop = MAP_VERTICAL_DIVIDER[0];
  const verticalBottom = MAP_VERTICAL_DIVIDER[MAP_VERTICAL_DIVIDER.length - 1];
  const horizontalLeft = MAP_HORIZONTAL_DIVIDER[0];
  const horizontalRight = MAP_HORIZONTAL_DIVIDER[MAP_HORIZONTAL_DIVIDER.length - 1];

  return {
    geometry: [
      verticalTop,
      topRight,
      horizontalRight,
      ...horizontalRightHalf.slice(0, -1).reverse(),
      ...verticalTopHalf.slice(0, -1).reverse(),
    ],
    fractal: [
      topLeft,
      verticalTop,
      ...verticalTopHalf.slice(1),
      ...horizontalLeftHalf.slice(0, -1).reverse(),
      horizontalLeft,
    ],
    organic: [
      horizontalLeft,
      bottomLeft,
      verticalBottom,
      ...verticalBottomHalf.slice(0, -1).reverse(),
      ...horizontalLeftHalf.slice(0, -1).reverse(),
    ],
    mechanical: [
      ...horizontalRightHalf,
      bottomRight,
      verticalBottom,
      ...verticalBottomHalf.slice(0, -1).reverse(),
    ],
  };
}

function polygonToPath(
  polygon: Array<{ x: number; y: number }>,
  mapPoint: (point: { x: number; y: number }) => { x: number; y: number },
): string {
  return polygon
    .map((point, index) => {
      const mapped = mapPoint(point);
      return `${index === 0 ? "M" : "L"} ${mapped.x} ${mapped.y}`;
    })
    .join(" ") + " Z";
}

function polylineToPath(
  line: readonly { x: number; y: number }[],
  mapPoint: (point: { x: number; y: number }) => { x: number; y: number },
): string {
  return line
    .map((point, index) => {
      const mapped = mapPoint(point);
      return `${index === 0 ? "M" : "L"} ${mapped.x} ${mapped.y}`;
    })
    .join(" ");
}
