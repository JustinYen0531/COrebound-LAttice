/**
 * @file 小隊圓盤.ts
 * @description 共用元件 B（統一版文件 2.1 / 3 節）：大圓盤 + 隊長核心 + 三層槽位。
 * 「New Game 準備流程」的小隊預覽，與「管理介面／小隊」分頁共用同一份元件。
 * 目前只做骨架呈現：外/中/內三層、藍(保護)/紅(火力)/黃(補給) 色標、點擊可選取。
 */
import { 職責顏色標籤 } from "../共用型別";
import type { 職責顏色 } from "../共用型別";

export interface 小隊圓盤選項 {
  隊長名稱: string;
  隊長代表色: string;
  可互動: boolean;
  選中變更?: (id: number) => void;
}

interface 槽位 {
  id: number;
  層: "外" | "中" | "內";
  角度: number;
  顏色: 職責顏色;
}

const 顏色循環: 職責顏色[] = ["保護", "火力", "補給"];

function 產生槽位(): 槽位[] {
  const 配置: Array<{ 層: 槽位["層"]; 數量: number }> = [
    { 層: "外", 數量: 4 },
    { 層: "中", 數量: 3 },
    { 層: "內", 數量: 2 },
  ];
  const 槽位陣列: 槽位[] = [];
  let id = 0;
  for (const { 層, 數量 } of 配置) {
    for (let i = 0; i < 數量; i++) {
      槽位陣列.push({ id: id++, 層, 角度: (360 / 數量) * i, 顏色: 顏色循環[id % 顏色循環.length] });
    }
  }
  return 槽位陣列;
}

const 層半徑: Record<槽位["層"], number> = { 外: 138, 中: 96, 內: 56 };

export function 建立小隊圓盤(選項: 小隊圓盤選項): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "小隊圓盤";

  const 環容器 = document.createElement("div");
  環容器.className = "小隊圓盤-環容器";

  (["外", "中", "內"] as const).forEach((層, idx) => {
    const 環 = document.createElement("div");
    環.className = `小隊圓盤-環 小隊圓盤-環-${層}`;
    環.style.animationDirection = idx % 2 === 0 ? "normal" : "reverse";
    環容器.appendChild(環);
  });

  const 核心 = document.createElement("div");
  核心.className = "小隊圓盤-核心";
  核心.style.background = `radial-gradient(circle at 35% 30%, ${選項.隊長代表色}, #0d0f18)`;
  核心.textContent = 選項.隊長名稱.slice(0, 1);
  核心.title = `隊長：${選項.隊長名稱}（核心 = 隊長，陣亡即整隊淘汰）`;
  環容器.appendChild(核心);

  for (const 槽 of 產生槽位()) {
    const 半徑 = 層半徑[槽.層];
    const el = document.createElement("button");
    el.type = "button";
    el.className = "小隊圓盤-槽位";
    el.style.setProperty("--角度", `${槽.角度}deg`);
    el.style.setProperty("--半徑", `${半徑}px`);
    el.style.background = 職責顏色標籤[槽.顏色].色票;
    el.title = `${槽.層}圈・${槽.顏色}位（${職責顏色標籤[槽.顏色].說明}）`;
    if (選項.可互動) {
      el.addEventListener("click", () => 選項.選中變更?.(槽.id));
    } else {
      el.disabled = true;
    }
    環容器.appendChild(el);
  }

  wrap.appendChild(環容器);

  const 圖例 = document.createElement("div");
  圖例.className = "小隊圓盤-圖例";
  圖例.innerHTML = (Object.keys(職責顏色標籤) as 職責顏色[])
    .map(
      (c) =>
        `<span class="小隊圓盤-圖例項"><i style="background:${職責顏色標籤[c].色票}"></i>${c}位</span>`
    )
    .join("");
  wrap.appendChild(圖例);

  return wrap;
}
