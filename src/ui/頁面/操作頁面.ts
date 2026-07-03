/**
 * @file 操作頁面.ts
 * @description 戰鬥 HUD（IC 預設常駐層）。已整合動態 HudController 與 MockSnapshotSource，
 * 實現核心 HUD、展圈、抽屜互斥、鍵盤/除錯受擊連動，以及展滿後進管理介面。
 */
import { 應用程式狀態 } from "../應用程式狀態";
import type { 互動設施 } from "../共用型別";
import { HudController } from "../../hud/hud-controller";
import { MockSnapshotSource } from "../../hud/mock-snapshot";

const 互動設施清單: 互動設施[] = ["合成", "熔爐", "雕像", "商店", "召喚"];

// 全域單例，防重繪時重複建立與事件洩漏
let hudCtrlInstance: HudController | null = null;
let mockSourceInstance: MockSnapshotSource | null = null;
let requestFrameId: number | null = null;
let lastTime = 0;

function 取得或建立HUD(): { hud: HudController; mock: MockSnapshotSource } {
  if (!hudCtrlInstance) {
    hudCtrlInstance = new HudController();
    mockSourceInstance = new MockSnapshotSource();

    // 綁定 HUD 內部事件
    hudCtrlInstance.onEvent((e) => {
      if (!mockSourceInstance) return;
      switch (e.type) {
        case "cast_active":
          mockSourceInstance.castActive();
          break;
        case "toggle_weapon":
          mockSourceInstance.toggleWeapon(e.family);
          break;
        case "use_potion":
          mockSourceInstance.usePotion(e.potionId);
          break;
        case "open_management":
          // 圓盤展滿 3 圈後再次點頭像/圓盤 ➔ 無縫跳轉進入小隊管理介面
          應用程式狀態.進入管理介面("小隊");
          break;
      }
    });
  }
  return { hud: hudCtrlInstance, mock: mockSourceInstance };
}

