/**
 * @file 遊戲準備流程.ts
 * @description New Game / Continue Game / 再來一場 共用的賽前準備頁：選隊長 + 小隊圓盤預覽（共用元件 B）。
 * 對應統一版文件 1.1 裁定：「編排小隊」不設獨立主按鈕，改在此流程與管理介面／小隊共用元件。
 */
import { 應用程式狀態 } from "../應用程式狀態";
import { 建立小隊圓盤 } from "../元件/小隊圓盤";
import { 隊長清單 } from "../資料/隊長清單";
import { 選文 } from "../語系";
import { MEMBERS } from "../../data/成員資料庫";
import {
  取得起始成員配置,
  設定起始成員,
  type 初始成員層級,
} from "../../progression/養成狀態";

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

  const 顯示起始成員選擇 = state.來源 !== "Continue Game";
  if (顯示起始成員選擇) {
    const 選角區 = document.createElement("section");
    選角區.style.marginTop = "18px";
    選角區.style.padding = "16px";
    選角區.style.borderRadius = "14px";
    選角區.style.background = "rgba(255,255,255,0.03)";
    選角區.style.border = "1px solid rgba(255,255,255,0.08)";
    選角區.style.display = "flex";
    選角區.style.flexDirection = "column";
    選角區.style.gap = "12px";
    選角區.innerHTML = `
      <div style="font-size:0.96rem;font-weight:700;color:#f2e6c9;">${雙語("選擇 3 名初始成員", "Choose 3 Starting Members")}</div>
      <div style="font-size:0.8rem;line-height:1.6;color:#c8d0ec;">
        ${雙語("開局時直接帶 3 名成員進場，分別鎖定在最內層、中層與外層。三個位置不能重複選同一名角色。", "Start the run with 3 members already assigned to the inner, middle, and outer rings. The same member cannot be chosen twice.")}
      </div>
    `;

    const 選擇列 = document.createElement("div");
    選擇列.style.display = "grid";
    選擇列.style.gridTemplateColumns = "repeat(auto-fit, minmax(220px, 1fr))";
    選擇列.style.gap = "12px";

    const 當前配置 = 取得起始成員配置();
    const 層級標籤: Record<初始成員層級, string> = {
      inner: 雙語("最內層", "Inner Ring"),
      middle: 雙語("中層", "Middle Ring"),
      outer: 雙語("外層", "Outer Ring"),
    };

    (["inner", "middle", "outer"] as 初始成員層級[]).forEach((layer) => {
      const current = 當前配置.find((entry) => entry.layer === layer);
      if (!current) return;
      const 其他已選 = new Set(
        當前配置.filter((entry) => entry.layer !== layer).map((entry) => entry.memberNo),
      );

      const 卡片 = document.createElement("label");
      卡片.style.display = "flex";
      卡片.style.flexDirection = "column";
      卡片.style.gap = "8px";
      卡片.style.padding = "12px";
      卡片.style.borderRadius = "12px";
      卡片.style.background = "rgba(11,15,24,0.48)";
      卡片.style.border = "1px solid rgba(255,255,255,0.08)";

      const 標題 = document.createElement("div");
      標題.style.fontSize = "0.82rem";
      標題.style.fontWeight = "700";
      標題.style.color = "#f2e6c9";
      標題.textContent = 層級標籤[layer];
      卡片.appendChild(標題);

      const 下拉 = document.createElement("select");
      下拉.className = "二級按鈕";
      下拉.style.width = "100%";
      下拉.style.textAlign = "left";
      下拉.style.padding = "10px 12px";

      MEMBERS.filter((member) => !其他已選.has(member.no) || member.no === current.memberNo).forEach((member) => {
        const option = document.createElement("option");
        option.value = String(member.no);
        option.selected = member.no === current.memberNo;
        option.textContent = `${String(member.no).padStart(2, "0")}. ${member.nameZh} (${member.nameEn})`;
        下拉.appendChild(option);
      });

      下拉.onchange = () => {
        設定起始成員(layer, Number(下拉.value));
        渲染遊戲準備流程(容器);
      };
      卡片.appendChild(下拉);

      const 補充 = document.createElement("div");
      補充.style.fontSize = "0.74rem";
      補充.style.color = "#8d93ad";
      const member = MEMBERS.find((entry) => entry.no === current.memberNo);
      補充.textContent = member
        ? `${雙語("目前選擇", "Current")}: ${member.nameZh} ｜ ${雙語("世界", "World")}: ${member.world}`
        : "";
      卡片.appendChild(補充);

      選擇列.appendChild(卡片);
    });

    選角區.appendChild(選擇列);
    root.appendChild(選角區);
  }

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
