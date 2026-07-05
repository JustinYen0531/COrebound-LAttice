/**
 * @file 主畫面.ts
 * @description 5 個第一層主按鈕 + 右側展開子按鈕（統一版文件 1.1、2.1、3 節）。
 */
import { 應用程式狀態 } from "../應用程式狀態";
import { 建立圖鑑瀏覽器 } from "../元件/圖鑑瀏覽器";
import type { 主畫面分頁 } from "../共用型別";
import { 選文 } from "../語系";

const 主按鈕清單: 主畫面分頁[] = ["開始遊玩", "圖鑑", "遊玩記錄", "新手入門", "設定"];
type 世界鍵 = "geometry" | "organic" | "fractal" | "mechanical";

type 世界封面資料 = {
  id: 世界鍵;
  中文: string;
  英文: string;
  影片: string;
  描述: { 中文: string; 英文: string };
};

const 世界封面清單: 世界封面資料[] = [
  {
    id: "geometry",
    中文: "幾何世界",
    英文: "Geometry World",
    影片: "/assets/video/幾何世界.mp4",
    描述: {
      中文: "稜鏡、聖幾何與秩序圓環在舊紙上緩緩呼吸。",
      英文: "Prisms, sacred geometry, and ordered rings breathing softly on aged paper.",
    },
  },
  {
    id: "organic",
    中文: "有機世界",
    英文: "Organic World",
    影片: "/assets/video/有機世界.mp4",
    描述: {
      中文: "根系、孢子與葉脈像活頁標本般微微起伏。",
      英文: "Roots, spores, and veins rising and falling like a living specimen page.",
    },
  },
  {
    id: "fractal",
    中文: "分形世界",
    英文: "Fractal World",
    影片: "/assets/video/分形世界.mp4",
    描述: {
      中文: "遞迴冰枝與不可能弧橋在紙頁深處反覆展開。",
      英文: "Recursive ice branches and impossible arches unfolding deep within the page.",
    },
  },
  {
    id: "mechanical",
    中文: "機械世界",
    英文: "Mechanical World",
    影片: "/assets/video/機械世界.mp4",
    描述: {
      中文: "古老機構與靜默環陣像祭壇一般緩慢運轉。",
      英文: "Ancient mechanisms and silent ring arrays turning like a ritual altar.",
    },
  },
];

const 主畫面翻轉秒數 = 7;
const 主畫面翻轉動畫毫秒 = 1800;

const 封面輪播狀態: {
  目前世界: 世界鍵;
  下輪隊列: 世界鍵[];
  計時器: number | null;
  翻轉計時器: number | null;
} = {
  目前世界: 世界封面清單[0].id,
  下輪隊列: [],
  計時器: null,
  翻轉計時器: null,
};

function 雙語(中文: string, 英文: string): string {
  return 選文(應用程式狀態.額外.語言, 中文, 英文);
}

function 取得世界顯示名(世界: 世界封面資料): string {
  return 雙語(世界.中文, 世界.英文);
}

function 清除封面輪播計時器() {
  if (封面輪播狀態.計時器 !== null) {
    window.clearTimeout(封面輪播狀態.計時器);
    封面輪播狀態.計時器 = null;
  }
  if (封面輪播狀態.翻轉計時器 !== null) {
    window.clearTimeout(封面輪播狀態.翻轉計時器);
    封面輪播狀態.翻轉計時器 = null;
  }
}

function 洗牌<T>(陣列: T[]): T[] {
  const 結果 = [...陣列];
  for (let i = 結果.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [結果[i], 結果[j]] = [結果[j], 結果[i]];
  }
  return 結果;
}

function 依id取世界資料(id: 世界鍵): 世界封面資料 {
  return 世界封面清單.find((世界) => 世界.id === id) ?? 世界封面清單[0];
}

function 取下一個世界id(): 世界鍵 {
  if (封面輪播狀態.下輪隊列.length === 0) {
    const 其他世界 = 世界封面清單
      .map((世界) => 世界.id)
      .filter((id) => id !== 封面輪播狀態.目前世界);
    封面輪播狀態.下輪隊列 = 洗牌(其他世界);
  }
  return 封面輪播狀態.下輪隊列.shift() ?? 世界封面清單[0].id;
}

function 指定影片(video: HTMLVideoElement, src: string) {
  if (video.dataset.src === src) return;
  video.dataset.src = src;
  video.src = src;
  video.load();
}

