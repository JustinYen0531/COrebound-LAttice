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
import type { World } from "../../data/成員型別";
import { buildEinsteinHatSupertile, type EinsteinPoint } from "../../world/愛因斯坦地板";

// 障礙物體積最大、資源礦物次之、環境機關最小，呼應立繪本身的視覺份量
const ENV_ICON_SIZE: Record<EnvObjectInstance["category"], number> = {
  障礙物: 256,
  資源礦物: 184,
  環境機關: 200,
};

const PLAYER_GLYPH = "🌀";
const MOVE_SPEED = 24;
const VIEW_PADDING = 140;

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
  createGeometryEinsteinFloor(zoneSvg);
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
  playerNode.textContent = PLAYER_GLYPH;
  playerNode.title = "小隊(玩家)";
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

    renderMiniMap(miniMapInner, miniRegionPaths, miniDividerPaths, miniObjectNodes, miniPlayer);
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
  node.innerHTML = `
    <span class="世界地圖層-物件-glyph">${FACILITY_GLYPH[object.kind]}</span>
    <span class="世界地圖層-物件-label">${object.label}</span>
  `;
  node.title = object.detail ?? object.label;
  return node;
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

function createGeometryEinsteinFloor(host: SVGSVGElement): void {
  const svgNamespace = "http://www.w3.org/2000/svg";
  const geometryPolygon = buildRegionPolygons().geometry;
  const geometryPath = polygonToPath(geometryPolygon, (point) => point);
  const geometryZone = MAP_ZONES.find((zone) => zone.region === "geometry");
  if (!geometryZone) return;

  const definitions = document.createElementNS(svgNamespace, "defs");
  const clipPath = document.createElementNS(svgNamespace, "clipPath");
  clipPath.setAttribute("id", "geometry-world-floor-clip");
  const clipShape = document.createElementNS(svgNamespace, "path");
  clipShape.setAttribute("d", geometryPath);
  clipPath.appendChild(clipShape);
  definitions.appendChild(clipPath);

  for (const zone of ["outer"] as const) {
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
      definitions.appendChild(pattern);
    }
  }

  const corePattern = document.createElementNS(svgNamespace, "pattern");
  corePattern.setAttribute("id", "geometry-floor-core-whole");
  corePattern.setAttribute("patternUnits", "objectBoundingBox");
  corePattern.setAttribute("width", "1");
  corePattern.setAttribute("height", "1");
  corePattern.setAttribute("viewBox", "887 0 887 887");
  corePattern.setAttribute("preserveAspectRatio", "xMidYMid slice");
  const coreImage = document.createElementNS(svgNamespace, "image");
  coreImage.setAttribute("href", "/幾何世界地板花紋.png");
  coreImage.setAttribute("width", "1774");
  coreImage.setAttribute("height", "887");
  coreImage.setAttribute("x", "0");
  coreImage.setAttribute("y", "0");
  corePattern.appendChild(coreImage);
  definitions.appendChild(corePattern);
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
  for (let index = 0; index < transformedTiles.length; index += 1) {
    const tile = transformedTiles[index];
    const variant = stableTileVariant(tile.center, index);
    const path = document.createElementNS(svgNamespace, "path");
    path.setAttribute("d", polygonToPath(tile.points, (point) => point));
    path.setAttribute("fill", `url(#geometry-floor-outer-${variant})`);
    path.setAttribute("class", "世界地圖層-愛因斯坦磁磚");
    tileGroup.appendChild(path);
  }

  // 中央是單一完整地板圖，蓋住下方所有磁磚與接縫，圖片中心對準區域中心。
  const coreFloor = document.createElementNS(svgNamespace, "circle");
  coreFloor.setAttribute("class", "世界地圖層-幾何中央整體地板");
  coreFloor.setAttribute("cx", String(geometryZone.centerX));
  coreFloor.setAttribute("cy", String(geometryZone.centerY));
  coreFloor.setAttribute("r", String(coreRadius));
  coreFloor.setAttribute("fill", "url(#geometry-floor-core-whole)");
  tileGroup.appendChild(coreFloor);
  host.appendChild(tileGroup);
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
