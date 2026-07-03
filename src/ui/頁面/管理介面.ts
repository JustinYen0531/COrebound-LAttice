/**
 * @file 管理介面.ts
 * @description IC 覆蓋層，5 個第一層主資料夾。只有「小隊」用大圓盤+立繪構圖（共用元件 B），
 * 其餘 4 個資料夾用「左書籤／中內容／右補充」的乾淨資料夾式構圖。
 * 世界時鐘持續流動（R3）；互動子分頁各自依「是否靠近設施」獨立鎖定（R5）；
 * 返回戰場只能回操作頁面，不能直接回主畫面（R7）；終局事件可強制打斷（R11）。
 *
 * 所有「目前選中哪個子分頁」的狀態一律讀寫 應用程式狀態.額外，不使用元件內部 closure，
 * 這樣世界時鐘每秒觸發的整頁重繪，才不會把玩家瀏覽到一半的分頁重置回預設值。
 */
import { 應用程式狀態, 背包分類清單, 地圖分類清單 } from "../應用程式狀態";
import { 建立小隊圓盤 } from "../元件/小隊圓盤";
import { 建立圖鑑瀏覽器 } from "../元件/圖鑑瀏覽器";
import { 建立互動面板 } from "../元件/互動面板";
import type { 互動設施, 管理介面分頁 } from "../共用型別";
import { 隊長清單 } from "../資料/隊長清單";

const 分頁清單: 管理介面分頁[] = ["小隊", "背包", "互動", "圖鑑", "地圖"];
const 互動設施清單: 互動設施[] = ["合成", "熔爐", "雕像", "商店", "召喚"];

function 小隊分頁內容(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "小隊分頁 專屬構圖";

  const 左 = document.createElement("div");
  左.className = "小隊分頁-左";
  const 隊長 = 隊長清單.find((c) => c.id === 應用程式狀態.額外.選中隊長) ?? 隊長清單[0];

  const 詳情區 = document.createElement("div");
  詳情區.className = "小隊分頁-右";
  const 選中槽位 = 應用程式狀態.額外.選中的小隊成員展示位;
  詳情區.innerHTML =
    選中槽位 === null
      ? `<p class="占位說明">點選圓盤任一槽位查看該成員立繪與詳細資訊（食譜／升星資訊／圈層位置）</p>`
      : `
        <h4>成員槽位 #${選中槽位}</h4>
        <p class="占位說明">立繪、名稱、定位、圈層、顏色位階、能力摘要、升星資訊、合成食譜（尚未接資料）。</p>
        <div class="占位卡片">合成食譜占位</div>
      `;

  左.appendChild(
    建立小隊圓盤({
      隊長名稱: 隊長.名稱,
      隊長代表色: 隊長.代表色,
      可互動: true,
      選中變更: (id) => {
        應用程式狀態.額外.選中的小隊成員展示位 = id;
        // 直接觸發一次整頁重繪，讓右側詳情區同步更新（維持單一資料來源）。
        應用程式狀態.進入管理介面("小隊");
      },
    })
  );

  wrap.append(左, 詳情區);
  return wrap;
}

function 背包分頁內容(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "資料夾式版面";

  const 書籤欄 = document.createElement("div");
  書籤欄.className = "資料夾式版面-書籤欄";
  for (const 名稱 of 背包分類清單) {
    const btn = document.createElement("button");
    btn.textContent = 名稱;
    btn.classList.toggle("作用中", 應用程式狀態.額外.背包選中分類 === 名稱);
    btn.onclick = () => 應用程式狀態.設定背包分類(名稱);
    書籤欄.appendChild(btn);
  }

  const 內容區 = document.createElement("div");
  內容區.className = "資料夾式版面-內容區";
  內容區.innerHTML = `<h3>背包 / ${應用程式狀態.額外.背包選中分類}</h3><p class="占位說明">內容尚未接入，骨架先呈現分頁結構。</p>`;

  const 補充區 = document.createElement("div");
  補充區.className = "資料夾式版面-補充區";
  補充區.innerHTML = `<h4>補充資訊</h4><p>材料、道具、消耗品的數量與來源管理。</p>`;

  wrap.append(書籤欄, 內容區, 補充區);
  return wrap;
}

function 地圖分頁內容(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "資料夾式版面";

  const 書籤欄 = document.createElement("div");
  書籤欄.className = "資料夾式版面-書籤欄";
  for (const 名稱 of 地圖分類清單) {
    const btn = document.createElement("button");
    btn.textContent = 名稱;
    btn.classList.toggle("作用中", 應用程式狀態.額外.地圖選中分類 === 名稱);
    btn.onclick = () => 應用程式狀態.設定地圖分類(名稱);
    書籤欄.appendChild(btn);
  }

  const 內容區 = document.createElement("div");
  內容區.className = "資料夾式版面-內容區";
  內容區.innerHTML = `<h3>地圖 / ${應用程式狀態.額外.地圖選中分類}</h3><p class="占位說明">內容尚未接入，骨架先呈現分頁結構。</p>`;

  const 補充區 = document.createElement("div");
  補充區.className = "資料夾式版面-補充區";
  補充區.innerHTML = `<h4>補充資訊</h4><p>動態戰術資訊，不屬於圖鑑，資料會隨局內狀態刷新。</p>`;

  wrap.append(書籤欄, 內容區, 補充區);
  return wrap;
}

