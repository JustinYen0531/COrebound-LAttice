/**
 * @file Showcase預設隊伍.ts
 * @description Game Jam 試玩用的「一鍵上陣」預設隊伍。三套已驗證過的陣容（非隨機生成），
 *              涵蓋強攻/均衡防禦/資源支援三種打法，家族人數配置分別對應機制指南 §1.1
 *              的「3+3+3 三修流」「4+3+2 混合流」「2+2+2+2 四修流」，星級落在 1~3★ 區間，
 *              刻意讓三套的成熟度不同（有的接近滿配、有的仍在中期），方便試玩者快速切換體感。
 *
 *              套用方式見 progression/養成狀態.ts 的 套用Showcase預設隊伍()：
 *              直接覆寫上陣 9 個真實戰鬥槽位的成員與星級，並把家族武器星級直接設到
 *              當前陣容可達到的門檻上限，玩家選了就能立刻打，不必再手動升星/升武器。
 */

export type Showcase層級 = "inner" | "middle" | "outer";
export type Showcase職責 = "protect" | "firepower" | "supply";

export interface Showcase成員槽 {
  slotId: number;
  memberNo: number;
  star: 1 | 2 | 3;
  layer: Showcase層級;
  role: Showcase職責;
}

export interface Showcase預設隊伍 {
  id: string;
  名稱: string;
  名稱英: string;
  archetype: "aggressive" | "defense" | "support";
  archetype標籤: string;
  archetype標籤英: string;
  家族配置: string; // 展示用文字，如 "3 + 3 + 3"
  說明: string;
  說明英: string;
  members: Showcase成員槽[];
}

