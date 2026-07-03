/**
 * @file 成員資料庫.ts
 * @description 20 名小隊成員的完整數值資料庫。
 *              對應「doc/角色與敵方/成員圖鑑.md」所有欄位:
 *              基礎數值(1★)、視覺、定位、專屬附魔、角色概念、多樣性類別、
 *              以及 1★/2★/3★ 星級成長節點(含 3★ 質變/分支)。
 *
 *              資料原則:
 *              - 所有數值(HP/ATK/Speed/Weight)皆為「1★ 基礎值」,取用時用 statsAtStar() 套倍率
 *              - 星級倍率 1★=1.0x / 2★=2.0x / 3★=3.0x(成員圖鑑 §2)
 *              - 升星採 5-3-1 生物材料配方 + 家族碎片,不消耗原石(機制指南 §1.1)
 *              - 不含任何美術資產路徑(依本任務要求只定義數值)
 *
 *              命名原則:id 採 m{編號}_{英文名小寫},穩定且可搜尋。
 */

import type { MemberDef } from "./成員型別";

// ============================================================
// 幾何世界(Geometry)— 視覺:人工、科技、精準
// 多樣性傾向:整體戰力數值提升 (buffer)
// 成員圖鑑 §三.1
// ============================================================

/** 01. 稜鏡 (Prism) — 護盾家族 */
const m01_prism: MemberDef = {
  id: "m01_prism",
  no: 1,
  nameZh: "稜鏡",
  nameEn: "Prism",
  world: "geometry",
  family: "shield",
  visual: "多重交錯的規則三角形,形成硬質透明的幾何玻璃擋板。",
  role: "利用規整的扇形偏轉,將敵方的彈道完美向外側滑移折射。",
  enchant: "repel",
  soulConcept:
    "一位由無數透明三角晶片拼貼而成的守護者,身體沒有真正的皮膚,而是由透明的折射稜鏡所構成,流光溢彩在晶體中輕盈穿梭,隨玩家視角變幻出七彩光暈。他的身邊懸浮漂浮著數片可自由旋轉、反射光芒的三角幾何盾片。",
  diversity: "buffer",
  base: { hp: 1200, atk: 100, speed: 100, weight: 6 },
  starNodes: {
    1: {
      name: "折射防線",
      description: "稜鏡的光學折射為全隊提供屏障護佑,全小隊成員的最大生命值上限額外提升 6%。",
    },
    2: {
      name: "數值強化",
      description: "2★ 基礎屬性乘 2(HP 2400, ATK 200, Weight 12)。",
    },
    3: {
      name: "光譜護佑",
      description: "3★ 基礎屬性乘 3(HP 3600, ATK 300, Weight 18);且小隊整體獲得 10% 的碰撞重疊傷害減免。",
    },
  },
};

/** 02. 矩陣 (Matrix) — 多發家族 */
const m02_matrix: MemberDef = {
  id: "m02_matrix",
  no: 2,
  nameZh: "矩陣",
  nameEn: "Matrix",
  world: "geometry",
  family: "multishot",
  visual: "無數微小的同心正方形組成的矩陣網格。",
  role: "一次性呈網格狀向前方散發多枚正方形的銳利碎片,適合中近距離覆蓋。",
  enchant: "focus",
  soulConcept:
    "他並非傳統金屬結構的機器人,而是由數萬顆微小、懸浮的正方形與立方體晶片拼湊出的人形精靈。他前行時,整個身軀宛如一條流動的數學矩陣,充盈著奇異的數位空靈感。",
  diversity: "buffer",
  base: { hp: 800, atk: 150, speed: 150, weight: 3 },
  starNodes: {
    1: {
      name: "矩陣校準",
      description: "運算小隊陣型,全小隊成員的基礎移動速度提升 6%,且能量回復速度提升 6%。",
    },
    2: {
      name: "數值強化",
      description: "2★ 基礎屬性乘 2(HP 1600, ATK 300, Weight 6)。",
    },
    3: {
      name: "運算超頻",
      description: "3★ 基礎屬性乘 3(HP 2400, ATK 450, Weight 9);且全小隊的傷害結算週期 (Damage Tick Interval) 縮短 15%。",
    },
  },
};

