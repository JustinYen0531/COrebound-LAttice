/**
 * @file 圖鑑瀏覽器.ts
 * @description 共用元件 A（統一版文件 1.3 / 5 節 R8）：圖鑑的兩個掛載點共用同一份元件與資料。
 * 差異只有一項：OOC（主畫面）版多一個「世界故事」分頁，IC（管理介面）版沒有。
 * 目前選中的分頁存在 應用程式狀態，而不是元件內部的 closure，
 * 避免 IC 版在世界時鐘每秒重繪時被重置回預設分頁。
 */
import { 應用程式狀態, 圖鑑資料查詢類分頁 } from "../應用程式狀態";

export function 建立圖鑑瀏覽器(情境: "OOC" | "IC"): HTMLElement {
  const 分頁清單: string[] =
    情境 === "OOC" ? [...圖鑑資料查詢類分頁, "世界故事"] : [...圖鑑資料查詢類分頁];

  const 目前選中 =
    情境 === "OOC" ? 應用程式狀態.額外.圖鑑選中OOC : 應用程式狀態.額外.圖鑑選中IC;
  const 選中名稱 = 分頁清單.includes(目前選中) ? 目前選中 : 分頁清單[0];

  const wrap = document.createElement("div");
  wrap.className = "資料夾式版面";

  const 書籤欄 = document.createElement("div");
  書籤欄.className = "資料夾式版面-書籤欄";

  for (const 名稱 of 分頁清單) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = 名稱;
    btn.classList.toggle("作用中", 名稱 === 選中名稱);
    if (名稱 === "世界故事") btn.classList.add("圖鑑瀏覽器-世界故事按鈕");
    btn.addEventListener("click", () => 應用程式狀態.設定圖鑑分頁(情境, 名稱));
    書籤欄.appendChild(btn);
  }

  const 內容區 = document.createElement("div");
  內容區.className = "資料夾式版面-內容區";
  內容區.innerHTML = `
    <h3>${選中名稱}</h3>
    <p class="占位說明">（資料尚未接入，之後會串接 doc/角色與敵方 與 doc/世界觀 內的圖鑑資料。）</p>
    <div class="占位卡片格">
      ${Array.from({ length: 6 })
        .map((_, i) => `<div class="占位卡片">條目 ${i + 1}</div>`)
        .join("")}
    </div>
  `;

  const 補充區 = document.createElement("div");
  補充區.className = "資料夾式版面-補充區";
  補充區.innerHTML = `<h4>補充資訊</h4><p>點選左側分類查看詳情。共用元件 A，兩個掛載點共用同一份資料與同一份選取狀態邏輯。</p>`;

  wrap.append(書籤欄, 內容區, 補充區);
  return wrap;
}
