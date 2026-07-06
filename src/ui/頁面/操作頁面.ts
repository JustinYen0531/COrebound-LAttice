/**
 * @file 操作頁面.ts
 * @description 戰鬥 HUD（IC 預設常駐層）。示範：左右滑互斥 R1、頭像展圈 → 進管理介面、
 * 驚嘆號快跳互動子頁 R6、世界時鐘持續流動、終局事件最高優先權 R11。
 *
 *              本版新增:嵌入「世界地圖層」,玩家可用 WASD 在 placeholder 地圖上移動,
 *              靠近熔爐/雕像/工作台/商店/祭壇時自動觸發靠近狀態並顯示驚嘆號。
 */
import type { World } from "../../data/成員型別";
import { MEMBERS } from "../../data/成員資料庫";
import { 應用程式狀態 } from "../應用程式狀態";
import { 戰鬥HUD接線 } from "../戰鬥HUD接線";
import { 建立世界地圖層, 讀取玩家位置 } from "../元件/世界地圖層";
import {
  取得全部可召喚怪物圖鑑,
  取得可召喚怪物圖鑑,
  取得訓練編隊預設列表,
  取得訓練道場摘要,
  回滿訓練玩家生命,
  清空訓練敵人,
  重置訓練碰撞統計,
  套用訓練編隊預設,
  設定訓練移動倍率,
  設定訓練預選怪物,
  設定訓練世界場景,
  召喚訓練敵人,
} from "../訓練道場狀態";
import * as 背包 from "../../economy/背包狀態";
import { smelt } from "../../economy/熔爐熔煉";
import {
  升星上陣隊員,
  取得上陣養成,
  小隊屬性摘要,
  當前隊長星級,
  隊員累計總星級,
  重置養成,
} from "../../progression/養成狀態";
import { 刷新正式最大生命, 回滿正式玩家生命, 取得正式小隊摘要 } from "../正式對局小隊狀態";
import { 對局進度摘要, 記錄世界擊殺, 重置對局進度 } from "../對局進度狀態";
import { 重置驗收場狀態, 取得驗收場快照 } from "../驗收場狀態";
import { 隊長清單 } from "../資料/隊長清單";
import { 選文 } from "../語系";
import { 取得音樂狀態, 切換音樂靜音, 訂閱音樂狀態, 設定音樂音量 } from "../../audio/音樂管理";

function 雙語(中文: string, 英文: string): string {
  return 選文(應用程式狀態.額外.語言, 中文, 英文);
}

function 世界顯示名(world: World): string {
  return {
    geometry: 雙語("幾何", "Geometry"),
    organic: 雙語("有機", "Organic"),
    fractal: 雙語("分形", "Fractal"),
    mechanical: 雙語("機械", "Mechanical"),
  }[world];
}

function 家族顯示名(family: string): string {
  return {
    shield: 雙語("護盾", "Shield"),
    multishot: 雙語("多發", "Multishot"),
    straight: 雙語("直線", "Straight"),
    mine: 雙語("地雷", "Mine"),
    laser: 雙語("激光", "Laser"),
  }[family] ?? family;
}

function 發送訓練場事件(type: string): void {
  window.dispatchEvent(new CustomEvent("dojo-acceptance-action", { detail: { type } }));
}

function 發送Showcase事件(type: string, detail: Record<string, unknown> = {}): void {
  window.dispatchEvent(new CustomEvent("showcase-action", { detail: { type, ...detail } }));
}