/** 03. 向量 (Vector) — 直線家族 */
const m03_vector: MemberDef = {
  id: "m03_vector",
  no: 3,
  nameZh: "向量",
  nameEn: "Vector",
  world: "geometry",
  family: "straight",
  visual: "帶有極強指向性箭頭的粗線段射線。",
  role: "高速、精確度極高的高速單發直線子彈,彈道極為平直且不偏轉。",
  enchant: "snipe",
  soulConcept:
    "他是幾何世界中最為純粹、極致簡潔的刺客。他的身體沒有任何多餘的角弧或花哨裝飾,完全由筆直的鋒利直線、尖銳的箭型與流線型長槍結構所構成。",
  diversity: "specialist",
  base: { hp: 600, atk: 250, speed: 100, weight: 3 },
  starNodes: {
    1: {
      name: "線性聚焦",
      description: "僅對自身數值生效。向量自身貢獻的基礎攻擊力(非子彈屬性)額外提升 20%。",
    },
    2: {
      name: "數值強化",
      description: "2★ 基礎屬性乘 2(HP 1200, ATK 500, Weight 6)。",
    },
    3: {
      name: "向量追獵",
      description: "3★ 基礎屬性乘 3(HP 1800, ATK 750, Weight 9);且當小隊成功擊殺敵人時,立刻為小隊全體施加持續 2.5 次傷害 Tick 的 20% 移動速度加成。",
    },
  },
};

/** 04. 節點 (Node) — 地雷家族 */
const m04_node: MemberDef = {
  id: "m04_node",
  no: 4,
  nameZh: "節點",
  nameEn: "Node",
  world: "geometry",
  family: "mine",
  visual: "在重力網格上閃爍著藍光的正方形錨點。",
  role: "靜止時會朝四周拉伸出短暫的幾何射線雷區,對觸碰的敵方造成傷害。",
  enchant: "empowered_cast",
  soulConcept:
    "他是重力網格的網絡守護者,一名將靈魂與網路錨點編織在一起的幾何法師。他的身邊永遠散落懸浮著數顆散發幽藍光芒的幾何光點。",
  diversity: "buffer",
  base: { hp: 1000, atk: 100, speed: 100, weight: 4 },
  starNodes: {
    1: {
      name: "網絡連結",
      description: "節點將小隊網絡化,全小隊成員獲得 5% 的碰撞重疊傷害減免,且小隊能量回復速度提升 10%。",
    },
    2: {
      name: "數值強化",
      description: "2★ 基礎屬性乘 2(HP 2000, ATK 200, Weight 8)。",
    },
    3: {
      name: "超載網格",
      description: "3★ 基礎屬性乘 3(HP 3000, ATK 300, Weight 12);且當隊長釋放主動位移技能時,全隊獲得持續 2.0 次傷害 Tick 的 15% 傷害加成。",
    },
  },
};

/** 05. 光錐 (Lightcone) — 激光家族 */
const m05_lightcone: MemberDef = {
  id: "m05_lightcone",
  no: 5,
  nameZh: "光錐",
  nameEn: "Lightcone",
  world: "geometry",
  family: "laser",
  visual: "圓錐狀的規則雷射光束。",
  role: "線性穿透,能對直線上的所有敵人造成均等的高頻率傷害。",
  enchant: null,
  soulConcept:
    "他是一位披著光之羽衣的高維神官。他的衣襬並非實體布料,而是由錐狀的強烈雷射光線折射所構成的無定型光幔。他站在光暈中央,身後自然形成巨大、高熱光錐。",
  diversity: "buffer",
  base: { hp: 1000, atk: 100, speed: 100, weight: 3 },
  starNodes: {
    1: {
      name: "圓錐透鏡",
      description: "光錐校準小隊光路,全小隊獲得 5% 的碰撞重疊傷害減免,且小隊能量回復速度提升 10%。",
    },
    2: {
      name: "數值強化",
      description: "2★ 基礎屬性乘 2(HP 2000, ATK 200, Weight 6)。",
    },
    3: {
      name: "光幔偏折",
      description: "3★ 基礎屬性乘 3(HP 3000, ATK 300, Weight 9);且小隊全體每隔 5 次受到碰撞傷害時,自動使該次受到的傷害無效(確定性判定,無機率隨機)。",
    },
  },
};

// ============================================================
// 有機世界(Organic)— 視覺:生命、森林、搏點
// 多樣性傾向:資源類之增益 (resource)
// 成員圖鑑 §三.2
// ============================================================

/** 06. 荊棘 (Thorn) — 護盾家族 */
const m06_thorn: MemberDef = {
  id: "m06_thorn",
  no: 6,
  nameZh: "荊棘",
  nameEn: "Thorn",
  world: "organic",
  family: "shield",
  visual: "粗糙有彈性的木質樹皮,其上覆滿尖銳的荊棘。",
  role: "大範圍扇形防護,被敵人子彈碰撞時,能反饋少量的尖刺反彈傷害。",
  enchant: "splinter",
  soulConcept:
    "他並非手拿實體盾牌的士兵,而是森林本身孕育出的守護神。他的身體肢體覆蓋著厚實粗糙的青苔樹皮,無數尖銳的荊棘沿著雙臂自然生長出來。",
  diversity: "specialist",
  base: { hp: 1600, atk: 100, speed: 50, weight: 10 },
  starNodes: {
    1: {
      name: "棘刺木質",
      description: "僅對自身數值生效。荊棘自身的最大生命值上限提升 15%。",
    },
    2: {
      name: "數值強化",
      description: "2★ 基礎屬性乘 2(HP 3200, ATK 200, Weight 20)。",
    },
    3: {
      name: "鐵木身軀",
      description: "3★ 基礎屬性乘 3(HP 4800, ATK 300, Weight 30);且自身受到的敵方子彈與武器碰撞傷害降低 30%。",
    },
  },
};

