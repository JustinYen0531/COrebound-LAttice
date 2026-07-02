# COrebound LAttence 成員圖鑑 (Member Guide)

本文件詳細記載了 **COrebound LAttence (COLA)** 的成員與家族配置、美術設計原則，以及各個世界的成員視覺與 AI 生圖 Prompt。

---

## 成員與家族篇 (Members & Families)

在 **COrebound LAttence (COLA)** 中，除了引導移動與控制的隊長之外，小隊的火力輸出與彈道防禦主要依靠編入的**小隊成員**。
小隊成員共計 **20 名**，分為 **5 個戰術家族**，並各自散落於 **4 個主題世界** 中。每個世界恰好擁有 5 名代表不同家族的成員。

### 1. 家族與世界成員矩陣 (5 × 4 Matrix)

| 戰術家族 | 幾何世界 (Geometry) | 有機世界 (Organic) | 分形世界 (Fractal) | 機械世界 (Mechanical) |
| :---: | :--- | :--- | :--- | :--- |
| **護盾家族 (Shield)** | 🛡️ **稜鏡 (Prism)** | 🛡️ **荊棘 (Thorn)** | 🛡️ **雪鏡 (Snowglass)** | 🛡️ **閘門 (Gate)** |
| **多發家族 (Multi-shot)**| 💥 **矩陣 (Matrix)** | 💥 **孢粉 (Spore)** | 💥 **分叉 (Bifurcation)**| 💥 **彈片 (Shrapnel)** |
| **直線家族 (Straight)** | 🎯 **向量 (Vector)** | 🎯 **藤蔓 (Vine)** | 🎯 **閃電 (Lightning)** | 🎯 **鋼針 (Needle)** |
| **地雷家族 (Mine)** | 💣 **節點 (Node)** | 💣 **真菌 (Fungus)** | 💣 **深淵 (Abyss)** | 💣 **發條 (Springtrap)** |
| **激光家族 (Laser)** | ⚡ **光錐 (Lightcone)** | ⚡ **螢光 (Biolume)** | ⚡ **極光 (Aurora)** | ⚡ **電弧 (Arc)** |

---

## 二、成員美術設計共識與 AI 生圖管線 (Visual Art Direction & AI Pipeline)

為了確保 20 位小隊成員具有高度統一的美學品質，我們建立以下整個專案一體適用的美術開發共識：

* **非人類，而是圖騰生命 (Not Human, but Totems)**：
  角色外觀**不要設計成穿機甲的人類**。他們是 **「神祇、精靈、構裝生物、圖騰生命」** —— 仍保有優美的人體姿態與比例魅力，但身體本質是由其所在世界的主題物質、幾何線條或能量流直接交織而成。
* **視覺黃金律：70% 世界 + 30% 家族**：
  * **世界決定身體 (Body - 佔比 70%)**：大視覺基調。例如幾何世界的角色身體永遠由幾何晶體、光學稜鏡或精準晶格構成。玩家一眼就能識別出「他是幾何世界的角色」。
  * **家族決定武器與配備 (Weapon - 佔比 30%)**：戰術屬性的象徵。例如護盾家族身邊永遠環繞着防禦結構或裝甲片；多發家族身上則帶有分裂式彈艙或懸浮碎片模組。
  * **角色決定靈魂 (Soul)**：透過優雅的站姿、特定的手勢、獨特的氣質與精緻點綴，塑造角色的獨立魅力與人格。

---

### 1. 角色共用 AI 生圖 Prompt Base (固定)
以下 Prompt 包含了乾淨去背、立繪構圖、精緻幻想風與柔和邊緣光的固定設定，建議在後續生圖時直接作為基礎前綴：
```text
masterpiece, best quality, highly detailed character concept art, elegant fantasy creature, humanoid silhouette, mystical guardian, full body, centered composition, isolated character, transparent background, clean silhouette, no background, soft rim lighting, intricate ornamental details, black and white concept emphasis with subtle accent color, symmetrical visual language, high readability, unique silhouette, no text, no watermark, game concept art, collectible character illustration, 
```

### 2. 共通負面 Prompt (Negative Prompt)
```text
background, scenery, environment, frame, border, watermark, logo, text, signature, cropped, blurry, low quality, realistic photo, extra limbs, duplicate body parts, deformed anatomy, messy composition
```

### 3. 幾何世界專屬 Prompt Style (Style Base)
幾何世界的角色，請務必在 Prompt 中加入以下風格基調詞，以確保材質與硬表面的科技秩序高度一致：
```text
constructed from crystal, prism glass, geometric plates, sacred geometry, precise mathematical patterns, glowing edges, polygonal body, translucent material, hard surface design, clean angular silhouette, 
```

