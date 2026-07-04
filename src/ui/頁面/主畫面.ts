/**
 * @file 主畫面.ts
 * @description 5 個第一層主按鈕 + 右側展開子按鈕（統一版文件 1.1、2.1、3 節）。
 */
import { 應用程式狀態 } from "../應用程式狀態";
import { 建立圖鑑瀏覽器 } from "../元件/圖鑑瀏覽器";
import type { 主畫面分頁 } from "../共用型別";

const 主按鈕清單: 主畫面分頁[] = ["開始遊玩", "圖鑑", "遊玩記錄", "新手入門", "設定"];

function 雙語(中文: string, 英文: string): string {
  return `${中文} / ${英文}`;
}

/** 主按鈕內部 id（中文）→ 中英雙語顯示標籤。id 仍作為狀態鍵。 */
const 分頁標籤: Record<string, string> = {
  開始遊玩: 雙語("開始遊玩", "Play"),
  圖鑑: 雙語("圖鑑", "Codex"),
  遊玩記錄: 雙語("遊玩記錄", "Records"),
  新手入門: 雙語("新手入門", "Getting Started"),
  設定: 雙語("設定", "Settings"),
};

function 開始遊玩子頁(): HTMLElement {
  const el = document.createElement("div");
  el.className = "子頁內容 子頁內容-narrow";
  el.innerHTML = `<h3>${雙語("開始遊玩", "Play")}</h3><p class="占位說明">${雙語("從這裡進入主流程，或先保留多人模式入口。", "Enter the main flow here, or leave a placeholder for the multiplayer entry.")}</p>`;

  const list = document.createElement("div");
  list.className = "按鈕列";

  const newGame = document.createElement("button");
  newGame.className = "一級按鈕";
  newGame.textContent = 雙語("新遊戲", "New Game");
  newGame.onclick = () => 應用程式狀態.進入遊戲準備流程("New Game");

  const continueGame = document.createElement("button");
  continueGame.className = "二級按鈕";
  continueGame.textContent = 雙語("繼續遊戲", "Continue Game");
  continueGame.onclick = () => 應用程式狀態.進入遊戲準備流程("Continue Game");

  const multiplayer = document.createElement("button");
  multiplayer.className = "二級按鈕";
  multiplayer.textContent = 雙語("多人模式（即將推出）", "Multiplayer (Coming Soon)");
  multiplayer.disabled = true;
  multiplayer.title = 雙語("這個入口先保留，之後再接多人流程。", "Entry reserved for now; the multiplayer flow will be wired up later.");

  list.append(newGame, continueGame, multiplayer);
  el.appendChild(list);
  return el;
}

function 遊玩記錄子頁(): HTMLElement {
  const el = document.createElement("div");
  el.className = "子頁內容";
  el.innerHTML = `
    <h3>${雙語("遊玩記錄", "Records")}</h3>
    <p class="占位說明">${雙語("這裡只存在於主畫面（帳號層級資料）；管理介面沒有對應頁面（規則 R9）。", "Lives only on the main screen (account-level data); there is no matching page in the Management panel (rule R9).")}</p>
    <div class="占位卡片格">
      ${[
        雙語("存檔紀錄", "Save Records"),
        雙語("通關紀錄", "Clears"),
        雙語("使用角色", "Characters Used"),
        雙語("通關時間", "Clear Time"),
        雙語("歷史編隊", "Past Loadouts"),
        雙語("成就", "Achievements"),
      ]
        .map((n) => `<div class="占位卡片">${n}</div>`)
        .join("")}
    </div>
  `;
  return el;
}

function 新手入門子頁(): HTMLElement {
  const el = document.createElement("div");
  el.className = "子頁內容 子頁內容-narrow";
  el.innerHTML = `<h3>${雙語("新手入門", "Getting Started")}</h3>`;
  const list = document.createElement("div");
  list.className = "按鈕列";

  const guide = document.createElement("button");
  guide.className = "二級按鈕";
  guide.textContent = 雙語("新手指南", "New Player Guide");

  const dojo = document.createElement("button");
  dojo.className = "一級按鈕";
  dojo.textContent = 雙語("訓練道場", "Training Dojo");
  dojo.title = 雙語("借用操作頁面 + 管理介面的骨架（R12）；離開後直接回主畫面，不進結算頁。", "Borrows the operation-page + management-panel skeleton (R12); quitting returns straight to the main screen, with no settlement page.");
  dojo.onclick = () => 應用程式狀態.進入訓練道場();

  list.append(guide, dojo);
  el.appendChild(list);
  return el;
}