/** 07. 孢粉 (Spore) — 多發家族 */
const m07_spore: MemberDef = {
  id: "m07_spore",
  no: 7,
  nameZh: "孢粉",
  nameEn: "Spore",
  world: "organic",
  family: "multishot",
  visual: "浮游在空中的絨毛羽片與微小的圓形浮游孢子。",
  role: "近距離呈極大散射角的扇形爆發,命中敵人時會留下短暫的生物標記。",
  enchant: "kill_chain",
  soulConcept:
    "他由花粉、輕盈羽片與無數懸浮孢子共同匯聚而成。他前行時,整個身軀宛如一朵在微風中悄然散開的蒲公英,漫天散播著森林的生命因子。",
  diversity: "resource",
  base: { hp: 800, atk: 100, speed: 150, weight: 1 },
  starNodes: {
    1: {
      name: "花粉繁衍",
      description: "孢粉標記或擊殺的敵方單位與物件,有 15% 的機率掉落雙倍的生物材料。",
    },
    2: {
      name: "數值強化",
      description: "2★ 基礎屬性乘 2(HP 1600, ATK 200, Weight 2)。",
    },
    3: {
      name: "孢子寄生",
      description: "3★ 基礎屬性乘 3(HP 2400, ATK 300, Weight 3);且若成功擊殺 T2 以上的精英怪,必定(100%)掉落雙倍生物材料。",
    },
  },
};

/** 08. 藤蔓 (Vine) — 直線家族 */
const m08_vine: MemberDef = {
  id: "m08_vine",
  no: 8,
  nameZh: "藤蔓",
  nameEn: "Vine",
  world: "organic",
  family: "straight",
  visual: "一條快速向前蜿蜒伸展、帶有螺旋捲鬚的藤條。",
  role: "直線刺穿首個目標,並在目標身上留下短暫的纏繞減速(20% 移速降低)。",
  enchant: "homing",
  soulConcept:
    "他的整個身軀本身就是一株優雅舒展的藤蔓生命。他的四肢完全由不斷延伸、交錯扭轉的翠綠藤條所扭聚而成,手臂如蟒蛇般靈活蜿蜒。",
  diversity: "resource",
  base: { hp: 1000, atk: 100, speed: 100, weight: 3 },
  starNodes: {
    1: {
      name: "探地深根",
      description: "藤蔓深入地表。小隊在靠近地圖原石礦物時,藤蔓會自動採集,並使獲得的原石數量增加 20%。",
    },
    2: {
      name: "數值強化",
      description: "2★ 基礎屬性乘 2(HP 2000, ATK 200, Weight 6)。",
    },
    3: {
      name: "落葉歸根",
      description: "3★ 基礎屬性乘 3(HP 3000, ATK 300, Weight 9);當小隊有成員在戰鬥中死亡時,藤蔓立刻收回其養分,返還合成該死亡隊員所需材料的 60%。",
    },
  },
};

/** 09. 真菌 (Fungus) — 地雷家族 */
const m09_fungus: MemberDef = {
  id: "m09_fungus",
  no: 9,
  nameZh: "真菌",
  nameEn: "Fungus",
  world: "organic",
  family: "mine",
  visual: "不斷搏動、外表呈波浪狀的紅色活體真菌孢子囊。",
  role: "拋射並部署在地面,被踩踏時引爆,向四周噴灑擴散的劇毒菌落。",
  enchant: "gigantism",
  soulConcept:
    "他是森林最古老、最神祕的分解者神明。他的身體由巨大的層疊菌傘、交織的菌絲與微微膨脹的孢子囊共同築成。",
  diversity: "resource",
  base: { hp: 1200, atk: 100, speed: 50, weight: 3 },
  starNodes: {
    1: {
      name: "屍體分解",
      description: "真菌分解地圖上的怪物遺骸。小隊在擊殺怪物時,會自動吸收養分,額外獲得 15% 的原石掉落。",
    },
    2: {
      name: "數值強化",
      description: "2★ 基礎屬性乘 2(HP 2400, ATK 200, Weight 6)。",
    },
    3: {
      name: "菌絲繁衍",
      description: "3★ 基礎屬性乘 3(HP 3600, ATK 300, Weight 9);且小隊在擊殺怪群時,必定(100%)直接掉落隨機 0~1 星的怪物生物材料。",
    },
  },
};

