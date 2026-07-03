/**
 * @file preview.ts
 * @description 圖騰系統的獨立預覽入口。
 * 渲染全遊戲 4 個世界 × 5 名成員 × 1★/2★/3★ = 60 個精美中空圓環角色肖像 (Emblems)。
 */
import { 建立圖騰SVG } from "./圖騰產生器";
import { 幾何世界圖騰清單 } from "./資料/幾何世界圖騰";
import { 有機世界圖騰清單 } from "./資料/有機世界圖騰";
import { 分形世界圖騰清單 } from "./資料/分形世界圖騰";
import { 機械世界圖騰清單 } from "./資料/機械世界圖騰";
import { 建立單個角色圖徽 } from "./資料/角色識別圖徽";

const style = document.createElement("style");
style.textContent = `
  html, body {
    margin: 0;
    background: #080a12;
    color: #fff;
    font-family: "Segoe UI", "Noto Sans TC", system-ui, sans-serif;
  }
  .totem-preview-root {
    padding: 40px;
    max-width: 1400px;
    margin: 0 auto;
  }
  .totem-preview-root h1 {
    font-weight: 700;
    letter-spacing: 0.04em;
    margin: 0 0 8px;
    color: #ff8a3b;
    text-shadow: 0 0 15px rgba(255, 138, 59, 0.2);
  }
  .totem-preview-root p.sub {
    color: #8f8f9c;
    margin: 0 0 32px;
    font-size: 0.95rem;
    line-height: 1.5;
  }
  
  .world-section {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 40px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
  }
  .world-section h2 {
    font-size: 1.35rem;
    color: #ff8a3b;
    margin: 0 0 20px;
    border-left: 4px solid #ff8a3b;
    padding-left: 12px;
  }
  
  .totem-grid {
    display: grid;
    grid-template-columns: 160px repeat(3, 1fr);
    gap: 12px 24px;
    align-items: center;
  }
  .totem-grid .col-head {
    text-align: center;
    color: #8f8f9c;
    font-size: 0.85rem;
    font-weight: bold;
    letter-spacing: 0.12em;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    margin-bottom: 12px;
  }
  .totem-row-label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-right: 12px;
  }
  .totem-row-label .name {
    font-size: 1.1rem;
    font-weight: 600;
    color: #fff;
  }
  .totem-row-label .code {
    color: #8f8f9c;
    font-size: 0.8rem;
  }
  .totem-row-label .family {
    color: #4d8dff;
    font-size: 0.78rem;
    font-weight: bold;
  }
  .totem-cell {
    position: relative;
    aspect-ratio: 1 / 1;
    background: #000;
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s, border-color 0.2s;
  }
  .totem-cell:hover {
    transform: scale(1.03);
    border-color: rgba(255, 138, 59, 0.4);
    box-shadow: 0 0 15px rgba(255, 138, 59, 0.15);
  }
  .totem-cell svg {
    width: 90%;
    height: 90%;
  }
  .totem-cell .star-badge {
    position: absolute;
    bottom: 8px;
    right: 10px;
    font-size: 0.75rem;
    color: #ffd24d;
    letter-spacing: 0.08em;
    font-weight: bold;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
  }
`;
document.head.appendChild(style);

const root = document.createElement("div");
root.className = "totem-preview-root";
root.innerHTML = `
  <h1>COrebound LAttence — 圖騰系統角色肖像全貌預覽</h1>
  <p class="sub">
    <b>甜甜圈圓環化佈局 (Doughnut Ring Layout)</b>：所有成員只繪製 22.5° 的半楔形，且中央 35% 半徑 (r: 0 ~ 55px) 強制中空留白。<br/>
    圖騰由產生器自動進行鏡射補齊，並向外旋轉旋轉 8 次拼接而成。這能最大化放大角色的主輪廓特徵，建立極具記憶點的身份辨識 Emblems。
  </p>
`;

const 世界列表 = [
  { 名稱: "📐 幾何世界 (Geometry) — 主輪廓對稱幾何", 清單: 幾何世界圖騰清單 },
  { 名稱: "🌿 有機世界 (Organic) — 葉脈、藤蔓與自然流線", 清單: 有機世界圖騰清單 },
  { 名稱: "❄️ 分形世界 (Fractal) — 遞歸、自相似與科赫冰晶", 清單: 分形世界圖騰清單 },
  { 名稱: "⚙️ 機械世界 (Mechanical) — 齒輪、防爆閘門與電極連桿", 清單: 機械世界圖騰清單 },
];

for (const 世界 of 世界列表) {
  const section = document.createElement("div");
  section.className = "world-section";
  
  const h2 = document.createElement("h2");
  h2.textContent = 世界.名稱;
  section.appendChild(h2);

  const grid = document.createElement("div");
  grid.className = "totem-grid";

  // 表頭
  grid.appendChild(document.createElement("div")); // 左上角空白
  for (const label of ["1★ 核心輪廓 (初醒)", "2★ 次級花瓣 (繁茂)", "3★ 完全展開 (覺醒)"]) {
    const head = document.createElement("div");
    head.className = "col-head";
    head.textContent = label;
    grid.appendChild(head);
  }

  // 行內容
  for (const 角色 of 世界.清單) {
    const labelCell = document.createElement("div");
    labelCell.className = "totem-row-label";
    labelCell.innerHTML = `
      <span class="name">${角色.名稱}</span>
      <span class="code">${角色.代號}</span>
      <span class="family">${角色.家族}</span>
    `;
    grid.appendChild(labelCell);

    角色.星級筆畫.forEach((筆畫, i) => {
      const cell = document.createElement("div");
      cell.className = "totem-cell";
      // 呼叫產生器，疊加星級，傳入對應外圈圈數
      const svg = 建立圖騰SVG(筆畫, { 外圈刻度: i + 1 });
      
      // 建立一個圍繞畫布中心 (150, 150) 的圖徽定位群組
      const emblemCenterG = document.createElementNS("http://www.w3.org/2000/svg", "g");
      emblemCenterG.setAttribute("transform", "translate(150, 150)");
      
      // 放置在圓環正上方 (0°)，半徑為 120px 的黃金軌道處
      const 圖徽半徑 = 120;
      
      // 建立白色白描、黑底實心背景、無光暈的 2 倍大小角色圖徽
      const glyphEl = 建立單個角色圖徽(角色.id, i + 1, 圖徽半徑, "#ffffff", 0);
      emblemCenterG.appendChild(glyphEl);
      svg.appendChild(emblemCenterG);
      
      cell.appendChild(svg);
      
      const badge = document.createElement("span");
      badge.className = "star-badge";
      badge.textContent = "★".repeat(i + 1);
      
      cell.appendChild(badge);
      grid.appendChild(cell);
    });
  }

  section.appendChild(grid);
  root.appendChild(section);
}

const app = document.getElementById("app");
if (!app) throw new Error("找不到 #app 掛載節點");
app.appendChild(root);
