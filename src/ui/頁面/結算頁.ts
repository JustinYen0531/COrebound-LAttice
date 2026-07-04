/**
 * @file 結算頁.ts
 * @description IC→OOC 過渡頁。兩個出口互斥且導向不同流程（R10）：
 * 回大廳 → 主畫面；再來一場 → 直接進「New Game 準備流程」，不經過主畫面。
 */
import { 應用程式狀態 } from "../應用程式狀態";
import { 選文 } from "../語系";

function 雙語(中文: string, 英文: string): string {
  return 選文(應用程式狀態.額外.語言, 中文, 英文);
}

export function 渲染結算頁(容器: HTMLElement) {
  容器.innerHTML = "";
  const state = 應用程式狀態.畫面;
  if (state.層 !== "結算頁") return;

  const root = document.createElement("div");
  root.className = "結算頁-root";
  root.innerHTML = `
    <h2>${雙語("對局結算", "Match Settlement")}</h2>
    <p class="占位說明">${雙語("由終局事件強制觸發（R11）；優先權高於操作頁面與管理介面的任何狀態。", "Forcibly triggered by an end-game event (R11); takes priority over any state of the operation page / Management panel.")}</p>
    <div class="占位卡片格">
      ${[
        雙語("查看戰報", "View Battle Report"),
        雙語("查看最終編隊", "View Final Squad Composition"),
        雙語("查看死亡原因", "View Cause of Death"),
        雙語("查看獲得材料", "View Materials Earned"),
        雙語("查看表現評級", "View Performance Rating"),
      ]
        .map((n) => `<div class="占位卡片">${n}</div>`)
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
