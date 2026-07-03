/**
 * @file 世界地圖層.ts
 * @description 戰鬥畫面的地圖 placeholder 層。
 *              玩家以 WASD/方向鍵移動小隊標記,靠近設施時:
 *              - 自動透過 應用程式狀態.模擬靠近設施() 更新「靠近的互動設施」
 *              - 畫面顯示驚嘆號提示
 *              - 點擊驚嘆號 → 應用程式狀態.點擊驚嘆號提示() → 跳管理介面互動分頁
 *
 *              物件以 emoji + DOM 呈現(placeholder,非正式美術)。
 *              對應「doc/世界觀/世界觀與視覺圖鑑.md」§9 地圖結構。
 */

import { 應用程式狀態 } from "../應用程式狀態";
import {
  FACILITY_GLYPH,
  MAP_BOUNDS,
  MAP_OBJECTS,
  REGION_DIRECTION,
  REGION_LABEL,
  nearbyObjects,
  type MapObject,
  type Region,
} from "../../data/地圖物件資料";

// ============================================================
// 視覺常數
// ============================================================

/** 每格的像素大小 */
const CELL_PX = 48;
/** 玩家小隊標記 */
const PLAYER_GLYPH = "🌀";

// ============================================================
// 玩家位置(模組級狀態,跨重繪保留)
// ============================================================

let playerPos = { x: 0, y: 0 }; // 起始於中央廣場
let moveListeners: Array<() => void> = [];

/** 移動玩家(含邊界限制),回傳是否實際移動 */
function movePlayer(dx: number, dy: number): boolean {
  const next = {
    x: Math.max(MAP_BOUNDS.minX, Math.min(MAP_BOUNDS.maxX, playerPos.x + dx)),
    y: Math.max(MAP_BOUNDS.minY, Math.min(MAP_BOUNDS.maxY, playerPos.y + dy)),
  };
  if (next.x === playerPos.x && next.y === playerPos.y) return false;
  playerPos = next;
  moveListeners.forEach((fn) => fn());
  return true;
}

/** 重置玩家位置(新一局時呼叫) */
export function resetPlayerPos(): void {
  playerPos = { x: 0, y: 0 };
}

// ============================================================
// 靠近設施 → 同步應用程式狀態
// ============================================================

/**
 * 每次玩家移動後,檢查目前靠近的設施並同步到應用程式狀態。
 * 若同時靠近多個設施,取最近的一個作為「靠近的互動設施」。
 */
function syncNearbyToState(): void {
  const near = nearbyObjects(playerPos);
  if (near.length === 0) {
    if (應用程式狀態.額外.靠近的互動設施 !== null) {
      應用程式狀態.模擬靠近設施(null);
    }
    return;
  }
  const nearest = near[0];
  if (應用程式狀態.額外.靠近的互動設施 !== nearest.kind) {
    應用程式狀態.模擬靠近設施(nearest.kind);
  }
}

// ============================================================
// 地圖視圖元件
// ============================================================

