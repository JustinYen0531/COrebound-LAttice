/**
 * @file 遊戲準備流程.ts
 * @description New Game / Continue Game / 再來一場 共用的賽前準備頁：選隊長 + 小隊圓盤預覽（共用元件 B）。
 * 對應統一版文件 1.1 裁定：「編排小隊」不設獨立主按鈕，改在此流程與管理介面／小隊共用元件。
 */
import { 應用程式狀態 } from "../應用程式狀態";
import { 隊長清單 } from "../資料/隊長清單";
import { 選文 } from "../語系";
import { MEMBERS } from "../../data/成員資料庫";
import {
  取得起始成員配置,
  設定起始成員,
  type 初始成員層級,
} from "../../progression/養成狀態";
import { SHOWCASE_PRESETS, 尋找Showcase預設, type Showcase預設隊伍 } from "../../progression/Showcase預設隊伍";

function 雙語(中文: string, 英文: string): string {
  return 選文(應用程式狀態.額外.語言, 中文, 英文);
}

function 成員顯示名(member: (typeof MEMBERS)[number]): string {
  return 應用程式狀態.額外.語言 === "zh" ? member.nameZh : member.nameEn;
}

function 隊長顯示名(隊長: (typeof 隊長清單)[number]): string {
  return 應用程式狀態.額外.語言 === "zh" ? 隊長.名稱 : 隊長.名稱英;
}

function 隊長代號(隊長: (typeof 隊長清單)[number]): string {
  return 應用程式狀態.額外.語言 === "zh" ? 隊長.代號 : 隊長.代號英;
}

function 隊長一句話(隊長: (typeof 隊長清單)[number]): string {
  return 應用程式狀態.額外.語言 === "zh" ? 隊長.一句話設計 : 隊長.一句話設計英;
}

function 隊長控制效果(隊長: (typeof 隊長清單)[number]): string {
  return 應用程式狀態.額外.語言 === "zh" ? 隊長.控制效果 : 隊長.控制效果英;
}

function 隊長主動技能(隊長: (typeof 隊長清單)[number]): string {
  return 應用程式狀態.額外.語言 === "zh" ? 隊長.主動位移技能 : 隊長.主動位移技能英;
}

function 隊長週期技能(隊長: (typeof 隊長清單)[number]): string {
  return 應用程式狀態.額外.語言 === "zh" ? 隊長.週期技能 : 隊長.週期技能英;
}

function 世界顯示名(world: string): string {
  return {
    geometry: 雙語("幾何世界", "Geometry"),
    organic: 雙語("有機世界", "Organic"),
    fractal: 雙語("分形世界", "Fractal"),
    mechanical: 雙語("機械世界", "Mechanical"),
  }[world] ?? world;
}

function 預設名稱(preset: Showcase預設隊伍): string {
  return 應用程式狀態.額外.語言 === "zh" ? preset.名稱 : preset.名稱英;
}
function 預設archetype標籤(preset: Showcase預設隊伍): string {
  return 應用程式狀態.額外.語言 === "zh" ? preset.archetype標籤 : preset.archetype標籤英;
}
function 預設說明(preset: Showcase預設隊伍): string {
  return 應用程式狀態.額外.語言 === "zh" ? preset.說明 : preset.說明英;
}
const ARCHETYPE_ICON: Record<Showcase預設隊伍["archetype"], string> = {
  aggressive: "⚔️",
  defense: "🛡️",
  support: "✨",
};

const 隊長立繪來源: Record<string, string> = {
  conductor: "/assets/transparent-portraits/captains/conductor_form1.png",
  operator: "/assets/transparent-portraits/captains/operator_form1.png",
  launcher: "/assets/transparent-portraits/captains/launcher_form1.png",
  architect: "/assets/transparent-portraits/captains/architect_form1.png",
};

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

  const 隊伍設定區 = document.createElement("div");
  隊伍設定區.className = "準備流程-隊伍設定區";

