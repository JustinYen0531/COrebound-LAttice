/**
 * @file 圖鑑瀏覽器.ts
 * @description 圖鑑瀏覽器 UI 元件。採用左側分類、中央列表、下方展開詳情的版面，
 *              成員條目會在下方以「左下小立繪舞台 + 右下詳細說明」呈現，避免右側過滿。
 */
import { 應用程式狀態, 圖鑑資料查詢類分頁 } from "../應用程式狀態";
import { MEMBERS } from "../../data/成員資料庫";
import { findMonster } from "../../data/怪物資料庫";
import { findMaterial, materialImagePath } from "../../data/素材資料庫";
import {
  成員圖鑑資料,
  怪物圖鑑資料,
  世界圖鑑資料,
  材料圖鑑資料,
  機制圖鑑資料,
  Boss圖鑑資料,
  隊長圖鑑資料,
  世界故事資料,
  圖鑑條目,
} from "../資料/圖鑑資料庫";
import { 生成角色迷你頭像HTML } from "./css角色頭像";
import { 選文 } from "../語系";

function 雙語(中文: string, 英文: string): string {
  return 選文(應用程式狀態.額外.語言, 中文, 英文);
}

const 怪物圖鑑編號對照: Record<string, number> = {
  mon_circle: 1,
  mon_triangle: 2,
  mon_square: 3,
  mon_hexagon: 4,
  mon_penrose: 5,
  mon_flower_life: 6,
  mon_seed: 8,
  mon_vein: 9,
  mon_moss: 10,
  mon_feather: 11,
  mon_nest: 12,
  mon_coral: 13,
  mon_mother: 15,
  mon_first_fractal: 16,
  mon_koch: 17,
  mon_dragon: 18,
  mon_sierpinski: 19,
  mon_hilbert: 20,
  mon_bearing: 22,
  mon_gear: 23,
  mon_nut: 24,
  mon_coil: 25,
  mon_piston: 26,
  mon_sentry: 27,
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
  if (名稱 === "隊長圖鑑") return 隊長圖鑑資料;
  if (名稱 === "世界故事") return 世界故事資料;
  return [];
}

function 建立星級切換(選中星級: number): string {
  return [1, 2, 3]
    .map(
      (lv) => `
        <button class="圖鑑星級按鈕 ${選中星級 === lv ? "作用中" : ""}" data-star="${lv}" type="button">
          <span class="圖鑑星級頭像框">
            ${生成角色迷你頭像HTML("__MEMBER__", lv, "圖鑑星級頭像")}
          </span>
          <span class="圖鑑星級文字">${雙語(`${lv} 星`, `${lv}★`)}</span>
        </button>
      `
    )
    .join("");
}

function 建立圖鑑舞台立繪HTML(立繪路徑: string, alt: string, 附加區塊HTML = ""): string {
  return `
    <div class="圖鑑詳情-角色構圖">
      <div class="圖鑑詳情-舞台框">
        <div class="圖鑑詳情-角色視口">
          <div class="圖鑑詳情-角色浮層">
            <img class="圖鑑詳情-角色立繪圖" src="${立繪路徑}" alt="${alt}" />
          </div>
        </div>
      </div>
      ${附加區塊HTML}
    </div>
  `;
}

function 建立成員立繪HTML(條目ID: string): string {
  const m = 尋找對應成員(條目ID);
  if (!m) return "";

  const 選中星級 = 應用程式狀態.額外.圖鑑選中星級 ?? 3;
  const 星級列HTML = 建立星級切換(選中星級).replaceAll("__MEMBER__", m.id);
  const 立繪路徑 = `/assets/transparent-portraits/members/${m.id}_s${選中星級}.png`;

  return 建立圖鑑舞台立繪HTML(
    立繪路徑,
    `${m.nameZh} ${選中星級}星立繪`,
    `
      <div class="圖鑑詳情-星級列">
        ${星級列HTML}
      </div>
    `
  );
}

