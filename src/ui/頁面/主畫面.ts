/**
 * @file 主畫面.ts
 * @description 5 個第一層主按鈕 + 右側展開子按鈕（統一版文件 1.1、2.1、3 節）。
 */
import { 應用程式狀態 } from "../應用程式狀態";
import { 建立圖鑑瀏覽器 } from "../元件/圖鑑瀏覽器";
import type { 主畫面分頁 } from "../共用型別";
import { 選文 } from "../語系";
import { 取得音樂狀態, 切換音樂靜音, 訂閱音樂狀態, 設定音樂音量 } from "../../audio/音樂管理";
import { 取得音效狀態, 切換音效靜音, 訂閱音效狀態, 設定音效音量, 播放音效, 音效百分比轉音量, 音效音量轉百分比 } from "../../audio/音效管理";
import { marked } from "marked";

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

const 世界Buff立繪清單 = [
  { className: "幾何", src: "/assets/images/enemies/bosses/幾何BOSS.png", alt: "Geometry boss portrait" },
  { className: "有機", src: "/assets/images/enemies/bosses/有機BOSS.png", alt: "Organic boss portrait" },
  { className: "分形", src: "/assets/images/enemies/bosses/分形BOSS.png", alt: "Fractal boss portrait" },
  { className: "機械", src: "/assets/images/enemies/bosses/機械BOSS.png", alt: "Mechanical boss portrait" },
];

const 主畫面隊長立繪清單 = [
  { className: "左外", src: "/assets/transparent-portraits/captains/clean/conductor_form4_clean.png", alt: "Conductor form 4 portrait" },
  { className: "左內", src: "/assets/transparent-portraits/captains/clean/operator_form4_clean.png", alt: "Operator form 4 portrait" },
  { className: "右內", src: "/assets/transparent-portraits/captains/clean/launcher_form4_clean.png", alt: "Launcher form 4 portrait" },
  { className: "右外", src: "/assets/transparent-portraits/captains/clean/architect_form4_clean.png", alt: "Architect form 4 portrait" },
];

// 20 名角色的去背立繪（一律使用最強的三星型態 _s3）。做成天空繁星：
// 散佈在上半部、各自以不同節奏做「半透明↔不透明」的呼吸閃爍，彼此互補不同步。
const 主畫面繁星檔名清單 = [
  "m01_prism", "m02_matrix", "m03_vector", "m04_node", "m05_lightcone",
  "m06_thorn", "m07_spore", "m08_vine", "m09_fungus", "m10_biolume",
  "m11_snowglass", "m12_bifurcation", "m13_lightning", "m14_abyss", "m15_aurora",
  "m16_gate", "m17_shrapnel", "m18_needle", "m19_springtrap", "m20_arc",
];

interface 繁星佈局 {
  src: string;
  left: number;
  top: number;
  size: number;
  期: number;
  延遲: number;
  最小: number;
  最大: number;
}