/** 10. 螢光 (Biolume) — 激光家族 */
const m10_biolume: MemberDef = {
  id: "m10_biolume",
  no: 10,
  nameZh: "螢光",
  nameEn: "Biolume",
  world: "organic",
  family: "laser",
  visual: "由無數微小的螢光孢子粒子匯聚而成的綠色生物冷光束。",
  role: "持續射擊時,光束的體積會隨著照射時間稍微膨脹。",
  enchant: null,
  soulConcept:
    "他身軀由半透明的植物纖維與純淨的冷光脈絡組成,體內流動著無數緩慢飄移的螢光孢子。",
  diversity: "resource",
  base: { hp: 900, atk: 100, speed: 100, weight: 3 },
  starNodes: {
    1: {
      name: "冷光捕獲",
      description: "螢光引導林間能量,小隊在擊殺低階怪物時,有 20% 的機率額外掉落 1 顆原石。",
    },
    2: {
      name: "數值強化",
      description: "2★ 基礎屬性乘 2(HP 1800, ATK 200, Weight 6)。",
    },
    3: {
      name: "3★ 質變分支",
      description: "3★ 基礎屬性乘 3(HP 2700, ATK 300, Weight 9);玩家從 A/B 兩個分支中擇一。",
      branch: true,
      branches: [
        {
          key: "A",
          name: "螢光潮汐",
          description: "3★ 基礎屬性乘 3(HP 2700, ATK 300, Weight 9);且擊殺精英怪時,額外獲得原石提升至 3 顆。",
        },
        {
          key: "B",
          name: "極光回收",
          description: "3★ 基礎屬性乘 3(HP 2700, ATK 300, Weight 9);且當小隊成功升星或合成成員時,退還消耗原石的 25%。",
        },
      ],
    },
  },
};

// ============================================================
// 分形世界(Fractal)— 視覺:混沌、遞歸、自相似
// 多樣性傾向:自動施法 (auto_caster)
// 成員圖鑑 §三.3
// ============================================================

/** 11. 雪鏡 (Snowglass) — 護盾家族 */
const m11_snowglass: MemberDef = {
  id: "m11_snowglass",
  no: 11,
  nameZh: "雪鏡",
  nameEn: "Snowglass",
  world: "fractal",
  family: "shield",
  visual: "由無數個自相似科赫雪花結晶層層嵌套而成的水晶偏轉盾。",
  role: "護盾本身可藉由防禦判定觸發自相似碎裂,在破壞時朝周圍分裂出微型雪花碎片。",
  enchant: "wide_angle",
  soulConcept:
    "他是由無數個不同尺寸的雪花冰晶共同凝聚而成的人形守護者。他那剔透的身體沒有固定的人類五官與皮膚——最大的雪花拼湊成他寬闊的肩膀。",
  diversity: "auto_caster",
  base: { hp: 1000, atk: 100, speed: 100, weight: 3 },
  starNodes: {
    1: {
      name: "微縮風暴",
      description: "週期施法。雪鏡每累積 10 次傷害結算 Tick 自動在小隊最外圍刮起一圈持續 2 次傷害 Tick 的碎冰風暴,對接觸的敵人造成微量傷害並減速 15%。",
    },
    2: {
      name: "數值強化",
      description: "2★ 基礎屬性乘 2(HP 2000, ATK 200, Weight 6)。",
    },
    3: {
      name: "冰封結界",
      description: "3★ 基礎屬性乘 3(HP 3000, ATK 300, Weight 9);且風暴持續時間為 4 次傷害 Tick,風暴寬度增加 50%;進入風暴的敵方子彈飛行速度降低 30%。",
    },
  },
};

/** 12. 分叉 (Bifurcation) — 多發家族 */
const m12_bifurcation: MemberDef = {
  id: "m12_bifurcation",
  no: 12,
  nameZh: "分叉",
  nameEn: "Bifurcation",
  world: "fractal",
  family: "multishot",
  visual: "主彈藥向外分叉,且分叉端點又帶有更小端點的樹狀分形。",
  role: "射出的擴散子彈在行進途中,每顆會再度分裂出 2 顆更小的子彈,形成大面積密集彈幕。",
  enchant: "rapid_fire",
  soulConcept:
    "他的身軀是「分叉規律」的具象化,四肢與邊線具有無限生長、分裂的樹狀姿態。",
  diversity: "auto_caster",
  base: { hp: 800, atk: 150, speed: 100, weight: 3 },
  starNodes: {
    1: {
      name: "分形彈幕",
      description: "週期施法。分叉每累積 7 次傷害結算 Tick 自動向最近的敵方目標發射 3 顆呈樹狀分叉的微型自相似彈藥(造成 20% 普攻傷害)。",
    },
    2: {
      name: "數值強化",
      description: "2★ 基礎屬性乘 2(HP 1600, ATK 300, Weight 6)。",
    },
    3: {
      name: "無限樹狀",
      description: "3★ 基礎屬性乘 3(HP 2400, ATK 450, Weight 9);且發射週期縮短至每隔 4 次傷害結算 Tick,射出的微型彈藥在碰撞敵人時會再度分裂出 2 顆小子彈。",
    },
  },
};

