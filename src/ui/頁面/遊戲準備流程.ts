/**
 * @file 遊戲準備流程.ts
 * @description New Game / Continue Game / 再來一場 共用的賽前準備頁：選隊長 + 小隊圓盤預覽（共用元件 B）。
 * 對應統一版文件 1.1 裁定：「編排小隊」不設獨立主按鈕，改在此流程與管理介面／小隊共用元件。
 */
import { 應用程式狀態 } from "../應用程式狀態";
import { 建立小隊圓盤 } from "../元件/小隊圓盤";
import { 隊長清單 } from "../資料/隊長清單";

export function 渲染遊戲準備流程(容器: HTMLElement) {
  容器.innerHTML = "";
  const state = 應用程式狀態.畫面;
  if (state.層 !== "遊戲準備流程") return;

  const root = document.createElement("div");
  root.className = "準備流程-root";

  root.innerHTML = `<h2>賽前準備（來源：${state.來源}）</h2>`;

  const 版面 = document.createElement("div");
  版面.className = "準備流程-版面";

  const 隊長區 = document.createElement("div");
  隊長區.className = "準備流程-隊長區";
  隊長區.innerHTML = `<h4>選擇隊長</h4>`;
  const 隊長列表 = document.createElement("div");
  隊長列表.className = "隊長卡片列";

  let 選中隊長id = 應用程式狀態.額外.選中隊長 ?? 隊長清單[0].id;

  const 圓盤容器 = document.createElement("div");

  function 重繪圓盤() {
    圓盤容器.innerHTML = "";
    const 隊長 = 隊長清單.find((c) => c.id === 選中隊長id)!;
    圓盤容器.appendChild(
      建立小隊圓盤({ 隊長名稱: 隊長.名稱, 隊長代表色: 隊長.代表色, 可互動: true })
    );
    const 說明 = document.createElement("div");
    說明.className = "隊長說明卡";
    說明.innerHTML = `
      <h4>${隊長.名稱}　<span class="淡字">${隊長.代號}</span></h4>
      <p>${隊長.一句話設計}</p>
      <ul>
        <li>控制效果：${隊長.控制效果}</li>
        <li>主動位移技能：${隊長.主動位移技能}</li>
        <li>週期技能：${隊長.週期技能}</li>
      </ul>
    `;
    圓盤容器.appendChild(說明);
  }

  for (const 隊長 of 隊長清單) {
    const btn = document.createElement("button");
    btn.className = "隊長卡片";
    btn.style.setProperty("--隊長色", 隊長.代表色);
    btn.innerHTML = `<strong>${隊長.名稱}</strong><span>${隊長.代號}</span>`;
    btn.classList.toggle("作用中", 隊長.id === 選中隊長id);
    btn.onclick = () => {
      選中隊長id = 隊長.id;
      應用程式狀態.額外.選中隊長 = 隊長.id;
      隊長列表.querySelectorAll("button").forEach((b) => b.classList.remove("作用中"));
      btn.classList.add("作用中");
      重繪圓盤();
    };
    隊長列表.appendChild(btn);
  }

  隊長區.appendChild(隊長列表);
  版面.appendChild(隊長區);

  const 預覽區 = document.createElement("div");
  預覽區.className = "準備流程-預覽區";
  預覽區.innerHTML = `<h4>小隊圓盤預覽（共用元件 B）</h4>`;
  預覽區.appendChild(圓盤容器);
  重繪圓盤();
  版面.appendChild(預覽區);

  root.appendChild(版面);

  const 底部按鈕列 = document.createElement("div");
  底部按鈕列.className = "按鈕列";
  const 取消 = document.createElement("button");
  取消.className = "二級按鈕";
  取消.textContent = "取消，返回主畫面";
  取消.onclick = () => 應用程式狀態.返回主畫面();

  const 確認 = document.createElement("button");
  確認.className = "一級按鈕";
  確認.textContent = "確認進場 → 正式遊玩";
  確認.onclick = () => 應用程式狀態.確認進場(false);

  底部按鈕列.append(取消, 確認);
  root.appendChild(底部按鈕列);

  容器.appendChild(root);
}
