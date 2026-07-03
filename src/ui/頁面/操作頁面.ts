/**
 * @file 操作頁面.ts
 * @description 戰鬥 HUD（IC 預設常駐層）。示範：左右滑互斥 R1、頭像展圈 → 進管理介面、
 * 驚嘆號快跳互動子頁 R6、世界時鐘持續流動、終局事件最高優先權 R11。
 */
import { 應用程式狀態 } from "../應用程式狀態";
import type { 互動設施 } from "../共用型別";

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
    <h3>目前你正在「正式遊玩」骨架頁</h3>
    <p class="占位說明">先看底部核心 HUD。點中央隊長頭像可依序展開 3 層圓盤，展滿後再點一次可進管理介面。</p>
    <p class="占位說明">左按鈕是耗能技能列，右按鈕是物品欄與隊員列。驚嘆號提示會把你直接送進對應的互動子頁。</p>
  `;
  root.appendChild(流程提示);

  // 小地圖 placeholder
  const 小地圖 = document.createElement("div");
  小地圖.className = "小地圖占位";
  小地圖.textContent = "小地圖";
  root.appendChild(小地圖);

  // 驚嘆號互動提示
  if (額外.靠近的互動設施) {
    const 驚嘆號 = document.createElement("button");
    驚嘆號.className = "驚嘆號提示";
    驚嘆號.textContent = `! 靠近「${額外.靠近的互動設施}」`;
    驚嘆號.onclick = () => 應用程式狀態.點擊驚嘆號提示();
    root.appendChild(驚嘆號);
  }

  // 中央 HUD：左滑技能列 / 生命能量+頭像 / 右滑物品欄
  const hud = document.createElement("div");
  hud.className = "底部核心HUD";

  const 左按鈕 = document.createElement("button");
  左按鈕.className = "滑動切換按鈕";
  左按鈕.textContent = "◀ 耗能中技能列";
  左按鈕.classList.toggle("作用中", 額外.滑動面板 === "左");
  左按鈕.onclick = () => 應用程式狀態.設定滑動面板("左");

  const 右按鈕 = document.createElement("button");
  右按鈕.className = "滑動切換按鈕";
  右按鈕.textContent = "物品欄＋隊員列 ▶";
  右按鈕.classList.toggle("作用中", 額外.滑動面板 === "右");
  右按鈕.onclick = () => 應用程式狀態.設定滑動面板("右");

  const 核心區 = document.createElement("div");
  核心區.className = "底部核心HUD-核心區";

  const 血條 = document.createElement("div");
  血條.className = "血條";
  血條.innerHTML = `<div class="血條-填充" style="width:78%"></div>`;

  const 頭像 = document.createElement("button");
  頭像.className = "隊長頭像";
  頭像.textContent = `圈 ${額外.圓盤展開階段}/3`;
  頭像.title = "點擊模擬「滑鼠停留展開」：內圈→中圈→外圈，展滿後再點一次進管理介面";
  頭像.onclick = () => {
    if (額外.圓盤展開階段 < 3) 應用程式狀態.展開下一圈();
    else 應用程式狀態.進入管理介面("小隊");
  };

  const 能量條 = document.createElement("div");
  能量條.className = "能量條";
  能量條.innerHTML = `<div class="能量條-填充" style="width:55%"></div>`;

  核心區.append(血條, 頭像, 能量條);

  hud.append(左按鈕, 核心區, 右按鈕);
  root.appendChild(hud);

  if (額外.圓盤展開階段 === 3) {
    const 提示 = document.createElement("div");
    提示.className = "占位說明 置中";
    提示.textContent = "圓盤已全展開，再點一次頭像即可進入管理介面（點擊圓盤任一處皆可）";
    root.appendChild(提示);
  }

  // 左右滑出面板（互斥，R1）
  if (額外.滑動面板 === "左") {
    const 面板 = document.createElement("div");
    面板.className = "滑出面板 滑出面板-左";
    面板.innerHTML = `
      <h4>耗能中技能列</h4>
      <p class="占位說明">武器群組技能：查看冷卻／啟用中／點擊關閉（副技能層級，小圖示轉圈表示冷卻）</p>
      <div class="占位卡片格">${["護盾", "多發", "直線", "地雷"].map((n) => `<div class="占位卡片">${n}</div>`).join("")}</div>
    `;
    root.appendChild(面板);
  } else if (額外.滑動面板 === "右") {
    const 面板 = document.createElement("div");
    面板.className = "滑出面板 滑出面板-右";
    面板.innerHTML = `
      <h4>物品欄 ＋ 隊員狀態列</h4>
      <p class="占位說明">左邊拿取道具、右邊指定對象（拖曳型操作，骨架先以清單呈現）</p>
      <div class="占位卡片格">${["小生命藥水", "大生命藥水", "小能量藥水", "混合藥水"].map((n) => `<div class="占位卡片">${n}</div>`).join("")}</div>
    `;
    root.appendChild(面板);
  }

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
