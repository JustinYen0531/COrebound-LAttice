/**
 * @file 圖鑑瀏覽器.ts
 * @description 圖鑑瀏覽器 UI 元件。支持動態資料渲染、選中高亮、以及右側詳情與數值表格繪製。
 *              整合 20 名成員立繪合圖的 CSS 網格平移裁剪定位，並支援 1★、2★、3★ 星級即時切換。
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
  圖鑑條目
} from "../資料/圖鑑資料庫";

/**
 * 簡易的 Markdown 轉 HTML 渲染器，支持粗體、列表與換行
 */
function 渲染Markdown(md: string): string {
  return md
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // 粗體
    .replace(/\* (.*?)/g, "• $1") // 列表
    .replace(/• \*\*•/g, "•") // 修復潛在雙重標記
    .trim()
    .split("\n")
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      if (trimmed.startsWith("•")) {
        return `<li style="margin-left: 15px; list-style-type: disc;">${trimmed.substring(1).trim()}</li>`;
      }
      if (trimmed.startsWith("###")) {
        return `<h5 style="margin-top: 12px; margin-bottom: 6px; color: #ff8a3b;">${trimmed.substring(3).trim()}</h5>`;
      }
      return `<p style="margin-bottom: 6px; line-height: 1.4;">${trimmed}</p>`;
    })
    .join("");
}