export function 建立世界地圖層(): HTMLElement {
  const root = document.createElement("div");
  root.className = "世界地圖層";

  // ---- 地圖畫布 ----
  const canvas = document.createElement("div");
  canvas.className = "世界地圖層-畫布";
  const w = MAP_BOUNDS.maxX - MAP_BOUNDS.minX + 1;
  const h = MAP_BOUNDS.maxY - MAP_BOUNDS.minY + 1;
  canvas.style.setProperty("--cell-px", `${CELL_PX}px`);
  canvas.style.setProperty("--map-w", `${w}`);
  canvas.style.setProperty("--map-h", `${h}`);
  root.appendChild(canvas);

  // ---- 區域底色(四世界 + 中央)----
  renderRegionBases(canvas);

  // ---- 物件圖層 ----
  const objectLayer = document.createElement("div");
  objectLayer.className = "世界地圖層-物件圖層";
  canvas.appendChild(objectLayer);

  const objNodes = new Map<string, HTMLElement>();
  for (const obj of MAP_OBJECTS) {
    const node = createObjectNode(obj);
    objectLayer.appendChild(node);
    objNodes.set(obj.id, node);
  }

  // ---- 玩家標記 ----
  const playerNode = document.createElement("div");
  playerNode.className = "世界地圖層-玩家";
  playerNode.textContent = PLAYER_GLYPH;
  playerNode.title = "小隊(玩家)";
  canvas.appendChild(playerNode);

  // ---- 驚嘆號提示(靠近時顯示)----
  const exclaim = document.createElement("button");
  exclaim.className = "世界地圖層-驚嘆號";
  exclaim.innerHTML = "❗";
  exclaim.title = "點擊開啟互動介面";
  exclaim.style.display = "none";
  exclaim.onclick = () => 應用程式狀態.點擊驚嘆號提示();
  canvas.appendChild(exclaim);

  // ---- 渲染函式:根據玩家位置更新畫面 ----
  function render(): void {
    // 玩家標記位置(轉成畫布座標;注意 y 軸:北=+y,畫面上方)
    const px = (playerPos.x - MAP_BOUNDS.minX) * CELL_PX + CELL_PX / 2;
    const py = (MAP_BOUNDS.maxY - playerPos.y) * CELL_PX + CELL_PX / 2; // y 翻轉
    playerNode.style.left = `${px}px`;
    playerNode.style.top = `${py}px`;

    // 物件靠近高亮
    const near = new Set(nearbyObjects(playerPos).map((o) => o.id));
    for (const [id, node] of objNodes) {
      node.classList.toggle("靠近中", near.has(id));
    }

    // 驚嘆號:跟隨玩家,靠近任一設施時顯示
    const nearest = nearbyObjects(playerPos)[0];
    if (nearest) {
      exclaim.style.display = "flex";
      exclaim.style.left = `${px + 24}px`;
      exclaim.style.top = `${py - 32}px`;
      exclaim.title = `點擊開啟「${nearest.label}」互動`;
    } else {
      exclaim.style.display = "none";
    }
  }

  // ---- 鍵盤移動(僅在操作頁面生效)----
  function onKeyDown(e: KeyboardEvent): void {
    if (應用程式狀態.畫面.層 !== "操作頁面") return;
    let dx = 0;
    let dy = 0;
    switch (e.code) {
      case "KeyW":
      case "ArrowUp":
        dy = 1;
        break;
      case "KeyS":
      case "ArrowDown":
        dy = -1;
        break;
      case "KeyA":
      case "ArrowLeft":
        dx = -1;
        break;
      case "KeyD":
      case "ArrowRight":
        dx = 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    if (movePlayer(dx, dy)) {
      syncNearbyToState();
      render();
    }
  }

  // ---- 點擊物件:移動到該物件旁(快速導航)----
  function onObjectClick(obj: MapObject): void {
    // 直接傳送到該物件旁邊(沿其方位退後一格)
    const dir = regionDirSafe(obj.region);
    const target = { x: obj.x - dir.dx, y: obj.y - dir.dy };
    playerPos = target;
    syncNearbyToState();
    render();
  }

  // 綁定物件點擊
  for (const [id, node] of objNodes) {
    const obj = MAP_OBJECTS.find((o) => o.id === id)!;
    node.addEventListener("click", (e) => {
      e.stopPropagation();
      onObjectClick(obj);
    });
  }

  // 註冊移動監聽(供外部重置用)
  moveListeners.push(render);

  window.addEventListener("keydown", onKeyDown);
  // 元件卸載時清理(操作頁面重繪會重建)
  root.addEventListener("DOMNodeRemovedFromDocument", () => {
    window.removeEventListener("keydown", onKeyDown);
    moveListeners = moveListeners.filter((fn) => fn !== render);
  });

  // 初次渲染
  render();
  return root;
}

// ============================================================
// 輔助
// ============================================================

function regionDirSafe(region: Region): { dx: number; dy: number } {
  if (region === "plaza") return { dx: 0, dy: -1 };
  return REGION_DIRECTION[region];
}

/** 建立單一物件的 DOM 節點 */
function createObjectNode(obj: MapObject): HTMLElement {
  const node = document.createElement("div");
  node.className = `世界地圖層-物件 世界地圖層-物件-${obj.kind}`;
  node.dataset.kind = obj.kind;
  node.dataset.id = obj.id;
  const px = (obj.x - MAP_BOUNDS.minX) * CELL_PX + CELL_PX / 2;
  const py = (MAP_BOUNDS.maxY - obj.y) * CELL_PX + CELL_PX / 2;
  node.style.left = `${px}px`;
  node.style.top = `${py}px`;
  node.innerHTML = `
    <span class="世界地圖層-物件-glyph">${FACILITY_GLYPH[obj.kind]}</span>
    <span class="世界地圖層-物件-label">${obj.label}</span>
  `;
  node.title = obj.detail ?? obj.label;
  return node;
}

/** 區域底色繪製(四世界的扇形背景 + 中央廣場) */
function renderRegionBases(canvas: HTMLElement): void {
  const bases = document.createElement("div");
  bases.className = "世界地圖層-區域底色";

  // 中央廣場(圓形)
  const plaza = document.createElement("div");
  plaza.className = "世界地圖層-區域 世界地圖層-區域-plaza";
  const cx = (0 - MAP_BOUNDS.minX) * CELL_PX + CELL_PX / 2;
  const cy = (MAP_BOUNDS.maxY - 0) * CELL_PX + CELL_PX / 2;
  plaza.style.left = `${cx}px`;
  plaza.style.top = `${cy}px`;
  plaza.textContent = "中央廣場";
  bases.appendChild(plaza);

  // 四世界(標籤放置在該方位深處)
  const worldDirs: { region: Exclude<Region, "plaza">; label: string }[] = [
    { region: "geometry", label: "幾何世界 ➔" },
    { region: "organic", label: "有機世界" },
    { region: "fractal", label: "⟵ 分形世界" },
    { region: "mechanical", label: "機械世界" },
  ];
  for (const { region, label } of worldDirs) {
    const dir = REGION_DIRECTION[region];
    const tag = document.createElement("div");
    tag.className = `世界地圖層-區域標籤 世界地圖層-區域標籤-${region}`;
    const tx = (dir.dx * 9 - MAP_BOUNDS.minX) * CELL_PX + CELL_PX / 2;
    const ty = (MAP_BOUNDS.maxY - dir.dy * 9) * CELL_PX + CELL_PX / 2;
    tag.style.left = `${tx}px`;
    tag.style.top = `${ty}px`;
    tag.textContent = label;
    bases.appendChild(tag);
  }

  canvas.appendChild(bases);
}