function 互動分頁內容(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "資料夾式版面";

  const 書籤欄 = document.createElement("div");
  書籤欄.className = "資料夾式版面-書籤欄";
  const 選中設施 = 應用程式狀態.額外.互動選中設施 ?? 互動設施清單[0];

  for (const 設施 of 互動設施清單) {
    const btn = document.createElement("button");
    btn.textContent = 設施;
    const 啟用中 = 應用程式狀態.額外.靠近的互動設施 === 設施;
    btn.classList.toggle("作用中", 選中設施 === 設施);
    btn.classList.toggle("鎖定", !啟用中);
    btn.onclick = () => 應用程式狀態.設定互動選中設施(設施);
    書籤欄.appendChild(btn);
  }

  const 啟用中 = 應用程式狀態.額外.靠近的互動設施 === 選中設施;
  const 內容區 = document.createElement("div");
  內容區.className = "資料夾式版面-內容區";
  // 使用實際的互動面板(靠近才啟用,未靠近面板內部會顯示鎖定提示)
  內容區.appendChild(建立互動面板(選中設施));

  const 補充區 = document.createElement("div");
  補充區.className = "資料夾式版面-補充區";
  補充區.innerHTML = `<h4>互動子分頁鎖定規則（R5）</h4>
    <p>每個子分頁各自依「玩家是否正靠近對應設施」獨立判定,互不連動。</p>
    <p>目前靠近:<b>${應用程式狀態.額外.靠近的互動設施 ?? "（無）"}</b></p>
    <p>選中設施:<b>${選中設施}</b> ${啟用中 ? "✅ 已啟用" : "🔒 未靠近,鎖定中"}</p>
    <p class="占位說明">提示:回到操作頁面用 WASD 移動靠近對應設施,即可啟用該分頁的操作。</p>`;

  wrap.append(書籤欄, 內容區, 補充區);
  return wrap;
}

export function 渲染管理介面(容器: HTMLElement) {
  容器.innerHTML = "";
  const state = 應用程式狀態.畫面;
  if (state.層 !== "管理介面") return;
  const 額外 = 應用程式狀態.額外;

  const root = document.createElement("div");
  root.className = "管理介面-root";

  const 頂部 = document.createElement("div");
  頂部.className = "操作頁面-頂部";
  頂部.innerHTML = `
    <span>管理介面 ${state.訓練道場 ? "（訓練道場）" : ""}</span>
    <span class="世界時鐘 ${額外.縮圈警戒 ? "警戒" : ""}">世界時鐘：${額外.世界時鐘秒數}s（R3：不因開啟管理介面而暫停）${
    額外.縮圈警戒 ? " ⚠" : ""
  }</span>
  `;
  root.appendChild(頂部);

  const 分頁列 = document.createElement("div");
  分頁列.className = "管理介面-分頁列";
  for (const 分頁 of 分頁清單) {
    const btn = document.createElement("button");
    btn.textContent = 分頁;
    btn.classList.toggle("作用中", state.分頁 === 分頁);
    btn.onclick = () => 應用程式狀態.切換管理介面分頁(分頁);
    分頁列.appendChild(btn);
  }
  root.appendChild(分頁列);

  const 內容 = document.createElement("div");
  內容.className = "管理介面-內容";

  switch (state.分頁) {
    case "小隊":
      內容.appendChild(小隊分頁內容());
      break;
    case "背包":
      內容.appendChild(背包分頁內容());
      break;
    case "互動":
      內容.appendChild(互動分頁內容());
      break;
    case "圖鑑":
      內容.appendChild(建立圖鑑瀏覽器("IC"));
      break;
    case "地圖":
      內容.appendChild(地圖分頁內容());
      break;
  }

  root.appendChild(內容);

  const 底部按鈕列 = document.createElement("div");
  底部按鈕列.className = "按鈕列";

  const 返回 = document.createElement("button");
  返回.className = "一級按鈕";
  返回.textContent = "返回戰場";
  返回.title = "R7：只能回操作頁面，不能直接回主畫面";
  返回.onclick = () => 應用程式狀態.返回戰場();
  底部按鈕列.appendChild(返回);

  if (!state.訓練道場) {
    const 終局 = document.createElement("button");
    終局.className = "危險按鈕";
    終局.textContent = "觸發終局事件（R11：可打斷管理介面直接進結算頁）";
    終局.onclick = () => 應用程式狀態.觸發終局事件();
    底部按鈕列.appendChild(終局);
  }

  root.appendChild(底部按鈕列);
  容器.appendChild(root);
}
