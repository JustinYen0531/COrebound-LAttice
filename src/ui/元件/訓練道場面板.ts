import { MEMBERS } from "../../data/成員資料庫";
import { FAMILY_LABEL, WORLD_LABEL } from "../../data/成員型別";
import { 幾何世界圖騰清單 } from "../../totem/資料/幾何世界圖騰";
import { 有機世界圖騰清單 } from "../../totem/資料/有機世界圖騰";
import { 分形世界圖騰清單 } from "../../totem/資料/分形世界圖騰";
import { 機械世界圖騰清單 } from "../../totem/資料/機械世界圖騰";
import { 隊長圖騰清單 } from "../../totem/資料/隊長圖騰";
import { 隊長清單 } from "../資料/隊長清單";
import { 建立玩家標記圖騰 } from "./玩家標記圖騰";
import {
  交換訓練槽位,
  取得可召喚怪物圖鑑,
  取得訓練編隊預設列表,
  取得訓練召喚敵群,
  取得訓練小隊槽位,
  取得訓練道場摘要,
  保存目前為訓練編隊預設,
  切換訓練槽位星級,
  回滿訓練玩家生命,
  套用訓練預設小隊,
  套用訓練編隊預設,
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

type 職責色 = "保護" | "火力" | "補給";

const 槽位職責色票: Record<職責色, { label: string; color: string }> = {
  保護: { label: "保護位", color: "#4d8dff" },
  火力: { label: "火力位", color: "#ff5b6e" },
  補給: { label: "補給位", color: "#ffd24d" },
};

const 軌道槽位配置: Array<{ slotId: number; layer: "外" | "中" | "內"; angle: number; role: 職責色 }> = [
  { slotId: 0, layer: "內", angle: -30, role: "火力" },
  { slotId: 1, layer: "內", angle: 90, role: "補給" },
  { slotId: 2, layer: "內", angle: 210, role: "保護" },
  { slotId: 3, layer: "中", angle: 0, role: "火力" },
  { slotId: 4, layer: "中", angle: 120, role: "補給" },
  { slotId: 5, layer: "中", angle: 240, role: "保護" },
  { slotId: 6, layer: "外", angle: 30, role: "火力" },
  { slotId: 7, layer: "外", angle: 150, role: "補給" },
  { slotId: 8, layer: "外", angle: 270, role: "保護" },
];

const 軌道半徑: Record<"外" | "中" | "內", number> = { 外: 140, 中: 98, 內: 60 };
let 正在編輯槽位: number | null = null;
const 全部圖騰角色 = [...幾何世界圖騰清單, ...有機世界圖騰清單, ...分形世界圖騰清單, ...機械世界圖騰清單];
const 成員圖騰索引 = new Map(全部圖騰角色.map((entry) => [entry.名稱, entry]));
const 隊長圖騰索引 = new Map(隊長圖騰清單.map((entry) => [entry.id, entry]));

function 取得層級標籤(layer: "外" | "中" | "內"): string {
  return `${layer}層`;
}

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

function 以編號套用成員(slotId: number, raw: string): boolean {
  const no = Number(raw.trim());
  if (!Number.isInteger(no) || no <= 0) return false;
  const target = MEMBERS.find((member) => member.no === no);
  if (!target) return false;
  const slots = 取得訓練小隊槽位();
  const existing = slots.find((slot) => slot.memberId === target.id);
  if (existing && existing.slotId !== slotId) {
    交換訓練槽位(existing.slotId, slotId);
    return true;
  }
  設定訓練槽位成員(slotId, target.id);
  return true;
}

function 轉換圖騰職責(role: 職責色): "藍" | "紅" | "黃" {
  if (role === "保護") return "藍";
  if (role === "火力") return "紅";
  return "黃";
}

function 建立正式圖騰預覽(): HTMLElement {
  const summary = 取得訓練道場摘要();
  const captain = 隊長圖騰索引.get(summary.captainId) ?? 隊長圖騰清單[0];
  const slots = 取得訓練小隊槽位();
  const totemSquad = 軌道槽位配置
    .map((item) => {
      const slot = slots.find((entry) => entry.slotId === item.slotId);
      const member = MEMBERS.find((entry) => entry.id === slot?.memberId) ?? null;
      const totemRole = member ? 成員圖騰索引.get(member.nameZh) : null;
      if (!slot || !member || !totemRole) return null;
      return {
        角色: totemRole,
        大環: item.layer,
        職責: 轉換圖騰職責(item.role),
        等級: Math.max(1, Math.min(3, slot.star)),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const root = document.createElement("div");
  root.className = "訓練軌道編排器-圖騰預覽浮窗";
  root.innerHTML = `
    <div class="訓練軌道編排器-圖騰預覽標題">主畫面圖騰預覽</div>
    <div class="訓練軌道編排器-圖騰預覽說明">這裡直接套用正式遊戲的圖騰元件。</div>
  `;

  const view = document.createElement("div");
  view.className = "訓練軌道編排器-圖騰預覽框";
  view.appendChild(
    建立玩家標記圖騰({
      size: 162,
      隊長: captain,
      隊長等級: 4,
      小隊: totemSquad,
      旋轉: false,
    }),
  );
  root.appendChild(view);
  return root;
}

function 建立訓練軌道編排器(刷新: () => void): HTMLElement {
  const summary = 取得訓練道場摘要();
  const slots = 取得訓練小隊槽位();
  const slotMap = new Map(slots.map((slot) => [slot.slotId, slot]));
  const captain = 隊長清單.find((entry) => entry.id === summary.captainId) ?? 隊長清單[0];

  const root = document.createElement("section");
  root.className = "訓練軌道編排器";

  const stage = document.createElement("div");
  stage.className = "訓練軌道編排器-舞台";

  const orbit = document.createElement("div");
  orbit.className = "訓練軌道編排器-軌道";
  orbit.title = "滑鼠停留時會暫停旋轉，方便安排槽位。";
  orbit.addEventListener("mouseenter", () => {
    orbit.classList.add("已暫停");
  });
  orbit.addEventListener("mouseleave", () => {
    orbit.classList.remove("已暫停");
  });

  (["外", "中", "內"] as const).forEach((layer, idx) => {
    const ring = document.createElement("div");
    ring.className = `訓練軌道編排器-環 訓練軌道編排器-環-${layer}`;
    ring.style.setProperty("--ring-duration", idx === 0 ? "30s" : idx === 1 ? "22s" : "16s");
    ring.style.setProperty("--ring-direction", idx === 1 ? "reverse" : "normal");
    const duration = idx === 0 ? 30 : idx === 1 ? 22 : 16;
    ring.style.animationDelay = `-${(Date.now() / 1000) % duration}s`;

    軌道槽位配置
      .filter((item) => item.layer === layer)
      .forEach((item) => {
        const slot = slotMap.get(item.slotId);
        if (!slot) return;
        const member = MEMBERS.find((entry) => entry.id === slot.memberId) ?? null;
        const role = 槽位職責色票[item.role];

        const node = document.createElement("button");
        node.type = "button";
        node.className = `訓練軌道編排器-槽位${summary.selectedSlotId === item.slotId ? " 作用中" : ""}`;
        node.style.setProperty("--slot-angle", `${item.angle}deg`);
        node.style.setProperty("--slot-radius", `${軌道半徑[item.layer]}px`);
        node.style.setProperty("--slot-color", role.color);
        node.title = `槽位 ${item.slotId + 1}｜${role.label}｜${member ? member.nameZh : "空槽"}`;
        node.onclick = () => {
          設定訓練選中槽位(item.slotId);
          刷新();
        };

        const num = document.createElement("span");
        num.className = "訓練軌道編排器-編號";
        num.textContent = String(item.slotId + 1);

        const initial = document.createElement("span");
        initial.className = "訓練軌道編排器-縮寫";
        initial.textContent = member ? member.nameZh.slice(0, 1) : "空";

        node.append(num, initial);
        ring.appendChild(node);
      });

    orbit.appendChild(ring);
  });

  const core = document.createElement("div");
  core.className = "訓練軌道編排器-核心";
  core.style.setProperty("--captain-color", captain.代表色);
  core.textContent = captain.名稱.slice(0, 1);
  orbit.appendChild(core);
  orbit.appendChild(建立正式圖騰預覽());

  stage.appendChild(orbit);

  const legend = document.createElement("div");
  legend.className = "訓練軌道編排器-圖例";
  legend.innerHTML = (Object.values(槽位職責色票))
    .map((item) => `<span class="訓練軌道編排器-圖例項"><i style="background:${item.color};"></i>${item.label}</span>`)
    .join("");
  stage.appendChild(legend);

  const grid = document.createElement("div");
  grid.className = "訓練軌道編排器-槽位格";

  slots.forEach((slot) => {
    const member = MEMBERS.find((entry) => entry.id === slot.memberId) ?? null;
    const layout = 軌道槽位配置.find((item) => item.slotId === slot.slotId);
    const role = 槽位職責色票[layout?.role ?? "保護"];
    const card = document.createElement("div");
    card.className = `訓練軌道編排器-槽位卡${summary.selectedSlotId === slot.slotId ? " 作用中" : ""}`;
    card.draggable = true;
    card.style.setProperty("--slot-color", role.color);
    card.addEventListener("click", () => {
      設定訓練選中槽位(slot.slotId);
      刷新();
    });

    const head = document.createElement("div");
    head.className = "訓練軌道編排器-槽位卡頭";
    const number = document.createElement("span");
    number.className = "訓練軌道編排器-槽位編號";
    number.style.background = role.color;
    number.textContent = String(slot.slotId + 1);
    const roleLabel = document.createElement("span");
    roleLabel.className = "訓練軌道編排器-槽位職責";
    roleLabel.style.color = role.color;
    roleLabel.textContent = role.label;
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "訓練軌道編排器-鉛筆按鈕";
    editBtn.textContent = "✎";
    editBtn.title = "輸入成員編號，例如 02 會切到矩陣；若該角色已在別處，則直接交換位置。";
    editBtn.onclick = (event) => {
      event.stopPropagation();
      正在編輯槽位 = 正在編輯槽位 === slot.slotId ? null : slot.slotId;
      刷新();
    };
    head.append(number, roleLabel, editBtn);
    card.appendChild(head);

    if (正在編輯槽位 === slot.slotId) {
      const editRow = document.createElement("div");
      editRow.className = "訓練軌道編排器-編輯列";
      const input = document.createElement("input");
      input.className = "訓練軌道編排器-編輯輸入";
      input.placeholder = member ? member.no.toString().padStart(2, "0") : "02";
      input.maxLength = 2;
      input.inputMode = "numeric";
      const ok = document.createElement("button");
      ok.type = "button";
      ok.className = "訓練軌道編排器-編輯確認";
      ok.textContent = "套用";
      const apply = () => {
        if (以編號套用成員(slot.slotId, input.value)) {
          正在編輯槽位 = null;
          刷新();
        }
      };
      input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") apply();
      });
      ok.onclick = (event) => {
        event.stopPropagation();
        apply();
      };
      editRow.append(input, ok);
      card.appendChild(editRow);
    }

    const level = document.createElement("div");
    level.className = "訓練軌道編排器-槽位層級";
    level.textContent = `${取得層級標籤(layout?.layer ?? "外")} ｜ 第 ${slot.slotId + 1} 槽`;
    card.appendChild(level);

    const main = document.createElement("div");
    main.className = "訓練軌道編排器-槽位主文";
    main.textContent = member ? `${member.no.toString().padStart(2, "0")} ${member.nameZh}` : "（空槽）";
    card.appendChild(main);

    const sub = document.createElement("div");
    sub.className = "訓練軌道編排器-槽位副文";
    sub.textContent = `${slot.star}★${member ? ` ｜ ${WORLD_LABEL[member.world]}` : ""}`;
    card.appendChild(sub);
    card.addEventListener("dragstart", (event) => {
      event.dataTransfer?.setData("text/plain", String(slot.slotId));
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
      card.classList.add("拖曳中");
    });
    card.addEventListener("dragend", () => {
      card.classList.remove("拖曳中");
    });
    card.addEventListener("dragover", (event) => {
      event.preventDefault();
      card.classList.add("可放置");
    });
    card.addEventListener("dragleave", () => {
      card.classList.remove("可放置");
    });
    card.addEventListener("drop", (event) => {
      event.preventDefault();
      card.classList.remove("可放置");
      const sourceSlotId = Number(event.dataTransfer?.getData("text/plain"));
      if (!Number.isFinite(sourceSlotId)) return;
      交換訓練槽位(sourceSlotId, slot.slotId);
      刷新();
    });
    grid.appendChild(card);
  });

  root.append(stage, grid);
  return root;
}

export function 建立訓練小隊編輯器(刷新: () => void): HTMLElement {
  const root = document.createElement("section");
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "14px";

  const summary = 取得訓練道場摘要();
  const slots = 取得訓練小隊槽位();
  const presets = 取得訓練編隊預設列表();
  const selectedSlot = slots.find((slot) => slot.slotId === summary.selectedSlotId) ?? slots[0];
  const selectedMember = MEMBERS.find((member) => member.id === selectedSlot.memberId) ?? null;
  const captain = 隊長清單.find((entry) => entry.id === summary.captainId) ?? 隊長清單[0];

  root.appendChild(建立標題("訓練編隊台", "左邊看軌道與槽位、右邊做細節調整與成員替換。"));

  const layout = document.createElement("div");
  layout.style.display = "grid";
  layout.style.gridTemplateColumns = "420px minmax(0, 1fr)";
  layout.style.gap = "18px";
  layout.style.alignItems = "start";

  const leftPane = document.createElement("div");
  leftPane.style.display = "flex";
  leftPane.style.flexDirection = "column";
  leftPane.style.gap = "14px";
  const captainCard = document.createElement("div");
  captainCard.className = "訓練軌道編排器-隊長卡";
  captainCard.style.setProperty("--captain-color", captain.代表色);
  captainCard.innerHTML = `
    <div class="訓練軌道編排器-隊長卡眉標">隊長核心</div>
    <div class="訓練軌道編排器-隊長卡主列">
      <span class="訓練軌道編排器-隊長徽記">${captain.名稱.slice(0, 1)}</span>
      <div>
        <div class="訓練軌道編排器-隊長名稱">${captain.名稱}</div>
        <div class="訓練軌道編排器-隊長資訊">${captain.代號} ｜ ${captain.控制效果}</div>
      </div>
    </div>
    <div class="訓練軌道編排器-隊長描述">${captain.主動位移技能} ｜ ${captain.週期技能}</div>
  `;
  leftPane.appendChild(captainCard);
  leftPane.appendChild(建立訓練軌道編排器(刷新));

  const rightPane = document.createElement("div");
  rightPane.style.display = "flex";
  rightPane.style.flexDirection = "column";
  rightPane.style.gap = "14px";

  const presetBlock = document.createElement("div");
  presetBlock.style.display = "grid";
  presetBlock.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
  presetBlock.style.gap = "8px";
  presets.forEach((preset) => {
    const filledCount = preset.slots.filter((slot) => slot.memberId).length;
    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.gap = "6px";
    wrap.style.padding = "10px";
    wrap.style.background = "rgba(255,255,255,0.03)";
    wrap.style.border = preset.id === summary.activePresetId ? "1px solid rgba(216,180,106,0.5)" : "1px solid rgba(255,255,255,0.06)";
    wrap.style.borderRadius = "10px";
    wrap.innerHTML = `
      <div style="font-size:0.82rem;color:#fff;font-weight:700;">${preset.label}</div>
      <div style="font-size:0.72rem;color:#8d93ad;">隊長 ${preset.captainId} ｜ 隊員 ${filledCount}/9</div>
    `;
    const row = document.createElement("div");
    row.className = "按鈕列";
    row.style.marginTop = "0";
    const loadBtn = document.createElement("button");
    loadBtn.className = preset.id === summary.activePresetId ? "一級按鈕" : "二級按鈕";
    loadBtn.textContent = "套用";
    loadBtn.onclick = () => {
      套用訓練編隊預設(preset.id);
      刷新();
    };
    const saveBtn = document.createElement("button");
    saveBtn.className = "二級按鈕";
    saveBtn.textContent = "存檔";
    saveBtn.onclick = () => {
      保存目前為訓練編隊預設(preset.id);
      刷新();
    };
    row.append(loadBtn, saveBtn);
    wrap.appendChild(row);
    presetBlock.appendChild(wrap);
  });
  rightPane.appendChild(presetBlock);

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
  rightPane.appendChild(captainRow);

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
  rightPane.appendChild(speedBlock);

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
  rightPane.appendChild(slotActions);

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
  rightPane.appendChild(summaryGrid);

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
  rightPane.appendChild(healRow);

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
        先在左邊點槽位，再從下方成員庫指派，或直接拖曳左側九宮格交換位置。
      </div>
    `;
  }
  rightPane.appendChild(selectedInfo);

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
  rightPane.appendChild(library);

  layout.append(leftPane, rightPane);
  root.appendChild(layout);
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
