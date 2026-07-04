import { MEMBERS } from "../../data/成員資料庫";
import { FAMILY_LABEL, WORLD_LABEL } from "../../data/成員型別";
import { 隊長清單 } from "../資料/隊長清單";
import {
  取得可召喚怪物圖鑑,
  取得訓練召喚敵群,
  取得訓練小隊槽位,
  取得訓練道場摘要,
  切換訓練槽位星級,
  回滿訓練玩家生命,
  套用訓練預設小隊,
  手動設定訓練玩家生命,
  更新訓練敵人,
  清空訓練小隊,
  清空訓練敵人,
  移除訓練敵人,
  設定訓練槽位成員,
  設定訓練移動倍率,
  設定訓練選中槽位,
  設定訓練預選怪物,
  設定訓練隊長,
  召喚訓練敵人,
} from "../訓練道場狀態";

function 建立標題(文字: string, 副標?: string): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.gap = "4px";
  wrap.innerHTML = `
    <h4 style="margin:0;color:#ff8a3b;font-size:0.9rem;">${文字}</h4>
    ${副標 ? `<span style="font-size:0.75rem;color:#8d93ad;">${副標}</span>` : ""}
  `;
  return wrap;
}

function 建立資料膠囊(label: string, value: string): string {
  return `
    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:8px 10px;">
      <div style="font-size:0.68rem;color:#8d93ad;">${label}</div>
      <div style="font-size:0.82rem;color:#fff;font-weight:700;margin-top:2px;">${value}</div>
    </div>
  `;
}