export function 建立圖鑑瀏覽器(情境: "OOC" | "IC"): HTMLElement {
  const 分頁清單: string[] =
    情境 === "OOC" ? [...圖鑑資料查詢類分頁, "世界故事"] : [...圖鑑資料查詢類分頁];

  const 目前選中 =
    情境 === "OOC" ? 應用程式狀態.額外.圖鑑選中OOC : 應用程式狀態.額外.圖鑑選中IC;
  const 選中名稱 = 分頁清單.includes(目前選中) ? 目前選中 : 分頁清單[0];

  // 1. 取得當前選中分類的資料清單
  let 當前資料列表: 圖鑑條目[] = [];
  if (選中名稱 === "成員圖鑑") 當前資料列表 = 成員圖鑑資料;
  else if (選中名稱 === "怪物圖鑑") 當前資料列表 = 怪物圖鑑資料;
  else if (選中名稱 === "世界圖鑑") 當前資料列表 = 世界圖鑑資料;
  else if (選中名稱 === "材料圖鑑") 當前資料列表 = 材料圖鑑資料;
  else if (選中名稱 === "機制圖鑑") 當前資料列表 = 機制圖鑑資料;
  else if (選中名稱 === "Boss圖鑑") 當前資料列表 = Boss圖鑑資料;
  else if (選中名稱 === "世界故事") 當前資料列表 = 世界故事資料;

  // 2. 取得當前選中條目的 ID 與物件
  const 選中條目ID =
    情境 === "OOC" ? 應用程式狀態.額外.圖鑑選中條目ID_OOC : 應用程式狀態.額外.圖鑑選中條目ID_IC;
  let 選中條目 = 當前資料列表.find(item => item.id === 選中條目ID);
  if (!選中條目 && 當前資料列表.length > 0) {
    選中條目 = 當前資料列表[0]; // 預設選中第一個，避免右側空白
  }

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

  // 3. 建立中央內容區的卡片清單
  const 內容區 = document.createElement("div");
  內容區.className = "資料夾式版面-內容區";

  const 標題 = document.createElement("h3");
  標題.textContent = 選中名稱;

  const 說明 = document.createElement("p");
  說明.className = "占位說明";
  說明.style.fontSize = "0.9rem";
  說明.style.color = "#8f8f9c";
  說明.style.marginBottom = "12px";
  說明.textContent = `共有 ${當前資料列表.length} 個檔案與記錄已串接。`;

  const 卡片格 = document.createElement("div");
  卡片格.className = "占位卡片格";

  for (const 條目 of 當前資料列表) {
    const card = document.createElement("div");
    card.className = "占位卡片";
    card.textContent = 條目.名稱.replace(/^(0[1-9]\.|🛡️|💥|🎯|💣|⚡)\s*/, ""); // 簡化卡片顯示名稱
    card.classList.toggle("作用中", 選中條目 !== undefined && 條目.id === 選中條目.id);
    
    // 如果是選中狀態，加上高亮樣式
    if (選中條目 !== undefined && 條目.id === 選中條目.id) {
      card.style.borderColor = "#ff8a3b";
      card.style.backgroundColor = "rgba(255, 138, 59, 0.15)";
      card.style.boxShadow = "0 0 8px rgba(255, 138, 59, 0.3)";
    }

    card.addEventListener("click", () => {
      應用程式狀態.設定圖鑑選中條目(情境, 條目.id);
    });
    卡片格.appendChild(card);
  }

  內容區.append(標題, 說明, 卡片格);

  // 4. 建立右側補充區的詳情面板
  const 補充區 = document.createElement("div");
  補充區.className = "資料夾式版面-補充區";
  補充區.style.overflowY = "auto";
  補充區.style.maxHeight = "100%";

  if (選中條目) {
    let 立繪HTML = "";
    
    // 檢查選中條目是否在 20 名普通成員中，若在則加入立繪展示
    const m = MEMBERS.find(x => x.id === 選中條目!.id);
    if (m) {
      const worldImages: Record<string, string> = {
        geometry: "幾何世界所有成員立繪與頭像.png",
        organic: "有機世界所有成員立繪與頭像.png",
        fractal: "分形世界所有成員立繪與頭像.png",
        mechanical: "機械世界所有成員立繪與頭像.png"
      };
      const imgFile = worldImages[m.world] || "幾何世界所有成員立繪與頭像.png";
      const 同世界成員 = MEMBERS.filter(x => x.world === m.world);
      const row = 同世界成員.findIndex(x => x.id === m.id);
      const 選中星級 = 應用程式狀態.額外.圖鑑選中星級 ?? 3;
      const col = 選中星級 - 1; // 1★, 2★, 3★ 對應 col 0, 1, 2

      // 計算 CSS background position 百分比 (4列 5行)
      const posX = (col * 100) / 3;
      const posY = (row * 100) / 4;

      立繪HTML = `
        <div class="圖鑑立繪-容器" style="width: 100%; height: 330px; background: #05060b; border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; overflow: hidden; display: flex; align-items: center; justify-content: center; position: relative; margin-bottom: 16px;">
          <!-- 實際的立繪裁剪視口 -->
          <div style="width: 220px; height: 300px; background-image: url('assets/${imgFile}'); background-size: 400% 500%; background-position: ${posX}% ${posY}%; background-repeat: no-repeat; transition: background-position 0.25s ease-out;">
          </div>
          
          <!-- 星級切換按鈕 -->
          <div style="position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px; background: rgba(0,0,0,0.7); padding: 4px 12px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.12); box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
            ${[1, 2, 3].map(lv => `
              <button class="圖鑑星級按鈕" data-star="${lv}" style="background: ${選中星級 === lv ? "#ff8a3b" : "none"}; color: ${選中星級 === lv ? "#000" : "#fff"}; border: none; padding: 2px 10px; font-size: 0.72rem; border-radius: 12px; cursor: pointer; font-weight: bold; transition: all 0.15s;">
                ${lv}★
              </button>
            `).join("")}
          </div>
        </div>
      `;
    }

    // 渲染詳細文本內容
    let 詳情HTML = `
      ${立繪HTML}
      <h4 style="color: #ff8a3b; font-size: 1.2rem; margin-bottom: 4px; margin-top: 0;">${選中條目.名稱}</h4>
      <div style="font-size: 0.8rem; color: #8f8f9c; margin-bottom: 12px; font-weight: bold;">
        🏷️ 類別與屬性：${選中條目.所屬}
      </div>
      <p style="font-size: 0.95rem; color: #ffffff; line-height: 1.4; background: rgba(255,255,255,0.05); padding: 8px; border-radius: 4px; margin-bottom: 12px;">
        ${選中條目.簡介}
      </p>
      <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 12px 0;">
      <div style="font-size: 0.85rem; color: #d0d0d8;">
        ${渲染Markdown(選中條目.詳細描述)}
      </div>
    `;

    // 渲染數值表格
    if (選中條目.表格數值 && 選中條目.表格數值.length > 0) {
      const headers = Object.keys(選中條目.表格數值[0]);
      const ths = headers.map(h => `<th style="padding: 6px; border: 1px solid rgba(255,255,255,0.15); background: rgba(255,255,255,0.1); font-size: 0.8rem; text-align: center;">${h}</th>`).join("");
      const trs = 選中條目.表格數值
        .map(row => {
          const tds = headers.map(h => `<td style="padding: 6px; border: 1px solid rgba(255,255,255,0.15); text-align: center; font-size: 0.8rem;">${row[h]}</td>`).join("");
          return `<tr style="background: rgba(255,255,255,0.02);">${tds}</tr>`;
        })
        .join("");

      詳情HTML += `
        <h5 style="margin-top: 16px; margin-bottom: 8px; color: #ff8a3b;">📈 星級屬性增幅對照</h5>
        <table style="width: 100%; border-collapse: collapse; margin-top: 6px; border: 1px solid rgba(255,255,255,0.15);">
          <thead><tr style="background: rgba(0,0,0,0.3);">${ths}</tr></thead>
          <tbody>${trs}</tbody>
        </table>
      `;
    }

    補充區.innerHTML = 詳情HTML;
  } else {
    補充區.innerHTML = `
      <h4>補充資訊</h4>
      <p>點選左側分類查看詳情。共用元件 A，兩個掛載點共用同一份資料與同一份選取狀態邏輯。</p>
    `;
  }

  // 5. 綁定星級切換按鈕事件
  wrap.querySelectorAll(".圖鑑星級按鈕").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const lv = Number((e.currentTarget as HTMLElement).dataset.star);
      應用程式狀態.設定圖鑑選中星級(lv);
      // 利用重新選擇選中條目觸發 UI 通知與重繪
      應用程式狀態.設定圖鑑選中條目(情境, 選中條目!.id);
    });
  });

  wrap.append(書籤欄, 內容區, 補充區);
  return wrap;
}