function 啟動封面輪播(
  轉台: HTMLElement,
  正面影片: HTMLVideoElement,
  背面影片: HTMLVideoElement,
  正面標籤: HTMLElement,
  背面標籤: HTMLElement,
  正面描述: HTMLElement,
  背面描述: HTMLElement,
) {
  清除封面輪播計時器();

  const 目前世界 = 依id取世界資料(封面輪播狀態.目前世界);
  const 下一世界 = 依id取世界資料(取下一個世界id());
  指定影片(正面影片, 目前世界.影片);
  指定影片(背面影片, 下一世界.影片);
  正面標籤.textContent = 取得世界顯示名(目前世界);
  背面標籤.textContent = 取得世界顯示名(下一世界);
  正面描述.textContent = 雙語(目前世界.描述.中文, 目前世界.描述.英文);
  背面描述.textContent = 雙語(下一世界.描述.中文, 下一世界.描述.英文);

  const 安排下一次翻轉 = () => {
    清除封面輪播計時器();
    封面輪播狀態.計時器 = window.setTimeout(() => {
      轉台.classList.add("翻轉中");

      封面輪播狀態.翻轉計時器 = window.setTimeout(() => {
        封面輪播狀態.目前世界 = 下一世界.id;
        const 新預覽世界 = 依id取世界資料(取下一個世界id());

        指定影片(正面影片, 下一世界.影片);
        指定影片(背面影片, 新預覽世界.影片);
        正面標籤.textContent = 取得世界顯示名(下一世界);
        背面標籤.textContent = 取得世界顯示名(新預覽世界);
        正面描述.textContent = 雙語(下一世界.描述.中文, 下一世界.描述.英文);
        背面描述.textContent = 雙語(新預覽世界.描述.中文, 新預覽世界.描述.英文);
        轉台.classList.remove("翻轉中");
        封面輪播狀態.翻轉計時器 = null;
        啟動封面輪播(轉台, 正面影片, 背面影片, 正面標籤, 背面標籤, 正面描述, 背面描述);
      }, 主畫面翻轉動畫毫秒);
    }, 主畫面翻轉秒數 * 1000);
  };

  安排下一次翻轉();
}

function 建立主畫面封面區(state: { 子頁: 主畫面分頁 }): HTMLElement {
  const 區塊 = document.createElement("section");
  區塊.className = "主畫面-封面區";

  const 世界展示 = document.createElement("div");
  世界展示.className = "主畫面-世界展示";

  const 世界標題 = document.createElement("div");
  世界標題.className = "主畫面-標題";
  世界標題.innerHTML = `<h1>COrebound LAttence</h1><p>${雙語("重製版主循環：從四世界素材與既有系統直接重組出的可玩版本。", "Remake main loop: a playable build assembled directly from the four-world assets and existing systems.")}</p>`;
  世界展示.appendChild(世界標題);

  const 轉台場景 = document.createElement("div");
  轉台場景.className = "主畫面-世界舞台場景";

  const 轉台 = document.createElement("div");
  轉台.className = "主畫面-世界轉台";

  const 正面 = document.createElement("article");
  正面.className = "主畫面-世界面 主畫面-世界面-正";
  const 正面影片 = document.createElement("video");
  正面影片.className = "主畫面-世界影片";
  正面影片.autoplay = true;
  正面影片.loop = true;
  正面影片.muted = true;
  正面影片.playsInline = true;
  正面影片.setAttribute("aria-hidden", "true");
  const 正面資訊 = document.createElement("div");
  正面資訊.className = "主畫面-世界資訊";
  const 正面標籤 = document.createElement("strong");
  正面標籤.className = "主畫面-世界標籤";
  const 正面描述 = document.createElement("p");
  正面描述.className = "主畫面-世界描述";
  正面資訊.append(正面標籤, 正面描述);
  正面.append(正面影片, 正面資訊);

  const 背面 = document.createElement("article");
  背面.className = "主畫面-世界面 主畫面-世界面-背";
  const 背面影片 = document.createElement("video");
  背面影片.className = "主畫面-世界影片";
  背面影片.autoplay = true;
  背面影片.loop = true;
  背面影片.muted = true;
  背面影片.playsInline = true;
  背面影片.setAttribute("aria-hidden", "true");
  const 背面資訊 = document.createElement("div");
  背面資訊.className = "主畫面-世界資訊";
  const 背面標籤 = document.createElement("strong");
  背面標籤.className = "主畫面-世界標籤";
  const 背面描述 = document.createElement("p");
  背面描述.className = "主畫面-世界描述";
  背面資訊.append(背面標籤, 背面描述);
  背面.append(背面影片, 背面資訊);

  轉台.append(正面, 背面);
  轉台場景.appendChild(轉台);
  世界展示.appendChild(轉台場景);

  const 註記 = document.createElement("p");
  註記.className = "主畫面-世界註記 占位說明";
  註記.textContent = 雙語(
    "四個世界會持續輪替；你現在看到的是重製版分支的主畫面，不是舊 prototype 展示稿。",
    "The four worlds keep rotating; what you are seeing now is the remake branch main screen, not the old prototype showcase.",
  );
  世界展示.appendChild(註記);

  const 導航木牌 = document.createElement("aside");
  導航木牌.className = "主畫面-木牌導航";

  const 木牌抬頭 = document.createElement("div");
  木牌抬頭.className = "主畫面-木牌抬頭";
  木牌抬頭.innerHTML = `<span>${雙語("重製版主選單", "Remake Board")}</span>`;
  導航木牌.appendChild(木牌抬頭);

  const 木牌按鈕列 = document.createElement("div");
  木牌按鈕列.className = "主畫面-木牌按鈕列";

  const 回上頁 = document.createElement("button");
  回上頁.className = "主畫面-木牌按鈕 主畫面-木牌按鈕-返回";
  回上頁.textContent = `← ${雙語("返回主選單", "Back to Board")}`;
  回上頁.disabled = state.子頁 === null;
  回上頁.onclick = () => 應用程式狀態.切換主畫面子頁(state.子頁 ?? null);
  木牌按鈕列.appendChild(回上頁);

  for (const 名稱 of 主按鈕清單) {
    const btn = document.createElement("button");
    btn.className = "主畫面-木牌按鈕";
    btn.textContent = 名稱 ? 分頁標籤[名稱] ?? 名稱 : "";
    btn.classList.toggle("作用中", state.子頁 === 名稱);
    btn.onclick = () => 應用程式狀態.切換主畫面子頁(名稱);
    木牌按鈕列.appendChild(btn);
  }

  const 離開 = document.createElement("button");
  離開.className = "主畫面-木牌按鈕 主畫面-木牌按鈕-次要";
  離開.textContent = 雙語("離開遊戲", "Quit Game");
  木牌按鈕列.appendChild(離開);

  導航木牌.appendChild(木牌按鈕列);
  區塊.append(世界展示, 導航木牌);

  啟動封面輪播(轉台, 正面影片, 背面影片, 正面標籤, 背面標籤, 正面描述, 背面描述);
  return 區塊;
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
  el.innerHTML = `<h3>${雙語("開始遊玩", "Play")}</h3><p class="占位說明">${雙語("從這裡直接進入重製版主流程：選隊長、進場、戰鬥、結算。", "Enter the remake main flow from here: choose a captain, enter battle, fight, and settle the run.")}</p>`;

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
  multiplayer.textContent = 雙語("多人模式（未接線）", "Multiplayer (Not Wired Yet)");
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
  const 語言 = 應用程式狀態.額外.語言;
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

  const 語言區 = document.createElement("div");
  語言區.className = "按鈕列";
  語言區.style.marginTop = "16px";

  const 中文按鈕 = document.createElement("button");
  中文按鈕.className = 語言 === "zh" ? "一級按鈕" : "二級按鈕";
  中文按鈕.textContent = "中文";
  中文按鈕.onclick = () => 應用程式狀態.設定語言("zh");

  const 英文按鈕 = document.createElement("button");
  英文按鈕.className = 語言 === "en" ? "一級按鈕" : "二級按鈕";
  英文按鈕.textContent = "English";
  英文按鈕.onclick = () => 應用程式狀態.設定語言("en");

  語言區.append(中文按鈕, 英文按鈕);
  el.appendChild(語言區);
  return el;
}