export const SHOWCASE_PRESETS: Showcase預設隊伍[] = [
  {
    id: "aggressive_trio",
    名稱: "強攻陣線",
    名稱英: "Aggressive Vanguard",
    archetype: "aggressive",
    archetype標籤: "強攻型",
    archetype標籤英: "Aggressive",
    家族配置: "3 + 3 + 3（直線／多發／地雷）",
    說明: "直線、多發、地雷三家族各出 3 人，三條武器線同時打到 2★，星級普遍偏高，接近滿配的高輸出陣容。",
    說明英: "Straight, Multishot, and Mine each field 3 members, pushing all three weapon lines to 2★ at once. Stars run high across the board — a near-max, high-damage lineup.",
    members: [
      { slotId: 0, memberNo: 4, star: 3, layer: "inner", role: "protect" }, // 04. 節點 Node (mine)
      { slotId: 1, memberNo: 3, star: 3, layer: "inner", role: "firepower" }, // 03. 向量 Vector (straight)
      { slotId: 2, memberNo: 2, star: 3, layer: "inner", role: "supply" }, // 02. 矩陣 Matrix (multishot)
      { slotId: 3, memberNo: 9, star: 2, layer: "middle", role: "protect" }, // 09. 真菌 Fungus (mine)
      { slotId: 4, memberNo: 8, star: 3, layer: "middle", role: "firepower" }, // 08. 藤蔓 Vine (straight)
      { slotId: 5, memberNo: 7, star: 2, layer: "middle", role: "supply" }, // 07. 孢粉 Spore (multishot)
      { slotId: 6, memberNo: 14, star: 2, layer: "outer", role: "protect" }, // 14. 深淵 Abyss (mine)
      { slotId: 7, memberNo: 13, star: 2, layer: "outer", role: "firepower" }, // 13. 閃電 Lightning (straight)
      { slotId: 8, memberNo: 12, star: 2, layer: "outer", role: "supply" }, // 12. 分叉 Bifurcation (multishot)
    ],
  },
  {
    id: "balanced_defense",
    名稱: "均衡防線",
    名稱英: "Balanced Defense",
    archetype: "defense",
    archetype標籤: "防禦型",
    archetype標籤英: "Defensive",
    家族配置: "4 + 3 + 2（護盾／直線／多發）",
    說明: "護盾家族滿編 4 人並衝上 3★武器，直線家族 3 人穩定在 2★，多發家族 2 人剛解鎖 1★——刻意呈現「主力已成熟、副線仍在成長」的中後期陣容。",
    說明英: "Shield runs a full 4 members and hits its 3★ weapon cap; Straight sits comfortably at 2★ with 3 members; Multishot has just unlocked its 1★ tier with 2. A deliberate mix of a matured core and a still-growing side line.",
    members: [
      { slotId: 0, memberNo: 1, star: 3, layer: "inner", role: "protect" }, // 01. 稜鏡 Prism (shield)
      { slotId: 1, memberNo: 3, star: 2, layer: "inner", role: "firepower" }, // 03. 向量 Vector (straight)
      { slotId: 2, memberNo: 2, star: 1, layer: "inner", role: "supply" }, // 02. 矩陣 Matrix (multishot)
      { slotId: 3, memberNo: 6, star: 3, layer: "middle", role: "protect" }, // 06. 荊棘 Thorn (shield)
      { slotId: 4, memberNo: 8, star: 2, layer: "middle", role: "firepower" }, // 08. 藤蔓 Vine (straight)
      { slotId: 5, memberNo: 7, star: 1, layer: "middle", role: "supply" }, // 07. 孢粉 Spore (multishot)
      { slotId: 6, memberNo: 11, star: 2, layer: "outer", role: "protect" }, // 11. 雪鏡 Snowglass (shield)
      { slotId: 7, memberNo: 13, star: 1, layer: "outer", role: "firepower" }, // 13. 閃電 Lightning (straight)
      { slotId: 8, memberNo: 16, star: 2, layer: "outer", role: "supply" }, // 16. 閘門 Gate (shield)
    ],
  },
  {
    id: "support_growth",
    名稱: "資源支援型",
    名稱英: "Support & Sustain",
    archetype: "support",
    archetype標籤: "支援型",
    archetype標籤英: "Support",
    家族配置: "2 + 2 + 2 + 2 + 1（護盾／多發／直線／地雷／激光）",
    說明: "四大家族各出 2 人，統一剛解鎖 1★武器，再加一名激光支援成員拉資源與增益——星級全在 1~2★，是一套仍在發育中期的寬陣容，適合喜歡邊打邊養成的玩家。",
    說明英: "All four combat families field exactly 2 members, each just unlocking its 1★ weapon, plus one Laser-family support member for extra buffs and resources. Stars stay at 1-2★ throughout — a wide, still-developing lineup for players who like growing as they go.",
    members: [
      { slotId: 0, memberNo: 1, star: 2, layer: "inner", role: "protect" }, // 01. 稜鏡 Prism (shield)
      { slotId: 1, memberNo: 3, star: 1, layer: "inner", role: "firepower" }, // 03. 向量 Vector (straight)
      { slotId: 2, memberNo: 2, star: 2, layer: "inner", role: "supply" }, // 02. 矩陣 Matrix (multishot)
      { slotId: 3, memberNo: 6, star: 1, layer: "middle", role: "protect" }, // 06. 荊棘 Thorn (shield)
      { slotId: 4, memberNo: 8, star: 1, layer: "middle", role: "firepower" }, // 08. 藤蔓 Vine (straight)
      { slotId: 5, memberNo: 7, star: 1, layer: "middle", role: "supply" }, // 07. 孢粉 Spore (multishot)
      { slotId: 6, memberNo: 4, star: 1, layer: "outer", role: "protect" }, // 04. 節點 Node (mine)
      { slotId: 7, memberNo: 9, star: 1, layer: "outer", role: "firepower" }, // 09. 真菌 Fungus (mine)
      { slotId: 8, memberNo: 5, star: 2, layer: "outer", role: "supply" }, // 05. 光錐 Lightcone (laser)
    ],
  },
];

export function 尋找Showcase預設(id: string | null): Showcase預設隊伍 | undefined {
  if (!id) return undefined;
  return SHOWCASE_PRESETS.find((preset) => preset.id === id);
}
