/**
 * @file 結算頁.ts
 * @description IC→OOC 過渡頁。兩個出口互斥且導向不同流程（R10）：
 * 回大廳 → 主畫面；再來一場 → 直接進「New Game 準備流程」，不經過主畫面。
 */
import { 應用程式狀態 } from "../應用程式狀態";
import { 選文 } from "../語系";
import { 取得對局戰報 } from "../對局戰報狀態";

function 雙語(中文: string, 英文: string): string {
  return 選文(應用程式狀態.額外.語言, 中文, 英文);
}

export function 渲染結算頁(容器: HTMLElement) {
  容器.innerHTML = "";
  const state = 應用程式狀態.畫面;
  if (state.層 !== "結算頁") return;
  const report = 取得對局戰報();
  const minutes = Math.floor(report.durationSeconds / 60);
  const seconds = report.durationSeconds % 60;
  const resultLabel = report.result === "victory" ? 雙語("通關", "Victory") : 雙語("本輪結束", "Run Ended");

  const root = document.createElement("div");
  root.className = "結算頁-root";
  root.innerHTML = `
    <h2>${resultLabel}</h2>
    <p class="占位說明">${report.reason}</p>
    <div class="占位卡片格">
      ${[
        `${雙語("遊玩時間", "Run Time")}<strong>${minutes}:${seconds.toString().padStart(2, "0")}</strong>`,
        `${雙語("擊殺", "Kills")}<strong>${report.kills}</strong>`,
        `${雙語("造成傷害", "Damage Dealt")}<strong>${report.damageDealt}</strong>`,
        `${雙語("承受傷害", "Damage Taken")}<strong>${report.damageTaken}</strong>`,
        `${雙語("復活次數", "Revives")}<strong>${report.deaths}</strong>`,
        `${雙語("取得原石", "Gems Earned")}<strong>${report.gemsEarned}</strong>`,
        `${雙語("取得材料", "Materials Earned")}<strong>${report.materialsEarned}</strong>`,
        `${雙語("擊敗守護者", "Guardians Defeated")}<strong>${report.guardiansDefeated} / 4</strong>`,
        `${雙語("核心鑰匙", "Core Key")}<strong>${report.coreKeyEarned ? 雙語("已取得", "Obtained") : 雙語("未取得", "Not obtained")}</strong>`,
      ]
        .map((n) => `<div class="占位卡片" style="display:grid;gap:8px;">${n}</div>`)
        .join("")}
    </div>
  `;

  const 按鈕列 = document.createElement("div");
  按鈕列.className = "按鈕列";

  const 回大廳 = document.createElement("button");
  回大廳.className = "二級按鈕";
  回大廳.textContent = 雙語("返回大廳", "Back to Lobby");
  回大廳.onclick = () => 應用程式狀態.回大廳();

  const 再來一場 = document.createElement("button");
  再來一場.className = "一級按鈕";
  再來一場.textContent = 雙語("再來一場", "Rematch");
  再來一場.onclick = () => 應用程式狀態.再來一場();

  按鈕列.append(回大廳, 再來一場);
  root.appendChild(按鈕列);

  容器.appendChild(root);
}