export function 渲染主畫面(容器: HTMLElement) {
  清除封面輪播計時器();
  容器.innerHTML = "";
  const state = 應用程式狀態.畫面;
  if (state.層 !== "主畫面") return;

  const root = document.createElement("div");
  root.className = "主畫面-root";
  root.appendChild(建立主畫面封面區(state));

  const 進度摘要 = document.createElement("div");
  進度摘要.className = "主畫面-進度摘要";
  進度摘要.innerHTML = `
    <h3>${雙語("目前重製版可走主循環", "Current Remake Play Route")}</h3>
    <ol>
      <li>${雙語("主畫面進入開始遊玩，選擇隊長後進場。", "Start from the main board, choose a captain, and enter the run.")}</li>
      <li>${雙語("在戰場中移動、碰撞、召敵、測試技能與正式戰鬥流程。", "Move through the battlefield, collide, summon enemies, test skills, and run the real combat flow.")}</li>
      <li>${雙語("可經由 HUD 與管理介面切換編隊、背包、互動、圖鑑與地圖。", "Use the HUD and management panel to switch squad, bag, interact, codex, and map views.")}</li>
      <li>${雙語("完成對局後進入結算，再返回主畫面或再開一場。", "Finish the run, reach settlement, then return to the board or start another run.")}</li>
    </ol>
    <p class="占位說明">${雙語("這裡不再顯示 first pass 展示語氣，首頁現在直接服務重製版主流程。", "The old first-pass showcase language is gone; the front page now serves the remake flow directly.")}</p>
  `;
  root.appendChild(進度摘要);

  const 版面 = document.createElement("div");
  版面.className = "主畫面-版面";
  版面.classList.toggle("圖鑑模式", state.子頁 === "圖鑑");

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
