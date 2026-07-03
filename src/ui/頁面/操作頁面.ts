/**
 * @file 操作頁面.ts
 * @description 戰鬥 HUD（IC 預設常駐層）。示範：左右滑互斥 R1、頭像展圈 → 進管理介面、
 * 驚嘆號快跳互動子頁 R6、世界時鐘持續流動、終局事件最高優先權 R11。
 *
 *              本版新增:嵌入「世界地圖層」,玩家可用 WASD 在 placeholder 地圖上移動,
 *              靠近熔爐/雕像/工作台/商店/祭壇時自動觸發靠近狀態並顯示驚嘆號。
 */
import { 應用程式狀態 } from "../應用程式狀態";
import type { 互動設施 } from "../共用型別";
import { 戰鬥HUD接線 } from "../戰鬥HUD接線";
import { 建立世界地圖層 } from "../元件/世界地圖層";

const 互動設施清單: 互動設施[] = ["合成", "熔爐", "雕像", "商店", "召喚"];

export function 渲染操作頁面(容器: HTMLElement) {
  容器.innerHTML = "";
  const state = 應用程式狀態.畫面;
  if (state.層 !== "操作頁面") return;
  const 額外 = 應用程式狀態.額外;

  const root = document.createElement("div");
  root.className = "操作頁面-root";

  // 頂部狀態列：世界時鐘 + 縮圈警戒（R3 示範：不論在哪一層都持續跑）
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
    <h3>正式遊玩第一版：HUD 已接入即時冷卻 / 能量 / 主動技能</h3>
    <p class="占位說明">底部中央現在不是靜態示意了。隊長頭像、能量條、主動技能冷卻環會跟著時間推進，點擊頭像可實際耗能並進入冷卻。</p>
    <p class="占位說明">左側抽屜可切換耗能中的武器群組，右側抽屜可使用藥水。驚嘆號仍會把你直接送進對應的互動子頁。</p>
  `;
  root.appendChild(流程提示);

  // 世界地圖層:玩家可走動、靠近設施觸發互動
  root.appendChild(建立世界地圖層());

  // 驚嘆號互動提示
  if (額外.靠近的互動設施) {
    const 驚嘆號 = document.createElement("button");
    驚嘆號.className = "驚嘆號提示";
    驚嘆號.textContent = `! 靠近「${額外.靠近的互動設施}」`;
    驚嘆號.onclick = () => 應用程式狀態.點擊驚嘆號提示();
    root.appendChild(驚嘆號);
  }

  const hud掛載區 = document.createElement("div");
  hud掛載區.className = "戰鬥HUD掛載區";
  root.appendChild(hud掛載區);
  戰鬥HUD接線.掛載(hud掛載區);
  戰鬥HUD接線.同步狀態();

  const 戰場操作列 = document.createElement("div");
  戰場操作列.className = "按鈕列";

  const 返回主畫面 = document.createElement("button");
  返回主畫面.className = "二級按鈕";
  返回主畫面.textContent = "返回主畫面";
  返回主畫面.onclick = () => 應用程式狀態.返回主畫面();
  戰場操作列.appendChild(返回主畫面);

  const 直接進管理 = document.createElement("button");
  直接進管理.className = "一級按鈕";
  直接進管理.textContent = "開啟管理介面";
  直接進管理.onclick = () => 應用程式狀態.進入管理介面("小隊");
  戰場操作列.appendChild(直接進管理);

  root.appendChild(戰場操作列);

  // 除錯區：模擬靠近設施 / 觸發終局事件
  const 除錯區 = document.createElement("details");
  除錯區.className = "除錯區";
  除錯區.innerHTML = `<summary>開發工具：骨架示範控制（非正式玩法）</summary>`;

  const 設施列 = document.createElement("div");
  設施列.className = "按鈕列";
  for (const 設施 of 互動設施清單) {
    const b = document.createElement("button");
    b.className = "三級按鈕";
    b.textContent = `模擬靠近：${設施}`;
    b.classList.toggle("作用中", 額外.靠近的互動設施 === 設施);
    b.onclick = () => 應用程式狀態.模擬靠近設施(設施);
    設施列.appendChild(b);
  }
  const 離開設施 = document.createElement("button");
  離開設施.className = "三級按鈕";
  離開設施.textContent = "離開設施範圍";
  離開設施.onclick = () => 應用程式狀態.模擬靠近設施(null);
  設施列.appendChild(離開設施);
  除錯區.appendChild(設施列);

  if (state.訓練道場) {
    const 退出 = document.createElement("button");
    退出.className = "二級按鈕";
    退出.textContent = "退出訓練道場 → 主畫面（R12，無結算頁）";
    退出.onclick = () => 應用程式狀態.退出訓練道場();
    除錯區.appendChild(退出);
  } else {
    const 終局 = document.createElement("button");
    終局.className = "危險按鈕";
    終局.textContent = "觸發終局事件（模擬隊長死亡，R11 最高優先權）";
    終局.onclick = () => 應用程式狀態.觸發終局事件();
    除錯區.appendChild(終局);
  }

  root.appendChild(除錯區);

  容器.appendChild(root);
}