/** 固定種子的偽隨機（mulberry32）：讓繁星佈局每次渲染都一致，不會亂跳。 */
function 建立種子亂數(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 佈局：左右兩側各 10 顆，沿畫面左右邊緣由上到下散開（避開中央標題/舞台），
 * 每欄再抖動位置避免排成死板直線。每顆再指定不同的閃爍週期與相位，讓明暗此起彼落。
 */
const 主畫面繁星佈局: 繁星佈局[] = (() => {
  const rng = 建立種子亂數(20260706);
  const 每側數量 = Math.ceil(主畫面繁星檔名清單.length / 2);
  return 主畫面繁星檔名清單.map((檔名, i) => {
    const 靠左 = i % 2 === 0;
    const 側內序 = Math.floor(i / 2); // 0..每側數量-1，決定由上到下的位置
    // 左側落在 3~17%、右側落在 83~97%，中央標題區完全留空。
    const left = 靠左
      ? 8 + rng() * 26
      : 66 + rng() * 26;
    const top = 4 + (側內序 / (每側數量 - 1)) * 88 + (rng() - 0.5) * 6; // 由上到下鋪滿 4~92%
    return {
      src: `/assets/transparent-portraits/members/${檔名}_s3.png`,
      left,
      top: Math.max(3, Math.min(95, top)),
      size: Math.round(108 + rng() * 60), // 108~168px，明顯可見
      期: Number((3.4 + rng() * 3.6).toFixed(2)), // 3.4~7.0s，各不相同
      延遲: Number((-(i / 主畫面繁星檔名清單.length) * 4 - rng() * 1.6).toFixed(2)), // 相位互補
      最小: Number((0.32 + rng() * 0.1).toFixed(3)), // 半透明底 0.32~0.42
      最大: Number((0.82 + rng() * 0.16).toFixed(3)), // 亮起峰值 0.82~0.98
    };
  });
})();

const 封面輪播狀態: {
  目前世界: 世界鍵;
  下輪隊列: 世界鍵[];
  計時器: number | null;
  翻轉計時器: number | null;
  已鎖定: boolean;
} = {
  目前世界: 世界封面清單[0].id,
  下輪隊列: [],
  計時器: null,
  翻轉計時器: null,
  已鎖定: false,
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

  if (封面輪播狀態.已鎖定) {
    轉台.classList.remove("翻轉中");
    return;
  }

  const 安排下一次翻轉 = () => {
    清除封面輪播計時器();
    封面輪播狀態.計時器 = window.setTimeout(() => {
      轉台.classList.add("翻轉中");
      播放音效("世界輪播");

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

function 鎖定目前世界(轉台: HTMLElement) {
  if (封面輪播狀態.已鎖定) return;
  封面輪播狀態.已鎖定 = true;
  清除封面輪播計時器();
  轉台.classList.remove("翻轉中");
}

function 建立主畫面封面區(state: { 子頁: 主畫面分頁 }): HTMLElement {
  const 區塊 = document.createElement("section");
  區塊.className = "主畫面-封面區";

  const 世界展示 = document.createElement("div");
  世界展示.className = "主畫面-世界展示";

  const 繁星群 = document.createElement("div");
  繁星群.className = "主畫面-繁星群";
  繁星群.setAttribute("aria-hidden", "true");
  繁星群.innerHTML = 主畫面繁星佈局
    .map(
      (星) => `
        <img
          class="主畫面-繁星"
          src="${星.src}"
          alt=""
          draggable="false"
          style="left:${星.left.toFixed(2)}%;top:${星.top.toFixed(2)}%;--繁星尺寸:${星.size}px;--繁星週期:${星.期}s;--繁星延遲:${星.延遲}s;--繁星最小:${星.最小};--繁星最大:${星.最大};"
        />
      `,
    )
    .join("");
  世界展示.appendChild(繁星群);

  const Buff群 = document.createElement("div");
  Buff群.className = "主畫面-世界Buff群";
  Buff群.setAttribute("aria-hidden", "true");
  Buff群.innerHTML = 世界Buff立繪清單
    .map(
      (立繪) => `
        <img class="主畫面-世界Buff 主畫面-世界Buff--${立繪.className}" src="${立繪.src}" alt="${立繪.alt}" draggable="false" />
      `,
    )
    .join("");
  世界展示.appendChild(Buff群);

  const 隊長群 = document.createElement("div");
  隊長群.className = "主畫面-隊長群";
  隊長群.setAttribute("aria-hidden", "true");
  隊長群.innerHTML = 主畫面隊長立繪清單
    .map(
      (立繪) => `
        <img class="主畫面-隊長立繪 主畫面-隊長立繪--${立繪.className}" src="${立繪.src}" alt="${立繪.alt}" draggable="false" />
      `,
    )
    .join("");
  世界展示.appendChild(隊長群);

  const 世界標題 = document.createElement("div");
  世界標題.className = "主畫面-標題";
  const 標題按鈕 = document.createElement("button");
  標題按鈕.type = "button";
  標題按鈕.className = "主畫面-標題按鈕";
  標題按鈕.setAttribute("aria-label", 雙語("開啟主選單", "Open Main Menu"));
  標題按鈕.innerHTML = `
    <img class="主畫面-Logo圖" src="/assets/images/logo_clean_nobg.png" alt="COrebound LAttence Logo" draggable="false" />
    <span class="主畫面-標題副文">${雙語("開始冒險！", "Let's Start Adventure!")}</span>
  `;

  const 下拉選單 = document.createElement("div");
  下拉選單.className = "主畫面-下拉選單";

  const 下拉按鈕列 = document.createElement("div");
  下拉按鈕列.className = "主畫面-下拉按鈕列";

  const Play子選單 = document.createElement("div");
  Play子選單.className = "主畫面-Play子選單";

  const 新遊戲按鈕 = document.createElement("button");
  新遊戲按鈕.type = "button";
  新遊戲按鈕.className = "主畫面-子選項按鈕";
  新遊戲按鈕.textContent = 雙語("新遊戲", "New Game");
  新遊戲按鈕.onclick = (event) => {
    event.stopPropagation();
    應用程式狀態.進入遊戲準備流程("New Game");
  };

  const 繼續遊戲按鈕 = document.createElement("button");
  繼續遊戲按鈕.type = "button";
  繼續遊戲按鈕.className = "主畫面-子選項按鈕";
  繼續遊戲按鈕.textContent = 雙語("繼續遊戲", "Continue Game");
  繼續遊戲按鈕.onclick = (event) => {
    event.stopPropagation();
    應用程式狀態.進入遊戲準備流程("Continue Game");
  };
  Play子選單.append(新遊戲按鈕, 繼續遊戲按鈕);

  // 新增的 Guide 子選單
  const Guide子選單 = document.createElement("div");
  Guide子選單.className = "主畫面-Play子選單";

  const Tutorial按鈕 = document.createElement("button");
  Tutorial按鈕.type = "button";
  Tutorial按鈕.className = "主畫面-子選項按鈕";
  Tutorial按鈕.textContent = 雙語("教學", "Tutorial");
  Tutorial按鈕.onclick = async (event) => {
    event.stopPropagation();
    try {
      const res = await fetch("/教學.md");
      if (!res.ok) throw new Error("fetch failed");
      const text = await res.text();
      const pages = text.split(/\r?\n---\r?\n/);
      打開教學視窗(pages);
    } catch (e) {
      alert("Tutorial file not found!");
    }
  };

  const Dojo按鈕 = document.createElement("button");
  Dojo按鈕.type = "button";
  Dojo按鈕.className = "主畫面-子選項按鈕";
  Dojo按鈕.textContent = 雙語("訓練道場", "Training Dojo");
  Dojo按鈕.onclick = (event) => {
    event.stopPropagation();
    應用程式狀態.進入訓練道場();
  };
  Guide子選單.append(Tutorial按鈕, Dojo按鈕);

  let Play子選單展開 = false;
  let Guide子選單展開 = false;

  for (const 名稱 of 主按鈕清單) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "主畫面-下拉按鈕";
    btn.textContent = 名稱 ? 分頁標籤[名稱] ?? 名稱 : "";
    btn.classList.toggle("作用中", state.子頁 === 名稱);
    btn.onclick = (event) => {
      event.stopPropagation();
      if (名稱 === "開始遊玩") {
        Play子選單展開 = true;
        Guide子選單展開 = false;
        更新選單狀態();
        return;
      }
      if (名稱 === "新手入門") {
        Play子選單展開 = false;
        Guide子選單展開 = true;
        更新選單狀態();
        return;
      }
      Play子選單展開 = false;
      Guide子選單展開 = false;
      更新選單狀態();
      應用程式狀態.切換主畫面子頁(名稱);
    };
    下拉按鈕列.appendChild(btn);
  }

  下拉選單.append(下拉按鈕列, Play子選單, Guide子選單);
  世界標題.append(標題按鈕, 下拉選單);
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

  const 任意處提示 = document.createElement("button");
  任意處提示.type = "button";
  任意處提示.className = "主畫面-任意處提示";
  任意處提示.innerHTML = `<strong>${雙語("按任意處繼續", "Click Anywhere to Continue")}</strong><span>${雙語("繼續後會停在目前世界，不再翻轉。", "After continuing, the current world stays fixed.")}</span>`;
  轉台場景.appendChild(任意處提示);

  const 投稿標記 = document.createElement("div");
  投稿標記.className = "主畫面-投稿標記";
  投稿標記.innerHTML = `
    <strong>Submission to Ultimate AI-Powered Game Jam #1</strong>
    <span>Topic: Coffee &amp; Cola</span>
  `;
  轉台場景.appendChild(投稿標記);

  世界展示.appendChild(轉台場景);
  區塊.append(世界展示);

  let 選單展開 = false;
  const 更新選單狀態 = () => {
    const 有任何子選單 = Play子選單展開 || Guide子選單展開;
    世界標題.classList.toggle("選單展開", 選單展開);
    下拉選單.classList.toggle("有子選單", 有任何子選單);
    區塊.classList.toggle("主畫面-選單展開", 選單展開);

    // 控制子選單的平滑過渡
    Play子選單.style.opacity = Play子選單展開 ? "1" : "0";
    Play子選單.style.pointerEvents = Play子選單展開 ? "auto" : "none";
    Play子選單.style.transform = Play子選單展開 ? "translateX(0) scale(1)" : "translateX(46px) scale(0.94)";

    Guide子選單.style.opacity = Guide子選單展開 ? "1" : "0";
    Guide子選單.style.pointerEvents = Guide子選單展開 ? "auto" : "none";
    Guide子選單.style.transform = Guide子選單展開 ? "translateX(0) scale(1)" : "translateX(46px) scale(0.94)";
  };

  標題按鈕.onclick = (event) => {
    event.stopPropagation();
    選單展開 = true;
    更新選單狀態();
  };

  下拉選單.addEventListener("click", (event) => event.stopPropagation());

  const 完成進場 = () => {
    if (封面輪播狀態.已鎖定) return;
    鎖定目前世界(轉台);
    區塊.classList.add("主畫面-已進場");
    選單展開 = false;
    更新選單狀態();
  };

  轉台場景.addEventListener("click", (event) => {
    if (封面輪播狀態.已鎖定) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest(".主畫面-標題")) return;
    完成進場();
  });

  const 任意鍵監聽 = (event: KeyboardEvent) => {
    if (event.repeat) return;
    完成進場();
    window.removeEventListener("keydown", 任意鍵監聽);
  };
  if (!封面輪播狀態.已鎖定) {
    window.addEventListener("keydown", 任意鍵監聽, { once: true });
  } else {
    區塊.classList.add("主畫面-已進場");
  }

  啟動封面輪播(轉台, 正面影片, 背面影片, 正面標籤, 背面標籤, 正面描述, 背面描述);
  return 區塊;
}

/** 主按鈕內部 id（中文）→ 中英雙語顯示標籤。id 仍作為狀態鍵。 */
const 分頁標籤: Record<string, string> = {
  開始遊玩: 雙語("開始遊玩", "Play"),
  圖鑑: 雙語("圖鑑", "Codex"),
  遊玩記錄: 雙語("遊玩記錄", "Records"),
  新手入門: 雙語("新手入門", "Beginner Guide"),
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
  el.innerHTML = `<h3>${雙語("新手入門", "Beginner Guide")}</h3>`;
  const list = document.createElement("div");
  list.className = "按鈕列";

  const guide = document.createElement("button");
  guide.className = "一級按鈕";
  guide.textContent = 雙語("教學", "Tutorial");
  guide.onclick = async () => {
    try {
      const res = await fetch("/教學.md");
      if (!res.ok) throw new Error("fetch failed");
      const text = await res.text();
      const pages = text.split(/\n---\s*\n/).filter((p) => p.trim().length > 0);
      打開教學視窗(pages);
    } catch (e) {
      alert("Tutorial file not found!");
    }
  };

  const dojo = document.createElement("button");
  dojo.className = "二級按鈕";
  dojo.textContent = 雙語("訓練道場", "Training Dojo");
  dojo.title = 雙語("借用操作頁面 + 管理介面的骨架（R12）；離開後直接回主畫面，不進結算頁。", "Borrows the operation-page + management-panel skeleton (R12); quitting returns straight to the main screen, with no settlement page.");
  dojo.onclick = () => 應用程式狀態.進入訓練道場();

  list.append(guide, dojo);
  el.appendChild(list);
  return el;
}

function 打開教學視窗(htmlContentList: string[]) {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.backgroundColor = "rgba(38, 35, 30, 0.6)";
  overlay.style.backdropFilter = "blur(2px)";
  overlay.style.zIndex = "9999";
  overlay.style.display = "flex";
  overlay.style.justifyContent = "center";
  overlay.style.alignItems = "center";

  const modal = document.createElement("div");
  modal.style.width = "85%";
  modal.style.maxWidth = "800px";
  modal.style.height = "85%";
  modal.style.backgroundColor = "var(--bg-panel)";
  modal.style.border = "3px solid var(--line)";
  modal.style.borderRadius = "12px";
  modal.style.padding = "30px 40px";
  modal.style.display = "flex";
  modal.style.flexDirection = "column";
  modal.style.justifyContent = "space-between";
  modal.style.position = "relative";
  modal.style.color = "var(--ink)";
  modal.style.fontFamily = "var(--font-serif)";
  modal.style.boxShadow = "0 12px 36px rgba(0, 0, 0, 0.25), inset 0 0 0 1px var(--line-soft)";

  const header = document.createElement("div");
  header.style.display = "flex";
  header.style.justifyContent = "space-between";
  header.style.alignItems = "center";
  header.style.borderBottom = "1px solid var(--line-soft)";
  header.style.paddingBottom = "12px";
  header.style.marginBottom = "20px";

  const title = document.createElement("h2");
  title.style.margin = "0";
  title.style.color = "var(--ink-warm)";
  title.style.fontFamily = "var(--font-serif)";
  title.textContent = 雙語("遊戲教學", "Game Tutorial");

  const closeBtn = document.createElement("button");
  closeBtn.className = "二級按鈕";
  closeBtn.textContent = 雙語("關閉", "Close");
  closeBtn.style.minWidth = "80px";
  closeBtn.onclick = () => document.body.removeChild(overlay);

  header.append(title, closeBtn);

  const content = document.createElement("div");
  content.style.flex = "1";
  content.style.overflowY = "auto";
  content.style.paddingRight = "15px";
  content.style.marginBottom = "20px";

  const footer = document.createElement("div");
  footer.style.display = "flex";
  footer.style.justifyContent = "space-between";
  footer.style.alignItems = "center";
  footer.style.borderTop = "1px solid var(--line-soft)";
  footer.style.paddingTop = "16px";

  const prevBtn = document.createElement("button");
  prevBtn.className = "二級按鈕";
  prevBtn.textContent = 雙語("上一頁", "← Prev");
  prevBtn.style.minWidth = "100px";

  const pageIndicator = document.createElement("span");
  pageIndicator.style.fontWeight = "bold";
  pageIndicator.style.fontSize = "1.1rem";
  pageIndicator.style.color = "var(--ink-dim)";

  const nextBtn = document.createElement("button");
  nextBtn.className = "一級按鈕";
  nextBtn.textContent = 雙語("下一頁", "Next →");
  nextBtn.style.minWidth = "100px";

  footer.append(prevBtn, pageIndicator, nextBtn);
  modal.append(header, content, footer);
  overlay.appendChild(modal);

  let currentPage = 0;

  const 渲染頁面 = () => {
    const rawHtml = marked.parse(htmlContentList[currentPage]);
    if (typeof rawHtml === "string") {
      content.innerHTML = rawHtml;
    } else {
      rawHtml.then((html) => {
        content.innerHTML = html;
      });
    }

    content.querySelectorAll("h1, h2, h3").forEach(h => {
      (h as HTMLElement).style.color = "var(--ink-warm)";
      (h as HTMLElement).style.fontFamily = "var(--font-serif)";
      (h as HTMLElement).style.marginTop = "0px";
    });
    content.querySelectorAll("p").forEach(p => {
      (p as HTMLElement).style.color = "var(--ink)";
      (p as HTMLElement).style.lineHeight = "1.7";
      (p as HTMLElement).style.fontSize = "1.05rem";
    });
    content.querySelectorAll("table").forEach(t => {
      t.style.borderCollapse = "collapse";
      t.style.width = "100%";
      t.style.marginBottom = "20px";
      t.style.marginTop = "10px";
      t.style.background = "var(--bg-panel-2)";
      t.style.fontSize = "0.95rem";
    });
    content.querySelectorAll("th, td").forEach(cell => {
      (cell as HTMLElement).style.border = "1px solid var(--line)";
      (cell as HTMLElement).style.padding = "10px";
      (cell as HTMLElement).style.color = "var(--ink)";
    });

    content.scrollTop = 0;

    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = currentPage === htmlContentList.length - 1;
    nextBtn.className = currentPage === htmlContentList.length - 1 ? "二級按鈕" : "一級按鈕";
    pageIndicator.textContent = `${currentPage + 1} / ${htmlContentList.length}`;
  };

  prevBtn.onclick = () => {
    if (currentPage > 0) {
      currentPage--;
      渲染頁面();
    }
  };

  nextBtn.onclick = () => {
    if (currentPage < htmlContentList.length - 1) {
      currentPage++;
      渲染頁面();
    }
  };

  渲染頁面();
  document.body.appendChild(overlay);
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
  el.appendChild(建立音樂控制卡());
  el.appendChild(建立音效控制卡());
  return el;
}

function 建立音效控制卡(): HTMLElement {
  const box = document.createElement("div");
  box.className = "占位卡片";
  box.style.marginTop = "16px";
  box.style.display = "grid";
  box.style.gap = "12px";
  box.style.padding = "16px";
  box.style.textAlign = "left";

  const title = document.createElement("div");
  title.style.display = "grid";
  title.style.gap = "4px";
  title.innerHTML = `
    <strong>${雙語("音效音量", "Sound Effects Volume")}</strong>
    <span style="font-size:0.76rem;color:#8d93ad;">${雙語("按鈕、HUD、戰鬥與互動設施的介面音效都走這裡。", "Controls UI clicks, HUD, combat, and facility interaction sounds.")}</span>
  `;

  const row = document.createElement("div");
  row.style.display = "grid";
  row.style.gridTemplateColumns = "auto 1fr auto auto";
  row.style.alignItems = "center";
  row.style.gap = "10px";

  const muteBtn = document.createElement("button");
  muteBtn.className = "二級按鈕";
  muteBtn.style.minWidth = "78px";

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0";
  slider.max = "100";
  slider.step = "1";
  slider.style.width = "100%";
  slider.style.accentColor = "#d8b46a";

  const value = document.createElement("span");
  value.style.minWidth = "60px";
  value.style.textAlign = "right";
  value.style.fontSize = "0.78rem";
  value.style.color = "#8d93ad";

  const testBtn = document.createElement("button");
  testBtn.className = "三級按鈕";
  testBtn.textContent = 雙語("試聽", "Test");
  testBtn.onclick = () => 播放音效("藥水成功");

  const render = () => {
    const state = 取得音效狀態();
    slider.value = String(音效音量轉百分比(state.volume));
    muteBtn.textContent = state.muted ? 雙語("取消靜音", "Unmute") : 雙語("靜音", "Mute");
    value.textContent = state.muted ? 雙語("已靜音", "Muted") : `${音效音量轉百分比(state.volume)}%`;
  };

  muteBtn.onclick = () => {
    切換音效靜音();
    render();
  };
  slider.oninput = () => {
    設定音效音量(音效百分比轉音量(Number(slider.value)));
    render();
  };

  const unsubscribe = 訂閱音效狀態(render);
  const observer = new MutationObserver(() => {
    if (!document.body.contains(box)) {
      unsubscribe();
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  row.append(muteBtn, slider, value, testBtn);
  box.append(title, row);
  render();
  return box;
}

function 建立音樂控制卡(): HTMLElement {
  const box = document.createElement("div");
  box.className = "占位卡片";
  box.style.marginTop = "16px";
  box.style.display = "grid";
  box.style.gap = "12px";
  box.style.padding = "16px";
  box.style.textAlign = "left";

  const title = document.createElement("div");
  title.style.display = "grid";
  title.style.gap = "4px";
  title.innerHTML = `
    <strong>${雙語("音樂音量", "Music Volume")}</strong>
    <span style="font-size:0.76rem;color:#8d93ad;">${雙語("主畫面、大廳、戰場與 Boss 音樂都走這裡。", "This controls the lobby, battlefield, and boss music.")}</span>
  `;

  const row = document.createElement("div");
  row.style.display = "grid";
  row.style.gridTemplateColumns = "auto 1fr auto";
  row.style.alignItems = "center";
  row.style.gap = "10px";

  const muteBtn = document.createElement("button");
  muteBtn.className = "二級按鈕";
  muteBtn.style.minWidth = "78px";

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0";
  slider.max = "100";
  slider.step = "1";
  slider.style.width = "100%";
  slider.style.accentColor = "#4d8dff";

  const value = document.createElement("span");
  value.style.minWidth = "92px";
  value.style.textAlign = "right";
  value.style.fontSize = "0.78rem";
  value.style.color = "#8d93ad";

  const track = document.createElement("div");
  track.style.fontSize = "0.74rem";
  track.style.color = "#c8d0ec";

  const render = () => {
    const state = 取得音樂狀態();
    slider.value = String(Math.round(state.volume * 100));
    muteBtn.textContent = state.muted ? 雙語("取消靜音", "Unmute") : 雙語("靜音", "Mute");
    value.textContent = state.muted ? 雙語("已靜音", "Muted") : `${Math.round(state.volume * 100)}%`;
    track.textContent = `${雙語("目前音軌", "Current Track")}：${state.trackLabel}`;
  };

  muteBtn.onclick = () => {
    切換音樂靜音();
    render();
  };
  slider.oninput = () => {
    設定音樂音量(Number(slider.value) / 100);
    render();
  };

  const unsubscribe = 訂閱音樂狀態(render);
  const observer = new MutationObserver(() => {
    if (!document.body.contains(box)) {
      unsubscribe();
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  row.append(muteBtn, slider, value);
  box.append(title, row, track);
  render();
  return box;
}

export function 渲染主畫面(容器: HTMLElement) {
  清除封面輪播計時器();
  容器.innerHTML = "";
  const state = 應用程式狀態.畫面;
  if (state.層 !== "主畫面") return;

  const root = document.createElement("div");
  root.className = "主畫面-root";
  root.classList.toggle("主畫面-root--子頁開啟", state.子頁 !== null);
  if (state.子頁 === null) root.appendChild(建立主畫面封面區(state));

  const 版面 = document.createElement("div");
  版面.className = "主畫面-版面";
  版面.classList.toggle("圖鑑模式", state.子頁 === "圖鑑");

  if (state.子頁 !== null) {
    const 返回主選單 = document.createElement("button");
    返回主選單.type = "button";
    返回主選單.className = "三級按鈕 主畫面-子頁返回按鈕";
    返回主選單.textContent = `← ${雙語("返回主選單", "Back to Main Menu")}`;
    返回主選單.onclick = () => 應用程式狀態.切換主畫面子頁(state.子頁);
    版面.appendChild(返回主選單);
  }

  const 子頁容器 = document.createElement("div");
  子頁容器.className = "主畫面-子頁容器";
  子頁容器.classList.toggle("展開", state.子頁 !== null);

  if (state.子頁 === "開始遊玩") 子頁容器.appendChild(開始遊玩子頁());
  else if (state.子頁 === "圖鑑") {
    const box = document.createElement("div");
    box.className = "子頁內容 子頁內容-圖鑑";
    box.appendChild(建立圖鑑瀏覽器("OOC"));
    子頁容器.appendChild(box);
  } else if (state.子頁 === "遊玩記錄") 子頁容器.appendChild(遊玩記錄子頁());
  else if (state.子頁 === "新手入門") 子頁容器.appendChild(新手入門子頁());
  else if (state.子頁 === "設定") 子頁容器.appendChild(設定子頁());

  版面.appendChild(子頁容器);
  root.appendChild(版面);
  容器.appendChild(root);
}
  任意處提示.onclick = (event) => {
    event.stopPropagation();
    完成進場();
  };
