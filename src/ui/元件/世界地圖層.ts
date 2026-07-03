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
  GENERATED_MAP,
  MAP_BOUNDS,
  MAP_OBJECTS,
  MAP_ZONES,
  REGION_DIRECTION,
  REGION_LABEL,
  nearbyObjects,
  type MapObject,
  type MapZone,
  type Region,
} from "../../data/地圖物件資料";

const PLAYER_GLYPH = "🌀";
const MOVE_SPEED = 240;
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

  const objectLayer = document.createElement("div");
  objectLayer.className = "世界地圖層-物件圖層";
  canvas.appendChild(objectLayer);

  const zoneNodes = MAP_ZONES.map((zone) => createZoneNode(zone, zoneLayer));
  const objectNodes = new Map<string, HTMLElement>();
  for (const object of MAP_OBJECTS) {
    const node = createObjectNode(object);
    objectLayer.appendChild(node);
    objectNodes.set(object.id, node);
  }

  const playerNode = document.createElement("div");
  playerNode.className = "世界地圖層-玩家";
  playerNode.textContent = PLAYER_GLYPH;
  playerNode.title = "小隊(玩家)";
  canvas.appendChild(playerNode);

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

    for (const { zone, blob, label } of zoneNodes) {
      const center = worldToScreen({ x: zone.centerX, y: zone.centerY }, playerPos, viewport);
      blob.style.left = `${center.x}px`;
      blob.style.top = `${center.y}px`;
      blob.style.width = `${zone.radiusX * 2}px`;
      blob.style.height = `${zone.radiusY * 2}px`;
      blob.style.display = isVisible(center, viewport) ? "flex" : "none";

      const labelPos = worldToScreen({ x: zone.labelX, y: zone.labelY }, playerPos, viewport);
      label.style.left = `${labelPos.x}px`;
      label.style.top = `${labelPos.y}px`;
      label.style.display = isVisible(labelPos, viewport) ? "block" : "none";
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

function createZoneNode(zone: MapZone, host: HTMLElement) {
  const blob = document.createElement("div");
  blob.className = `世界地圖層-區域 世界地圖層-區域-${zone.region}`;
  if (zone.region === "plaza") {
    blob.textContent = "中央廣場";
  }
  host.appendChild(blob);

  const label = document.createElement("div");
  label.className = `世界地圖層-區域標籤 世界地圖層-區域標籤-${zone.region}`;
  label.textContent = REGION_LABEL[zone.region];
  host.appendChild(label);

  return { zone, blob, label };
}
