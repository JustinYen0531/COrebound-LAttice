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
  FACILITY_GLYPH,
  MAP_HORIZONTAL_DIVIDER,
  MAP_BOUNDS,
  MAP_OBJECTS,
  MAP_VERTICAL_DIVIDER,
  MAP_ZONES,
  REGION_DIRECTION,
  REGION_LABEL,
  nearbyObjects,
  type MapObject,
  type MapZone,
  type Region,
} from "../../data/地圖物件資料";
import { ENV_OBJECTS, type EnvObjectInstance } from "../../data/環境物件資料";
import type { Family, World } from "../../data/成員型別";
import { buildEinsteinHatSupertile, type EinsteinPoint } from "../../world/愛因斯坦地板";
import { 建立玩家標記圖騰 } from "./玩家標記圖騰";
import { buildPenroseSupertile, type PenrosePoint } from "../../world/彭羅斯地板";
import { buildEscherBirdField, type EscherPoint } from "../../world/艾雪鳥地板";
import { buildCairoField, type CairoPoint } from "../../world/開羅五邊形地板";

// 障礙物體積最大、資源礦物次之、環境機關最小，呼應立繪本身的視覺份量
const ENV_ICON_SIZE: Record<EnvObjectInstance["category"], number> = {
  障礙物: 256,
  資源礦物: 184,
  環境機關: 200,
};

const MOVE_SPEED = 24;
const VIEW_PADDING = 140;

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

let playerPos = { x: 0, y: 0 };

export function resetPlayerPos(): void {
  playerPos = { x: 0, y: 0 };
}

function clampPlayerPosition(next: { x: number; y: number }): { x: number; y: number } {
  return {
    x: Math.max(MAP_BOUNDS.minX, Math.min(MAP_BOUNDS.maxX, next.x)),
    y: Math.max(MAP_BOUNDS.minY, Math.min(MAP_BOUNDS.maxY, next.y)),
  };
}

function syncNearbyToState(): void {
  const near = nearbyObjects(playerPos);
  const nearest = near[0]?.kind ?? null;
  if (應用程式狀態.額外.靠近的互動設施 !== nearest) {
    應用程式狀態.模擬靠近設施(nearest);
  }
}

