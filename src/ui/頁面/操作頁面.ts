/**
 * @file 操作頁面.ts
 * @description 戰鬥 HUD（IC 預設常駐層）。示範：左右滑互斥 R1、頭像展圈 → 進管理介面、
 * 驚嘆號快跳互動子頁 R6、世界時鐘持續流動、終局事件最高優先權 R11。
 *
 *              本版新增:嵌入「世界地圖層」,玩家可用 WASD 在 placeholder 地圖上移動,
 *              靠近熔爐/雕像/工作台/商店/祭壇時自動觸發靠近狀態並顯示驚嘆號。
 */
import { 應用程式狀態 } from "../應用程式狀態";
import { 戰鬥HUD接線 } from "../戰鬥HUD接線";
import { 建立世界地圖層 } from "../元件/世界地圖層";

export function 渲染操作頁面(容器: HTMLElement) {
  容器.innerHTML = "";
  const state = 應用程式狀態.畫面;
  if (state.層 !== "操作頁面") return;
  const 額外 = 應用程式狀態.額外;

  const root = document.createElement("div");
  root.className = "操作頁面-root";

  const 頂部 = document.createElement("div");
  頂部.className = "操作頁面-頂部";
  頂部.innerHTML = `<span class="世界時鐘 ${額外.縮圈警戒 ? "警戒" : ""}">世界時間：${額外.世界時鐘秒數}s${
    額外.縮圈警戒 ? " ⚠" : ""
  }</span>`;
  root.appendChild(頂部);

  // 世界地圖層:玩家可走動、靠近設施觸發互動
  root.appendChild(建立世界地圖層());

  const hud掛載區 = document.createElement("div");
  hud掛載區.className = "戰鬥HUD掛載區";
  root.appendChild(hud掛載區);
  戰鬥HUD接線.掛載(hud掛載區);
  戰鬥HUD接線.同步狀態();

  容器.appendChild(root);
}
