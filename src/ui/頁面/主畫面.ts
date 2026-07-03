/**
 * @file 主畫面.ts
 * @description 5 個第一層主按鈕 + 右側展開子按鈕（統一版文件 1.1、2.1、3 節）。
 */
import { 應用程式狀態 } from "../應用程式狀態";
import { 建立圖鑑瀏覽器 } from "../元件/圖鑑瀏覽器";
import type { 主畫面分頁 } from "../共用型別";

const 主按鈕清單: 主畫面分頁[] = ["開始遊玩", "圖鑑", "遊玩記錄", "新手入門", "設定"];

function 開始遊玩子頁(): HTMLElement {
  const el = document.createElement("div");
  el.className = "子頁內容 子頁內容-narrow";
  el.innerHTML = `<h3>開始遊玩</h3>`;
  const list = document.createElement("div");
  list.className = "按鈕列";

  const newGame = document.createElement("button");
  newGame.textContent = "New Game";
  newGame.className = "一級按鈕";
  newGame.onclick = () => 應用程式狀態.進入遊戲準備流程("New Game");

  const cont = document.createElement("button");
  cont.textContent = "Continue Game";
  cont.className = "二級按鈕";
  cont.onclick = () => 應用程式狀態.進入遊戲準備流程("Continue Game");

  const mp = document.createElement("button");
  mp.textContent = "多人連線（暫未開放）";
  mp.className = "二級按鈕 禁用";
  mp.disabled = true;

  list.append(newGame, cont, mp);
  el.appendChild(list);
  return el;
}

function 遊玩記錄子頁(): HTMLElement {
  const el = document.createElement("div");
  el.className = "子頁內容";
  el.innerHTML = `
    <h3>遊玩記錄</h3>
    <p class="占位說明">僅存在於主畫面（帳號等級資料），管理介面沒有對應頁（規則 R9）。</p>
    <div class="占位卡片格">
      ${["存檔記錄", "通關次數", "使用過的角色", "通關時間", "歷次配置", "成就"]
        .map((n) => `<div class="占位卡片">${n}</div>`)
        .join("")}
    </div>
  `;
  return el;
}

function 新手入門子頁(): HTMLElement {
  const el = document.createElement("div");
  el.className = "子頁內容 子頁內容-narrow";
  el.innerHTML = `<h3>新手入門</h3>`;
  const list = document.createElement("div");
  list.className = "按鈕列";

  const guide = document.createElement("button");
  guide.className = "二級按鈕";
  guide.textContent = "新手導覽";

  const dojo = document.createElement("button");
  dojo.className = "一級按鈕";
  dojo.textContent = "訓練道場";
  dojo.title = "借用操作頁面＋管理介面骨架（R12），退出直接回主畫面，無結算頁";
  dojo.onclick = () => 應用程式狀態.進入訓練道場();

  list.append(guide, dojo);
  el.appendChild(list);
  return el;
}

function 設定子頁(): HTMLElement {
  const el = document.createElement("div");
  el.className = "子頁內容";
  el.innerHTML = `
    <h3>設定</h3>
    <div class="占位卡片格">
      ${["音樂", "音效", "顯示", "操作"].map((n) => `<div class="占位卡片">${n}</div>`).join("")}
    </div>
  `;
  return el;
}

export function 渲染主畫面(容器: HTMLElement) {
  容器.innerHTML = "";
  const state = 應用程式狀態.畫面;
  if (state.層 !== "主畫面") return;

  const root = document.createElement("div");
  root.className = "主畫面-root";

  const 標題 = document.createElement("div");
  標題.className = "主畫面-標題";
  標題.innerHTML = `<h1>COrebound LAttence</h1><p>主流程骨架原型 — 圍繞核心展開的小隊圖騰</p>`;
  root.appendChild(標題);

  const 進度摘要 = document.createElement("div");
  進度摘要.className = "主畫面-進度摘要";
  進度摘要.innerHTML = `
    <h3>目前第一版已串起的主線</h3>
    <ol>
      <li>主畫面：展開主按鈕子頁</li>
      <li>開始遊玩：進入賽前準備，選擇隊長</li>
      <li>正式遊玩：查看 HUD、展開圓盤、進入管理介面</li>
      <li>管理介面：切換小隊 / 背包 / 互動 / 圖鑑 / 地圖</li>
      <li>結算頁：回大廳或再來一場</li>
    </ol>
    <p class="占位說明">這一版先把主流程接通，很多內容仍是骨架占位，但已經不是互相分離的孤島。</p>
    <p class="占位說明" style="margin-top: 12px; margin-bottom: 0;">
      <a href="/totem-preview.html" target="_blank" style="color: #ff8a3b; font-weight: bold; text-decoration: underline; cursor: pointer;">
        🔗 點此開啟「圖騰全貌預覽 HTML 頁面 (totem-preview.html)」
      </a>
      <span style="margin: 0 8px; color: #8f8f9c;">|</span>
      <a href="/totem-weaving.html" target="_blank" style="color: #ff8a3b; font-weight: bold; text-decoration: underline; cursor: pointer;">
        🧬 點此開啟「Living Totem 疊加編織模擬器 (totem-weaving.html)」
      </a>
    </p>
  `;
  root.appendChild(進度摘要);

  const 版面 = document.createElement("div");
  版面.className = "主畫面-版面";

  const 主按鈕欄 = document.createElement("div");
  主按鈕欄.className = "主畫面-主按鈕欄";
  for (const 名稱 of 主按鈕清單) {
    const btn = document.createElement("button");
    btn.className = "主畫面-主按鈕";
    btn.textContent = 名稱 ?? "";
    btn.classList.toggle("作用中", state.子頁 === 名稱);
    btn.onclick = () => 應用程式狀態.切換主畫面子頁(名稱);
    主按鈕欄.appendChild(btn);
  }
  const 離開 = document.createElement("button");
  離開.className = "主畫面-離開按鈕";
  離開.textContent = "離開遊戲";
  離開.title = "刻意不算主按鈕，放在角落次級位置";
  主按鈕欄.appendChild(離開);

  版面.appendChild(主按鈕欄);

  const 子頁容器 = document.createElement("div");
  子頁容器.className = "主畫面-子頁容器";
  子頁容器.classList.toggle("展開", state.子頁 !== null);

  if (state.子頁 === "開始遊玩") 子頁容器.appendChild(開始遊玩子頁());
  else if (state.子頁 === "圖鑑") {
    const box = document.createElement("div");
    box.className = "子頁內容";
    box.innerHTML = `<h3>圖鑑（主畫面版，共用元件 A）</h3>`;
    box.appendChild(建立圖鑑瀏覽器("OOC"));
    子頁容器.appendChild(box);
  } else if (state.子頁 === "遊玩記錄") 子頁容器.appendChild(遊玩記錄子頁());
  else if (state.子頁 === "新手入門") 子頁容器.appendChild(新手入門子頁());
  else if (state.子頁 === "設定") 子頁容器.appendChild(設定子頁());

  版面.appendChild(子頁容器);
  root.appendChild(版面);
  容器.appendChild(root);
}