/** 13. 閃電 (Lightning) — 直線家族 */
const m13_lightning: MemberDef = {
  id: "m13_lightning",
  no: 13,
  nameZh: "閃電",
  nameEn: "Lightning",
  world: "fractal",
  family: "straight",
  visual: "沿著分形概率軌跡前進、不斷折返的電弧折線。",
  role: "彈道以極高頻率的折線前進,對碰撞目標造成麻痺。",
  enchant: "firework",
  soulConcept:
    "他就是「雷電自相似規律」的化身。他的身軀沒有任何實體盔甲,所有貼身的長袍、紋理與肢體邊界,完全是由跳躍折返的雷電分枝交織而成。",
  diversity: "auto_caster",
  base: { hp: 700, atk: 200, speed: 150, weight: 1 },
  starNodes: {
    1: {
      name: "閃電連鎖",
      description: "週期施法。閃電每累積 8 次傷害結算 Tick 自動向最近的敵人釋放一道連環電弧,最多在目標間彈跳 3 次,造成基礎閃電傷害。",
    },
    2: {
      name: "數值強化",
      description: "2★ 基礎屬性乘 2(HP 1400, ATK 400, Weight 2)。",
    },
    3: {
      name: "電能麻痺",
      description: "3★ 基礎屬性乘 3(HP 2100, ATK 600, Weight 3);且被連環電弧擊中的敵方目標會陷入 0.8 次傷害 Tick 的短暫眩暈狀態。",
    },
  },
};

/** 14. 深淵 (Abyss) — 地雷家族 */
const m14_abyss: MemberDef = {
  id: "m14_abyss",
  no: 14,
  nameZh: "深淵",
  nameEn: "Abyss",
  world: "fractal",
  family: "mine",
  visual: "緩慢旋轉、中心呈無限嵌套黑洞狀態的遞歸螺旋。",
  role: "靜止後會在原地產生微弱的引力拉扯,將周邊小圖騰緩慢向中心拉攏。",
  enchant: "interception_field",
  soulConcept:
    "他是分形世界中最為深邃神祕的「遞歸黑洞」。他的身體胸口中央是一個緩慢旋轉的遞歸虛無螺旋,不論玩家如何凝視、放大,都永遠看不到底。",
  diversity: "specialist",
  base: { hp: 1400, atk: 50, speed: 50, weight: 5 },
  starNodes: {
    1: {
      name: "深淵虛無",
      description: "僅對自身數值生效。深淵自身的最大生命值額外提升 15%。",
    },
    2: {
      name: "數值強化",
      description: "2★ 基礎屬性乘 2(HP 2800, ATK 100, Weight 10)。",
    },
    3: {
      name: "3★ 質變分支",
      description: "3★ 基礎屬性乘 3(HP 4200, ATK 150, Weight 15);玩家從 A/B 兩個分支中擇一。",
      branch: true,
      branches: [
        {
          key: "A",
          name: "無限引力",
          description: "3★ 基礎屬性乘 3(HP 4200, ATK 150, Weight 15);且自身在被編入隊伍時,每隔 5 次傷害 Tick 固定獲得一個最大生命 15% 的個人虛無護盾。",
        },
        {
          key: "B",
          name: "鏡面折射",
          description: "3★ 基礎屬性乘 3(HP 4200, ATK 150, Weight 15);且自身每隔 5 次傷害 Tick 獲得最大生命 8% 的個人護盾,當護盾被擊碎時自動發射引力震盪波。",
        },
      ],
    },
  },
};

