/**
 * @file 操作頁面.ts
 * @description 戰鬥 HUD（IC 預設常駐層）。示範：左右滑互斥 R1、頭像展圈 → 進管理介面、
 * 驚嘆號快跳互動子頁 R6、世界時鐘持續流動、終局事件最高優先權 R11。
 *
 *              本版新增:嵌入「世界地圖層」,玩家可用 WASD 在 placeholder 地圖上移動,
 *              靠近熔爐/雕像/工作台/商店/祭壇時自動觸發靠近狀態並顯示驚嘆號。
 */
import type { World } from "../../data/成員型別";
import { 應用程式狀態 } from "../應用程式狀態";
import { 戰鬥HUD接線 } from "../戰鬥HUD接線";
import { 建立世界地圖層, 讀取玩家位置 } from "../元件/世界地圖層";
import {
  取得可召喚怪物圖鑑,
  取得訓練編隊預設列表,
  取得訓練道場摘要,
  回滿訓練玩家生命,
  清空訓練敵人,
  重置訓練碰撞統計,
  套用訓練編隊預設,
  設定訓練移動倍率,
  設定訓練預選怪物,
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
import { 刷新正式最大生命 } from "../正式對局小隊狀態";
import { 對局進度摘要, 記錄世界擊殺, 重置對局進度 } from "../對局進度狀態";
import { 重置驗收場狀態, 取得驗收場快照 } from "../驗收場狀態";
import { 隊長清單 } from "../資料/隊長清單";
import { 選文 } from "../語系";

function 雙語(中文: string, 英文: string): string {
  return 選文(應用程式狀態.額外.語言, 中文, 英文);
}

function 發送訓練場事件(type: string): void {
  window.dispatchEvent(new CustomEvent("dojo-acceptance-action", { detail: { type } }));
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
    const prog = 對局進度摘要();
    const acceptance = 取得驗收場快照();
    panel.innerHTML = "";

    const title = document.createElement("div");
    const resultLabel =
      acceptance.result === "victory" ? "已通過" : acceptance.result === "defeat" ? "失敗" : acceptance.result === "running" ? "進行中" : "待命";
    const resultColor =
      acceptance.result === "victory" ? "#7df0b2" : acceptance.result === "defeat" ? "#ff8a8a" : acceptance.result === "running" ? "#ffd37f" : "#8d93ad";
    title.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;">
        <div>
          <div style="font-size:0.74rem;letter-spacing:0.12em;color:#6f8cff;text-transform:uppercase;">訓練道場驗收控制台</div>
          <div style="font-size:1rem;font-weight:700;color:#f2e6c9;margin-top:4px;">左上角直接跑完整遊戲迴圈</div>
        </div>
        <div style="font-size:0.72rem;color:${resultColor};font-weight:700;white-space:nowrap;">${resultLabel}</div>
      </div>
      <div id="道場面板-即時資訊" style="font-size:0.76rem;color:#8d93ad;line-height:1.5;margin-top:6px;">
        位置 X ${Math.round(playerPos.x)} / Y ${Math.round(playerPos.y)} ｜ 生命 ${summary.playerHp}/${summary.playerMaxHp} ｜ 敵群 ${summary.aliveEnemies}
      </div>
      <div style="font-size:0.74rem;color:#c8d0ec;line-height:1.5;margin-top:6px;">${acceptance.lastEvent}</div>
    `;
    panel.appendChild(title);

    const primaryRow = document.createElement("div");
    primaryRow.className = "按鈕列";
    primaryRow.style.marginTop = "0";
    const squadBtn = document.createElement("button");
    squadBtn.className = "一級按鈕";
    squadBtn.textContent = "編隊管理";
    squadBtn.onclick = () => 應用程式狀態.進入管理介面("小隊");
    const summonPageBtn = document.createElement("button");
    summonPageBtn.className = "二級按鈕";
    summonPageBtn.textContent = "召敵面板";
    summonPageBtn.onclick = () => 應用程式狀態.進入管理介面("地圖");
    const backBtn = document.createElement("button");
    backBtn.className = "二級按鈕";
    backBtn.textContent = "離開道場";
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
    const captainName = 隊長清單.find((c) => c.id === skill.captainId)?.名稱 ?? skill.captainId;
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
      .map(([family, count]) => `${family}:${count}`)
      .join(" ｜ ") || "無";
    const guardianSummary = prog.守護者
      .map((entry) => {
        const label = { geometry: "幾何", organic: "有機", fractal: "分形", mechanical: "機械" }[entry.world];
        if (entry.defeated) return `${label}✓`;
        if (entry.ready) return `${label}可召`;
        return `${label}${entry.readiness.eliteKills}/3精`;
      })
      .join(" ｜ ");
    const killSummary = Object.entries(acceptance.killBreakdown)
      .map(([key, count]) => `${key}:${count}`)
      .join(" ｜ ") || "尚無擊殺";
    acceptanceBlock.innerHTML = `
      <div style="font-size:0.78rem;color:#f2e6c9;font-weight:700;">驗收進度</div>
      <div style="font-size:0.75rem;color:#e9ecf8;">擊殺 <b>${acceptance.kills}</b> ｜ 原石 <b>${bag.原石}</b> ｜ 材料 <b>${bag.材料總數}</b></div>
      <div style="font-size:0.74rem;color:#8d93ad;">碎片：${shardSummary}</div>
      <div style="font-size:0.75rem;color:#e9ecf8;">正式 ATK <b>${squad.totalAtk}</b> ｜ HP <b>${squad.totalHp}</b> ｜ 隊長 ${當前隊長星級()}★ ｜ 累計 ${隊員累計總星級()}★</div>
      <div style="font-size:0.74rem;color:#8d93ad;">上陣星級：${roster.map((member) => `${member.nameZh}${member.star}★`).join("、")}</div>
      <div style="font-size:0.74rem;color:#e9ecf8;">守護者：${guardianSummary}</div>
      <div style="font-size:0.74rem;color:#e9ecf8;">印記 ${prog.印記數}/4 ｜ COLA ${prog.可召喚COLA ? "可召喚" : "未集齊"} ｜ 全世界狂暴 ${prog.全守護者已倒 ? "是" : "否"}</div>
      <div style="font-size:0.72rem;color:#8d93ad;">擊殺分布：${killSummary}</div>
    `;
    panel.appendChild(acceptanceBlock);

    const speedBlock = document.createElement("div");
    speedBlock.style.display = "flex";
    speedBlock.style.flexDirection = "column";
    speedBlock.style.gap = "8px";
    speedBlock.style.padding = "12px";
    speedBlock.style.background = "rgba(255,255,255,0.03)";
    speedBlock.style.border = "1px solid rgba(255,255,255,0.06)";
    speedBlock.innerHTML = `<div style="font-size:0.78rem;color:#f2e6c9;font-weight:700;">移動速度</div>`;
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
    presetBlock.innerHTML = `<div style="font-size:0.78rem;color:#f2e6c9;font-weight:700;">編隊預設</div>`;
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
    summonBlock.innerHTML = `<div style="font-size:0.78rem;color:#f2e6c9;font-weight:700;">就地召敵</div>`;

    const select = document.createElement("select");
    select.style.width = "100%";
    select.style.padding = "9px 10px";
    select.style.background = "rgba(17,21,33,0.92)";
    select.style.color = "#e9ecf8";
    select.style.border = "1px solid rgba(111,140,255,0.28)";
    const selectedEnemyId = summary.selectedEnemyMonsterId;
    const groups = new Map<string, HTMLOptGroupElement>();
    catalog.forEach((monster) => {
      const worldLabelMap: Record<World | "core", string> = {
        geometry: "幾何",
        organic: "有機",
        fractal: "分形",
        mechanical: "機械",
        core: "核心",
      };
      const worldLabel = worldLabelMap[monster.world];
      let group = groups.get(worldLabel);
      if (!group) {
        group = document.createElement("optgroup");
        group.label = `${worldLabel}世界`;
        groups.set(worldLabel, group);
        select.appendChild(group);
      }
      const option = document.createElement("option");
      option.value = monster.id;
      option.textContent = `T${monster.tier}｜${monster.no.toString().padStart(2, "0")} ${monster.nameZh}`;
      option.selected = monster.id === selectedEnemyId;
      group.appendChild(option);
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
      { label: "召喚 1", count: 1, style: "一級按鈕" },
      { label: "召喚 3", count: 3, style: "二級按鈕" },
      { label: "召喚 6", count: 6, style: "二級按鈕" },
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
    economyBlock.innerHTML = `<div style="font-size:0.78rem;color:#f2e6c9;font-weight:700;">養成與資源</div>`;

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

    addButton("給測試資源", () => {
      背包.加入原石(2000);
      for (const family of ["shield", "multishot", "straight", "mine", "laser"] as const) {
        背包.加入碎片(family, 100);
      }
      for (let no = 1; no <= 24; no += 1) 背包.加入材料(no, 20);
    }, true);
    addButton("熔煉", () => {
      const latest = 背包.背包快照();
      const inputs = latest.材料明細.map((item) => ({ materialNo: item.no, count: item.count }));
      if (inputs.length === 0) return;
      const result = smelt({ furnace: { family: "straight", world: "organic" }, inputs });
      for (const item of inputs) 背包.花費材料(item.materialNo, item.count);
      背包.加入碎片("straight", result.shards);
    });
    addButton("升星隊員", () => {
      for (let index = 0; index < roster.length; index += 1) {
        if (roster[index].star >= 3) continue;
        if (升星上陣隊員(index).ok) {
          刷新正式最大生命();
          break;
        }
      }
    });
    addButton("全員升星", () => {
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
    progressBlock.innerHTML = `<div style="font-size:0.78rem;color:#f2e6c9;font-weight:700;">守護者與終局</div>`;

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
    addProgressButton("達成守護者條件", () => {
      for (const world of ["geometry", "organic", "fractal", "mechanical"] as const) {
        for (let kind = 0; kind < 3; kind += 1) {
          for (let count = 0; count < 5; count += 1) 記錄世界擊殺(world, 1, `dojo_t${kind}`);
        }
        for (let elite = 0; elite < 3; elite += 1) 記錄世界擊殺(world, 2);
      }
    }, true);
    addProgressButton("召喚守護者", () => 發送訓練場事件("summon_guardians"));
    addProgressButton("召喚COLA", () => 發送訓練場事件("summon_cola"));
    progressBlock.appendChild(progressButtons);
    panel.appendChild(progressBlock);

    const supportRow = document.createElement("div");
    supportRow.className = "按鈕列";
    supportRow.style.marginTop = "0";
    const healBtn = document.createElement("button");
    healBtn.className = "二級按鈕";
    healBtn.textContent = "回滿生命";
    healBtn.onclick = () => {
      回滿訓練玩家生命();
      render();
    };
    const clearBtn = document.createElement("button");
    clearBtn.className = "二級按鈕";
    clearBtn.textContent = "清空敵群";
    clearBtn.onclick = () => {
      清空訓練敵人();
      render();
    };
    const resetStatsBtn = document.createElement("button");
    resetStatsBtn.className = "二級按鈕";
    resetStatsBtn.textContent = "重置統計";
    resetStatsBtn.onclick = () => {
      重置訓練碰撞統計();
      render();
    };
    const resetRunBtn = document.createElement("button");
    resetRunBtn.className = "二級按鈕";
    resetRunBtn.textContent = "重置驗收場";
    resetRunBtn.onclick = () => {
      背包.重置背包();
      重置養成();
      重置對局進度();
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
    const activeNames = monitor.activeEnemyNames.length > 0 ? monitor.activeEnemyNames.join("、") : "無";
    const lastResolvedAgo =
      monitor.lastResolvedAtMs === null ? "尚未結算" : `${Math.max(0, Math.floor((Date.now() - monitor.lastResolvedAtMs) / 1000))} 秒前`;
    if (summary.lastCollision) {
      collision.innerHTML = `
        <div style="color:#f2e6c9;font-weight:700;">最近碰撞</div>
        <div style="color:#ffcf7f;">接觸中：${activeNames}</div>
        <div style="color:#e9ecf8;">對象：${summary.lastCollision.enemyNames.join("、")}</div>
        <div style="color:#8d93ad;">我方輸出 ${summary.lastCollision.squadDamage} ｜ 承傷 ${summary.lastCollision.enemyDamage}</div>
        <div style="color:#8d93ad;">累計 ${monitor.collisionCount} 次 ｜ 累積輸出 ${monitor.totalSquadDamage} ｜ 累積承傷 ${monitor.totalEnemyDamage}</div>
        <div style="color:#8d93ad;">最近一次結算：${lastResolvedAgo}</div>
      `;
    } else {
      collision.innerHTML = `
        <div style="color:#f2e6c9;font-weight:700;">最近碰撞</div>
        <div style="color:#ffcf7f;">接觸中：${activeNames}</div>
        <div style="color:#8d93ad;">目前還沒有接觸紀錄，先就地召一批怪試試看。</div>
        <div style="color:#8d93ad;">累計 ${monitor.collisionCount} 次 ｜ 累積輸出 ${monitor.totalSquadDamage} ｜ 累積承傷 ${monitor.totalEnemyDamage}</div>
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
      liveEl.textContent = `位置 X ${Math.round(p.x)} / Y ${Math.round(p.y)} ｜ 生命 ${s.playerHp}/${s.playerMaxHp} ｜ 敵群 ${s.aliveEnemies}`;
    }
    liveRaf = requestAnimationFrame(updateLive);
  };
  liveRaf = requestAnimationFrame(updateLive);
  return panel;
}

export function 渲染操作頁面(容器: HTMLElement) {
  容器.innerHTML = "";
  const state = 應用程式狀態.畫面;
  if (state.層 !== "操作頁面") return;
  const 額外 = 應用程式狀態.額外;

  const root = document.createElement("div");
  root.className = "操作頁面-root";

  const 頂部 = document.createElement("div");
  頂部.className = "操作頁面-頂部";
  頂部.innerHTML = `<span class="世界時鐘 ${額外.縮圈警戒 ? "警戒" : ""}">${雙語("世界時間", "World Time")}: ${額外.世界時鐘秒數}s${
    額外.縮圈警戒 ? " ⚠" : ""
  }</span>`;
  root.appendChild(頂部);

  // 世界地圖層:玩家可走動、靠近設施觸發互動
  root.appendChild(建立世界地圖層());

  if (state.訓練道場) {
    root.appendChild(建立訓練道場快捷面板());
  }

  const hud掛載區 = document.createElement("div");
  hud掛載區.className = "戰鬥HUD掛載區";
  root.appendChild(hud掛載區);
  戰鬥HUD接線.掛載(hud掛載區);
  戰鬥HUD接線.同步狀態();

  容器.appendChild(root);
}
