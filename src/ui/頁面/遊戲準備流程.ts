/**
 * @file 遊戲準備流程.ts
 * @description New Game / Continue Game / 再來一場 共用的賽前準備頁：選隊長 + 小隊圓盤預覽（共用元件 B）。
 * 對應統一版文件 1.1 裁定：「編排小隊」不設獨立主按鈕，改在此流程與管理介面／小隊共用元件。
 */
import { 應用程式狀態 } from "../應用程式狀態";
import { 建立小隊圓盤 } from "../元件/小隊圓盤";
import { 隊長清單 } from "../資料/隊長清單";
import { 選文 } from "../語系";

function 雙語(中文: string, 英文: string): string {
  return 選文(應用程式狀態.額外.語言, 中文, 英文);
}

export function 渲染遊戲準備流程(容器: HTMLElement) {
  容器.innerHTML = "";
  const state = 應用程式狀態.畫面;
  if (state.層 !== "遊戲準備流程") return;

  const root = document.createElement("div");
  root.className = "準備流程-root";

  const 來源標籤 = state.來源 === "再來一場" ? 雙語("再來一場", "Rematch") : state.來源;
  root.innerHTML = `<h2>${雙語("賽前準備", "Pre-Match Setup")} (${雙語("來源", "Source")}: ${來源標籤})</h2>`;

  const 版面 = document.createElement("div");
  版面.className = "準備流程-版面";

  const 隊長區 = document.createElement("div");
  隊長區.className = "準備流程-隊長區";
  隊長區.innerHTML = `<h4>${雙語("選擇隊長", "Choose a Captain")}</h4>`;
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
        <li>${雙語("控制效果", "Control Effect")}: ${隊長.控制效果}</li>
        <li>${雙語("主動位移技能", "Active Mobility Skill")}: ${隊長.主動位移技能}</li>
        <li>${雙語("週期技能", "Periodic Skill")}: ${隊長.週期技能}</li>
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
  預覽區.innerHTML = `<h4>${雙語("小隊圓盤預覽（共用元件 B）", "Squad Disc Preview (Shared Component B)")}</h4>`;
  預覽區.appendChild(圓盤容器);
  重繪圓盤();
  版面.appendChild(預覽區);

  root.appendChild(版面);

  const 畫質區 = document.createElement("section");
  畫質區.style.marginTop = "18px";
  畫質區.style.padding = "16px";
  畫質區.style.borderRadius = "14px";
  畫質區.style.background = "rgba(255,255,255,0.03)";
  畫質區.style.border = "1px solid rgba(255,255,255,0.08)";
  畫質區.style.display = "flex";
  畫質區.style.flexDirection = "column";
  畫質區.style.gap = "10px";
  畫質區.innerHTML = `
    <div style="font-size:0.96rem;font-weight:700;color:#f2e6c9;">${雙語("世界地板載入模式", "World Floor Load Mode")}</div>
    <div style="font-size:0.8rem;line-height:1.6;color:#c8d0ec;">
      ${雙語("順暢模式保留輕量地板；中細節會回到你原本那版世界專屬磁磚；高細節則沿用同一套世界磁磚，再保留更重的材質感。", "Smooth mode keeps the lightweight floor. Medium Detail restores your original world-specific signature tiles. High Detail keeps the same world tiles with a heavier material feel.")}
    </div>
  `;

  const 模式列 = document.createElement("div");
  模式列.className = "按鈕列";
  模式列.style.marginTop = "0";
  const 地板模式 = 應用程式狀態.額外.世界地板細節模式;

  const 順暢模式 = document.createElement("button");
  順暢模式.className = 地板模式 === "smooth" ? "一級按鈕" : "二級按鈕";
  順暢模式.textContent = 雙語("順暢模式", "Smooth Mode");
  順暢模式.onclick = () => {
    應用程式狀態.設定世界地板細節模式("smooth");
    渲染遊戲準備流程(容器);
  };

  const 中細節模式 = document.createElement("button");
  中細節模式.className = 地板模式 === "medium" ? "一級按鈕" : "二級按鈕";
  中細節模式.textContent = 雙語("中細節磁磚", "Medium Detail Tiles");
  中細節模式.onclick = () => {
    應用程式狀態.設定世界地板細節模式("medium");
    渲染遊戲準備流程(容器);
  };

  const 高細節模式 = document.createElement("button");
  高細節模式.className = 地板模式 === "high" ? "一級按鈕" : "二級按鈕";
  高細節模式.textContent = 雙語("高細節條紋", "High Detail Stripes");
  高細節模式.onclick = () => {
    應用程式狀態.設定世界地板細節模式("high");
    渲染遊戲準備流程(容器);
  };

  模式列.append(順暢模式, 中細節模式, 高細節模式);
  畫質區.appendChild(模式列);

  const 提示 = document.createElement("div");
  提示.style.fontSize = "0.75rem";
  提示.style.lineHeight = "1.6";
  提示.style.color = "#8d93ad";
  提示.textContent =
    地板模式 === "high"
      ? 雙語("目前使用完整世界磁磚版本。若裝置開始吃力，可退回中細節或順暢模式。", "High Detail is using the full world signature tile version. If the device struggles, step back to Medium or Smooth.")
      : 地板模式 === "medium"
        ? 雙語("目前使用你原本那版磁磚地板，保留切割、色差與核心區域。想再加上條紋圖時，切到高細節。", "Medium Detail keeps your original tile floor with segmentation, variation, and core zones. Switch to High Detail when you want the stripe art on top.")
        : 雙語("目前使用順暢模式，只保留輕量世界地板。需要看磁磚與核心節奏時，再切到中細節或高細節。", "Smooth Mode is active and keeps only the lightweight floor. Switch to Medium or High Detail when you want the tiled floor and core rhythm back.");
  畫質區.appendChild(提示);

  root.appendChild(畫質區);

  const 底部按鈕列 = document.createElement("div");
  底部按鈕列.className = "按鈕列";
  const 取消 = document.createElement("button");
  取消.className = "二級按鈕";
  取消.textContent = 雙語("取消，返回主畫面", "Cancel: Back to Main Screen");
  取消.onclick = () => 應用程式狀態.返回主畫面();

  const 確認 = document.createElement("button");
  確認.className = "一級按鈕";
  確認.textContent = 雙語("確認並進入對局", "Confirm & Enter Play");
  確認.onclick = () => 應用程式狀態.確認進場(false);

  底部按鈕列.append(取消, 確認);
  root.appendChild(底部按鈕列);

  容器.appendChild(root);
}