/** 15. 極光 (Aurora) — 激光家族 */
const m15_aurora: MemberDef = {
  id: "m15_aurora",
  no: 15,
  nameZh: "極光",
  nameEn: "Aurora",
  world: "fractal",
  family: "laser",
  visual: "折射成多重稜鏡色彩、波狀起伏的絢麗光譜射線。",
  role: "發射出不穩定的多波段射線,對重疊位置的敵人造成多重元素判定。",
  enchant: null,
  soulConcept:
    "他不是單純的彩色光譜,而是「光譜自我遞歸分裂」的奇蹟。他的身軀由多波段光譜絲帶層層纏繞而成。",
  diversity: "auto_caster",
  base: { hp: 1000, atk: 100, speed: 100, weight: 3 },
  starNodes: {
    1: {
      name: "分形光帶",
      description: "週期施法。極光每累積 8 次傷害結算 Tick 自動在小隊四周鋪開一圈彩虹極光(持續 2 次傷害 Tick),對進入的敵人造成持續微量傷害,並使其在 2 次傷害 Tick 內無法觸發被動。",
    },
    2: {
      name: "數值強化",
      description: "2★ 基礎屬性乘 2(HP 2000, ATK 200, Weight 6)。",
    },
    3: {
      name: "光譜增殖",
      description: "3★ 基礎屬性乘 3(HP 3000, ATK 300, Weight 9);且極光觸發週期縮短至每隔 5 次傷害結算 Tick,且極光區域的持續時間為 4 次傷害 Tick。",
    },
  },
};

// ============================================================
// 機械世界(Mechanical)— 視覺:工業、齒輪、模組
// 成員圖鑑 §三.4(已審核定稿三星效果)
// ============================================================

/** 16. 閘門 (Gate) — 護盾家族 */
const m16_gate: MemberDef = {
  id: "m16_gate",
  no: 16,
  nameZh: "閘門",
  nameEn: "Gate",
  world: "mechanical",
  family: "shield",
  visual: "帶有厚重焊接鉚釘、散熱鰭片與重型液壓杆的鋼鐵護擋。",
  role: "以極大碰撞重量承受衝擊,可抵擋最猛烈的子彈碾壓。",
  enchant: "wind_zone",
  soulConcept:
    "防禦不是因為勇敢,防禦是因為他本來就是城門。他的身軀度寬闊沉重,胸口處嵌著防爆閘門,移動時,全身的液壓桿會隨著步伐同步進行沉重的伸縮。",
  diversity: "resource",
  base: { hp: 2000, atk: 50, speed: 0, weight: 20 },
  starNodes: {
    1: {
      name: "廢鐵回收",
      description: "閘門每次消除敵方子彈或承受敵方碰撞傷害時,會將其體積與重量轉化為「廢鐵度」。廢鐵度滿 100 點時,自動為小隊產出 5 顆原石。",
    },
    2: {
      name: "數值強化",
      description: "2★ 基礎屬性乘 2(HP 4000, ATK 100, Weight 40)。",
    },
    3: {
      name: "3★ 質變分支",
      description: "3★ 基礎屬性乘 3(HP 6000, ATK 150, Weight 60);玩家從 A/B 兩個分支中擔一。",
      branch: true,
      branches: [
        {
          key: "A",
          name: "熔融提煉",
          description: "3★ 基礎屬性乘 3(HP 6000, ATK 150, Weight 60);廢鐵度滿 100 點時,除產出 10 顆原石外,有 15% 的機率直接為小隊提煉出 1 顆通用「星塵 (Stardust)」。",
        },
        {
          key: "B",
          name: "戰術拆解",
          description: "3★ 基礎屬性乘 3(HP 6000, ATK 150, Weight 60);廢鐵度滿 100 點時,產出 10 顆原石;且當閘門在戰鬥中被消滅(擊碎)時,自動回收並退還合成他所消耗的全部生物材料的 50%。",
        },
      ],
    },
  },
};

/** 17. 彈片 (Shrapnel) — 多發家族 */
const m17_shrapnel: MemberDef = {
  id: "m17_shrapnel",
  no: 17,
  nameZh: "彈片",
  nameEn: "Shrapnel",
  world: "mechanical",
  family: "multishot",
  visual: "飛散的破損齒輪片、滾針與鉚釘碎片。",
  role: "近身發射大量破片,被碰撞到的敵人會受到短暫流血性(持續微量傷害)影響。",
  enchant: "recoil",
  soulConcept:
    "他是一台永遠處於動態解體狀態的極致兵器。他的身體沒有完整的鋼鐵外殼,無數個精密的工業齒輪、銳利鉚釘在一個磁力或蒸汽場的引導下圍繞著他的軀幹高速旋轉。",
  diversity: "specialist",
  base: { hp: 700, atk: 200, speed: 150, weight: 3 },
  starNodes: {
    1: {
      name: "破片彈頭",
      description: "僅對自身數值生效。彈片自身普通攻擊貢獻的基礎攻擊力額外提升 15%。",
    },
    2: {
      name: "數值強化",
      description: "2★ 基礎屬性乘 2(HP 1400, ATK 400, Weight 6)。",
    },
    3: {
      name: "彈刃吸血",
      description: "3★ 基礎屬性乘 3(HP 2100, ATK 600, Weight 9);且彈片自身的攻擊造成傷害時,將傷害量的 8% 確定性轉化為對己方小隊整體的生命值回復。",
    },
  },
};