export function 建立訓練小隊編輯器(刷新: () => void): HTMLElement {
  const root = document.createElement("section");
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "14px";

  const summary = 取得訓練道場摘要();
  const slots = 取得訓練小隊槽位();
  const selectedSlot = slots.find((slot) => slot.slotId === summary.selectedSlotId) ?? slots[0];
  const selectedMember = MEMBERS.find((member) => member.id === selectedSlot.memberId) ?? null;

  root.appendChild(建立標題("訓練編隊台", "可自由改隊長、九個槽位與移動速度。"));

  const captainRow = document.createElement("div");
  captainRow.style.display = "grid";
  captainRow.style.gridTemplateColumns = "repeat(4, minmax(0, 1fr))";
  captainRow.style.gap = "8px";
  隊長清單.forEach((captain) => {
    const btn = document.createElement("button");
    btn.className = summary.captainId === captain.id ? "一級按鈕" : "二級按鈕";
    btn.textContent = captain.名稱;
    btn.style.setProperty("--隊長色", captain.代表色);
    btn.onclick = () => {
      設定訓練隊長(captain.id);
      刷新();
    };
    captainRow.appendChild(btn);
  });
  root.appendChild(captainRow);

  const speedBlock = document.createElement("div");
  speedBlock.style.display = "flex";
  speedBlock.style.alignItems = "center";
  speedBlock.style.gap = "12px";
  speedBlock.style.padding = "10px 12px";
  speedBlock.style.borderRadius = "10px";
  speedBlock.style.background = "rgba(255,255,255,0.03)";
  speedBlock.style.border = "1px solid rgba(255,255,255,0.06)";
  speedBlock.innerHTML = `<span style="font-size:0.8rem;color:#fff;font-weight:700;">移動速度倍率</span>`;
  const speedValue = document.createElement("strong");
  speedValue.style.color = "#ffd24d";
  speedValue.textContent = `${summary.moveSpeedScale.toFixed(2)}x`;
  const speedSlider = document.createElement("input");
  speedSlider.type = "range";
  speedSlider.min = "0.25";
  speedSlider.max = "3";
  speedSlider.step = "0.05";
  speedSlider.value = String(summary.moveSpeedScale);
  speedSlider.style.flex = "1";
  speedSlider.oninput = () => {
    設定訓練移動倍率(Number(speedSlider.value));
    speedValue.textContent = `${Number(speedSlider.value).toFixed(2)}x`;
  };
  speedSlider.onchange = () => 刷新();
  speedBlock.append(speedSlider, speedValue);
  root.appendChild(speedBlock);

  const slotGrid = document.createElement("div");
  slotGrid.style.display = "grid";
  slotGrid.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))";
  slotGrid.style.gap = "8px";
  slots.forEach((slot) => {
    const member = MEMBERS.find((entry) => entry.id === slot.memberId) ?? null;
    const btn = document.createElement("button");
    btn.className = slot.slotId === summary.selectedSlotId ? "一級按鈕" : "二級按鈕";
    btn.style.textAlign = "left";
    btn.style.padding = "10px";
    btn.innerHTML = `
      <div style="font-size:0.7rem;color:#8d93ad;">槽位 ${slot.slotId + 1} ・ ${slot.star}★</div>
      <div style="font-size:0.8rem;color:#fff;font-weight:700;margin-top:4px;">${member ? `${member.no.toString().padStart(2, "0")} ${member.nameZh}` : "（空槽）"}</div>
    `;
    btn.onclick = () => {
      設定訓練選中槽位(slot.slotId);
      刷新();
    };
    slotGrid.appendChild(btn);
  });
  root.appendChild(slotGrid);

  const slotActions = document.createElement("div");
  slotActions.className = "按鈕列";
  const cycleStar = document.createElement("button");
  cycleStar.className = "二級按鈕";
  cycleStar.textContent = `切換星級 (${selectedSlot.star}★)`;
  cycleStar.onclick = () => {
    切換訓練槽位星級(selectedSlot.slotId);
    刷新();
  };
  const clearSlot = document.createElement("button");
  clearSlot.className = "二級按鈕";
  clearSlot.textContent = "清空目前槽位";
  clearSlot.onclick = () => {
    設定訓練槽位成員(selectedSlot.slotId, null);
    刷新();
  };
  const resetDemo = document.createElement("button");
  resetDemo.className = "二級按鈕";
  resetDemo.textContent = "恢復預設編隊";
  resetDemo.onclick = () => {
    套用訓練預設小隊();
    刷新();
  };
  const clearAll = document.createElement("button");
  clearAll.className = "二級按鈕";
  clearAll.textContent = "全部清空";
  clearAll.onclick = () => {
    清空訓練小隊();
    刷新();
  };
  slotActions.append(cycleStar, clearSlot, resetDemo, clearAll);
  root.appendChild(slotActions);

  const summaryGrid = document.createElement("div");
  summaryGrid.style.display = "grid";
  summaryGrid.style.gridTemplateColumns = "repeat(5, minmax(0, 1fr))";
  summaryGrid.style.gap = "8px";
  summaryGrid.innerHTML = [
    建立資料膠囊("隊員數", `${summary.memberCount} / 9`),
    建立資料膠囊("總生命", `${summary.playerHp} / ${summary.playerMaxHp}`),
    建立資料膠囊("總攻擊", `${summary.totalAtk}`),
    建立資料膠囊("總重量", `${summary.totalWeight}`),
    建立資料膠囊("平均速度", `${summary.avgSpeedContribution}`),
  ].join("");
  root.appendChild(summaryGrid);

  const healRow = document.createElement("div");
  healRow.className = "按鈕列";
  const healBtn = document.createElement("button");
  healBtn.className = "二級按鈕";
  healBtn.textContent = "回滿玩家生命";
  healBtn.onclick = () => {
    回滿訓練玩家生命();
    刷新();
  };
  const zeroBtn = document.createElement("button");
  zeroBtn.className = "二級按鈕";
  zeroBtn.textContent = "玩家生命歸零";
  zeroBtn.onclick = () => {
    手動設定訓練玩家生命(0);
    刷新();
  };
  healRow.append(healBtn, zeroBtn);
  root.appendChild(healRow);

  const selectedInfo = document.createElement("div");
  selectedInfo.style.padding = "12px";
  selectedInfo.style.borderRadius = "10px";
  selectedInfo.style.background = "rgba(255,255,255,0.03)";
  selectedInfo.style.border = "1px solid rgba(255,255,255,0.06)";
  if (selectedMember) {
    selectedInfo.innerHTML = `
      <div style="font-size:0.72rem;color:#8d93ad;">目前編輯：槽位 ${selectedSlot.slotId + 1}</div>
      <div style="font-size:0.9rem;color:#fff;font-weight:700;margin-top:4px;">${selectedMember.no.toString().padStart(2, "0")} ${selectedMember.nameZh}</div>
      <div style="font-size:0.78rem;color:#8d93ad;line-height:1.5;margin-top:8px;">
        ${WORLD_LABEL[selectedMember.world]}世界｜${FAMILY_LABEL[selectedMember.family]}家族｜${selectedMember.starNodes[selectedSlot.star].name}
      </div>
      <div style="font-size:0.78rem;color:#fff;line-height:1.5;margin-top:6px;">
        ${selectedMember.role}
      </div>
    `;
  } else {
    selectedInfo.innerHTML = `
      <div style="font-size:0.72rem;color:#8d93ad;">目前編輯：槽位 ${selectedSlot.slotId + 1}</div>
      <div style="font-size:0.9rem;color:#fff;font-weight:700;margin-top:4px;">空槽</div>
      <div style="font-size:0.78rem;color:#8d93ad;line-height:1.5;margin-top:8px;">
        從下方成員庫點一下，就會直接塞進這個位置。
      </div>
    `;
  }
  root.appendChild(selectedInfo);

  const library = document.createElement("div");
  library.style.display = "grid";
  library.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
  library.style.gap = "8px";
  library.style.maxHeight = "340px";
  library.style.overflowY = "auto";
  MEMBERS.forEach((member) => {
    const btn = document.createElement("button");
    btn.className = "二級按鈕";
    btn.style.textAlign = "left";
    btn.style.padding = "10px";
    btn.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:10px;">
        <strong>${member.no.toString().padStart(2, "0")} ${member.nameZh}</strong>
        <span style="color:#8d93ad;">${WORLD_LABEL[member.world]}</span>
      </div>
      <div style="font-size:0.72rem;color:#8d93ad;margin-top:4px;">${FAMILY_LABEL[member.family]} ｜ ${member.starNodes[1].name}</div>
    `;
    btn.onclick = () => {
      設定訓練槽位成員(selectedSlot.slotId, member.id);
      刷新();
    };
    library.appendChild(btn);
  });
  root.appendChild(library);

  return root;
}

export function 建立訓練召喚面板(刷新: () => void, 生成座標: { x: number; y: number }): HTMLElement {
  const root = document.createElement("section");
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "14px";

  const summary = 取得訓練道場摘要();
  const active = 取得訓練召喚敵群();
  const catalog = 取得可召喚怪物圖鑑();

  root.appendChild(建立標題("敵群召喚台", "選定怪物後可在玩家附近直接叫出來，立刻做碰撞測試。"));

  const selectorWrap = document.createElement("div");
  selectorWrap.style.display = "grid";
  selectorWrap.style.gridTemplateColumns = "1fr auto auto auto auto";
  selectorWrap.style.gap = "8px";

  const select = document.createElement("select");
  select.className = "二級按鈕";
  const groups = new Map<string, HTMLOptGroupElement>();
  catalog.forEach((monster) => {
    const key = `${WORLD_LABEL[monster.world]}世界`;
    let group = groups.get(key);
    if (!group) {
      group = document.createElement("optgroup");
      group.label = key;
      groups.set(key, group);
      select.appendChild(group);
    }
    const option = document.createElement("option");
    option.value = monster.id;
    option.textContent = `T${monster.tier}｜${monster.no.toString().padStart(2, "0")} ${monster.nameZh}`;
    option.selected = monster.id === summary.selectedEnemyMonsterId;
    group.appendChild(option);
  });
  select.onchange = () => {
    設定訓練預選怪物(select.value);
    刷新();
  };

  const summon1 = document.createElement("button");
  summon1.className = "一級按鈕";
  summon1.textContent = "召喚 1";
  summon1.onclick = () => {
    召喚訓練敵人(select.value, 1, 生成座標);
    刷新();
  };
  const summon3 = document.createElement("button");
  summon3.className = "二級按鈕";
  summon3.textContent = "召喚 3";
  summon3.onclick = () => {
    召喚訓練敵人(select.value, 3, 生成座標);
    刷新();
  };
  const summon6 = document.createElement("button");
  summon6.className = "二級按鈕";
  summon6.textContent = "召喚 6";
  summon6.onclick = () => {
    召喚訓練敵人(select.value, 6, 生成座標);
    刷新();
  };
  const clear = document.createElement("button");
  clear.className = "二級按鈕";
  clear.textContent = "清空敵群";
  clear.onclick = () => {
    清空訓練敵人();
    刷新();
  };
  selectorWrap.append(select, summon1, summon3, summon6, clear);
  root.appendChild(selectorWrap);

  const status = document.createElement("div");
  status.style.display = "grid";
  status.style.gridTemplateColumns = "repeat(4, minmax(0, 1fr))";
  status.style.gap = "8px";
  status.innerHTML = [
    建立資料膠囊("當前敵數", `${active.length}`),
    建立資料膠囊("碰撞測試", summary.lastCollision ? summary.lastCollision.enemyNames.join("、") : "尚未接觸"),
    建立資料膠囊("最近我方輸出", summary.lastCollision ? `${summary.lastCollision.squadDamage}` : "0"),
    建立資料膠囊("最近敵方輸出", summary.lastCollision ? `${summary.lastCollision.enemyDamage}` : "0"),
  ].join("");
  root.appendChild(status);

  const activeList = document.createElement("div");
  activeList.style.display = "flex";
  activeList.style.flexDirection = "column";
  activeList.style.gap = "8px";
  activeList.style.maxHeight = "360px";
  activeList.style.overflowY = "auto";

  if (active.length === 0) {
    activeList.innerHTML = `<div style="padding:18px;border-radius:10px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);font-size:0.8rem;color:#8d93ad;">目前沒有任何召喚中的敵人。先選一隻，然後在玩家附近召喚出來。</div>`;
  } else {
    active.forEach((enemy) => {
      const row = document.createElement("div");
      row.style.display = "grid";
      row.style.gridTemplateColumns = "1fr auto auto";
      row.style.gap = "10px";
      row.style.alignItems = "center";
      row.style.padding = "10px 12px";
      row.style.borderRadius = "10px";
      row.style.background = "rgba(255,255,255,0.03)";
      row.style.border = "1px solid rgba(255,255,255,0.06)";
      row.innerHTML = `
        <div>
          <div style="font-size:0.82rem;color:#fff;font-weight:700;">T${enemy.tier}｜${enemy.nameZh}</div>
          <div style="font-size:0.72rem;color:#8d93ad;margin-top:4px;">HP ${enemy.hp}/${enemy.maxHp} ｜ 重量 ${enemy.weight} ｜ ATK ${enemy.atk}</div>
        </div>
      `;
      const resetHp = document.createElement("button");
      resetHp.className = "二級按鈕";
      resetHp.textContent = "補滿";
      resetHp.onclick = () => {
        更新訓練敵人(enemy.id, { hp: enemy.maxHp });
        刷新();
      };
      const remove = document.createElement("button");
      remove.className = "二級按鈕";
      remove.textContent = "移除";
      remove.onclick = () => {
        移除訓練敵人(enemy.id);
        刷新();
      };
      row.append(resetHp, remove);
      activeList.appendChild(row);
    });
  }

  root.appendChild(activeList);
  return root;
}