---

### 3. 各世界成員詳細設定

#### 2.1 幾何世界成員 (Geometry Set) —— 視覺：人工、科技、精準
幾何世界的成員圖騰由完美的數學曲線與幾何形體組成，表現出冷靜的科技秩序。
* **🛡️ 稜鏡 (Prism) - 護盾家族**
  * **視覺**：多重交錯的規則三角形，形成硬質透明的幾何玻璃擋板。
  * **定位**：利用規整的扇形偏轉，將敵方的彈道完美向外側滑移折射。
  * **專屬附魔變異**：**【反彈 (Repel)】**
  * **角色概念 (Soul Concept)**：
    一位由無數透明三角晶片拼貼而成的守護者，身體沒有真正的皮膚，而是由透明的折射稜鏡所構成，流光溢彩在晶體中輕盈穿梭，隨玩家視角變幻出七彩光暈。他的身邊懸浮漂浮著數片可自由旋轉、反射光芒的三角幾何盾片。他的動作無比優雅，如同在空中指揮光線的織光者，而非在泥濘中肉搏的戰士。
  * **AI 生圖 Prompt**：
    ```text
    [共用 Prompt Base] + [幾何 Style] + humanoid prism guardian, body made of translucent crystal prisms, floating triangular glass shields orbiting around the body, sacred geometry patterns, elegant guardian, futuristic fantasy, transparent crystal armor, glowing refraction, symmetrical composition
    ```
* **💥 矩陣 (Matrix) - 多發家族**
  * **視覺**：無數微小的同心正方形組成的矩陣網格。
  * **定位**：一次性呈網格狀向前方散發多枚正方形的銳利碎片，適合中近距離覆蓋。
  * **專屬附魔變異**：**【收斂 (Focus)】**
  * **角色概念 (Soul Concept)**：
    他並非傳統金屬結構 of 機器人，而是由數萬顆微小、懸浮的正方形與立方體晶片拼湊出的人形精靈。他的身體沒有固定的輪廓，隨著移動、重力與呼吸，無數的正方小方塊在地心引力中優雅地排列、崩解、漂移與重組。他前行時，整個身軀宛如一條流動的數學矩陣，充盈著奇異的數位空靈感。
  * **AI 生圖 Prompt**：
    ```text
    [共用 Prompt Base] + [幾何 Style] + humanoid composed of countless floating cubes, modular body, voxel aesthetic, geometric matrix, elegant digital construct, floating square particles, mathematical symmetry, futuristic mystical being
    ```
* **🎯 向量 (Vector) - 直線家族**
  * **視覺**：帶有極強指向性箭頭的粗線段射線。
  * **定位**：高速、精確度極高的高速單發直線子彈，彈道極為平直且不偏轉。
  * **專屬附魔變異**：**【狙擊 (Snipe)】**
  * **角色概念 (Soul Concept)**：
    他是幾何世界中最為純粹、極致簡潔的刺客。他的身體沒有任何多餘的弧度或花哨的裝飾，完全由筆直的鋒利直線、尖銳的箭型與流線型長槍結構所構成。他的四肢纖細修長，呈現出完美的空氣動力學幾何。他的站姿永遠維持著冷酷、毫無多餘動作的狙擊姿態，宛如一支隨時準備射穿深淵的幾何之箭。
  * **AI 生圖 Prompt**：
    ```text
    [共用 Prompt Base] + [幾何 Style] + sleek humanoid made from sharp linear geometry, arrow shaped silhouette, aerodynamic body, elongated limbs, precise mathematical proportions, glowing directional lines, minimalistic futuristic warrior
    ```
* **💣 節點 (Node) - 地雷家族**
  * **視覺**：在重力網格上閃爍著藍光的正方形錨點。
  * **定位**：靜止時會朝四周拉伸出短暫的幾何射線雷區，對觸碰的敵方圖騰造成切割傷害。
  * **專屬附魔變異**：**【強化一擊 (Empowered Cast)】**
  * **角色概念 (Soul Concept)**：
    他是重力網格的網絡 keeper，一名將靈魂與網路錨點編織在一起的幾何法師。他的身邊永遠散落懸浮著數顆散發幽藍光芒的幾何光點——「節點」，這些節點彼此之間由纖細、明亮的光線編織相連。他前行時，雙手微張，身軀彷彿在控制著一張活生生的、有脈搏的立體幾何重力網絡。
  * **AI 生圖 Prompt**：
    ```text
    [共用 Prompt Base] + [幾何 Style] + humanoid network keeper, glowing geometric nodes floating around the body, connected by luminous lines, grid architecture, mathematical anchor points, elegant technological mage
    ```