/** 18. 鋼針 (Needle) — 直線家族 */
const m18_needle: MemberDef = {
  id: "m18_needle",
  no: 18,
  nameZh: "鋼針",
  nameEn: "Needle",
  world: "mechanical",
  family: "straight",
  visual: "一根散發著冷光、帶有螺紋的工業鋼釘與活塞推進軌跡。",
  role: "單發極高速度的重彈,可輕易碾壓並破壞重量較小的敵方子彈。",
  enchant: "explosion",
  soulConcept:
    "他不是一位端著長槍的狙擊手,而是一部高速移動的精密 CNC 加工設備。他的四肢由細長氣動活塞杆構成,雙手前端為一根精鋼巨針。",
  diversity: "buffer",
  base: { hp: 1000, atk: 200, speed: 100, weight: 4 },
  starNodes: {
    1: {
      name: "精密加工",
      description: "鋼針對全小隊進行校準,全小隊成員的基礎攻擊力提升 6%,且小隊移動速度提升 4%。",
    },
    2: {
      name: "數值強化",
      description: "2★ 基礎屬性乘 2(HP 2000, ATK 400, Weight 8)。",
    },
    3: {
      name: "氣動充能",
      description: "3★ 基礎屬性乘 3(HP 3000, ATK 600, Weight 12);全小隊基礎攻擊力提升至 15%,小隊移動速度提升至 8%;且全小隊成員額外獲得 10% 的敵方子彈與武器碰撞傷害減免。",
    },
  },
};

/** 19. 發條 (Springtrap) — 地雷家族 */
const m19_springtrap: MemberDef = {
  id: "m19_springtrap",
  no: 19,
  nameZh: "發條",
  nameEn: "Springtrap",
  world: "mechanical",
  family: "mine",
  visual: "外露的嚙合齒輪、軸承與緊繃發條的鋸齒捕獸夾。",
  role: "部署在通道上,觸發時給予目標重度擊退與短暫抓取。",
  enchant: "charge",
  soulConcept:
    "他是一座靜默矗立在黑暗中、將釋能拉扯到極限的發條陷阱。他的胸腔深處外露著一顆巨大、極度擰緊且蓄勢待發的合金發條。",
  diversity: "auto_caster",
  base: { hp: 600, atk: 50, speed: 50, weight: 1 },
  starNodes: {
    1: {
      name: "發條彈射",
      description: "週期施法。發條每累積 9 次傷害結算 Tick 自動釋放緊繃彈簧,推動小隊向前方進行一次微型衝刺位移(不消耗能量),並將衝刺路徑上的敵人小幅擊退。",
    },
    2: {
      name: "數值強化",
      description: "2★ 基礎屬性乘 2(HP 1200, ATK 100, Weight 2)。",
    },
    3: {
      name: "能量回充",
      description: "3★ 基礎屬性乘 3(HP 1800, ATK 150, Weight 3);當發條彈射衝刺成功撞擊並擊退任何敵方目標時,會立即為小隊回充 20% 的最大能量值。",
    },
  },
};

/** 20. 電弧 (Arc) — 激光家族 */
const m20_arc: MemberDef = {
  id: "m20_arc",
  no: 20,
  nameZh: "電弧",
  nameEn: "Arc",
  world: "mechanical",
  family: "laser",
  visual: "淡藍色、劈啪作響的高壓工業電弧焊接光束。",
  role: "高溫聚焦熔融光束,射擊時間越長,對單一目標的破防與傷害效果越強。",
  enchant: null,
  soulConcept:
    "他是一座一直在行走的高壓電焊工廠。他的雙肩裝配有排氣葉片與厚重散熱片,雙臂則是兩根高壓導電碳棒電極。",
  diversity: "specialist",
  base: { hp: 1000, atk: 150, speed: 100, weight: 4 },
  starNodes: {
    1: {
      name: "電磁熔接",
      description: "僅對自身數值生效。電弧自身普通攻擊貢獻的基礎攻擊力額外提升 15%。",
    },
    2: {
      name: "數值強化",
      description: "2★ 基礎屬性乘 2(HP 2000, ATK 300, Weight 8)。",
    },
    3: {
      name: "3★ 質變分支",
      description: "3★ 基礎屬性乘 3(HP 3000, ATK 450, Weight 12);玩家從 A/B 兩個分支中擇一。",
      branch: true,
      branches: [
        {
          key: "A",
          name: "超載焊槍",
          description: "3★ 基礎屬性乘 3(HP 3000, ATK 450, Weight 12);自身基礎攻擊力提升至 45%;且自身貢獻的碰撞重量額外增加 20%。",
        },
        {
          key: "B",
          name: "電能傳導",
          description: "3★ 基礎屬性乘 3(HP 3000, ATK 450, Weight 12);自身基礎攻擊力提升至 35%;且當電弧參與的傷害 Tick 造成消滅時,全小隊的能量回復速度提升 25%,持續 2 次傷害 Tick。",
        },
      ],
    },
  },
};