function 建立怪物立繪HTML(條目ID: string): string {
  const monsterNo = 怪物圖鑑編號對照[條目ID];
  if (!monsterNo) return "";

  const m = findMonster(monsterNo);
  if (!m || m.world === "core") return "";

  return 建立圖鑑舞台立繪HTML(
    `/assets/images/enemies/${m.world}/${m.id}.png`,
    `${m.nameZh} 立繪`
  );
}

// 隊長條目 id 格式 "captain_{captainId}"。每位隊長有 4 種形態立繪。
function 建立隊長立繪HTML(條目ID: string): string {
  if (!條目ID.startsWith("captain_")) return "";
  const captainId = 條目ID.replace("captain_", "");

  const 選中形態 = 應用程式狀態.額外.圖鑑選中隊長形態 ?? 1;
  const 立繪路徑 = `/assets/transparent-portraits/captains/${captainId}_form${選中形態}.png`;

  // 形態切換按鈕：每個按鈕顯示對應形態的頭像。
  const 形態列HTML = [1, 2, 3, 4]
    .map(
      (form) => `
        <button class="圖鑑隊長形態按鈕 ${選中形態 === form ? "作用中" : ""}" data-form="${form}" type="button">
          <span class="圖鑑星級頭像框 圖鑑隊長形態頭像框">
            <img class="圖鑑隊長形態頭像圖" src="/assets/transparent-portraits/captains/${captainId}_form${form}_head.png" alt="" draggable="false" />
          </span>
          <span class="圖鑑星級文字">${雙語(`形態 ${form}`, `Form ${form}`)}</span>
        </button>
      `
    )
    .join("");

  return 建立圖鑑舞台立繪HTML(
    立繪路徑,
    `${captainId} 形態${選中形態} 立繪`,
    `
      <div class="圖鑑詳情-星級列 圖鑑詳情-隊長形態列">
        ${形態列HTML}
      </div>
    `
  );
}

function 建立材料立繪HTML(條目ID: string): string {
  const match = 條目ID.match(/^mat_(\d{2})$/);
  if (!match) return "";
  const materialNo = Number(match[1]);
  const material = findMaterial(materialNo);
  if (!material) return "";

  return 建立圖鑑舞台立繪HTML(
    materialImagePath(materialNo),
    `${material.nameZh} 材料立繪`,
    `
      <div class="圖鑑詳情-星級列">
        <div class="圖鑑星級按鈕 作用中" style="pointer-events:none;">
          <span class="圖鑑星級頭像框">
            <img class="圖鑑隊長形態頭像圖" src="${materialImagePath(materialNo)}" alt="" draggable="false" />
          </span>
          <span class="圖鑑星級文字">${material.star}★ · ${material.rarity === "fine" ? 雙語("高級", "Fine") : 雙語("普通", "Common")}</span>
        </div>
      </div>
    `,
  );
}