* **⚡ 光錐 (Lightcone) - 激光家族**
  * **視覺**：沿著特定角度收縮、呈現圓錐狀的規則雷射光束。
  * **定位**：線性穿透，能對直線上的所有敵人造成均等的高頻率熱割傷害。
  * **角色概念 (Soul Concept)**：
    他是一位披著光之羽衣的高維神官。他的衣襬並非實體布料，而是由錐狀的強烈雷射光線折射所構成的無定型光幔。他的肩膀裝配有類似望遠鏡的反射光路，而雙手則是兩枚純淨透亮的聚焦光學鏡片。他站在光暈中央，身後自然形成巨大、高熱的光錐，將散亂的幾何能量凝聚為極致的穿透光束。
  * **AI 生圖 Prompt**：
    ```text
    [共用 Prompt Base] + [幾何 Style] + humanoid light entity, cone shaped light projections, elegant luminous robes, optical lens motifs, sacred light geometry, concentrated laser aura, radiant futuristic priest
    ```

#### 2.2 有機世界成員 (Organic Set) —— 視覺：生命、森林、搏動
有機世界的成員圖騰具有充滿生命張力的不規則流線型，彷彿活生生的森林生物。
* **🛡️ 荊棘 (Thorn) - 護盾家族**
  * **視覺**：粗糙有彈性的木質樹皮，其上覆滿尖銳的荊棘。
  * **定位**：大範圍扇形防護，被敵人子彈碰撞時，能反饋少量的尖刺反彈傷害。
  * **專屬附魔變異**：**【分裂 (Splinter)】**（護盾耗盡或被擊碎時，木質棘片飛散分裂為多個小衝擊波前進）
* **💥 孢粉 (Spore) - 多發家族**
  * **視覺**：浮游在空中的絨毛羽片與微小的圓形浮游孢子。
  * **定位**：近距離呈極大散射角的扇形爆發，命中敵人時會留下短暫的生物標記。
  * **專屬附魔變異**：**【擊殺連鎖 (Kill Chain)】**（擊殺敵方或地圖物件時，以該處為新生起點，再次對最近目標噴發同等威力 50% 的相同彈幕）
* **🎯 藤蔓 (Vine) - 直線家族**
  * **視覺**：一條快速向前蜿蜒伸展、帶有螺旋捲鬚的藤條。
  * **定位**：直線刺穿首個目標，並在目標身上留下短暫的繞減速（20% 移速降低）。
  * **專屬附魔變異**：**【追蹤 (Homing)】**（藤蔓像有生命蛇類般，在行進間具備每秒最大 30° 的自動轉向偏折力）
* **💣 真菌 (Fungus) - 地雷家族**
  * **視覺**：不斷搏動、外表呈波浪狀的紅色活體真菌孢子囊。
  * **定位**：拋射並部署在地面，被踩踏時引爆，向四周噴灑擴散的劇毒菌落。
  * **專屬附魔變異**：**【巨大化 (Gigantism)】**（孢子囊在地上吸收水分急遽膨大，碰撞感應半徑增加 45%，重量生命提升 50%）
* **⚡ 螢光 (Biolume) - 激光家族**
  * **視覺**：由無數微小的螢光孢子粒子匯聚而成的綠色生物冷光束。
  * **定位**：持續射擊時，光束的體積會隨著照射時間稍微膨脹。

#### 2.3 分形世界成員 (Fractal Set) —— 視覺：混沌、遞歸、自相似
分形世界的成員圖騰展現無限延伸與递归嵌套的魔法奧秘。
* **🛡️ 雪鏡 (Snowglass) - 護盾家族**
  * **視覺**：由無數個自相似科赫雪花結晶層層嵌套而成的水晶偏轉盾。
  * **定位**：護盾本身可藉由防禦判定觸發自相似碎裂，在破壞時朝周圍分裂出微型雪花碎片。
  * **專屬附魔變異**：**【超廣角 (Wide Angle)】**（利用幾何分形的對稱橫向延展，使衝擊波角度大幅增加 30%）
* **💥 Bifurcation (分叉) - 多發家族**
  * **視覺**：主彈藥向外分叉，且分叉端點又帶有更小端點的樹狀分形。
  * **定位**：射出的擴散子彈在行進途中，每顆會再度分裂出 2 顆更小的子彈，形成大面積密集彈幕。
  * **專屬附魔變異**：**【連射 (Rapid Fire)】**（子彈呈分形般一輪接一輪自相似發射，首發後自動追加一輪 50% 彈幕）
