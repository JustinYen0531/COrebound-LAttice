/**
 * @file 操作頁面.ts
 * @description 戰鬥 HUD（IC 預設常駐層）。示範：左右滑互斥 R1、頭像展圈 → 進管理介面、
 * 驚嘆號快跳互動子頁 R6、世界時鐘持續流動、終局事件最高優先權 R11。
 *
 *              本版新增:嵌入「世界地圖層」,玩家可用 WASD 在 placeholder 地圖上移動,
 *              靠近熔爐/雕像/工作台/商店/祭壇時自動觸發靠近狀態並顯示驚嘆號。
 */
import { 應用程式狀態 } from "../應用程式狀態";
import { 戰鬥HUD接線 } from "../戰鬥HUD接線";
import { 建立世界地圖層, 讀取玩家位置 } from "../元件/世界地圖層";
import {
  取得可召喚怪物圖鑑,
  取得訓練道場摘要,
  回滿訓練玩家生命,
  清空訓練敵人,
  設定訓練移動倍率,
  設定訓練預選怪物,
  召喚訓練敵人,
} from "../訓練道場狀態";

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
  panel.style.background = "rgba(8, 12, 20, 0.82)";
  panel.style.border = "1px solid rgba(255,255,255,0.14)";
  panel.style.boxShadow = "0 10px 30px rgba(0,0,0,0.34)";
  panel.style.backdropFilter = "blur(10px)";

  const render = () => {
    const summary = 取得訓練道場摘要();
    const playerPos = 讀取玩家位置();
    const catalog = 取得可召喚怪物圖鑑();
    panel.innerHTML = "";

    const title = document.createElement("div");
    title.innerHTML = `
      <div style="font-size:0.74rem;letter-spacing:0.12em;color:#6f8cff;text-transform:uppercase;">訓練道場快捷台</div>
      <div style="font-size:1rem;font-weight:700;color:#f2e6c9;margin-top:4px;">戰場內直接測試隊伍與碰撞</div>
      <div style="font-size:0.76rem;color:#8d93ad;line-height:1.5;margin-top:6px;">
        位置 X ${Math.round(playerPos.x)} / Y ${Math.round(playerPos.y)} ｜ 生命 ${summary.playerHp}/${summary.playerMaxHp} ｜ 敵群 ${summary.aliveEnemies}
      </div>
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
      const worldLabel = {
        geometry: "幾何",
        organic: "有機",
        fractal: "分形",
        mechanical: "機械",
      }[monster.world];
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
    supportRow.append(healBtn, clearBtn);
    panel.appendChild(supportRow);

    const collision = document.createElement("div");
    collision.style.padding = "12px";
    collision.style.background = "rgba(255,255,255,0.03)";
    collision.style.border = "1px solid rgba(255,255,255,0.06)";
    collision.style.fontSize = "0.76rem";
    collision.style.lineHeight = "1.6";
    if (summary.lastCollision) {
      collision.innerHTML = `
        <div style="color:#f2e6c9;font-weight:700;">最近碰撞</div>
        <div style="color:#e9ecf8;">對象：${summary.lastCollision.enemyNames.join("、")}</div>
        <div style="color:#8d93ad;">我方輸出 ${summary.lastCollision.squadDamage} ｜ 承傷 ${summary.lastCollision.enemyDamage}</div>
      `;
    } else {
      collision.innerHTML = `
        <div style="color:#f2e6c9;font-weight:700;">最近碰撞</div>
        <div style="color:#8d93ad;">目前還沒有接觸紀錄，先就地召一批怪試試看。</div>
      `;
    }
    panel.appendChild(collision);
  };

  render();
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
  頂部.innerHTML = `<span class="世界時鐘 ${額外.縮圈警戒 ? "警戒" : ""}">世界時間：${額外.世界時鐘秒數}s${
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