function 建立Showcase快捷面板(): HTMLElement {
  const panel = document.createElement("aside");
  panel.className = "Showcase控制台";
  let 收合 = false;
  let 已選Showcase怪物Id: string | null = null;

  const render = () => {
    const hp = 取得正式小隊摘要();
    const catalog = 取得全部可召喚怪物圖鑑().filter((monster) => monster.world !== "core");
    const selectedId = 已選Showcase怪物Id || 取得訓練道場摘要().selectedEnemyMonsterId || catalog[0]?.id || "";
    panel.innerHTML = `
      <header><div><small>SHOWCASE MODE</small><strong>${雙語("正式對局沙盒工具", "Formal Run Sandbox")}</strong></div><button class="二級按鈕" data-collapse>${收合 ? "+" : "−"}</button></header>
      <div class="Showcase控制台-內容" ${收合 ? "hidden" : ""}>
        <div class="Showcase控制台-狀態">${雙語("正式生命", "Formal HP")} ${hp.playerHp}/${hp.playerMaxHp} · ${雙語("工具只影響本局", "Tools affect this run only")}</div>
        <div class="Showcase控制台-列"><button class="一級按鈕" data-management>${雙語("管理介面", "Management")}</button><button class="二級按鈕" data-heal>${雙語("回滿生命", "Restore HP")}</button><button class="二級按鈕" data-clear>${雙語("清空敵群", "Clear Enemies")}</button></div>
        <label>${雙語("就地召敵", "Spawn Enemies Here")}<select data-enemy></select></label>
        <div class="Showcase控制台-列"><button class="一級按鈕" data-spawn="1">${雙語("召喚 1", "Spawn 1")}</button><button class="二級按鈕" data-spawn="3">${雙語("召喚 3", "Spawn 3")}</button><button class="二級按鈕" data-spawn="6">${雙語("召喚 6", "Spawn 6")}</button></div>
        <label>${雙語("移動速度", "Move Speed")}<div class="Showcase控制台-列" data-speed></div></label>
        <div class="Showcase控制台-列"><button class="二級按鈕" data-resources>${雙語("給測試資源", "Give Test Resources")}</button><button class="二級按鈕" data-upgrade>${雙語("全員升星", "Upgrade All")}</button></div>
        <div class="Showcase控制台-列"><button class="二級按鈕" data-guardians>${雙語("達成並召喚守護者", "Ready & Spawn Guardians")}</button><button class="二級按鈕" data-cola>${雙語("召喚 COLA", "Spawn COLA")}</button></div>
      </div>`;

    panel.querySelector<HTMLButtonElement>("[data-collapse]")!.onclick = () => { 收合 = !收合; render(); };
    panel.querySelector<HTMLButtonElement>("[data-management]")!.onclick = () => 應用程式狀態.進入管理介面("小隊");
    panel.querySelector<HTMLButtonElement>("[data-heal]")!.onclick = () => { 回滿正式玩家生命(); render(); };
    panel.querySelector<HTMLButtonElement>("[data-clear]")!.onclick = () => 發送Showcase事件("clear_enemies");

    const enemySelect = panel.querySelector<HTMLSelectElement>("[data-enemy]")!;
    enemySelect.size = Math.min(12, Math.max(8, catalog.length));
    enemySelect.style.minHeight = "220px";
    enemySelect.style.maxHeight = "280px";
    enemySelect.style.overflowY = "auto";
    for (const monster of catalog) {
      const option = document.createElement("option");
      option.value = monster.id;
      option.selected = monster.id === selectedId;
      const worldLabel = monster.world === "geometry"
        ? 雙語("幾何", "Geometry")
        : monster.world === "organic"
          ? 雙語("有機", "Organic")
          : monster.world === "fractal"
            ? 雙語("分形", "Fractal")
            : 雙語("機械", "Mechanical");
      option.textContent = `[${worldLabel}] T${monster.tier} | ${monster.no.toString().padStart(2, "0")} ${應用程式狀態.額外.語言 === "zh" ? monster.nameZh : monster.nameEn}`;
      enemySelect.appendChild(option);
    }
    enemySelect.onchange = () => {
      已選Showcase怪物Id = enemySelect.value;
      設定訓練預選怪物(enemySelect.value);
    };
    panel.querySelectorAll<HTMLButtonElement>("[data-spawn]").forEach((button) => {
      button.onclick = () => {
        已選Showcase怪物Id = enemySelect.value;
        發送Showcase事件("spawn_enemies", { monsterId: enemySelect.value, count: Number(button.dataset.spawn) });
      };
    });

    const speedRow = panel.querySelector<HTMLElement>("[data-speed]")!;
    [0.5, 1, 1.5, 2].forEach((scale) => {
      const button = document.createElement("button");
      button.className = Math.abs(應用程式狀態.額外.Showcase移動倍率 - scale) < 0.01 ? "一級按鈕" : "二級按鈕";
      button.textContent = `${scale}x`;
      button.onclick = () => 應用程式狀態.設定Showcase移動倍率(scale);
      speedRow.appendChild(button);
    });

    panel.querySelector<HTMLButtonElement>("[data-resources]")!.onclick = () => {
      背包.加入原石(2000);
      for (const family of ["shield", "multishot", "straight", "mine", "laser"] as const) 背包.加入碎片(family, 100);
      for (let no = 1; no <= 24; no += 1) 背包.加入材料(no, 20);
      render();
    };
    panel.querySelector<HTMLButtonElement>("[data-upgrade]")!.onclick = () => {
      for (let round = 0; round < 6; round += 1) for (let index = 0; index < 取得上陣養成().length; index += 1) 升星上陣隊員(index);
      刷新正式最大生命();
      render();
    };
    panel.querySelector<HTMLButtonElement>("[data-guardians]")!.onclick = () => {
      for (const world of ["geometry", "organic", "fractal", "mechanical"] as const) {
        for (let kind = 0; kind < 3; kind += 1) for (let count = 0; count < 5; count += 1) 記錄世界擊殺(world, 1, `showcase_t${kind}`, "formal");
        for (let elite = 0; elite < 3; elite += 1) 記錄世界擊殺(world, 2, undefined, "formal");
      }
      發送Showcase事件("summon_guardians");
    };
    panel.querySelector<HTMLButtonElement>("[data-cola]")!.onclick = () => 發送Showcase事件("summon_cola", { bypass: true });
  };
  render();
  return panel;
}