// 鍵盤監聽處理（防止在其他層頁面觸發）
function 處理鍵盤按下(e: KeyboardEvent) {
  if (應用程式狀態.畫面.層 !== "操作頁面" || !mockSourceInstance) return;
  if (e.code === "Space") {
    e.preventDefault();
    mockSourceInstance.castActive();
  }
  if (["KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)) {
    mockSourceInstance.setMoving(true);
  }
}

function 處理鍵盤放開(e: KeyboardEvent) {
  if (應用程式狀態.畫面.層 !== "操作頁面" || !mockSourceInstance) return;
  if (["KeyW", "KeyA", "KeyS", "KeyD"].includes(e.code)) {
    mockSourceInstance.setMoving(false);
  }
}

export function 渲染操作頁面(容器: HTMLElement) {
  容器.innerHTML = "";
  const state = 應用程式狀態.畫面;
  if (state.層 !== "操作頁面") return;
  const 額外 = 應用程式狀態.額外;

  const { hud, mock } = 取得或建立HUD();

  const root = document.createElement("div");
  root.className = "操作頁面-root";

  // 頂部狀態列：世界時鐘 + 縮圈警戒
  const 頂部 = document.createElement("div");
  頂部.className = "操作頁面-頂部";
  頂部.innerHTML = `
    <span>${state.訓練道場 ? "訓練道場（沙盒，無結算頁）" : "正式遊玩"}</span>
    <span class="世界時鐘 ${額外.縮圈警戒 ? "警戒" : ""}">世界時鐘：${額外.世界時鐘秒數}s ${
    額外.縮圈警戒 ? "⚠ 縮圈逼近（示範用）" : ""
  }</span>
  `;
  root.appendChild(頂部);

  const 流程提示 = document.createElement("div");
  流程提示.className = "流程提示卡";
  流程提示.innerHTML = `
    <h3>目前你正在「正式遊玩」戰鬥畫面</h3>
    <p class="占位說明" style="color: #ff8a3b; font-weight: bold;">[HUD 互動指南]：</p>
    <p class="占位說明">• <b>滑鼠停留頭像 0.5 秒</b>：依序展開三圈同心圓陣型盤。</p>
    <p class="占位說明">• <b>展滿後再次點擊頭像/圓盤</b>：直接無縫進入小隊管理介面。</p>
    <p class="占位說明">• <b>從頭像左滑/右滑（或點擊下方輔助按鈕）</b>：拉出武器面板 / 藥水隊員欄（互斥）。</p>
    <p class="占位說明">• <b>鍵盤操作</b>：按 <kbd>WASD</kbd> 模擬移動（移動時不展開），按 <kbd>Space</kbd> 施放主動技能，按 <kbd>Esc</kbd> 收回一切。</p>
  `;
  root.appendChild(流程提示);

  // 美化後的小地圖
  const 小地圖 = document.createElement("div");
  小地圖.className = "小地圖占位";
  小地圖.style.border = "2px solid rgba(255, 138, 59, 0.4)";
  小地圖.style.borderRadius = "50%";
  小地圖.style.background = "radial-gradient(circle, rgba(255, 138, 59, 0.1) 0%, rgba(0,0,0,0.85) 85%)";
  小地圖.style.boxShadow = "0 0 15px rgba(255, 138, 59, 0.25)";
  小地圖.style.display = "flex";
  小地圖.style.alignItems = "center";
  小地圖.style.justifyContent = "center";
  小地圖.style.fontSize = "0.85rem";
  小地圖.style.fontWeight = "bold";
  小地圖.style.color = "#ff8a3b";
  小地圖.style.position = "absolute";
  小地圖.style.top = "60px";
  小地圖.style.right = "20px";
  小地圖.style.width = "110px";
  小地圖.style.height = "110px";
  小地圖.innerHTML = `
    <div style="position:absolute; inset:0; opacity:0.15; border-radius:50%; background-image: radial-gradient(circle, #ff8a3b 1px, transparent 1px); background-size: 15px 15px;"></div>
    <span style="z-index: 1;">📐 幾何縮影</span>
  `;
  root.appendChild(小地圖);

  // 驚嘆號互動提示
  if (額外.靠近的互動設施) {
    const 驚嘆號 = document.createElement("button");
    驚嘆號.className = "驚嘆號提示";
    驚嘆號.textContent = `! 靠近「${額外.靠近的互動設施}」`;
    驚嘆號.onclick = () => 應用程式狀態.點擊驚嘆號提示();
    root.appendChild(驚嘆號);
  }

  // 中央 HUD 容器
  const hudContainer = document.createElement("div");
  hudContainer.className = "底部核心HUD";
  hudContainer.style.display = "flex";
  hudContainer.style.justifyContent = "space-between";
  hudContainer.style.alignItems = "center";
  hudContainer.style.width = "100%";
  hudContainer.style.pointerEvents = "none";

  const 左按鈕 = document.createElement("button");
  左按鈕.className = "滑動切換按鈕";
  左按鈕.textContent = "◀ 技能面板";
  左按鈕.style.pointerEvents = "auto";
  左按鈕.classList.toggle("作用中", 額外.滑動面板 === "左");
  左按鈕.onclick = () => {
    應用程式狀態.設定滑動面板("左");
    if (應用程式狀態.額外.滑動面板 === "左") {
      hud.openLeftDrawer();
    } else {
      hud.closeDrawers();
    }
  };

  const 右按鈕 = document.createElement("button");
  右按鈕.className = "滑動切換按鈕";
  右按鈕.textContent = "物品隊員 ▶";
  右按鈕.style.pointerEvents = "auto";
  右按鈕.classList.toggle("作用中", 額外.滑動面板 === "右");
  右按鈕.onclick = () => {
    應用程式狀態.設定滑動面板("右");
    if (應用程式狀態.額外.滑動面板 === "右") {
      hud.openRightDrawer();
    } else {
      hud.closeDrawers();
    }
  };

  // 核心發光區
  const 核心區 = document.createElement("div");
  核心區.className = "底部核心HUD-核心區";
  核心區.style.position = "relative";
  核心區.style.width = "400px";
  核心區.style.height = "120px";
  核心區.style.display = "flex";
  核心區.style.justifyContent = "center";
  核心區.style.alignItems = "center";
  
  // 掛載動態 HUD
  核心區.appendChild(hud.el);

  hudContainer.append(左按鈕, 核心區, 右按鈕);
  root.appendChild(hudContainer);

  // 戰地操作按鈕
  const 戰場操作列 = document.createElement("div");
  戰場操作列.className = "按鈕列";

  const 返回主畫面 = document.createElement("button");
  返回主畫面.className = "二級按鈕";
  返回主畫面.textContent = "返回主畫面";
  返回主畫面.onclick = () => {
    if (requestFrameId !== null) {
      cancelAnimationFrame(requestFrameId);
      requestFrameId = null;
    }
    應用程式狀態.返回主畫面();
  };
  戰場操作列.appendChild(返回主畫面);

  const 直接進管理 = document.createElement("button");
  直接進管理.className = "一級按鈕";
  直接進管理.textContent = "開啟管理介面";
  直接進管理.onclick = () => {
    if (requestFrameId !== null) {
      cancelAnimationFrame(requestFrameId);
      requestFrameId = null;
    }
    應用程式狀態.進入管理介面("小隊");
  };
  戰場操作列.appendChild(直接進管理);

  root.appendChild(戰場操作列);

  // 除錯與模擬控制面板
  const 除錯區 = document.createElement("details");
  除錯區.className = "除錯區";
  除錯區.open = true;
  除錯區.innerHTML = `<summary>開發工具：HUD 戰鬥模擬面板</summary>`;

  const 模擬操作列 = document.createElement("div");
  模擬操作列.className = "按鈕列";

  const 受擊按鈕 = document.createElement("button");
  受擊按鈕.className = "危險按鈕";
  受擊按鈕.textContent = "💥 模擬小隊受擊 (HP -8%)";
  受擊按鈕.onclick = () => {
    mock.takeHit();
  };
  模擬操作列.appendChild(受擊按鈕);

  const 技能按鈕 = document.createElement("button");
  技能按鈕.className = "一級按鈕";
  技能按鈕.textContent = "⚡ 模擬釋放隊長技能 (Space)";
  技能按鈕.onclick = () => {
    mock.castActive();
  };
  模擬操作列.appendChild(技能按鈕);

  除錯區.appendChild(模擬操作列);

  const 設施列 = document.createElement("div");
  設施列.className = "按鈕列";
  for (const 設施 of 互動設施清單) {
    const b = document.createElement("button");
    b.className = "三級按鈕";
    b.textContent = `靠近：${設施}`;
    b.classList.toggle("作用中", 額外.靠近的互動設施 === 設施);
    b.onclick = () => 應用程式狀態.模擬靠近設施(設施);
    設施列.appendChild(b);
  }
  const 離開設施 = document.createElement("button");
  離開設施.className = "三級按鈕";
  離開設施.textContent = "離開設施";
  離開設施.onclick = () => 應用程式狀態.模擬靠近設施(null);
  設施列.appendChild(離開設施);
  除錯區.appendChild(設施列);

  if (state.訓練道場) {
    const 退出 = document.createElement("button");
    退出.className = "二級按鈕";
    退出.textContent = "退出訓練道場 (R12)";
    退出.onclick = () => 應用程式狀態.退出訓練道場();
    除錯區.appendChild(退出);
  } else {
    const 終局 = document.createElement("button");
    終局.className = "危險按鈕";
    終局.textContent = "觸發終局事件 (R11)";
    終局.onclick = () => 應用程式狀態.觸發終局事件();
    除錯區.appendChild(終局);
  }

  root.appendChild(除錯區);
  容器.appendChild(root);

  // 重置與綁定鍵盤事件
  window.removeEventListener("keydown", 處理鍵盤按下);
  window.removeEventListener("keyup", 處理鍵盤放開);
  window.addEventListener("keydown", 處理鍵盤按下);
  window.addEventListener("keyup", 處理鍵盤放開);

  // 重置與啟動動畫 Loop
  if (requestFrameId !== null) {
    cancelAnimationFrame(requestFrameId);
    requestFrameId = null;
  }

  lastTime = performance.now();
  function loop(now: number) {
    if (應用程式狀態.畫面.層 !== "操作頁面") {
      if (requestFrameId !== null) {
        cancelAnimationFrame(requestFrameId);
        requestFrameId = null;
      }
      // 退場時釋放鍵盤監聽
      window.removeEventListener("keydown", 處理鍵盤按下);
      window.removeEventListener("keyup", 處理鍵盤放開);
      return;
    }
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    mock.tick(dt);
    hud.update(mock.snapshot());

    requestFrameId = requestAnimationFrame(loop);
  }
  requestFrameId = requestAnimationFrame(loop);
}

