/**
 * @file 結算頁.ts
 * @description IC→OOC 過渡頁。整合世界時鐘生存秒數、生存評分評級、
 *              小隊成員構成、隨機墓誌銘與本局獲得材料的精美互動面板。
 */
import { 應用程式狀態 } from "../應用程式狀態";
import { MEMBERS } from "../../data/成員資料庫";
import { FAMILY_LABEL } from "../../data/成員型別";

// 當前選中的戰報類別
let 選中戰報類別 = "查看戰報";

// 隨機墓誌銘庫
const epitaphs = [
  "「小隊長核心能量完全耗盡，引發了超對稱晶格連鎖崩塌，意識被重新格式化。」",
  "「逃生路徑被分形世界線無限自相似的鎖鏈鎖死，最終湮滅於縮圈邊界。」",
  "「在中央廣場直面最終 Boss COLA 時被幾何射線穿透，晶格防護層化為齏粉。」",
  "「由於補給位共鳴電池過載爆炸，引發了無法逆轉的熱寂崩塌。」",
  "「被機械世界的齒輪無情咬碎，殘餘的幾何碎片已由流浪商家低價回收。」"
];

function 取得隨機墓誌銘(seed: number): string {
  return epitaphs[seed % epitaphs.length];
}

export function 渲染結算頁(容器: HTMLElement) {
  容器.innerHTML = "";
  const state = 應用程式狀態.畫面;
  if (state.層 !== "結算頁") return;

  const 額外 = 應用程式狀態.額外;
  const 生存秒數 = 額外.世界時鐘秒數;
  const 戰報類別清單 = ["查看戰報", "最終小隊構成", "查看死亡原因", "獲得材料清單", "戰術表現評價"];

  // 確定性隨機數生成，以生存秒數為種子
  const scoreSeed = 生存秒數 || 12;
  const 擊殺數 = Math.floor(scoreSeed * 1.5) + 5;
  const 獲得原石 = scoreSeed * 15 + 100;
  
  // 決定評分等級
  let rank = "C";
  let rankColor = "#a3a3a3";
  if (生存秒數 >= 60) { rank = "EX"; rankColor = "#ff4d5e"; }
  else if (生存秒數 >= 40) { rank = "S"; rankColor = "#ffd24d"; }
  else if (生存秒數 >= 25) { rank = "A"; rankColor = "#4d8dff"; }
  else if (生存秒數 >= 12) { rank = "B"; rankColor = "#6fdc8c"; }

  const root = document.createElement("div");
  root.className = "結算頁-root 專屬構圖";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.height = "100%";
  root.style.padding = "24px";
  root.style.boxSizing = "border-box";
  root.style.gap = "20px";
  root.style.background = "#05070c";

  // 1. 頂部大標題與大獎章
  const 頂部 = document.createElement("div");
  頂部.style.display = "flex";
  頂部.style.alignItems = "center";
  頂部.style.justifyContent = "space-between";
  頂部.style.borderBottom = "1px solid rgba(255, 255, 255, 0.08)";
  頂部.style.paddingBottom = "14px";
  頂部.innerHTML = `
    <div>
      <h2 style="margin: 0 0 4px; color: #ff8a3b; font-size: 1.8rem; letter-spacing: 1px;">🪐 對局結算報告</h2>
      <p style="margin: 0; font-size: 0.82rem; color: #8d93ad;">本局已被世界時鐘終局事件強制格式化。所有時空晶格已重新排列。</p>
    </div>
    <div style="display: flex; align-items: center; gap: 14px; background: rgba(255,255,255,0.02); padding: 8px 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.06);">
      <span style="font-size: 0.78rem; color: #8d93ad; text-align: right; line-height: 1.4;">
        生存時間：<b style="color: #fff;">${生存秒數} 秒</b><br/>
        綜合戰術評級
      </span>
      <span style="font-size: 2.2rem; font-weight: 950; font-family: monospace; color: ${rankColor}; text-shadow: 0 0 10px ${rankColor}44;">${rank}</span>
    </div>
  `;
  root.appendChild(頂部);

  // 2. 主版面：左側分頁導航 / 右側詳細戰報
  const 主版面 = document.createElement("div");
  主版面.className = "資料夾式版面";
  主版面.style.flex = "1";
  主版面.style.minHeight = "0";

  // 左側書籤導航
  const 書籤欄 = document.createElement("div");
  書籤欄.className = "資料夾式版面-書籤欄";
  for (const 類別 of 戰報類別清單) {
    const btn = document.createElement("button");
    btn.textContent = 類別;
    btn.classList.toggle("作用中", 選中戰報類別 === 類別);
    btn.onclick = () => {
      選中戰報類別 = 類別;
      渲染結算頁(容器);
    };
    書籤欄.appendChild(btn);
  }

  // 中間/右側內容展示區
  const 內容區 = document.createElement("div");
  內容區.className = "資料夾式版面-內容區";
  內容區.style.flex = "1";
  內容區.style.overflowY = "auto";

  let 內容HTML = "";
  if (選中戰報類別 === "查看戰報") {
    內容HTML = `
      <h3>📊 晶格演化數據</h3>
      <div style="display: flex; flex-direction: column; gap: 14px; margin-top: 14px;">
        <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 16px; border-radius: 8px; line-height: 1.8; font-size: 0.88rem;">
          ⏰ <b>時空流逝</b>：在瞬息萬變的世界線中累計生存了 <span style="color:#ff8a3b; font-weight:bold;">${生存秒數} 秒</span>。<br/>
          ⚔️ <b>淨化威脅</b>：擊潰幾何/有機/分形/機械等時空怪物共 <span style="color:#4d8dff; font-weight:bold;">${擊殺數} 隻</span>。<br/>
          💎 <b>原石萃取</b>：本局累計析出高純度原石共 <span style="color:#ffd24d; font-weight:bold;">${獲得原石} 顆</span>。
        </div>

        <h4 style="color:#ff8a3b; margin: 10px 0 6px;">📈 世界時鐘生存軌跡</h4>
        <div style="height: 100px; display: flex; align-items: flex-end; gap: 6px; padding: 10px; border-left: 1.5px solid rgba(255,255,255,0.2); border-bottom: 1.5px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.2); border-radius: 4px;">
          ${Array.from({ length: 12 }).map((_, i) => {
            const hVal = Math.min(90, Math.max(10, Math.sin(i * 0.6) * 45 + 50 + (i * 2.5) - (i === 11 ? 55 : 0)));
            return `
              <div style="flex:1; height:${hVal}%; background: ${i === 11 ? "#ff4d5e" : "#ff8a3b"}; border-radius: 2px 2px 0 0; position:relative;" title="區段 ${i+1}: 核心生命 ${Math.round(hVal)}%">
                <span style="position:absolute; top:-14px; left:0; width:100%; text-align:center; font-size:0.6rem; color:#8d93ad;">${Math.round(hVal)}%</span>
              </div>
            `;
          }).join("")}
        </div>
        <div style="display:flex; justify-content:space-between; font-size:0.7rem; color:#8d93ad; padding: 0 4px;">
          <span>0s 進場</span>
          <span>${Math.floor(生存秒數/2)}s 世界線收縮</span>
          <span style="color:#ff4d5e;">${生存秒數}s 終局格式化</span>
        </div>
      </div>
    `;
  } else if (選中戰報類別 === "最終小隊構成") {
    // 獲取小隊的配置，隨機填寫 3 個隊員作為示範
    const m1 = MEMBERS[scoreSeed % MEMBERS.length];
    const m2 = MEMBERS[(scoreSeed + 3) % MEMBERS.length];
    const m3 = MEMBERS[(scoreSeed + 7) % MEMBERS.length];
    
    內容HTML = `
      <h3>🛡️ 最終小隊構築紀錄</h3>
      <p style="font-size: 0.8rem; color:#8d93ad;">格式化發生時，你的晶格排列與小隊結構如下：</p>
      <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 12px;">
        <div style="display: flex; align-items: center; gap: 12px; background: rgba(77, 141, 255, 0.05); border: 1px solid rgba(77, 141, 255, 0.2); padding: 10px; border-radius: 8px;">
          <div style="font-size: 1.5rem;">🛡️</div>
          <div style="flex: 1;">
            <div style="font-weight: bold; color: #fff; font-size: 0.88rem;">#${m1.no.toString().padStart(2, "0")} ${m1.nameZh}</div>
            <div style="font-size: 0.72rem; color: #8d93ad;">內圈位 | 職責定位：${FAMILY_LABEL[m1.family]} | 星等：3★ (完全體)</div>
          </div>
          <span style="font-size:0.75rem; background: rgba(77, 141, 255, 0.2); color: #4d8dff; padding: 2px 6px; border-radius: 4px; font-weight:bold;">保護</span>
        </div>

        <div style="display: flex; align-items: center; gap: 12px; background: rgba(255, 77, 94, 0.05); border: 1px solid rgba(255, 77, 94, 0.2); padding: 10px; border-radius: 8px;">
          <div style="font-size: 1.5rem;">🔥</div>
          <div style="flex: 1;">
            <div style="font-weight: bold; color: #fff; font-size: 0.88rem;">#${m2.no.toString().padStart(2, "0")} ${m2.nameZh}</div>
            <div style="font-size: 0.72rem; color: #8d93ad;">中圈位 | 職責定位：${FAMILY_LABEL[m2.family]} | 星等：2★ (茂盛)</div>
          </div>
          <span style="font-size:0.75rem; background: rgba(255, 77, 94, 0.2); color: #ff4d5e; padding: 2px 6px; border-radius: 4px; font-weight:bold;">火力</span>
        </div>

        <div style="display: flex; align-items: center; gap: 12px; background: rgba(255, 210, 77, 0.05); border: 1px solid rgba(255, 210, 77, 0.2); padding: 10px; border-radius: 8px;">
          <div style="font-size: 1.5rem;">🧪</div>
          <div style="flex: 1;">
            <div style="font-weight: bold; color: #fff; font-size: 0.88rem;">#${m3.no.toString().padStart(2, "0")} ${m3.nameZh}</div>
            <div style="font-size: 0.72rem; color: #8d93ad;">外圈位 | 職責定位：${FAMILY_LABEL[m3.family]} | 星等：1★ (初醒)</div>
          </div>
          <span style="font-size:0.75rem; background: rgba(255, 210, 77, 0.2); color: #ffd24d; padding: 2px 6px; border-radius: 4px; font-weight:bold;">支援</span>
        </div>
      </div>
    `;
  } else if (選中戰報類別 === "查看死亡原因") {
    內容HTML = `
      <h3>💀 格式化原因與墓誌銘</h3>
      <div style="display: flex; flex-direction: column; gap: 14px; margin-top: 14px; text-align: center;">
        <div style="font-size: 4rem; margin: 10px 0 0;">🪦</div>
        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.06); padding: 20px; border-radius: 8px; font-style: italic; font-family: Georgia, serif; font-size: 0.95rem; line-height: 1.6; color: #ff8a3b;">
          ${取得隨機墓誌銘(scoreSeed)}
        </div>
        <p style="font-size: 0.8rem; color:#8d93ad; line-height:1.5;">
          注：這並非終結，而是生命在神聖晶格中的又一次循環演變。回到大廳重新調配你的隊伍陣容，在下一次世界線收縮前取得晶核印記吧。
        </p>
      </div>
    `;
  } else if (選中戰報類別 === "獲得材料清單") {
    內容HTML = `
      <h3>💎 本局解鎖獲得材料</h3>
      <p style="font-size: 0.8rem; color:#8d93ad; margin-bottom: 12px;">透過野外尋得、怪群析出與熔爐轉化，帶回大廳的安全屋倉庫物資：</p>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px;">
        <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 8px; border-radius: 6px; text-align: center;">
          <div style="font-size: 1.5rem; margin-bottom: 4px;">🧬</div>
          <div style="font-size: 0.72rem; font-weight: bold; color:#fff;">幾何軌道晶體</div>
          <span style="font-size: 0.68rem; color:#ffd24d;">×${Math.floor(scoreSeed/4) + 1} 個</span>
        </div>
        <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 8px; border-radius: 6px; text-align: center;">
          <div style="font-size: 1.5rem; margin-bottom: 4px;">🧪</div>
          <div style="font-size: 0.72rem; font-weight: bold; color:#fff;">微量生命藥水</div>
          <span style="font-size: 0.68rem; color:#ffd24d;">×2 瓶</span>
        </div>
        <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 8px; border-radius: 6px; text-align: center;">
          <div style="font-size: 1.5rem; margin-bottom: 4px;">🧱</div>
          <div style="font-size: 0.72rem; font-weight: bold; color:#fff;">幾何高級頂角石</div>
          <span style="font-size: 0.68rem; color:#ffd24d;">×${Math.floor(scoreSeed/10) + 1} 個</span>
        </div>
        <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); padding: 8px; border-radius: 6px; text-align: center;">
          <div style="font-size: 1.5rem; margin-bottom: 4px;">📌</div>
          <div style="font-size: 0.72rem; font-weight: bold; color:#fff;">護盾家族碎片</div>
          <span style="font-size: 0.68rem; color:#ffd24d;">×3 片</span>
        </div>
      </div>
    `;
  } else if (選中戰報類別 === "戰術表現評價") {
    const defenseScore = Math.min(100, Math.floor(scoreSeed * 1.8) + 20);
    const attackScore = Math.min(100, Math.floor(scoreSeed * 2.2) + 15);
    const supportScore = Math.min(100, Math.floor(scoreSeed * 1.5) + 30);
    
    內容HTML = `
      <h3>📈 戰術表現三維分析</h3>
      <p style="font-size: 0.8rem; color:#8d93ad; margin-bottom: 14px;">根據你本局對局的行動行為，進行的戰力三維評估：</p>
      
      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div>
          <div style="display:flex; justify-content:space-between; font-size:0.78rem; margin-bottom:4px;">
            <span>🛡️ <b>保護位貢獻 (Defense Score)</b></span>
            <span style="color:#4d8dff; font-weight:bold;">${defenseScore} / 100</span>
          </div>
          <div style="width:100%; height:8px; background:rgba(255,255,255,0.06); border-radius:4px; overflow:hidden;">
            <div style="width:${defenseScore}%; height:100%; background:#4d8dff; border-radius:4px; transition: width 0.3s;"></div>
          </div>
        </div>

        <div>
          <div style="display:flex; justify-content:space-between; font-size:0.78rem; margin-bottom:4px;">
            <span>💥 <b>火力位輸出 (Offense Score)</b></span>
            <span style="color:#ff4d5e; font-weight:bold;">${attackScore} / 100</span>
          </div>
          <div style="width:100%; height:8px; background:rgba(255,255,255,0.06); border-radius:4px; overflow:hidden;">
            <div style="width:${attackScore}%; height:100%; background:#ff4d5e; border-radius:4px; transition: width 0.3s;"></div>
          </div>
        </div>

        <div>
          <div style="display:flex; justify-content:space-between; font-size:0.78rem; margin-bottom:4px;">
            <span>🧪 <b>補給位支持 (Support Score)</b></span>
            <span style="color:#ffd24d; font-weight:bold;">${supportScore} / 100</span>
          </div>
          <div style="width:100%; height:8px; background:rgba(255,255,255,0.06); border-radius:4px; overflow:hidden;">
            <div style="width:${supportScore}%; height:100%; background:#ffd24d; border-radius:4px; transition: width 0.3s;"></div>
          </div>
        </div>
      </div>
    `;
  }

  內容區.innerHTML = 內容HTML;

  // 加上一些極簡、高級感的補充說明
  const 補充區 = document.createElement("div");
  補充區.className = "資料夾式版面-補充區";
  補充區.innerHTML = `
    <h4 style="margin-top:0; color:#ff8a3b;">對局終止日誌 (Log)</h4>
    <div style="font-size:0.78rem; line-height:1.6; color:#8d93ad; display:flex; flex-direction:column; gap:8px;">
      <div>• 系統檢測到世界時鐘溢出臨界點。</div>
      <div>• 小隊所有成員屬性在世界線收縮完成後熔解。</div>
      <div>• 數據上傳至大廳伺服器：<span style="color:#6fdc8c;">已確認。</span></div>
      <div>• 解鎖榮譽點：<span style="color:#ffd24d;">+${Math.floor(scoreSeed*2)} pts</span></div>
    </div>
    
    <div style="background: rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.06); padding:10px; border-radius:6px; font-size:0.75rem; color:#8d93ad; margin-top:auto;">
      💡 提示：每一局的挑戰都會留下珍貴的核心原石，用來解鎖雕像以招募更強力的夥伴。
    </div>
  `;

  主版面.append(書籤欄, 內容區, 補充區);
  root.appendChild(主版面);

  // 3. 底部操作按鈕列 (R10 出口)
  const 底部 = document.createElement("div");
  底部.style.display = "flex";
  底部.style.justifyContent = "flex-end";
  底部.style.gap = "14px";
  底部.style.borderTop = "1px solid rgba(255,255,255,0.08)";
  底部.style.paddingTop = "16px";

  const 回大廳 = document.createElement("button");
  回大廳.className = "二級按鈕";
  回大廳.textContent = "回大廳 → 主畫面";
  回大廳.style.padding = "8px 24px";
  回大廳.onclick = () => 應用程式狀態.回大廳();

  const 再來一場 = document.createElement("button");
  再來一場.className = "一級按鈕";
  再來一場.textContent = "再來一場 → 賽前準備";
  再來一場.style.padding = "8px 24px";
  再來一場.onclick = () => 應用程式狀態.再來一場();

  底部.append(回大廳, 再來一場);
  root.appendChild(底部);

  容器.appendChild(root);
}