function 設定子頁(): HTMLElement {
  const el = document.createElement("div");
  el.className = "子頁內容";
  el.innerHTML = `
    <h3>${雙語("設定", "Settings")}</h3>
    <div class="占位卡片格">
      ${[
        雙語("音樂", "Music"),
        雙語("音效", "Sound"),
        雙語("顯示", "Display"),
        雙語("操作", "Controls"),
      ].map((n) => `<div class="占位卡片">${n}</div>`).join("")}
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
  標題.innerHTML = `<h1>COrebound LAttence</h1><p>${雙語("主流程骨架原型：以核心為中心展開的小隊圖騰", "Main-flow skeleton prototype: a squad totem unfolding around the core")}</p>`;
  root.appendChild(標題);

  const 進度摘要 = document.createElement("div");
  進度摘要.className = "主畫面-進度摘要";
  進度摘要.innerHTML = `
    <h3>${雙語("這一輪先接好的主線流程", "The Main Line Wired Up In This First Pass")}</h3>
    <ol>
      <li>${雙語("主畫面：展開第一層主按鈕子頁", "Main screen: expand the primary-button subpages")}</li>
      <li>${雙語("開始遊玩：進入開局準備、選擇隊長", "Play: enter pre-match setup, choose a captain")}</li>
      <li>${雙語("對局中：查看 HUD、展開圓盤、進入管理介面", "In play: check the HUD, expand the disc, enter the Management panel")}</li>
      <li>${雙語("管理介面：切換小隊 / 背包 / 互動 / 圖鑑 / 地圖", "Management panel: switch between Squad / Bag / Interact / Codex / Map")}</li>
      <li>${雙語("結算：回到大廳或再來一場", "Settlement: return to the lobby or run it again")}</li>
    </ol>
    <p class="占位說明">${雙語("這一輪先把主流程接起來；很多內容仍然是骨架占位，但已經不是各自漂浮的孤島。", "This pass wires the main flow together first; a lot of content is still skeleton placeholder, but it's no longer a set of disconnected islands.")}</p>
    <p class="占位說明" style="margin-top: 12px; margin-bottom: 0;">
      <a href="/totem-preview.html" target="_blank" style="font-weight: bold; text-decoration: underline; cursor: pointer;">
        🔗 ${雙語("打開「圖騰完整預覽」", `Open the "Totem Full-View Preview"`)} (totem-preview.html)
      </a>
      <span style="margin: 0 8px;">|</span>
      <a href="/totem-weaving.html" target="_blank" style="font-weight: bold; text-decoration: underline; cursor: pointer;">
        🧬 ${雙語("打開「活體圖騰層疊編織模擬器」", `Open the "Living Totem Layered Weaving Simulator"`)} (totem-weaving.html)
      </a>
    </p>
  `;
  root.appendChild(進度摘要);

  const 版面 = document.createElement("div");
  版面.className = "主畫面-版面";
  版面.classList.toggle("圖鑑模式", state.子頁 === "圖鑑");

  const 主按鈕欄 = document.createElement("div");
  主按鈕欄.className = "主畫面-主按鈕欄";

  // 最左邊的「回上頁」按鈕：收起當前展開的子頁，回到主畫面初始狀態。
  const 回上頁 = document.createElement("button");
  回上頁.className = "主畫面-主按鈕 主畫面-回上頁按鈕";
  回上頁.textContent = 雙語("返回", "Back");
  回上頁.title = 雙語("收起目前展開的子頁", "Collapse the current subpage");
  回上頁.disabled = state.子頁 === null;
  回上頁.onclick = () => 應用程式狀態.切換主畫面子頁(state.子頁 ?? null);
  主按鈕欄.appendChild(回上頁);

  for (const 名稱 of 主按鈕清單) {
    const btn = document.createElement("button");
    btn.className = "主畫面-主按鈕";
    btn.textContent = 名稱 ? 分頁標籤[名稱] ?? 名稱 : "";
    btn.classList.toggle("作用中", state.子頁 === 名稱);
    btn.onclick = () => 應用程式狀態.切換主畫面子頁(名稱);
    主按鈕欄.appendChild(btn);
  }
  const 離開 = document.createElement("button");
  離開.className = "主畫面-離開按鈕";
  離開.textContent = 雙語("離開遊戲", "Quit Game");
  離開.title = 雙語("刻意不算進主按鈕列，收在次要角落位置。", "Deliberately not counted as a primary button; tucked into a secondary corner spot.");
  主按鈕欄.appendChild(離開);

  if (state.子頁 !== "圖鑑") 版面.appendChild(主按鈕欄);

  const 子頁容器 = document.createElement("div");
  子頁容器.className = "主畫面-子頁容器";
  子頁容器.classList.toggle("展開", state.子頁 !== null);

  if (state.子頁 === "開始遊玩") 子頁容器.appendChild(開始遊玩子頁());
  else if (state.子頁 === "圖鑑") {
    const box = document.createElement("div");
    box.className = "子頁內容 子頁內容-圖鑑";
    const 返回列 = document.createElement("div");
    返回列.className = "主畫面-圖鑑返回列";
    const 返回按鈕 = document.createElement("button");
    返回按鈕.className = "三級按鈕 主畫面-圖鑑返回按鈕";
    返回按鈕.textContent = `← ${雙語("返回", "Back")}`;
    返回按鈕.onclick = () => 應用程式狀態.切換主畫面子頁("圖鑑");
    返回列.appendChild(返回按鈕);
    box.appendChild(返回列);
    box.appendChild(建立圖鑑瀏覽器("OOC"));
    子頁容器.appendChild(box);
  } else if (state.子頁 === "遊玩記錄") 子頁容器.appendChild(遊玩記錄子頁());
  else if (state.子頁 === "新手入門") 子頁容器.appendChild(新手入門子頁());
  else if (state.子頁 === "設定") 子頁容器.appendChild(設定子頁());

  版面.appendChild(子頁容器);
  root.appendChild(版面);
  容器.appendChild(root);
}