* **🎯 閃電 (Lightning) - 直線家族**
  * **視覺**：沿著分形概率軌跡前進、不斷折返的電弧折線。
  * **定位**：彈道以極高頻率的折線前進，對碰撞目標造成麻痺。
  * **專屬附魔變異**：**【煙火 (Firework)】**（電弧在行進時，向兩側以分形分叉射出微型電火花，造成主彈 25% 傷害）
* **💣 深淵 (Abyss) - 地雷家族**
  * **視覺**：緩慢旋轉、中心呈無限嵌套黑洞狀態的遞歸螺旋。
  * **定位**：靜止後會在原地產生微弱的引力拉扯，將周邊小圖騰緩慢向中心拉攏。
  * **專屬附魔變異**：**【擦彈護體 (Interception Field)】**（在原地產生引力偏轉圈，使進入領域內的敵人和敵方子彈速度降低 35%）
* **⚡ 極光 (Aurora) - 激光家族**
  * **視覺**：折射成多重稜鏡色彩、波狀起伏的絢麗光譜射線。
  * **定位**：發射出不穩定的多波段射線，對重疊位置的敵人造成多重元素判定。

#### 2.4 機械世界成員 (Mechanical Set) —— 視覺：工業、齒輪、模組
機械世界的成員圖騰具有硬朗、金屬感強烈且螺絲鉚釘密集的重工業機械結構。
* **🛡️ 閘門 (Gate) - 護盾家族**
  * **視覺**：帶有厚重焊接鉚釘、散熱鰭片與重型液壓杆的鋼鐵護擋。
  * **定位**：以極大碰撞重量承受衝擊，可抵擋最猛烈的子彈碾壓。
  * **專屬附魔變異**：**【風域 (Wind Zone)】**（閘門向後排放高氣壓冷卻風，在後方生成可使小隊速度提升 25% 的風力加速風場）
* **💥 彈片 (Shrapnel) - 多發家族**
  * **視覺**：飛散的破損齒輪片、滾針與鉚釘碎片。
  * **定位**：近身發射大量破片，被碰撞到的敵人會受到短暫流血性（持續微量傷害）影響。
  * **專屬附魔變異**：**【後座力 (Recoil)】**（高壓彈片爆發時產生反向氣流推力，使小隊朝發射反方向位移 2.5 距離單位）
* **🎯 鋼針 (Needle) - 直線家族**
  * **視覺**：一根散發著冷光、帶有螺紋的工業鋼釘與活塞推進軌跡。
  * **定位**：單發極高速度的重彈，可輕易碾壓並破壞重量較小的敵方子彈。
  * **專屬附魔變異**：**【爆炸 (Explosion)】**（鋼針打進地圖物體或終點後，氣壓閥過載爆炸，射出 6 顆造成 40% 傷害的碎片子彈）
* **💣 發條 (Springtrap) - 地雷家族**
  * **視覺**：外露的嚙合齒輪、軸承與緊繃發條的鋸齒捕獸夾。
  * **定位**：部署在通道上，觸發時給予目標重度擊退與短暫抓取。
  * **專屬附魔變異**：**【衝鋒 (Charge)】**（地雷即將失效前 1.5 秒，發條猛烈釋放，以 2.0 倍速主動衝鋒並撞向最近的敵人）
* **⚡ 電弧 (Arc) - 激光家族**
  * **視覺**：淡藍色、劈啪作響的高壓工業電弧焊接光束。
  * **定位**：高溫聚焦熔融光束，射擊時間越長，對單一目標的破防與傷害效果越強。

---

## 備用附魔變異庫 (Unassigned Enchantments)

以下變異效果（附魔）目前未指派給任何初始成員，保留作為新成員解鎖、角色星級分支或後續版本的設計儲備：
* **【著火 (Scorch)】（護盾家族）**：衝擊波掃過之處會留下無法熄滅的燃燒火焰地帶，造成持續傷害與領域限制。
* **【蓄力衝擊 (Charged Burst)】（多發家族）**：脫戰 2.5 秒不攻擊後，下次發射獲得傷害與子彈重量 `+50%` 的爆發性蓄力彈。
* **【漫射 (Diffuse)】（直線家族）**：在主彈道的左右側邊平行發射兩顆平行子彈（造成主彈 40% 傷害），增大覆蓋面。
* **【砲台 (Sentry)】（地雷家族）**：地雷靜止部署後，化為自動防禦砲台，每 0.6 秒向最近的敵人發射一顆小子彈（造成 25% 傷害）。
