/**
 * @file preview.ts
 * @description 戰鬥 HUD 的獨立預覽入口。
 *
 *              與正式的 src/main.ts(主流程路由器)分離,刻意不碰既有的中文主流程架構。
 *              用途:單獨打開 hud-preview.html 即可驗證 HUD 骨架的所有互動,
 *              不需要進入主畫面 → 遊戲準備 → 操作頁面的完整流程。
 *
 *              正式整合時,HudController 可被「操作頁面」採用(取代當前的占位 HUD)。
 */

import "./hud.css";
import { HudController } from "./hud-controller";
import { MockSnapshotSource } from "./mock-snapshot";
import type { HudEvent } from "./types";

const app = document.getElementById("app")!;

// 戰場背景
const shell = document.createElement("div");
shell.className = "test-shell";
shell.innerHTML = `<div class="test-bg-grid"></div>`;
app.appendChild(shell);

// HUD
const hud = new HudController();
const mock = new MockSnapshotSource();

// 事件閉環:HUD 事件 → 模擬層
hud.onEvent((e: HudEvent) => {
  const detail =
    e.type === "toggle_weapon" ? `(${e.family})`
    : e.type === "use_potion" ? `(${e.potionId} → ${e.onMemberId ?? "隊長"})`
    : e.type === "open_management" && e.focusMemberId ? `(聚焦 ${e.focusMemberId})`
    : "";
  logEvent(`${e.type}${detail}`);
  switch (e.type) {
    case "cast_active":
      mock.castActive();
      break;
    case "toggle_weapon":
      mock.toggleWeapon(e.family);
      break;
    case "use_potion":
      mock.usePotion(e.potionId);
      break;
    case "open_management":
      logEvent(`>>> 開啟管理介面 ${e.focusMemberId ? `(聚焦 ${e.focusMemberId})` : "(小隊頁)"}`);
      break;
  }
});

document.body.appendChild(hud.el);

// 測試控制面板
const panel = document.createElement("div");
panel.className = "test-panel";
panel.innerHTML = `
  <h3>戰鬥 HUD 骨架 · 預覽</h3>
  <button data-act="move">移動狀態:靜止</button>
  <button data-act="hit">模擬受擊 (-8% HP)</button>
  <button data-act="cast">施放主動技能</button>
  <button data-act="reset">重置</button>
  <div class="hint">
    <b>操作測試:</b><br/>
    • 滑鼠停留核心區 <kbd>0.5s</kbd> → 展開同心圓<br/>
    • 從核心向左/右拖曳 <kbd>40px</kbd> → 開抽屜<br/>
    • 點擊頭像 / <kbd>Space</kbd> → 施放<br/>
    • <kbd>Esc</kbd> → 收回一切<br/>
    • 右滑抽屜:拖曳藥水到隊員<br/>
    • 大藥水需 3s 內確認<br/>
    • 受擊後 1s 內 → 展開被抑制
  </div>
`;
app.appendChild(panel);

let moving = false;
panel.addEventListener("click", (e) => {
  const btn = (e.target as Element).closest("[data-act]") as HTMLElement | null;
  if (!btn) return;
  const act = btn.dataset.act;
  if (act === "move") {
    moving = !moving;
    mock.setMoving(moving);
    btn.textContent = `移動狀態:${moving ? "移動中" : "靜止"}`;
  } else if (act === "hit") {
    mock.takeHit();
  } else if (act === "cast") {
    mock.castActive();
  } else if (act === "reset") {
    location.reload();
  }
});

// 事件日誌
const logBox = document.createElement("div");
logBox.className = "test-log";
logBox.innerHTML = `<div class="entry"><span class="t">[HUD 事件]</span> 等待操作…</div>`;
app.appendChild(logBox);

function logEvent(msg: string): void {
  const entry = document.createElement("div");
  entry.className = "entry";
  const now = new Date().toLocaleTimeString("zh-Hant", { hour12: false });
  entry.innerHTML = `<span class="t">${now}</span> ${msg}`;
  logBox.prepend(entry);
  while (logBox.children.length > 30) logBox.lastChild?.remove();
}

// 鍵盤快捷
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    mock.castActive();
  }
  if (["KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)) {
    mock.setMoving(true);
    moving = true;
    const btn = panel.querySelector('[data-act="move"]') as HTMLElement;
    if (btn) btn.textContent = "移動狀態:移動中";
  }
});
window.addEventListener("keyup", (e) => {
  if (["KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)) {
    mock.setMoving(false);
    moving = false;
    const btn = panel.querySelector('[data-act="move"]') as HTMLElement;
    if (btn) btn.textContent = "移動狀態:靜止";
  }
});

// 主循環
let lastT = performance.now();
function loop(now: number): void {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  mock.tick(dt);
  hud.update(mock.snapshot());
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
