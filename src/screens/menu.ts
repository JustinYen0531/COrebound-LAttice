/**
 * @file menu.ts
 * @description 主畫面:世界舞台影片輪播 + 標題 + 開始遊玩(選隊長)+ 玩法說明。
 */

import type { CaptainId } from "../legacy/data/戰鬥原語";
import { CAPTAIN_BASE } from "../legacy/data/控制引擎";
import { 主動技能效果參數 } from "../legacy/captain/主動技能效果";
import { music } from "../game/assets";

const CAPTAINS: Array<{ id: CaptainId; name: string; title: string; skill: string; control: string }> = [
  { id: "conductor", name: "Conductor 指導者", title: "掌管小隊戰術律動", skill: "加速 — 全隊移速 ×1.6,持續 3 秒", control: "擊退:子彈把敵人往後推" },
  { id: "operator", name: "Operator 操作者", title: "機械與環境精密控制", skill: "傳送點 — 朝面向瞬移 620 單位", control: "沉默:敵人短時間無法開火" },
  { id: "launcher", name: "Launcher 投射者", title: "遠程能量引導與位移", skill: "鉤索拖曳 — 把範圍內敵人拉到身邊", control: "眩暈:敵人定身無法行動" },
  { id: "architect", name: "Architect 建築師", title: "防禦工事與陣型加固", skill: "減速領域 — 原地放下 4 秒緩速圈", control: "減速:敵人移動變慢" },
];

const WORLD_VIDEOS = ["geometry", "organic", "fractal", "mechanical"];

export function showMenu(root: HTMLElement, onStart: (captain: CaptainId) => void): void {
  root.innerHTML = `
    <div class="menu">
      <video class="menu-video" autoplay muted loop playsinline></video>
      <div class="menu-scrim"></div>
      <div class="menu-content">
        <h1 class="menu-title">COrebound <span>LAttence</span></h1>
        <p class="menu-sub">重製版 — 圍繞中心展開的圖騰小隊生存戰</p>
        <div class="menu-buttons">
          <button class="btn primary big" id="btn-start">開始遊玩</button>
          <button class="btn big" id="btn-help">玩法說明</button>
        </div>
        <p class="menu-foot">舊專案素材與設計全量重用 · 單人 PVE 通關制</p>
      </div>
      <div class="captain-select hidden">
        <h2>選擇你的隊長引擎</h2>
        <div class="captain-cards">
          ${CAPTAINS.map((c) => `
            <div class="captain-card" data-id="${c.id}">
              <div class="captain-art" style="background-image:url(assets/captains/${c.id}.png)"></div>
              <h3>${c.name}</h3>
              <p class="cap-title">${c.title}</p>
              <p class="cap-stat">HP ${CAPTAIN_BASE[c.id].hp} · ATK ${CAPTAIN_BASE[c.id].atk}</p>
              <p class="cap-skill">⚡ ${c.skill}</p>
              <p class="cap-ctrl">🎯 2★ 起:${c.control}</p>
              <button class="btn primary">以此隊長出擊</button>
            </div>`).join("")}
        </div>
        <button class="btn" id="btn-back">返回</button>
      </div>
      <div class="help-panel hidden">
        <div class="help-inner">
          <h2>玩法說明</h2>
          <ol>
            <li><b>目標</b>:在四個世界達成擊殺指標 → 召喚並擊敗世界守護者 ×4 → 集齊四枚晶核印記 → 回中央廣場召喚最終 Boss <b>COLA</b> 並擊敗它。</li>
            <li><b>操作</b>:WASD/方向鍵移動;Space 隊長主動技(耗 40 能量);E 與雕像/工坊/商店/祭壇互動;Tab 管理介面;1~4 使用藥水。</li>
            <li><b>成長</b>:打怪掉「原石」與「生物材料」→ 在<b>雕像</b>供奉材料解鎖成員(最多 8 名)→ 在<b>工坊</b>把多餘材料熔成家族碎片、為成員升星。</li>
            <li><b>武器</b>:同家族成員 2 名(累計 2★)自動啟用該家族武器;人越多星越高,武器越強。四家族:護盾🛡 / 多發💥 / 直線🎯 / 地雷💣。</li>
            <li><b>隊長</b>:小隊總星 5/10/15 時自動進化,2★ 起所有子彈附帶隊長控制效果。</li>
            <li><b>壓力</b>:10 分鐘後晶格侵蝕開始向中心收縮,圈外每秒扣 5% 生命;死亡扣 30% 原石並在中央廣場復活,<b>第 3 次死亡即失敗</b>。</li>
            <li><b>提示</b>:T2 精英只在各世界虛線核心圈出沒;禪繞寶箱花 50% 能量開啟,掉大量原石。</li>
          </ol>
          <button class="btn primary" id="btn-help-close">知道了</button>
        </div>
      </div>
    </div>
  `;

  const video = root.querySelector<HTMLVideoElement>(".menu-video")!;
  let vidIdx = Math.floor(Math.random() * WORLD_VIDEOS.length);
  const playVideo = () => {
    video.src = `assets/video/${WORLD_VIDEOS[vidIdx]}.mp4`;
    video.play().catch(() => {});
  };
  video.addEventListener("ended", () => { vidIdx = (vidIdx + 1) % WORLD_VIDEOS.length; playVideo(); });
  // loop 屬性開著時 ended 不會觸發;改用計時輪播
  video.loop = false;
  playVideo();

  const menuContent = root.querySelector<HTMLElement>(".menu-content")!;
  const select = root.querySelector<HTMLElement>(".captain-select")!;
  const help = root.querySelector<HTMLElement>(".help-panel")!;

  root.querySelector("#btn-start")!.addEventListener("click", () => {
    music.unlock();
    music.play("title");
    menuContent.classList.add("hidden");
    select.classList.remove("hidden");
  });
  root.querySelector("#btn-help")!.addEventListener("click", () => {
    music.unlock();
    music.play("title");
    help.classList.remove("hidden");
  });
  root.querySelector("#btn-help-close")!.addEventListener("click", () => help.classList.add("hidden"));
  root.querySelector("#btn-back")!.addEventListener("click", () => {
    select.classList.add("hidden");
    menuContent.classList.remove("hidden");
  });
  root.querySelectorAll<HTMLElement>(".captain-card").forEach((card) => {
    card.querySelector("button")!.addEventListener("click", () => {
      const id = card.dataset.id as CaptainId;
      onStart(id);
    });
  });

  music.play("title");
}
