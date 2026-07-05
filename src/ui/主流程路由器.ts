/**
 * @file 主流程路由器.ts
 * @description 依 應用程式狀態.畫面.層 分派到對應頁面渲染函式，對應
 * doc/介面流程/主流程與頁面骨架_統一版.md 第 2 節主流程總圖。
 */
import { 應用程式狀態 } from "./應用程式狀態";
import { 渲染主畫面 } from "./頁面/主畫面";
import { 渲染遊戲準備流程 } from "./頁面/遊戲準備流程";
import { 渲染操作頁面 } from "./頁面/操作頁面";
import { 渲染管理介面 } from "./頁面/管理介面";
import { 渲染結算頁 } from "./頁面/結算頁";

export function 啟動路由器(根節點: HTMLElement) {
  let lastLayer: string | null = null;
  let 頁面容器: HTMLElement | null = null;
  let 浮動容器: HTMLElement | null = null;

  function 渲染() {
    const currentLayer = 應用程式狀態.畫面.層;

    if (currentLayer !== lastLayer) {
      根節點.innerHTML = "";
      頁面容器 = document.createElement("div");
      頁面容器.className = "頁面容器";
      浮動容器 = document.createElement("div");
      浮動容器.className = "頁面浮動容器";
      根節點.appendChild(頁面容器);
      根節點.appendChild(浮動容器);
      lastLayer = currentLayer;

      switch (currentLayer) {
        case "主畫面":
          渲染主畫面(頁面容器);
          break;
        case "遊戲準備流程":
          渲染遊戲準備流程(頁面容器);
          break;
        case "操作頁面":
          渲染操作頁面(頁面容器);
          break;
        case "管理介面":
          渲染管理介面(頁面容器);
          break;
        case "結算頁":
          渲染結算頁(頁面容器);
          break;
      }
    } else {
      // 只要當前層不是「操作頁面」，當前層的其他子分頁或狀態改變時，我們就重新局部渲染它。
      // 這保證了主畫面子分頁、準備流程選隊長、管理介面分頁切換等正常運作，同時又徹底豁免了「操作頁面」的重繪開銷。
      if (currentLayer !== "操作頁面" && 頁面容器) {
        if (currentLayer === "主畫面") 渲染主畫面(頁面容器);
        else if (currentLayer === "遊戲準備流程") 渲染遊戲準備流程(頁面容器);
        else if (currentLayer === "管理介面") 渲染管理介面(頁面容器);
        else if (currentLayer === "結算頁") 渲染結算頁(頁面容器);
      }
    }

    if (浮動容器) {
      浮動容器.innerHTML = "";
    }
  }

  應用程式狀態.訂閱(渲染);
  應用程式狀態.啟動世界時鐘();
  渲染();
}
