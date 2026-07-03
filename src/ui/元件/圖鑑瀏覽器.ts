/**
 * @file 圖鑑瀏覽器.ts
 * @description 圖鑑瀏覽器 UI 元件。採用左側分類、中央列表、下方展開詳情的版面，
 *              成員條目會在下方以「左下小立繪舞台 + 右下詳細說明」呈現，避免右側過滿。
 */
import { 應用程式狀態, 圖鑑資料查詢類分頁 } from "../應用程式狀態";
import { MEMBERS } from "../../data/成員資料庫";
import {
  成員圖鑑資料,
  怪物圖鑑資料,
  世界圖鑑資料,
  材料圖鑑資料,
  機制圖鑑資料,
  Boss圖鑑資料,
  世界故事資料,
  圖鑑條目,
} from "../資料/圖鑑資料庫";

const 成員世界合圖: Record<string, string> = {
  geometry: "幾何世界所有成員立繪與頭像.png",
  organic: "有機世界所有成員立繪與頭像.png",
  fractal: "分形世界所有成員立繪與頭像.png",
  mechanical: "機械世界所有成員立繪與頭像.png",
};

function 尋找對應成員(條目ID: string) {
  return MEMBERS.find((item) => {
    if (item.id === 條目ID) return true;
    if (item.id.endsWith(`_${條目ID}`)) return true;
    if (item.nameEn.toLowerCase() === 條目ID.toLowerCase()) return true;
    return false;
  });
}

function 渲染Markdown(md: string): string {
  return md
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\* (.*?)/g, "• $1")
    .replace(/• \*\*•/g, "•")
    .trim()
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("•")) {
        return `<li class="圖鑑詳情-列表項">${trimmed.substring(1).trim()}</li>`;
      }
      if (trimmed.startsWith("###")) {
        return `<h5 class="圖鑑詳情-小標">${trimmed.substring(3).trim()}</h5>`;
      }
      return `<p class="圖鑑詳情-段落">${trimmed}</p>`;
    })
    .join("");
}

function 取得資料列表(名稱: string): 圖鑑條目[] {
  if (名稱 === "成員圖鑑") return 成員圖鑑資料;
  if (名稱 === "怪物圖鑑") return 怪物圖鑑資料;
  if (名稱 === "世界圖鑑") return 世界圖鑑資料;
  if (名稱 === "材料圖鑑") return 材料圖鑑資料;
  if (名稱 === "機制圖鑑") return 機制圖鑑資料;
  if (名稱 === "Boss圖鑑") return Boss圖鑑資料;
  if (名稱 === "世界故事") return 世界故事資料;
  return [];
}

function 建立星級切換(選中星級: number): string {
  return [1, 2, 3]
    .map(
      (lv) => `
        <button class="圖鑑星級按鈕 ${選中星級 === lv ? "作用中" : ""}" data-star="${lv}" type="button">
          ${lv}★
        </button>
      `
    )
    .join("");
}

function 建立成員立繪HTML(條目ID: string): string {
  const m = 尋找對應成員(條目ID);
  if (!m) return "";

  const imgFile = 成員世界合圖[m.world] ?? 成員世界合圖.geometry;
  const 同世界成員 = MEMBERS.filter((item) => item.world === m.world);
  const row = 同世界成員.findIndex((item) => item.id === m.id);
  const 選中星級 = 應用程式狀態.額外.圖鑑選中星級 ?? 3;
  const col = Math.max(0, Math.min(2, 選中星級 - 1));
  const posX = (col * 100) / 3;
  const posY = (row * 100) / 4;
  const imageUrl = `assets/transparent-portraits/${imgFile}`;

  return `
    <div class="圖鑑詳情-角色構圖">
      <div class="圖鑑詳情-舞台框">
        <div class="圖鑑詳情-角色視口">
          <div
            class="圖鑑詳情-角色立繪"
            style="background-image: url('${imageUrl}'); background-position: ${posX}% ${posY}%;"
          ></div>
        </div>
        <div class="圖鑑詳情-小舞台"></div>
        <div class="圖鑑詳情-星級列">
          ${建立星級切換(選中星級)}
        </div>
      </div>
    </div>
  `;
}

