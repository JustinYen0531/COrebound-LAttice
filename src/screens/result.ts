/**
 * @file result.ts
 * @description 結算頁:勝敗、戰報統計、再來一場 / 回主畫面。
 */

import type { RunResult } from "../game/game";
import type { CaptainId } from "../legacy/data/戰鬥原語";

export function showResult(
  root: HTMLElement,
  result: RunResult,
  onReplay: (captain: CaptainId) => void,
  onMenu: () => void,
): void {
  const st = result.state;
  const victory = result.result === "victory";
  const t = Math.floor(st.timeSec);
  const mm = Math.floor(t / 60), ss = t % 60;

  root.innerHTML = `
    <div class="result ${victory ? "win" : "lose"}">
      <div class="result-inner">
        <h1>${victory ? "🏆 輪迴終結 — 終極勝利!" : "💀 小隊全滅 — 晶格重啟"}</h1>
        <p class="result-sub">${victory
          ? "COLA(中央生命晶格組裝體)已被擊敗。四個世界的圖騰重獲自由。"
          : "隊長第三次倒下,小隊在晶格中潰散。下一次輪迴,走得更遠。"}</p>
        <div class="result-grid">
          <div><b>${mm} 分 ${ss} 秒</b><span>存活時間</span></div>
          <div><b>${st.stats.kills}</b><span>總擊殺</span></div>
          <div><b>${st.stats.bossKills}</b><span>Boss 擊殺</span></div>
          <div><b>${st.sigils} / 4</b><span>晶核印記</span></div>
          <div><b>${st.members.length}</b><span>解鎖成員</span></div>
          <div><b>${st.totalMemberStars()}★</b><span>小隊總星</span></div>
          <div><b>${Math.round(st.stats.damageDealt)}</b><span>總輸出</span></div>
          <div><b>${Math.round(st.stats.damageTaken)}</b><span>總承傷</span></div>
          <div><b>${st.stats.gemsEarned}</b><span>累積原石</span></div>
          <div><b>${st.stats.chestsOpened}</b><span>寶箱開啟</span></div>
          <div><b>${st.stats.starUps}</b><span>升星次數</span></div>
          <div><b>${st.deaths}</b><span>死亡次數</span></div>
        </div>
        <div class="result-buttons">
          <button class="btn primary big" id="btn-replay">再來一場(同隊長)</button>
          <button class="btn big" id="btn-menu">回主畫面</button>
        </div>
      </div>
    </div>
  `;
  root.querySelector("#btn-replay")!.addEventListener("click", () => onReplay(st.captainId));
  root.querySelector("#btn-menu")!.addEventListener("click", onMenu);
}