function 建立詳情HTML(選中條目: 圖鑑條目): string {
  const 成員立繪HTML = 建立成員立繪HTML(選中條目.id);
  const 怪物立繪HTML = 建立怪物立繪HTML(選中條目.id);
  const 隊長立繪HTML = 建立隊長立繪HTML(選中條目.id);
  const 材料立繪HTML = 建立材料立繪HTML(選中條目.id);
  const 立繪HTML =
    成員立繪HTML || 怪物立繪HTML || 隊長立繪HTML || 材料立繪HTML || `<div class="圖鑑詳情-佔位圖"><span>${雙語("這筆資料沒有立繪", "No portrait for this entry")}</span></div>`;
  const 表格HTML =
    選中條目.表格數值 && 選中條目.表格數值.length > 0
      ? `
        <section class="圖鑑詳情-表格區">
          <h5 class="圖鑑詳情-小標">${雙語("星級數值", "Star Stats")}</h5>
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
          <p class="圖鑑詳情-眉標">${雙語("展開紀錄", "Expanded Entry")}</p>
          <h4 class="圖鑑詳情-標題">${選中條目.名稱}</h4>
          <p class="圖鑑詳情-屬性">🏷️ ${雙語("分類", "Category")}：${選中條目.所屬}</p>
        </div>
        <p class="圖鑑詳情-摘要">${選中條目.簡介}</p>
      </div>
      <div class="圖鑑詳情-下半">
        ${立繪HTML}
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
  const 列表展開 =
    情境 === "OOC" ? 應用程式狀態.額外.圖鑑列表展開_OOC : 應用程式狀態.額外.圖鑑列表展開_IC;

  const wrap = document.createElement("div");
  wrap.className = "資料夾式版面 圖鑑瀏覽器-版面";

  const 書籤欄 = document.createElement("div");
  書籤欄.className = "資料夾式版面-書籤欄";
  for (const 名稱 of 分頁清單) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent =
      名稱 === "成員圖鑑" ? 雙語("成員圖鑑", "Member") :
      名稱 === "怪物圖鑑" ? 雙語("怪物圖鑑", "Monster") :
      名稱 === "世界圖鑑" ? 雙語("世界圖鑑", "World") :
      名稱 === "材料圖鑑" ? 雙語("材料圖鑑", "Material") :
      名稱 === "機制圖鑑" ? 雙語("機制圖鑑", "Mechanics") :
      名稱 === "Boss圖鑑" ? 雙語("Boss圖鑑", "Boss") :
      名稱 === "隊長圖鑑" ? 雙語("隊長圖鑑", "Captain") :
      雙語("世界故事", "World Stories");
    btn.classList.toggle("作用中", 名稱 === 選中名稱);
    if (名稱 === "世界故事") btn.classList.add("圖鑑瀏覽器-世界故事按鈕");
    btn.addEventListener("click", () => 應用程式狀態.設定圖鑑分頁(情境, 名稱));
    書籤欄.appendChild(btn);
  }

  const 主區 = document.createElement("div");
  主區.className = "圖鑑瀏覽器-主區";

  const 標題列 = document.createElement("div");
  標題列.className = "圖鑑瀏覽器-標題列";
  const 選中名稱顯示 =
    選中名稱 === "成員圖鑑" ? 雙語("成員圖鑑", "Member") :
    選中名稱 === "怪物圖鑑" ? 雙語("怪物圖鑑", "Monster") :
    選中名稱 === "世界圖鑑" ? 雙語("世界圖鑑", "World") :
    選中名稱 === "材料圖鑑" ? 雙語("材料圖鑑", "Material") :
    選中名稱 === "機制圖鑑" ? 雙語("機制圖鑑", "Mechanics") :
    選中名稱 === "Boss圖鑑" ? 雙語("Boss圖鑑", "Boss") :
    選中名稱 === "隊長圖鑑" ? 雙語("隊長圖鑑", "Captain") :
    雙語("世界故事", "World Stories");
  標題列.innerHTML = `
    <div>
      <h3>${選中名稱顯示}</h3>
      <p class="占位說明">${雙語(`共 ${當前資料列表.length} 筆資料。點一筆後，上方列表會自動收起，避免擋住下面內容。`, `Total ${當前資料列表.length} entries. Once you click one, the top list auto-collapses to keep the lower panel clear.`)}</p>
    </div>
  `;

  if (選中條目) {
    const 工具列 = document.createElement("div");
    工具列.className = "圖鑑瀏覽器-選中列";
    工具列.innerHTML = `
      <div class="圖鑑瀏覽器-選中摘要">
        <span class="圖鑑瀏覽器-選中標籤">${雙語("已選中", "Selected")}</span>
        <strong>${選中條目.名稱}</strong>
      </div>
      <button type="button" class="三級按鈕 圖鑑瀏覽器-切換列表">${列表展開 ? 雙語("收起上方列表", "Collapse Top List") : 雙語("展開上方列表", "Expand Top List")}</button>
    `;
    工具列.querySelector("button")?.addEventListener("click", () => {
      應用程式狀態.設定圖鑑列表展開(情境, !列表展開);
    });
    標題列.appendChild(工具列);
  }

  const 卡片格 = document.createElement("div");
  卡片格.className = "占位卡片格 圖鑑瀏覽器-卡片格";
  if (!列表展開 && 選中條目) 卡片格.classList.add("已收起");
  const 有選中條目 = Boolean(選中條目);

  if (選中名稱 === "成員圖鑑") {
    卡片格.classList.add("成員圖鑑-五乘四版");

    const 世界配置 = [
      { key: "幾何世界", name: "幾何世界 (Geometry)" },
      { key: "有機世界", name: "有機世界 (Organic)" },
      { key: "分形世界", name: "分形世界 (Fractal)" },
      { key: "機械世界", name: "機械世界 (Mechanical)" },
    ];

    for (const world of 世界配置) {
      const row = document.createElement("section");
      row.className = "圖鑑瀏覽器-成員世界列";
      const heading = document.createElement("h4");
      heading.className = "圖鑑瀏覽器-成員世界標題";
      heading.textContent = world.name;
      row.appendChild(heading);

      const 世界成員 = 當前資料列表.filter((item) => item.所屬.includes(world.key));
      for (const 條目 of 世界成員) {
        const 編號 = 條目.名稱.match(/^(\d{2})\./)?.[1] ?? "--";
        const 乾淨名稱 = 條目.名稱
          .replace(/^\d{2}\.\s*/, "")
          .replace(/^[^\p{L}\p{N}]+/u, "");
          const card = document.createElement("button");
          card.type = "button";
          card.className = "占位卡片 圖鑑瀏覽器-條目按鈕";
          if (有選中條目 && 條目.id !== 選中條目!.id) card.classList.add("收斂");
          if (有選中條目 && 條目.id === 選中條目!.id) card.classList.add("作用中");
          card.innerHTML = `
            <span class="圖鑑瀏覽器-成員編號">${編號}</span>
            <span class="圖鑑瀏覽器-條目標題">${乾淨名稱}</span>
            <span class="圖鑑瀏覽器-條目簡述">${條目.簡介}</span>
          `;
          card.addEventListener("click", () => 應用程式狀態.設定圖鑑選中條目(情境, 條目.id));
          row.appendChild(card);
      }
      卡片格.appendChild(row);
    }
  } else {
    // 其他類別圖鑑（如怪物、材料等）維持原本的平鋪網格
    for (const 條目 of 當前資料列表) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "占位卡片 圖鑑瀏覽器-條目按鈕";
      if (有選中條目 && 條目.id !== 選中條目!.id) card.classList.add("收斂");
      if (有選中條目 && 條目.id === 選中條目!.id) card.classList.add("作用中");
      card.innerHTML = `
        <span class="圖鑑瀏覽器-條目標題">${條目.名稱}</span>
        <span class="圖鑑瀏覽器-條目簡述">${條目.簡介}</span>
      `;
      card.addEventListener("click", () => 應用程式狀態.設定圖鑑選中條目(情境, 條目.id));
      卡片格.appendChild(card);
    }
  }

  const 展開區 = document.createElement("div");
  展開區.className = "圖鑑瀏覽器-展開區";
  展開區.innerHTML = 選中條目
    ? 建立詳情HTML(選中條目)
    : `<p class="占位說明 置中">${雙語("先點一筆資料，下面就會展開。", "Pick an entry first and the detail panel will open below.")}</p>`;

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

  wrap.querySelectorAll<HTMLButtonElement>(".圖鑑隊長形態按鈕").forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      const form = Number((event.currentTarget as HTMLButtonElement).dataset.form);
      應用程式狀態.設定圖鑑選中隊長形態(form);
      if (選中條目) 應用程式狀態.設定圖鑑選中條目(情境, 選中條目.id);
    });
  });

  return wrap;
}