const 顯示起始成員選擇 = state.來源 !== "Continue Game";

  const 隊長區 = document.createElement("div");
  隊長區.className = "準備流程-隊長區";
  隊長區.innerHTML = `<h4>${雙語("選擇隊長", "Choose a Captain")}</h4>`;

  if (顯示起始成員選擇) {
    const 徽章 = document.createElement("div");
    const 是Showcase = 應用程式狀態.額外.開場模式 === "showcase";
    徽章.className = `準備流程-模式徽章 ${是Showcase ? "作用中" : "無加成"}`;
    徽章.innerHTML = 是Showcase
      ? `⚡ ${雙語("目前使用 Showcase 模式", "Currently Using Showcase Mode")}`
      : `🌱 ${雙語("目前從零開始，無開場加成", "Starting From Scratch — No Boost")}`;
    隊長區.appendChild(徽章);
  }

  const 隊長列表 = document.createElement("div");
  隊長列表.className = "隊長卡片列";

  let 選中隊長id = 應用程式狀態.額外.選中隊長 ?? 隊長清單[0].id;

  const 預覽容器 = document.createElement("div");

  function 重繪隊伍預覽() {
    預覽容器.innerHTML = "";
    const 隊長 = 隊長清單.find((c) => c.id === 選中隊長id)!;
    const 使用Showcase預設 = 顯示起始成員選擇 && 應用程式狀態.額外.開場模式 === "showcase";
    const 選中預設 = 使用Showcase預設 ? 尋找Showcase預設(應用程式狀態.額外.選中Showcase預設ID) : undefined;
    const 隊伍立繪 = document.createElement("div");
    隊伍立繪.className = `準備流程-隊伍立繪${選中預設 ? " 準備流程-隊伍立繪--九宮格" : ""}`;

    const 隊長立繪 = document.createElement("article");
    隊長立繪.className = "準備流程-立繪卡 準備流程-立繪卡--隊長";
    隊長立繪.style.setProperty("--角色色", 隊長.代表色);
    隊長立繪.innerHTML = `
      <div class="準備流程-立繪角色標籤">${雙語("隊長", "Captain")}</div>
      <div class="準備流程-隊長立繪裁切"><img src="${隊長立繪來源[隊長.id]}" alt="${隊長顯示名(隊長)}" /></div>
      <div class="準備流程-立繪名稱"><strong>${隊長顯示名(隊長)}</strong><span>${隊長代號(隊長)}</span></div>
    `;
    隊伍立繪.appendChild(隊長立繪);

    const 層級標籤: Record<初始成員層級, string> = {
      inner: 雙語("最內層", "Inner"),
      middle: 雙語("中層", "Middle"),
      outer: 雙語("外層", "Outer"),
    };

    if (選中預設) {
      選中預設.members.forEach((entry) => {
        const member = MEMBERS.find((item) => item.no === entry.memberNo);
        if (!member) return;
        const 立繪卡 = document.createElement("article");
        立繪卡.className = `準備流程-立繪卡 準備流程-立繪卡--${entry.layer}`;
        立繪卡.innerHTML = `
          <div class="準備流程-立繪角色標籤">${層級標籤[entry.layer]}</div>
          <div class="準備流程-立繪星級標籤">${"★".repeat(entry.star)}</div>
          <img src="/assets/transparent-portraits/members/${member.id}_s${entry.star}.png" alt="${成員顯示名(member)}" />
          <div class="準備流程-立繪名稱"><strong>${成員顯示名(member)}</strong><span>${member.nameEn}</span></div>
        `;
        隊伍立繪.appendChild(立繪卡);
      });
    } else {
      const 當前配置 = 取得起始成員配置();
      當前配置.forEach((entry) => {
        const member = MEMBERS.find((item) => item.no === entry.memberNo);
        if (!member) return;
        const 立繪卡 = document.createElement("article");
        立繪卡.className = `準備流程-立繪卡 準備流程-立繪卡--${entry.layer}`;
        立繪卡.innerHTML = `
          <div class="準備流程-立繪角色標籤">${層級標籤[entry.layer]}</div>
          <img src="/assets/transparent-portraits/members/${member.id}_s1.png" alt="${成員顯示名(member)}" />
          <div class="準備流程-立繪名稱"><strong>${成員顯示名(member)}</strong><span>${member.nameEn}</span></div>
        `;
        隊伍立繪.appendChild(立繪卡);
      });
    }
    預覽容器.appendChild(隊伍立繪);

    const 說明 = document.createElement("div");
    說明.className = "隊長說明卡";
    說明.innerHTML = `
      <h4>${隊長顯示名(隊長)}　<span class="淡字">${隊長代號(隊長)}</span></h4>
      <p>${隊長一句話(隊長)}</p>
      <ul>
        <li>${雙語("控制效果", "Control Effect")}: ${隊長控制效果(隊長)}</li>
        <li>${雙語("主動位移技能", "Active Mobility Skill")}: ${隊長主動技能(隊長)}</li>
        <li>${雙語("週期技能", "Periodic Skill")}: ${隊長週期技能(隊長)}</li>
      </ul>
    `;
    預覽容器.appendChild(說明);
  }

  for (const 隊長 of 隊長清單) {
    const btn = document.createElement("button");
    btn.className = "隊長卡片";
    btn.style.setProperty("--隊長色", 隊長.代表色);
    btn.innerHTML = `<strong>${隊長顯示名(隊長)}</strong><span>${隊長代號(隊長)}</span>`;
    btn.classList.toggle("作用中", 隊長.id === 選中隊長id);
    btn.onclick = () => {
      選中隊長id = 隊長.id;
      應用程式狀態.額外.選中隊長 = 隊長.id;
      隊長列表.querySelectorAll("button").forEach((b) => b.classList.remove("作用中"));
      btn.classList.add("作用中");
      重繪隊伍預覽();
    };
    隊長列表.appendChild(btn);
  }

  隊長區.appendChild(隊長列表);
  隊伍設定區.appendChild(隊長區);

  if (顯示起始成員選擇) {
    const 模式切換區 = document.createElement("section");
    模式切換區.className = "準備流程-模式切換區";
    模式切換區.innerHTML = `
      <div class="準備流程-區塊標題">${雙語("開場方式", "Starting Approach")}</div>
      <div class="準備流程-區塊說明">
        ${雙語("挑一套已驗證過的預設隊伍立刻探索，或不要任何加成、從零慢慢養成。", "Jump in with a validated preset squad, or skip every boost and grow your team from scratch.")}
      </div>
    `;
    const 切換列 = document.createElement("div");
    切換列.className = "準備流程-模式切換列";

    const 目前開場模式 = 應用程式狀態.額外.開場模式;

    const showcase按鈕 = document.createElement("button");
    showcase按鈕.type = "button";
    showcase按鈕.className = `準備流程-模式按鈕 ${目前開場模式 === "showcase" ? "作用中" : ""}`;
    showcase按鈕.innerHTML = `<strong>⚡ ${雙語("Showcase 快速上手", "Showcase Quick Start")}</strong><small>${雙語("三套已驗證的預設隊伍，選了就能直接探索", "3 validated preset squads — pick one and explore right away")}</small>`;
    showcase按鈕.onclick = () => {
      應用程式狀態.設定開場模式("showcase");
      渲染遊戲準備流程(容器);
    };

    const 從零按鈕 = document.createElement("button");
    從零按鈕.type = "button";
    從零按鈕.className = `準備流程-模式按鈕 ${目前開場模式 === "none" ? "作用中" : ""}`;
    從零按鈕.innerHTML = `<strong>🌱 ${雙語("不要開場加成", "No Starting Boost")}</strong><small>${雙語("從零開始，自己手動挑 3 名初始成員慢慢養成", "Start from scratch — manually pick 3 starting members and grow at your own pace")}</small>`;
    從零按鈕.onclick = () => {
      應用程式狀態.設定開場模式("none");
      渲染遊戲準備流程(容器);
    };

    切換列.append(showcase按鈕, 從零按鈕);
    模式切換區.appendChild(切換列);
    隊伍設定區.appendChild(模式切換區);

    if (目前開場模式 === "showcase") {
      const 預設區 = document.createElement("section");
      預設區.className = "準備流程-預設區";
      預設區.innerHTML = `
        <div class="準備流程-區塊標題">${雙語("選擇一套預設隊伍", "Choose a Preset Build")}</div>
        <div class="準備流程-區塊說明">
          ${雙語("每套都是 9 名真實上陣成員，星級 1~3★ 不等，家族配置各不相同，選了就直接帶著這套隊伍出發。", "Each build fields 9 real squad members at 1-3 stars, with a different family split. Pick one and head straight into the run with it.")}
        </div>
      `;
      const 預設卡列 = document.createElement("div");
      預設卡列.className = "準備流程-預設卡列";
      const 選中預設id = 應用程式狀態.額外.選中Showcase預設ID;

      SHOWCASE_PRESETS.forEach((preset) => {
        const 卡片 = document.createElement("button");
        卡片.type = "button";
        卡片.className = `準備流程-預設卡 準備流程-預設卡--${preset.archetype} ${preset.id === 選中預設id ? "作用中" : ""}`;
        卡片.innerHTML = `
          <div class="準備流程-預設卡標題"><span>${ARCHETYPE_ICON[preset.archetype]} ${預設archetype標籤(preset)}</span><strong>${預設名稱(preset)}</strong></div>
          <div class="準備流程-預設卡配置">${preset.家族配置}</div>
          <div class="準備流程-預設卡說明">${預設說明(preset)}</div>
        `;
        卡片.onclick = () => {
          應用程式狀態.設定選中Showcase預設(preset.id);
          渲染遊戲準備流程(容器);
        };
        預設卡列.appendChild(卡片);
      });

      預設區.appendChild(預設卡列);
      隊伍設定區.appendChild(預設區);
    } else {
      const 選角區 = document.createElement("section");
      選角區.className = "準備流程-選角區";
      選角區.innerHTML = `
        <div class="準備流程-區塊標題">${雙語("選擇 3 名初始成員", "Choose 3 Starting Members")}</div>
        <div class="準備流程-區塊說明">
          ${雙語("由內而外安排三名初始成員；每一位只能加入一次。", "Assign three starting members from the inner ring outward. Each member can only be chosen once.")}
        </div>
      `;

      const 選擇列 = document.createElement("div");
      選擇列.className = "準備流程-選擇列";
      const 當前配置 = 取得起始成員配置();
      const 層級標籤: Record<初始成員層級, string> = {
        inner: 雙語("最內層", "Inner Ring"),
        middle: 雙語("中層", "Middle Ring"),
        outer: 雙語("外層", "Outer Ring"),
      };

      (["inner", "middle", "outer"] as 初始成員層級[]).forEach((layer) => {
        const current = 當前配置.find((entry) => entry.layer === layer);
        if (!current) return;
        const 其他已選 = new Set(當前配置.filter((entry) => entry.layer !== layer).map((entry) => entry.memberNo));
        const member = MEMBERS.find((entry) => entry.no === current.memberNo);
        const 卡片 = document.createElement("label");
        卡片.className = `準備流程-選角卡 準備流程-選角卡--${layer}`;
        卡片.innerHTML = `<div class="準備流程-選角卡標題"><span>${層級標籤[layer]}</span><strong>${member ? 成員顯示名(member) : ""}</strong></div>`;

        const 下拉 = document.createElement("select");
        下拉.className = "二級按鈕";
        MEMBERS.filter((candidate) => !其他已選.has(candidate.no) || candidate.no === current.memberNo).forEach((candidate) => {
          const option = document.createElement("option");
          option.value = String(candidate.no);
          option.selected = candidate.no === current.memberNo;
          option.textContent = `${String(candidate.no).padStart(2, "0")}. ${成員顯示名(candidate)}`;
          下拉.appendChild(option);
        });
        下拉.onchange = () => {
          設定起始成員(layer, Number(下拉.value));
          渲染遊戲準備流程(容器);
        };
        卡片.appendChild(下拉);

        const 補充 = document.createElement("div");
        補充.className = "準備流程-選角補充";
        補充.textContent = member ? `${member.nameEn} | ${雙語("世界", "World")}: ${世界顯示名(member.world)}` : "";
        卡片.appendChild(補充);
        選擇列.appendChild(卡片);
      });
      選角區.appendChild(選擇列);
      隊伍設定區.appendChild(選角區);
    }
  }

  版面.appendChild(隊伍設定區);

  const 預覽區 = document.createElement("div");
  預覽區.className = "準備流程-預覽區";
  預覽區.innerHTML = `<h4>${雙語("出戰隊伍立繪", "Starting Squad Portraits")}</h4>`;
  預覽區.appendChild(預覽容器);
  重繪隊伍預覽();
  版面.appendChild(預覽區);

  root.appendChild(版面);

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