function 建立訓練道場快捷面板(): HTMLElement {
  const panel = document.createElement("div");
  panel.style.position = "absolute";
  panel.style.top = "78px";
  panel.style.left = "24px";
  panel.style.zIndex = "26";
  panel.style.width = "360px";
  panel.style.display = "flex";
  panel.style.flexDirection = "column";
  panel.style.gap = "12px";
  panel.style.padding = "16px";
  panel.style.background = "rgba(8, 12, 20, 0.94)";
  panel.style.border = "1px solid rgba(255,255,255,0.14)";
  panel.style.boxShadow = "0 10px 30px rgba(0,0,0,0.34)";
  panel.style.maxHeight = "calc(100vh - 120px)";
  panel.style.overflowY = "auto";
  let refreshTimer = 0;

  const render = () => {
    const summary = 取得訓練道場摘要();
    const playerPos = 讀取玩家位置();
    const catalog = 取得可召喚怪物圖鑑();
    const monitor = summary.collisionMonitor;
    const bag = 背包.背包快照();
    const squad = 小隊屬性摘要();
    const roster = 取得上陣養成();
    const prog = 對局進度摘要("dojo");
    const acceptance = 取得驗收場快照();
    panel.innerHTML = "";

    const title = document.createElement("div");
    const resultLabel =
      acceptance.result === "victory"
        ? 雙語("已通過", "Passed")
        : acceptance.result === "defeat"
          ? 雙語("失敗", "Failed")
          : acceptance.result === "running"
            ? 雙語("進行中", "Running")
            : 雙語("待命", "Standby");
    const resultColor =
      acceptance.result === "victory" ? "#7df0b2" : acceptance.result === "defeat" ? "#ff8a8a" : acceptance.result === "running" ? "#ffd37f" : "#8d93ad";
    title.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
        <div>
          <div style="font-size:0.74rem;letter-spacing:0.12em;color:#6f8cff;text-transform:uppercase;">${雙語("訓練道場驗收控制台", "Training Dojo Validation Console")}</div>
          <div style="font-size:1rem;font-weight:700;color:#f2e6c9;margin-top:4px;">${雙語("左上角直接跑完整遊戲迴圈", "Run the full gameplay loop from the top-left")}</div>
        </div>
        <div style="font-size:0.72rem;color:${resultColor};font-weight:700;white-space:nowrap;">${resultLabel}</div>
      </div>
      <div id="道場面板-即時資訊" style="font-size:0.76rem;color:#8d93ad;line-height:1.5;margin-top:6px;">
        ${雙語("位置", "Position")} X ${Math.round(playerPos.x)} / Y ${Math.round(playerPos.y)} | ${雙語("生命", "HP")} ${summary.playerHp}/${summary.playerMaxHp} | ${雙語("敵群", "Enemies")} ${summary.aliveEnemies}
      </div>
      <div style="font-size:0.74rem;color:#c8d0ec;line-height:1.5;margin-top:6px;">${acceptance.lastEvent}</div>
    `;
    panel.appendChild(title);

    const primaryRow = document.createElement("div");
    primaryRow.className = "按鈕列";
    primaryRow.style.marginTop = "0";
    const squadBtn = document.createElement("button");
    squadBtn.className = "一級按鈕";
    squadBtn.textContent = 雙語("編隊管理", "Squad Setup");
    squadBtn.onclick = () => 應用程式狀態.進入管理介面("小隊");
    const summonPageBtn = document.createElement("button");
    summonPageBtn.className = "二級按鈕";
    summonPageBtn.textContent = 雙語("召敵面板", "Summon Panel");
    summonPageBtn.onclick = () => 應用程式狀態.進入管理介面("地圖");
    const backBtn = document.createElement("button");
    backBtn.className = "二級按鈕";
    backBtn.textContent = 雙語("離開道場", "Leave Dojo");
    backBtn.onclick = () => 應用程式狀態.退出訓練道場();
    primaryRow.append(squadBtn, summonPageBtn, backBtn);
    panel.appendChild(primaryRow);

    // —— 隊長主動技能：讀數 + 施放（可驗收）——
    const skillBlock = document.createElement("div");
    skillBlock.style.display = "flex";
    skillBlock.style.flexDirection = "column";
    skillBlock.style.gap = "8px";
    skillBlock.style.padding = "12px";
    skillBlock.style.background = "rgba(255,255,255,0.03)";
    skillBlock.style.border = "1px solid rgba(255,255,255,0.06)";
    const skill = 戰鬥HUD接線.主動技能讀數();
    const captainName = (() => {
      const captain = 隊長清單.find((c) => c.id === skill.captainId);
      if (!captain) return skill.captainId;
      return 應用程式狀態.額外.語言 === "zh" ? captain.名稱 : captain.名稱英;
    })();
    const cdText =
      skill.cooldownRemaining > 0.05
        ? 雙語(`冷卻 ${skill.cooldownRemaining.toFixed(1)}s`, `CD ${skill.cooldownRemaining.toFixed(1)}s`)
        : skill.energyEnough
          ? 雙語("就緒", "Ready")
          : 雙語("能量不足", "Low Energy");
    skillBlock.innerHTML = `
      <div style="font-size:0.78rem;color:#f2e6c9;font-weight:700;">${雙語("隊長主動技能", "Captain Active Skill")}</div>
      <div style="font-size:0.78rem;color:#e9ecf8;">${captainName}｜<b>${skill.label}</b></div>
      <div style="font-size:0.74rem;color:#8d93ad;">${雙語("能量", "Energy")} ${Math.round(skill.energyCurrent)}/${skill.energyMax}（${雙語("消耗", "cost")} ${skill.energyCost}）｜ ${cdText}</div>
    `;
    const castRow = document.createElement("div");
    castRow.className = "按鈕列";
    castRow.style.marginTop = "0";
    const castBtn = document.createElement("button");
    castBtn.className = skill.castable ? "一級按鈕" : "二級按鈕";
    if (!skill.castable) castBtn.classList.add("鎖定");
    castBtn.textContent = 雙語("施放主動技能（Space）", "Cast Active Skill (Space)");
    castBtn.onclick = () => {
      window.dispatchEvent(new CustomEvent("request-cast-active"));
      render();
    };
    castRow.appendChild(castBtn);
    skillBlock.appendChild(castRow);
    panel.appendChild(skillBlock);

    const acceptanceBlock = document.createElement("div");
    acceptanceBlock.style.display = "flex";
    acceptanceBlock.style.flexDirection = "column";
    acceptanceBlock.style.gap = "8px";
    acceptanceBlock.style.padding = "12px";
    acceptanceBlock.style.background = "rgba(255,255,255,0.03)";
    acceptanceBlock.style.border = "1px solid rgba(255,255,255,0.06)";
    const shardSummary = (Object.entries(bag.碎片) as [string, number][])
      .filter(([, count]) => count > 0)
      .map(([family, count]) => `${家族顯示名(family)}:${count}`)
      .join(" ｜ ") || 雙語("無", "None");
    const guardianSummary = prog.守護者
      .map((entry) => {
        const label = 世界顯示名(entry.world);
        if (entry.defeated) return `${label}✓`;
        if (entry.ready) return `${label} ${雙語("可召喚", "Ready")}`;
        return `${label} T2 ${entry.readiness.eliteKills}/3`;
      })
      .join(" ｜ ");
    const killSummary = Object.entries(acceptance.killBreakdown)
      .map(([key, count]) => `${key}:${count}`)
      .join(" ｜ ") || 雙語("尚無擊殺", "No kills yet");
    acceptanceBlock.innerHTML = `
      <div style="font-size:0.78rem;color:#f2e6c9;font-weight:700;">${雙語("驗收進度", "Validation Progress")}</div>
      <div style="font-size:0.75rem;color:#e9ecf8;">${雙語("擊殺", "Kills")} <b>${acceptance.kills}</b> ｜ ${雙語("原石", "Gems")} <b>${bag.原石}</b> ｜ ${雙語("材料", "Materials")} <b>${bag.材料總數}</b></div>
      <div style="font-size:0.74rem;color:#8d93ad;">${雙語("碎片", "Shards")}：${shardSummary}</div>
      <div style="font-size:0.75rem;color:#e9ecf8;">${雙語("正式", "Live")} ATK <b>${squad.totalAtk}</b> | HP <b>${squad.totalHp}</b> | ${雙語("隊長", "Captain")} ${當前隊長星級()}★ | ${雙語("累計", "Total")} ${隊員累計總星級()}★</div>
      <div style="font-size:0.74rem;color:#8d93ad;">${雙語("上陣星級", "Deployed Stars")}：${roster.map((member) => { const m = MEMBERS.find(candidate => candidate.no === member.memberNo); return `${m ? (應用程式狀態.額外.語言 === "zh" ? m.nameZh : m.nameEn) : ""}${member.star}★`; }).join(" / ")}</div>
      <div style="font-size:0.74rem;color:#e9ecf8;">${雙語("守護者", "Guardians")}：${guardianSummary}</div>
      <div style="font-size:0.74rem;color:#e9ecf8;">${雙語("印記", "Sigils")} ${prog.印記數}/4 | COLA ${prog.可召喚COLA ? 雙語("可召喚", "Ready") : 雙語("未集齊", "Not Ready")} | ${雙語("全世界狂暴", "All-World Enrage")} ${prog.全守護者已倒 ? 雙語("是", "Yes") : 雙語("否", "No")}</div>
      <div style="font-size:0.72rem;color:#8d93ad;">${雙語("擊殺分布", "Kill Spread")}：${killSummary}</div>
    `;
    panel.appendChild(acceptanceBlock);

    const speedBlock = document.createElement("div");
    speedBlock.style.display = "flex";
    speedBlock.style.flexDirection = "column";
    speedBlock.style.gap = "8px";
    speedBlock.style.padding = "12px";
    speedBlock.style.background = "rgba(255,255,255,0.03)";
    speedBlock.style.border = "1px solid rgba(255,255,255,0.06)";
    speedBlock.innerHTML = `<div style="font-size:0.78rem;color:#f2e6c9;font-weight:700;">${雙語("移動速度", "Move Speed")}</div>`;
    const speedBtns = document.createElement("div");
    speedBtns.className = "按鈕列";
    speedBtns.style.marginTop = "0";
    [0.5, 1, 1.5, 2].forEach((scale) => {
      const btn = document.createElement("button");
      btn.className = Math.abs(summary.moveSpeedScale - scale) < 0.01 ? "一級按鈕" : "二級按鈕";
      btn.textContent = `${scale.toFixed(scale % 1 === 0 ? 0 : 1)}x`;
      btn.onclick = () => {
        設定訓練移動倍率(scale);
        render();
      };
      speedBtns.appendChild(btn);
    });
    speedBlock.appendChild(speedBtns);
    panel.appendChild(speedBlock);

    const presetBlock = document.createElement("div");
    presetBlock.style.display = "flex";
    presetBlock.style.flexDirection = "column";
    presetBlock.style.gap = "8px";
    presetBlock.style.padding = "12px";
    presetBlock.style.background = "rgba(255,255,255,0.03)";
    presetBlock.style.border = "1px solid rgba(255,255,255,0.06)";
    presetBlock.innerHTML = `<div style="font-size:0.78rem;color:#f2e6c9;font-weight:700;">${雙語("編隊預設", "Squad Presets")}</div>`;
    const presetBtns = document.createElement("div");
    presetBtns.className = "按鈕列";
    presetBtns.style.marginTop = "0";
    取得訓練編隊預設列表().forEach((preset) => {
      const btn = document.createElement("button");
      btn.className = preset.id === summary.activePresetId ? "一級按鈕" : "二級按鈕";
      btn.textContent = preset.label;
      btn.onclick = () => {
        套用訓練編隊預設(preset.id);
        render();
      };
      presetBtns.appendChild(btn);
    });
    presetBlock.appendChild(presetBtns);
    panel.appendChild(presetBlock);

    const summonBlock = document.createElement("div");
    summonBlock.style.display = "flex";
    summonBlock.style.flexDirection = "column";
    summonBlock.style.gap = "8px";
    summonBlock.style.padding = "12px";
    summonBlock.style.background = "rgba(255,255,255,0.03)";
    summonBlock.style.border = "1px solid rgba(255,255,255,0.06)";
    summonBlock.innerHTML = `<div style="font-size:0.78rem;color:#f2e6c9;font-weight:700;">${雙語("就地召敵", "Spawn Enemies Here")}</div>`;

    const worldSelect = document.createElement("select");
    worldSelect.style.width = "100%";
    worldSelect.style.padding = "9px 10px";
    worldSelect.style.background = "rgba(17,21,33,0.92)";
    worldSelect.style.color = "#e9ecf8";
    worldSelect.style.border = "1px solid rgba(111,140,255,0.28)";
    (["geometry", "organic", "fractal", "mechanical"] as const).forEach((world) => {
      const option = document.createElement("option");
      option.value = world;
      option.textContent = `${世界顯示名(world)} ${雙語("世界場景", "Scene")}`;
      option.selected = world === summary.selectedWorld;
      worldSelect.appendChild(option);
    });
    worldSelect.onchange = () => {
      設定訓練世界場景(worldSelect.value as World);
      render();
    };
    summonBlock.appendChild(worldSelect);

    const select = document.createElement("select");
    select.style.width = "100%";
    select.style.padding = "9px 10px";
    select.style.background = "rgba(17,21,33,0.92)";
    select.style.color = "#e9ecf8";
    select.style.border = "1px solid rgba(111,140,255,0.28)";
    const selectedEnemyId = summary.selectedEnemyMonsterId;
    catalog.forEach((monster) => {
      const option = document.createElement("option");
      option.value = monster.id;
      option.textContent = `T${monster.tier} | ${monster.no.toString().padStart(2, "0")} ${應用程式狀態.額外.語言 === "zh" ? monster.nameZh : monster.nameEn}`;
      option.selected = monster.id === selectedEnemyId;
      select.appendChild(option);
    });
    select.onchange = () => {
      設定訓練預選怪物(select.value);
      render();
    };
    summonBlock.appendChild(select);

    const summonButtons = document.createElement("div");
    summonButtons.className = "按鈕列";
    summonButtons.style.marginTop = "0";
    [
      { label: 雙語("召喚 1", "Spawn 1"), count: 1, style: "一級按鈕" },
      { label: 雙語("召喚 3", "Spawn 3"), count: 3, style: "二級按鈕" },
      { label: 雙語("召喚 6", "Spawn 6"), count: 6, style: "二級按鈕" },
    ].forEach((item) => {
      const btn = document.createElement("button");
      btn.className = item.style;
      btn.textContent = item.label;
      btn.onclick = () => {
        召喚訓練敵人(select.value, item.count, 讀取玩家位置());
        render();
      };
      summonButtons.appendChild(btn);
    });
    summonBlock.appendChild(summonButtons);
    panel.appendChild(summonBlock);

    const economyBlock = document.createElement("div");
    economyBlock.style.display = "flex";
    economyBlock.style.flexDirection = "column";
    economyBlock.style.gap = "8px";
    economyBlock.style.padding = "12px";
    economyBlock.style.background = "rgba(255,255,255,0.03)";
    economyBlock.style.border = "1px solid rgba(255,255,255,0.06)";
    economyBlock.innerHTML = `<div style="font-size:0.78rem;color:#f2e6c9;font-weight:700;">${雙語("養成與資源", "Growth and Resources")}</div>`;

    const economyButtons = document.createElement("div");
    economyButtons.className = "按鈕列";
    economyButtons.style.marginTop = "0";
    const addButton = (label: string, fn: () => void, primary = false) => {
      const btn = document.createElement("button");
      btn.className = primary ? "一級按鈕" : "二級按鈕";
      btn.textContent = label;
      btn.onclick = () => {
        fn();
        render();
      };
      economyButtons.appendChild(btn);
    };

    addButton(雙語("給測試資源", "Give Test Resources"), () => {
      背包.加入原石(2000);
      for (const family of ["shield", "multishot", "straight", "mine", "laser"] as const) {
        背包.加入碎片(family, 100);
      }
      for (let no = 1; no <= 24; no += 1) 背包.加入材料(no, 20);
    }, true);
    addButton(雙語("熔煉", "Smelt"), () => {
      const latest = 背包.背包快照();
      const inputs = latest.材料明細.map((item) => ({ materialNo: item.no, count: item.count }));
      if (inputs.length === 0) return;
      const result = smelt({ furnace: { family: "straight", world: "organic" }, inputs });
      for (const item of inputs) 背包.花費材料(item.materialNo, item.count);
      背包.加入碎片("straight", result.shards);
    });
    addButton(雙語("升星隊員", "Upgrade One Member"), () => {
      for (let index = 0; index < roster.length; index += 1) {
        if (roster[index].star >= 3) continue;
        if (升星上陣隊員(index).ok) {
          刷新正式最大生命();
          break;
        }
      }
    });
    addButton(雙語("全員升星", "Upgrade All"), () => {
      let changed = false;
      for (let round = 0; round < 6; round += 1) {
        for (let index = 0; index < roster.length; index += 1) {
          if (升星上陣隊員(index).ok) changed = true;
        }
      }
      if (changed) 刷新正式最大生命();
    });
    economyBlock.appendChild(economyButtons);
    panel.appendChild(economyBlock);

    const progressBlock = document.createElement("div");
    progressBlock.style.display = "flex";
    progressBlock.style.flexDirection = "column";
    progressBlock.style.gap = "8px";
    progressBlock.style.padding = "12px";
    progressBlock.style.background = "rgba(255,255,255,0.03)";
    progressBlock.style.border = "1px solid rgba(255,255,255,0.06)";
    progressBlock.innerHTML = `<div style="font-size:0.78rem;color:#f2e6c9;font-weight:700;">${雙語("守護者與終局", "Guardians and Endgame")}</div>`;

    const progressButtons = document.createElement("div");
    progressButtons.className = "按鈕列";
    progressButtons.style.marginTop = "0";
    const addProgressButton = (label: string, fn: () => void, primary = false) => {
      const btn = document.createElement("button");
      btn.className = primary ? "一級按鈕" : "二級按鈕";
      btn.textContent = label;
      btn.onclick = () => {
        fn();
        render();
      };
      progressButtons.appendChild(btn);
    };
    addProgressButton(雙語("達成守護者條件", "Fill Guardian Requirements"), () => {
      for (const world of ["geometry", "organic", "fractal", "mechanical"] as const) {
        for (let kind = 0; kind < 3; kind += 1) {
          for (let count = 0; count < 5; count += 1) 記錄世界擊殺(world, 1, `dojo_t${kind}`, "dojo");
        }
        for (let elite = 0; elite < 3; elite += 1) 記錄世界擊殺(world, 2, undefined, "dojo");
      }
    }, true);
    addProgressButton(雙語("召喚守護者", "Summon Guardians"), () => 發送訓練場事件("summon_guardians"));
    addProgressButton(雙語("召喚COLA", "Summon COLA"), () => 發送訓練場事件("summon_cola"));
    progressBlock.appendChild(progressButtons);
    panel.appendChild(progressBlock);

    const supportRow = document.createElement("div");
    supportRow.className = "按鈕列";
    supportRow.style.marginTop = "0";
    const healBtn = document.createElement("button");
    healBtn.className = "二級按鈕";
    healBtn.textContent = 雙語("回滿生命", "Restore HP");
    healBtn.onclick = () => {
      回滿訓練玩家生命();
      render();
    };
    const clearBtn = document.createElement("button");
    clearBtn.className = "二級按鈕";
    clearBtn.textContent = 雙語("清空敵群", "Clear Enemies");
    clearBtn.onclick = () => {
      清空訓練敵人();
      render();
    };
    const resetStatsBtn = document.createElement("button");
    resetStatsBtn.className = "二級按鈕";
    resetStatsBtn.textContent = 雙語("重置統計", "Reset Stats");
    resetStatsBtn.onclick = () => {
      重置訓練碰撞統計();
      render();
    };
    const resetRunBtn = document.createElement("button");
    resetRunBtn.className = "二級按鈕";
    resetRunBtn.textContent = 雙語("重置驗收場", "Reset Validation Run");
    resetRunBtn.onclick = () => {
      背包.重置背包();
      重置養成();
      重置對局進度("dojo");
      重置驗收場狀態();
      刷新正式最大生命();
      回滿訓練玩家生命();
      清空訓練敵人();
      重置訓練碰撞統計();
      發送訓練場事件("reset_battlefield");
      render();
    };
    supportRow.append(healBtn, clearBtn, resetStatsBtn, resetRunBtn);
    panel.appendChild(supportRow);

    const collision = document.createElement("div");
    collision.style.padding = "12px";
    collision.style.background = "rgba(255,255,255,0.03)";
    collision.style.border = "1px solid rgba(255,255,255,0.06)";
    collision.style.fontSize = "0.76rem";
    collision.style.lineHeight = "1.6";
    const activeNames = monitor.activeEnemyNames.length > 0 ? monitor.activeEnemyNames.join(英文模式分隔()) : 雙語("無", "None");
    const lastResolvedAgo =
      monitor.lastResolvedAtMs === null ? 雙語("尚未結算", "Not resolved yet") : `${Math.max(0, Math.floor((Date.now() - monitor.lastResolvedAtMs) / 1000))} ${雙語("秒前", "s ago")}`;
    if (summary.lastCollision) {
      collision.innerHTML = `
        <div style="color:#f2e6c9;font-weight:700;">${雙語("最近碰撞", "Recent Collision")}</div>
        <div style="color:#ffcf7f;">${雙語("接觸中", "Touching")}: ${activeNames}</div>
        <div style="color:#e9ecf8;">${雙語("對象", "Targets")}: ${summary.lastCollision.enemyNames.join(英文模式分隔())}</div>
        <div style="color:#8d93ad;">${雙語("我方輸出", "Squad Damage")} ${summary.lastCollision.squadDamage} ｜ ${雙語("承傷", "Damage Taken")} ${summary.lastCollision.enemyDamage}</div>
        <div style="color:#8d93ad;">${雙語("累計", "Total")} ${monitor.collisionCount} ${雙語("次", "hits")} ｜ ${雙語("累積輸出", "Total Squad Damage")} ${monitor.totalSquadDamage} ｜ ${雙語("累積承傷", "Total Damage Taken")} ${monitor.totalEnemyDamage}</div>
        <div style="color:#8d93ad;">${雙語("最近一次結算", "Last Resolution")}: ${lastResolvedAgo}</div>
      `;
    } else {
      collision.innerHTML = `
        <div style="color:#f2e6c9;font-weight:700;">${雙語("最近碰撞", "Recent Collision")}</div>
        <div style="color:#ffcf7f;">${雙語("接觸中", "Touching")}: ${activeNames}</div>
        <div style="color:#8d93ad;">${雙語("目前還沒有接觸紀錄，先就地召一批怪試試看。", "No contact record yet. Spawn a wave nearby and try it.")}</div>
        <div style="color:#8d93ad;">${雙語("累計", "Total")} ${monitor.collisionCount} ${雙語("次", "hits")} ｜ ${雙語("累積輸出", "Total Squad Damage")} ${monitor.totalSquadDamage} ｜ ${雙語("累積承傷", "Total Damage Taken")} ${monitor.totalEnemyDamage}</div>
      `;
    }
    panel.appendChild(collision);
  };

  render();
  // 整個面板的重建降到 1 秒一次（技能 CD、背包、進度等不需要每秒更新 4 次）。
  // 玩家座標 / 生命 / 敵群這種高頻變動的欄位，由獨立的 RAF 迴圈只更新該元素，避免整個面板閃爍。
  refreshTimer = window.setInterval(() => {
    if (!panel.isConnected) {
      window.clearInterval(refreshTimer);
      return;
    }
    render();
  }, 1000);

  let liveRaf = 0;
  const updateLive = () => {
    if (!panel.isConnected) {
      if (liveRaf) cancelAnimationFrame(liveRaf);
      return;
    }
    const liveEl = panel.querySelector<HTMLElement>("#道場面板-即時資訊");
    if (liveEl) {
      const p = 讀取玩家位置();
      const s = 取得訓練道場摘要();
      liveEl.textContent = `${雙語("位置", "Position")} X ${Math.round(p.x)} / Y ${Math.round(p.y)} | ${雙語("生命", "HP")} ${s.playerHp}/${s.playerMaxHp} | ${雙語("敵群", "Enemies")} ${s.aliveEnemies}`;
    }
    liveRaf = requestAnimationFrame(updateLive);
  };
  liveRaf = requestAnimationFrame(updateLive);
  return panel;
}

function 英文模式分隔(): string {
  return 應用程式狀態.額外.語言 === "zh" ? "、" : ", ";
}

function 建立操作頁音樂控制(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.position = "absolute";
  wrap.style.top = "18px";
  wrap.style.right = "24px";
  wrap.style.zIndex = "27";
  wrap.style.width = "min(420px, calc(100vw - 48px))";
  wrap.style.display = "grid";
  wrap.style.gridTemplateColumns = "auto auto minmax(112px, 148px) auto";
  wrap.style.alignItems = "center";
  wrap.style.gap = "8px";
  wrap.style.marginLeft = "auto";
  wrap.style.padding = "8px 12px";
  wrap.style.borderRadius = "999px";
  wrap.style.background = "rgba(255,255,255,0.88)";
  wrap.style.border = "1px solid rgba(44, 58, 91, 0.12)";
  wrap.style.boxShadow = "0 10px 24px rgba(30, 39, 67, 0.12)";

  const label = document.createElement("span");
  label.textContent = 雙語("音樂", "Music");
  label.style.fontSize = "0.76rem";
  label.style.fontWeight = "700";
  label.style.color = "#23314f";

  const muteBtn = document.createElement("button");
  muteBtn.className = "二級按鈕";
  muteBtn.style.padding = "6px 10px";
  muteBtn.style.fontSize = "0.72rem";

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0";
  slider.max = "100";
  slider.step = "1";
  slider.style.width = "100%";
  slider.style.accentColor = "#4d8dff";

  const value = document.createElement("span");
  value.style.fontSize = "0.74rem";
  value.style.fontWeight = "700";
  value.style.color = "#5c6a85";
  value.style.minWidth = "42px";
  value.style.textAlign = "right";

  const track = document.createElement("div");
  track.style.gridColumn = "1 / -1";
  track.style.fontSize = "0.7rem";
  track.style.color = "#7080a3";
  track.style.textAlign = "right";

  const scene = document.createElement("div");
  scene.style.gridColumn = "1 / -1";
  scene.style.fontSize = "0.7rem";
  scene.style.color = "#8d93ad";
  scene.style.textAlign = "right";

  const render = () => {
    const state = 取得音樂狀態();
    slider.value = String(Math.round(state.volume * 100));
    muteBtn.textContent = state.muted ? 雙語("取消靜音", "Unmute") : 雙語("靜音", "Mute");
    value.textContent = state.muted ? 雙語("已靜音", "Muted") : `${Math.round(state.volume * 100)}%`;
    track.textContent = `${雙語("目前曲目", "Now Playing")}: ${state.trackLabel}`;
    scene.textContent = `${雙語("目前場景", "Current Scene")}: ${state.sceneLabel}`;
  };

  muteBtn.onclick = () => {
    切換音樂靜音();
    render();
  };
  slider.oninput = () => {
    設定音樂音量(Number(slider.value) / 100);
    render();
  };

  const unsubscribe = 訂閱音樂狀態(render);
  const observer = new MutationObserver(() => {
    if (!document.body.contains(wrap)) {
      unsubscribe();
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  wrap.append(label, muteBtn, slider, value, track, scene);
  render();
  return wrap;
}

export function 渲染操作頁面(容器: HTMLElement) {
  容器.innerHTML = "";
  const state = 應用程式狀態.畫面;
  if (state.層 !== "操作頁面") return;
  const 額外 = 應用程式狀態.額外;

  const root = document.createElement("div");
  root.className = "操作頁面-root";

  try {
    // 世界地圖層:玩家可走動、靠近設施觸發互動
    root.appendChild(建立世界地圖層());

    if (state.訓練道場) {
      root.appendChild(建立訓練道場快捷面板());
    } else if (額外.Showcase模式) {
      root.appendChild(建立Showcase快捷面板());
    }

    const hud掛載區 = document.createElement("div");
    hud掛載區.className = "戰鬥HUD掛載區";
    root.appendChild(hud掛載區);
    戰鬥HUD接線.掛載(hud掛載區);
    戰鬥HUD接線.同步狀態();
  } catch (error) {
    const fallback = document.createElement("div");
    fallback.style.margin = "96px auto 0";
    fallback.style.maxWidth = "680px";
    fallback.style.padding = "24px";
    fallback.style.borderRadius = "16px";
    fallback.style.background = "rgba(8, 12, 20, 0.92)";
    fallback.style.border = "1px solid rgba(255,255,255,0.1)";
    fallback.style.color = "#f2e6c9";
    fallback.innerHTML = `
      <div style="font-size:1rem;font-weight:700;">${雙語("戰場載入失敗", "Battlefield Load Failed")}</div>
      <div style="margin-top:10px;font-size:0.82rem;line-height:1.6;color:#c8d0ec;">
        ${雙語("這次沒有讓整頁白掉，我先把錯誤攔下來了。請把下面訊息貼給我，我繼續追。", "I caught the failure so the whole page does not go blank. Please send me the message below and I will keep tracing it.")}
      </div>
      <pre style="margin-top:14px;padding:14px;border-radius:12px;background:rgba(0,0,0,0.28);white-space:pre-wrap;word-break:break-word;font-size:0.76rem;color:#ffcf7f;">${String(error instanceof Error ? error.stack ?? error.message : error)}</pre>
    `;
    root.appendChild(fallback);
  }

  容器.appendChild(root);
}