// ============================================================
// 主資料表
// ============================================================

/** 全部 20 名成員,按編號 01~20 排序 */
export const MEMBERS: readonly MemberDef[] = [
  m01_prism,
  m02_matrix,
  m03_vector,
  m04_node,
  m05_lightcone,
  m06_thorn,
  m07_spore,
  m08_vine,
  m09_fungus,
  m10_biolume,
  m11_snowglass,
  m12_bifurcation,
  m13_lightning,
  m14_abyss,
  m15_aurora,
  m16_gate,
  m17_shrapnel,
  m18_needle,
  m19_springtrap,
  m20_arc,
];

// ============================================================
// 查詢 API(供戰鬥、UI、養成系統使用)
// ============================================================

/** 依 id 查詢 */
export function findMember(id: string): MemberDef | undefined {
  return MEMBERS.find((m) => m.id === id);
}

/** 依編號查詢 */
export function findMemberByNo(no: number): MemberDef | undefined {
  return MEMBERS.find((m) => m.no === no);
}

/** 依世界過濾 */
export function membersByWorld(world: MemberDef["world"]): MemberDef[] {
  return MEMBERS.filter((m) => m.world === world);
}

/** 依家族過濾 */
export function membersByFamily(family: MemberDef["family"]): MemberDef[] {
  return MEMBERS.filter((m) => m.family === family);
}

/** 5×4 家族 × 世界 矩陣(對應成員圖鑑 §一.1) */
export function familyWorldMatrix(): Record<MemberDef["family"], Record<MemberDef["world"], MemberDef | undefined>> {
  const matrix = {} as Record<MemberDef["family"], Record<MemberDef["world"], MemberDef | undefined>>;
  for (const m of MEMBERS) {
    if (!matrix[m.family]) matrix[m.family] = {} as any;
    matrix[m.family][m.world] = m;
  }
  return matrix;
}

/**
 * 取得某成員在指定星級的完整數值。
 * 套用 STAR_MULTIPLIER 倍率(成員圖鑑 §2)。
 */
export function memberStatsAtStar(member: MemberDef, star: 1 | 2 | 3) {
  const m = star === 1 ? 1.0 : star === 2 ? 2.0 : 3.0;
  return {
    hp: Math.round(member.base.hp * m),
    atk: Math.round(member.base.atk * m),
    speed: Math.round(member.base.speed * m),
    weight: Math.round(member.base.weight * m),
    star,
    slots: star, // 附魔插槽數 = 星級(1/2/3)
  };
}

// ============================================================
// 養成配方常數(對應機制指南 §1.1、怪物圖鑑 §6)
// ============================================================

/**
 * 角色升星不消耗原石,採 5-3-1 生物材料配方 + 家族碎片。
 * 碎片需求:0→1★ 需 10、1→2★ 需 25、2→3★ 需 60。
 */
export const FAMILY_SHARD_COST: Record<1 | 2 | 3, number> = {
  1: 10,
  2: 25,
  3: 60,
};

/**
 * 5-3-1 配方結構說明:
 *   0→1★:[1★ 高級 1] + [1★ 普通 3] + 家族碎片 10
 *   1→2★:[2★ 高級 1] + [2★ 普通 3] + [1★ 高級 5] + 家族碎片 25
 *   2→3★:[3★ 高級 1] + [3★ 普通 3] + [2★ 高級 5] + 家族碎片 60
 *
 * 實際生物材料對應(依世界)見怪物圖鑑 §6.1,本檔不重複列舉材料 id。
 */
export interface StarRecipeShape {
  /** 本級高級材料數量 */
  fineCurrent: number;
  /** 本級普通材料數量 */
  commonCurrent: number;
  /** 上一級高級材料數量(0→1★ 時為 0) */
  finePrev: number;
  /** 家族碎片 */
  shards: number;
}

export const STAR_RECIPE: Record<1 | 2 | 3, StarRecipeShape> = {
  1: { fineCurrent: 1, commonCurrent: 3, finePrev: 0, shards: 10 },
  2: { fineCurrent: 1, commonCurrent: 3, finePrev: 5, shards: 25 },
  3: { fineCurrent: 1, commonCurrent: 3, finePrev: 5, shards: 60 },
};