function worldToScreen(
  point: { x: number; y: number },
  player: { x: number; y: number },
  viewport: { w: number; h: number },
): { x: number; y: number } {
  return {
    x: viewport.w / 2 + (point.x - player.x),
    y: viewport.h / 2 + (point.y - player.y),
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
  const root = document.createElement("div");
  root.className = "世界地圖層";

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
  const geometryCoreBoundaries = createGeometryEinsteinFloor(zoneSvg);
  const fractalCoreBoundaries = createFractalPenroseFloor(zoneSvg);
  const organicCoreBoundaries = createOrganicBirdFloor(zoneSvg);
  const mechanicalCoreBoundaries = createMechanicalCairoFloor(zoneSvg);
  const dividerPaths = createDividerPaths(zoneSvg);
  const zoneLabels = MAP_ZONES.map((zone) => createZoneLabel(zone, zoneLayer));
  const objectNodes = new Map<string, HTMLElement>();
  for (const object of MAP_OBJECTS) {
    const node = createObjectNode(object);
    objectLayer.appendChild(node);
    objectNodes.set(object.id, node);
  }

  const envNodes = new Map<string, HTMLElement>();
  for (const env of ENV_OBJECTS) {
    const node = createEnvObjectNode(env);
    envLayer.appendChild(node);
    envNodes.set(env.id, node);
  }

  const playerNode = document.createElement("div");
  playerNode.className = "世界地圖層-玩家";
  // 真正移動的是「9 層疊加編織圖騰」(隊長六邊形印襯 + 9 成員差速互旋),取代漩渦 emoji
  playerNode.appendChild(建立玩家標記圖騰({ size: 140 }));
  playerNode.title = "小隊(玩家)· 9 層疊加編織圖騰";
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

  const exclaim = document.createElement("button");
  exclaim.className = "世界地圖層-驚嘆號";
  exclaim.innerHTML = "❗";
  exclaim.style.display = "none";
  exclaim.onclick = () => 應用程式狀態.點擊驚嘆號提示();
  canvas.appendChild(exclaim);

  const pressed = new Set<string>();
  let rafId = 0;
  let lastNow = performance.now();

  function render(): void {
    const viewport = { w: canvas.clientWidth || window.innerWidth, h: canvas.clientHeight || window.innerHeight };
    const playerScreen = { x: viewport.w / 2, y: viewport.h / 2 };

    playerNode.style.left = `${playerScreen.x}px`;
    playerNode.style.top = `${playerScreen.y}px`;

    renderRegionPaths(regionPaths, dividerPaths, viewport);
    renderZoneLabels(zoneLabels, viewport);

    for (const env of ENV_OBJECTS) {
      const node = envNodes.get(env.id);
      if (!node) continue;
      const pos = worldToScreen(env, playerPos, viewport);
      node.style.left = `${pos.x}px`;
      node.style.top = `${pos.y}px`;
      node.style.display = isVisible(pos, viewport) ? "block" : "none";
    }

    const near = nearbyObjects(playerPos);
    const nearIds = new Set(near.map((object) => object.id));

    for (const object of MAP_OBJECTS) {
      const node = objectNodes.get(object.id);
      if (!node) continue;
      const pos = worldToScreen(object, playerPos, viewport);
      node.style.left = `${pos.x}px`;
      node.style.top = `${pos.y}px`;
      node.style.display = isVisible(pos, viewport) ? "flex" : "none";
      node.classList.toggle("靠近中", nearIds.has(object.id));
    }

    const nearest = near[0];
    if (nearest) {
      exclaim.style.display = "flex";
      exclaim.style.left = `${playerScreen.x + 26}px`;
      exclaim.style.top = `${playerScreen.y - 36}px`;
      exclaim.title = `點擊開啟「${nearest.label}」互動`;
    } else {
      exclaim.style.display = "none";
    }

    renderMiniMap(
      miniMapInner,
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
      miniObjectNodes,
      miniPlayer,
    );
  }

  function tick(now: number): void {
    const dt = Math.min(0.05, (now - lastNow) / 1000);
    lastNow = now;

    if (應用程式狀態.畫面.層 === "操作頁面" && pressed.size > 0) {
      let axisX = 0;
      let axisY = 0;
      if (pressed.has("KeyA") || pressed.has("ArrowLeft")) axisX -= 1;
      if (pressed.has("KeyD") || pressed.has("ArrowRight")) axisX += 1;
      if (pressed.has("KeyW") || pressed.has("ArrowUp")) axisY -= 1;
      if (pressed.has("KeyS") || pressed.has("ArrowDown")) axisY += 1;

      if (axisX !== 0 || axisY !== 0) {
        const length = Math.hypot(axisX, axisY) || 1;
        const next = clampPlayerPosition({
          x: playerPos.x + (axisX / length) * MOVE_SPEED * dt,
          y: playerPos.y + (axisY / length) * MOVE_SPEED * dt,
        });
        playerPos = next;
        syncNearbyToState();
      }
    }

    render();
    rafId = window.requestAnimationFrame(tick);
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (應用程式狀態.畫面.層 !== "操作頁面") return;
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
    playerPos = clampPlayerPosition({
      x: object.x - dir.dx * 36,
      y: object.y - dir.dy * 36,
    });
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

  root.addEventListener("DOMNodeRemovedFromDocument", () => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("resize", render);
    window.cancelAnimationFrame(rafId);
  });

  syncNearbyToState();
  render();
  rafId = window.requestAnimationFrame(tick);
  return root;
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
  const imagePath = facilityImagePath(object);
  const visual = imagePath
    ? `<img class="世界地圖層-物件-image" src="${imagePath}" alt="${object.label}" draggable="false">`
    : `<span class="世界地圖層-物件-glyph">${FACILITY_GLYPH[object.kind]}</span>`;
  node.innerHTML = `${visual}<span class="世界地圖層-物件-label">${object.label}</span>`;
  node.title = object.detail ?? object.label;
  return node;
}

function facilityImagePath(object: MapObject): string | null {
  if (object.kind === "熔爐" && object.family) return FAMILY_FURNACE_IMAGE[object.family];
  if (object.kind === "召喚" && object.region !== "plaza") return GUARDIAN_ALTAR_IMAGE[object.region];
  return null;
}

function createEnvObjectNode(env: EnvObjectInstance): HTMLElement {
  const size = ENV_ICON_SIZE[env.category];
  const img = document.createElement("img");
  img.className = `世界地圖層-環境物件 世界地圖層-環境物件-${env.category}`;
  img.src = env.iconPath;
  img.alt = env.nameZh;
  img.width = size;
  img.height = size;
  img.draggable = false;
  const 重量描述 = env.destructible ? `碰撞重量 ${env.weight ?? "?"}` : "不可破壞";
  img.title = `${env.nameZh}（${env.category}・${重量描述}）\n${env.mechanicText}`;
  return img;
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

function renderMiniMap(
  host: HTMLElement,
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
  objectNodes: Map<string, HTMLElement>,
  playerNode: HTMLElement,
): void {
  const width = host.clientWidth || 180;
  const height = host.clientHeight || 180;
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

  for (const object of MAP_OBJECTS) {
    const node = objectNodes.get(object.id);
    if (!node) continue;
    const pos = toMini(object);
    node.style.left = `${pos.x}px`;
    node.style.top = `${pos.y}px`;
  }

  const player = toMini(playerPos);
  playerNode.style.left = `${player.x}px`;
  playerNode.style.top = `${player.y}px`;
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
      image.setAttribute("href", "/幾何世界地板花紋.png");
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

  host.appendChild(definitions);

  const tileGroup = document.createElementNS(svgNamespace, "g");
  tileGroup.setAttribute("class", "世界地圖層-愛因斯坦地板");
  tileGroup.setAttribute("clip-path", "url(#geometry-world-floor-clip)");

  const supertile = buildEinsteinHatSupertile(3);
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
  for (let index = 0; index < transformedTiles.length; index += 1) {
    const tile = transformedTiles[index];
    const tilePath = polygonToPath(tile.points, (point) => point);
    const distanceToCore = Math.hypot(tile.center.x - geometryZone.centerX, tile.center.y - geometryZone.centerY);
    const floorZone = distanceToCore <= coreRadius ? "core" : "outer";
    const variant = stableTileVariant(tile.center, index);
    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", tilePath);
    path.setAttribute("fill", `url(#geometry-floor-${floorZone}-${variant})`);
    path.setAttribute("class", `世界地圖層-愛因斯坦磁磚 世界地圖層-愛因斯坦磁磚-${floorZone}`);
    tileGroup.appendChild(path);
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

      const image = document.createElementNS(svgNamespace, "image");
      image.setAttribute("href", "/分形世界地板.png");
      image.setAttribute("width", "1774");
      image.setAttribute("height", "887");
      image.setAttribute("x", "0");
      image.setAttribute("y", "0");
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
      // 分形世界統一使用淺紫色，中央僅稍亮，不再切換為金色。
      tint.setAttribute("fill", zone === "outer" ? "#b49bdc" : "#d0bdeb");
      tint.setAttribute("fill-opacity", zone === "outer" ? "0.82" : "0.76");
      tint.setAttribute("style", "mix-blend-mode: multiply");
      pattern.appendChild(tint);
      definitions.appendChild(pattern);
    }
  }

  host.appendChild(definitions);

  const tileGroup = document.createElementNS(svgNamespace, "g");
  tileGroup.setAttribute("class", "世界地圖層-彭羅斯地板");
  tileGroup.setAttribute("clip-path", "url(#fractal-world-floor-clip)");

  const supertile = buildPenroseSupertile(6);
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
  for (let index = 0; index < transformedTiles.length; index += 1) {
    const tile = transformedTiles[index];
    const tilePath = polygonToPath(tile.points, (point) => point);
    const distanceToCore = Math.hypot(tile.center.x - fractalZone.centerX, tile.center.y - fractalZone.centerY);
    const floorZone = distanceToCore <= coreRadius ? "core" : "outer";
    const variant = stableTileVariant(tile.center, index);
    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", tilePath);
    path.setAttribute("fill", `url(#fractal-floor-${floorZone}-${variant})`);
    path.setAttribute(
      "class",
      `世界地圖層-彭羅斯磁磚 世界地圖層-彭羅斯磁磚-${floorZone} 世界地圖層-彭羅斯磁磚-${tile.kind}`,
    );
    tileGroup.appendChild(path);
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

      const image = document.createElementNS(svgNamespace, "image");
      image.setAttribute("href", "/有機世界地板.png");
      image.setAttribute("width", "1774");
      image.setAttribute("height", "887");
      image.setAttribute("x", "0");
      image.setAttribute("y", "0");
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
      // 外圍＝暗黃綠森林，中央＝暖綠生命搏動，呼應世界觀與視覺圖鑑.md §8.2
      tint.setAttribute("fill", zone === "outer" ? "#1a4321" : "#5a9c5f");
      tint.setAttribute("fill-opacity", zone === "outer" ? "0.82" : "0.7");
      tint.setAttribute("style", "mix-blend-mode: multiply");
      pattern.appendChild(tint);
      definitions.appendChild(pattern);
    }
  }

  host.appendChild(definitions);

  const tileGroup = document.createElementNS(svgNamespace, "g");
  tileGroup.setAttribute("class", "世界地圖層-艾雪鳥地板");
  tileGroup.setAttribute("clip-path", "url(#organic-world-floor-clip)");

  const targetBounds = boundsOf(organicPolygon);
  const field = buildEscherBirdField(targetBounds, 260);

  const regionArea = Math.abs(polygonArea(organicPolygon));
  const coreRadius = Math.sqrt((regionArea * 0.3) / Math.PI);
  const coreTiles = field.tiles.filter((tile) =>
    Math.hypot(tile.center.x - organicZone.centerX, tile.center.y - organicZone.centerY) <= coreRadius,
  );
  const coreBoundaries = buildTileBoundaryLoops(coreTiles.map((tile) => tile.points));

  for (let index = 0; index < field.tiles.length; index += 1) {
    const tile = field.tiles[index];
    const tilePath = polygonToPath(tile.points, (point) => point);
    const distanceToCore = Math.hypot(tile.center.x - organicZone.centerX, tile.center.y - organicZone.centerY);
    const floorZone = distanceToCore <= coreRadius ? "core" : "outer";
    const variant = stableTileVariant(tile.center, index);
    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", tilePath);
    path.setAttribute("fill", `url(#organic-floor-${floorZone}-${variant})`);
    path.setAttribute("class", `世界地圖層-艾雪鳥磁磚 世界地圖層-艾雪鳥磁磚-${floorZone}`);
    tileGroup.appendChild(path);
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
function createMechanicalCairoFloor(host: SVGSVGElement): CairoPoint[][] {
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

      const image = document.createElementNS(svgNamespace, "image");
      image.setAttribute("href", "/機械世界地板.png");
      image.setAttribute("width", "1774");
      image.setAttribute("height", "887");
      image.setAttribute("x", "0");
      image.setAttribute("y", "0");
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
      // 外圍＝深灰鏽蝕鋼網，中央＝黃銅動力反應爐，呼應世界觀與視覺圖鑑.md §8.4
      tint.setAttribute("fill", zone === "outer" ? "#4a4750" : "#c9a227");
      tint.setAttribute("fill-opacity", zone === "outer" ? "0.84" : "0.72");
      tint.setAttribute("style", "mix-blend-mode: multiply");
      pattern.appendChild(tint);
      definitions.appendChild(pattern);
    }
  }

  host.appendChild(definitions);

  const tileGroup = document.createElementNS(svgNamespace, "g");
  tileGroup.setAttribute("class", "世界地圖層-開羅地板");
  tileGroup.setAttribute("clip-path", "url(#mechanical-world-floor-clip)");

  const targetBounds = boundsOf(mechanicalPolygon);
  const field = buildCairoField(targetBounds, 130);

  const regionArea = Math.abs(polygonArea(mechanicalPolygon));
  const coreRadius = Math.sqrt((regionArea * 0.3) / Math.PI);
  const coreTiles = field.tiles.filter((tile) =>
    Math.hypot(tile.center.x - mechanicalZone.centerX, tile.center.y - mechanicalZone.centerY) <= coreRadius,
  );
  const coreBoundaries = buildTileBoundaryLoops(coreTiles.map((tile) => tile.points));

  for (let index = 0; index < field.tiles.length; index += 1) {
    const tile = field.tiles[index];
    const tilePath = polygonToPath(tile.points, (point) => point);
    const distanceToCore = Math.hypot(
      tile.center.x - mechanicalZone.centerX,
      tile.center.y - mechanicalZone.centerY,
    );
    const floorZone = distanceToCore <= coreRadius ? "core" : "outer";
    const variant = stableTileVariant(tile.center, index);
    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", tilePath);
    path.setAttribute("fill", `url(#mechanical-floor-${floorZone}-${variant})`);
    path.setAttribute("class", `世界地圖層-開羅磁磚 世界地圖層-開羅磁磚-${floorZone}`);
    tileGroup.appendChild(path);
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

function renderRegionPaths(
  regions: Record<World, SVGPathElement>,
  dividers: { vertical: SVGPathElement; horizontal: SVGPathElement },
  viewport: { w: number; h: number },
): void {
  const viewLeft = playerPos.x - viewport.w / 2;
  const viewTop = playerPos.y - viewport.h / 2;
  const host = regions.geometry.ownerSVGElement;
  host?.setAttribute("viewBox", `${viewLeft} ${viewTop} ${viewport.w} ${viewport.h}`);
  const polygons = buildRegionPolygons();

  (Object.keys(regions) as World[]).forEach((world) => {
    regions[world].setAttribute("d", polygonToPath(polygons[world], (point) => point));
  });

  dividers.vertical.setAttribute("d", polylineToPath(MAP_VERTICAL_DIVIDER, (point) => point));
  dividers.horizontal.setAttribute("d", polylineToPath(MAP_HORIZONTAL_DIVIDER, (point) => point));
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
