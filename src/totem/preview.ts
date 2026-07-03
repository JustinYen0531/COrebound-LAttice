/**
 * @file preview.ts
 * @description 圖騰系統的獨立預覽頁（比照 hud-preview.html 的模式），
 * 目前先渲染幾何世界 5 名成員 × 1★/2★/3★ = 15 個圖騰，供審視。
 */
import { 建立圖騰SVG } from "./圖騰產生器";
import { 幾何世界圖騰清單 } from "./資料/幾何世界圖騰";

const style = document.createElement("style");
style.textContent = `
  html, body { margin: 0; background: #000; color: #fff; font-family: "Segoe UI", "Noto Sans TC", system-ui, sans-serif; }
  .totem-preview-root { padding: 32px; }
  .totem-preview-root h1 { font-weight: 600; letter-spacing: 0.04em; margin: 0 0 4px; }
  .totem-preview-root p.sub { color: #9aa0b8; margin: 0 0 28px; font-size: 0.9em; }
  .totem-grid {
    display: grid;
    grid-template-columns: 140px repeat(3, 1fr);
    gap: 8px 18px;
    align-items: center;
  }
  .totem-grid .col-head {
    text-align: center;
    color: #9aa0b8;
    font-size: 0.8em;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding-bottom: 10px;
    border-bottom: 1px solid #24283a;
    margin-bottom: 10px;
  }
  .totem-row-label {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .totem-row-label .name { font-size: 1.05em; font-weight: 600; }
  .totem-row-label .code { color: #9aa0b8; font-size: 0.78em; }
  .totem-row-label .family { color: #6f8cff; font-size: 0.74em; }
  .totem-cell {
    position: relative;
    aspect-ratio: 1 / 1;
    background: #000;
    border: 1px solid #1c2030;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .totem-cell svg { width: 92%; height: 92%; }
  .totem-cell .star-badge {
    position: absolute;
    bottom: 6px;
    right: 8px;
    font-size: 0.72em;
    color: #ffd24d;
    letter-spacing: 0.08em;
  }
`;
document.head.appendChild(style);

const root = document.createElement("div");
root.className = "totem-preview-root";
root.innerHTML = `
  <h1>COrebound LAttence — 圖騰系統預覽（幾何世界）</h1>
  <p class="sub">Signature Slice：每人只畫 0°~22.5° 半楔形，鏡射＋旋轉 8 次拼成完整圖騰。共 5 名成員 × 3 星級 = 15 個圖騰。</p>
`;

const grid = document.createElement("div");
grid.className = "totem-grid";

grid.appendChild(document.createElement("div")); // 左上角空白
for (const label of ["1★ 初醒", "2★ 繁茂", "3★ 完全展開"]) {
  const head = document.createElement("div");
  head.className = "col-head";
  head.textContent = label;
  grid.appendChild(head);
}

for (const 角色 of 幾何世界圖騰清單) {
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
    const svg = 建立圖騰SVG(筆畫, { 外圈刻度: i + 1 });
    cell.appendChild(svg);
    const badge = document.createElement("span");
    badge.className = "star-badge";
    badge.textContent = "★".repeat(i + 1);
    cell.appendChild(badge);
    grid.appendChild(cell);
  });
}

root.appendChild(grid);

const app = document.getElementById("app");
if (!app) throw new Error("找不到 #app 掛載節點");
app.appendChild(root);