function 建立詳情HTML(選中條目: 圖鑑條目): string {
  const 成員立繪HTML = 建立成員立繪HTML(選中條目.id);
  const 表格HTML =
    選中條目.表格數值 && 選中條目.表格數值.length > 0
      ? `
        <section class="圖鑑詳情-表格區">
          <h5 class="圖鑑詳情-小標">星級數值</h5>
          <table class="圖鑑詳情-表格">
            <thead>
              <tr>${Object.keys(選中條目.表格數值[0])
                .map((key) => `<th>${key}</th>`)
                .join("")}</tr>
            </thead>
            <tbody>
              ${選中條目.表格數值
                .map(
                  (row) => `
                    <tr>
                      ${Object.keys(選中條目.表格數值![0])
                        .map((key) => `<td>${row[key]}</td>`)
                        .join("")}
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>
        </section>
      `
      : "";

  return `
    <section class="圖鑑詳情">
      <div class="圖鑑詳情-頂部">
        <div>
          <p class="圖鑑詳情-眉標">展開紀錄</p>
          <h4 class="圖鑑詳情-標題">${選中條目.名稱}</h4>
          <p class="圖鑑詳情-屬性">🏷️ ${選中條目.所屬}</p>
        </div>
        <p class="圖鑑詳情-摘要">${選中條目.簡介}</p>
      </div>
      <div class="圖鑑詳情-下半">
        ${成員立繪HTML || `<div class="圖鑑詳情-佔位圖"><span>這筆資料沒有立繪</span></div>`}
        <div class="圖鑑詳情-文案區">
          <div class="圖鑑詳情-內文">${渲染Markdown(選中條目.詳細描述)}</div>
          ${表格HTML}
        </div>
      </div>
    </section>
  `;
}

export function 建立圖鑑瀏覽器(情境: "OOC" | "IC"): HTMLElement {
  const 分頁清單: string[] =
    情境 === "OOC" ? [...圖鑑資料查詢類分頁, "世界故事"] : [...圖鑑資料查詢類分頁];
  const 目前選中 =
    情境 === "OOC" ? 應用程式狀態.額外.圖鑑選中OOC : 應用程式狀態.額外.圖鑑選中IC;
  const 選中名稱 = 分頁清單.includes(目前選中) ? 目前選中 : 分頁清單[0];
  const 當前資料列表 = 取得資料列表(選中名稱);
  const 選中條目ID =
    情境 === "OOC" ? 應用程式狀態.額外.圖鑑選中條目ID_OOC : 應用程式狀態.額外.圖鑑選中條目ID_IC;

  let 選中條目 = 當前資料列表.find((item) => item.id === 選中條目ID);
  if (!選中條目 && 當前資料列表.length > 0) {
    選中條目 = 當前資料列表[0];
  }

  const wrap = document.createElement("div");
  wrap.className = "資料夾式版面 圖鑑瀏覽器-版面";

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

  const 主區 = document.createElement("div");
  主區.className = "圖鑑瀏覽器-主區";

  const 標題列 = document.createElement("div");
  標題列.className = "圖鑑瀏覽器-標題列";
  標題列.innerHTML = `
    <div>
      <h3>${選中名稱}</h3>
      <p class="占位說明">共 ${當前資料列表.length} 筆資料。點一筆後，其餘會收斂，說明會往下展開。</p>
    </div>
  `;

  const 卡片格 = document.createElement("div");
  卡片格.className = "占位卡片格 圖鑑瀏覽器-卡片格";
  const 有選中條目 = Boolean(選中條目);

  for (const 條目 of 當前資料列表) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "占位卡片 圖鑑瀏覽器-條目按鈕";
    if (有選中條目 && 條目.id !== 選中條目!.id) card.classList.add("收斂");
    if (有選中條目 && 條目.id === 選中條目!.id) card.classList.add("作用中");
    card.innerHTML = `
      <span class="圖鑑瀏覽器-條目標題">${條目.名稱.replace(/^(0[1-9]|[1-2][0-9])\.\s*/, "")}</span>
      <span class="圖鑑瀏覽器-條目簡述">${條目.簡介}</span>
    `;
    card.addEventListener("click", () => 應用程式狀態.設定圖鑑選中條目(情境, 條目.id));
    卡片格.appendChild(card);
  }

  const 展開區 = document.createElement("div");
  展開區.className = "圖鑑瀏覽器-展開區";
  展開區.innerHTML = 選中條目
    ? 建立詳情HTML(選中條目)
    : `<p class="占位說明 置中">先點一筆資料，下面就會展開。</p>`;

  主區.append(標題列, 卡片格, 展開區);
  wrap.append(書籤欄, 主區);

  wrap.querySelectorAll<HTMLButtonElement>(".圖鑑星級按鈕").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      const lv = Number((event.currentTarget as HTMLButtonElement).dataset.star);
      應用程式狀態.設定圖鑑選中星級(lv);
      if (選中條目) 應用程式狀態.設定圖鑑選中條目(情境, 選中條目.id);
    });
  });

  return wrap;
}
