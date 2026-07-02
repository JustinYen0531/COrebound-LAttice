# COrebound LAttence 成員圖鑑 (Member Guide)

本文件詳細記載了 **COrebound LAttence (COLA)** 的成員與家族配置、美術設計原則，以及各個世界的成員視覺與 AI 生圖 Prompt。

---

## 一、成員與家族篇 (Members & Families)

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

## 三、各世界成員詳細設定

### 1. 幾何世界成員 (Geometry Set) —— 視覺：人工、科技、精準
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
    他並非傳統金屬結構的機器人，而是由數萬顆微小、懸浮的正方形與立方體晶片拼湊出的人形精靈。他的身體沒有固定的輪廓，隨著移動、重力與呼吸，無數的正方小方塊在地心引力中優雅地排列、崩解、漂移與重組。他前行時，整個身軀宛如一條流動的數學矩陣，充盈著奇異的數位空靈感。
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
    他是一位披著光之羽衣的高維神官。他的衣襬並非實體布料，而是由錐狀的強烈雷射光線折射所構成的無定型光幔。他的肩膀裝配有類似望遠鏡的反射光路，而雙手則是兩枚純淨透亮的聚焦光學鏡片。他站在光暈中央，身後自然形成巨大、高熱的光錐，將散亂 of 幾何能量凝聚為極致的穿透光束。
  * **AI 生圖 Prompt**：
    ```text
    [共用 Prompt Base] + [幾何 Style] + humanoid light entity, cone shaped light projections, elegant luminous robes, optical lens motifs, sacred light geometry, concentrated laser aura, radiant futuristic priest
    ```

---

### 2. 有機世界成員 (Organic Set) —— 視覺：生命、森林、搏動

#### 🌿 Organic 世界統一美術規範 (Art Bible)
* **核心理念**：
  不是簡單的「植物人」或穿著植物裝飾的人類，而是**生命本身**。他們是介於植物、昆蟲、精靈、菌類之間的高階自然神祇，身體像活生生的森林生態系統，隨呼吸微微起伏。
* **共通設計元素**：
  * 不規則流線輪廓 (Organic Flow)
  * 活體紋理 (Living Texture)
  * 自然生長感 (Growth) & 緩慢呼吸感 (Breathing)
  * 左右不完全對稱 (Natural Asymmetry)
  * 柔和曲線 (Soft Curves)
  * 半透明植物組織 (Translucent Botanical Tissue)
  * 少量螢光 (Bioluminescence)
* **身體材質黃金比例**：
  * 🌿 **40% 植物**（葉、藤蔓、樹皮、樹根）
  * 🍄 **30% 真菌／菌絲**（孢子囊、菌傘、菌絲網）
  * 🪶 **20% 生命散播結構**（羽毛、花粉、種子、絨毛）
  * ✨ **10% 生物冷光與能量流**

#### 🌿 有機世界 AI 生圖指引 (AI Prompt Workflow)
* **共用 Organic Prompt Base (固定)**：
  ```text
  masterpiece, best quality, highly detailed fantasy character concept art, humanoid nature spirit, elegant organic creature, full body, centered composition, transparent background, isolated character, flowing silhouette, living ecosystem, soft natural lighting, intricate botanical ornaments, no background, clean silhouette, mystical forest guardian, 
  ```
* **有機世界專屬 Style Base (固定加入)**：
  ```text
  body composed of living vines, leaves, bark, roots, fungi, feathers, pollen, organic flowing curves, asymmetrical natural growth, breathing living textures, bioluminescent accents, graceful pose, 
  ```

#### 🌿 成員詳細設定

* **🛡️ 荊棘 (Thorn) - 護盾家族**
  * **視覺**：粗糙有彈性的木質樹皮，其上覆滿尖銳的荊棘。
  * **定位**：大範圍扇形防護，被敵人子彈碰撞時，能反饋少量的尖刺反彈傷害。
  * **專屬附魔變異**：**【分裂 (Splinter)】**
  * **角色概念 (Soul Concept)**：
    他並非手拿實體盾牌的士兵，而是森林本身孕育出的守護神。 his 身體宛如一棵仍然活著、緩慢呼吸的大古樹，肩膀與背部覆蓋著厚實粗糙的青苔樹皮，無數尖銳的荊棘沿著雙臂自然生長出來。古老的老樹根緊緊纏繞雙腳融入大地，當他矗立時，防禦不是刻意舉盾阻擋，而是植物與樹木受到感應時，極其自然地向外舒展生長。
  * **AI 生圖 Prompt**：
    ```text
    [共用 Organic Base] + [有機 Style] + humanoid forest guardian, living bark armor, thick tree trunk body, thorn covered branches growing naturally from shoulders and arms, exposed roots wrapping the legs, moss and vines, ancient forest spirit, elegant asymmetrical botanical anatomy
    ```
* **💥 孢粉 (Spore) - 多發家族**
  * **視覺**：浮游在空中的絨毛羽片與微小的圓形浮游孢子。
  * **定位**：近距離呈極大散射角的扇形爆發，命中敵人時會留下短暫的生物標記。
  * **專屬附魔變異**：**【擊殺連鎖 (Kill Chain)】**
  * **角色概念 (Soul Concept)**：
    他不是一顆普通的毒蘑菇，而是由花粉、輕盈羽片與無數懸浮孢子共同匯聚而成的活體精靈。他的身體幾無實體骨架，由大量極其柔軟的羽狀纖維與絨毛結構交織漂浮而成。無數發光的細小孢子粒子如星塵般圍繞著他的全身，每一次移動、呼吸，都如同一朵在微風中悄然散開的蒲公英，漫天散播著森林的生命因子。
  * **AI 生圖 Prompt**：
    ```text
    [共用 Organic Base] + [有機 Style] + humanoid pollen spirit, body formed from floating spores and soft feather-like fibers, dandelion aesthetic, glowing pollen particles, ethereal botanical creature, elegant floating posture, delicate organic textures
    ```
* **🎯 藤蔓 (Vine) - 直線家族**
  * **視覺**：一條快速向前蜿蜒伸展、帶有螺旋捲鬚的藤條。
  * **定位**：直線刺穿首個目標，並在目標身上留下短暫的纏繞減速（20% 移速降低）。
  * **專屬附魔變異**：**【追蹤 (Homing)】**
  * **角色概念 (Soul Concept)**：
    他身上沒有纏繞藤蔓，因為他的整個身軀本身就是一株優雅舒展的藤蔓生命。他的四肢完全由不斷延伸、交錯扭轉的翠綠藤條所扭聚而成，全身找不到任何生硬的固定骨架。他的手臂如蟒蛇般靈活蜿蜒，末端優雅地抽出嫩芽與新生的卷鬚，所有動作都無比流暢柔韌，彷彿永遠能在廢墟中找到向上攀爬的新生方向。
  * **AI 生圖 Prompt**：
    ```text
    [共用 Organic Base] + [有機 Style] + humanoid vine spirit, body entirely formed from twisting vines and tendrils, spiral growth patterns, curling plant shoots, flexible organic anatomy, elegant flowing movement, botanical guardian
    ```
* **💣 真菌 (Fungus) - 地雷家族**
  * **視覺**：不斷搏動、外表呈波浪狀的紅色活體真菌孢子囊。
  * **定位**：拋射並部署在地面，被踩踏時引爆，向四周噴灑擴散的劇毒菌落。
  * **專屬附魔變異**：**【巨大化 (Gigantism)】**
  * **角色概念 (Soul Concept)**：
    他是森林最古老、最神祕的分解者神明。他的身體由巨大的層疊菌傘、交織的菌絲與微微膨脹的孢子囊共同築成。幽綠色發光的菌絲像血管脈絡般密密麻麻地覆蓋全身，背後層層堆疊著色彩斑斕的巨大菌菇結構。他的身軀隨着森林的吐納進行有規律的搏動，宛如一座活著的、能自給自足的菌落母體。
  * **AI 生圖 Prompt**：
    ```text
    [共用 Organic Base] + [有機 Style] + humanoid fungal entity, layered mushroom caps growing from the back, glowing mycelium veins across the body, breathing spore sacs, ancient decomposition spirit, organic asymmetrical anatomy, living colony aesthetic
    ```
* **⚡ 螢光 (Biolume) - 激光家族**
  * **視覺**：由無數微小的螢光孢子粒子匯聚而成的綠色生物冷光束。
  * **定位**：持續射擊時，光束的體積會隨著照射時間稍微膨脹。
  * **角色概念 (Soul Concept)**：
    他並非金屬製的雷射槍，而是森林黑夜中躍動的一縷生命之光。他的身體由半透明的植物纖維與純淨的冷光脈絡組成，體內流動著無數緩慢飄移的螢光孢子。他的雙手在充能時如同花朵一般優雅綻放，當射擊時，全身的生物光脈絡與花瓣心部會同步發亮起舞，宛如整片寂靜森林在黑夜中的一次深呼吸。
  * **AI 生圖 Prompt**：
    ```text
    [共用 Organic Base] + [有機 Style] + humanoid bioluminescent forest spirit, translucent botanical body, glowing spores flowing inside plant veins, luminous flowers blooming from the hands, soft green natural light, elegant ethereal organic creature
    ```

---

### 3. 分形世界成員 (Fractal Set) —— 視覺：混沌、遞歸、自相似

#### 🌌 Fractal 世界統一美術規範 (Art Bible)
* **核心理念**：
  `Every pattern wishes to become itself again.` (萬物都想再次成為自己)。
  這裡不是自然生長，也不是工業組裝，而是**自相似遞歸複製**。玩家看到的不是枯燥的幾何數學式 (如 Koch Snowflake / Mandelbrot)，而是「魔法世界理解分形的方式」—— 世界上的一切都在重複自己。
* **共通設計元素**：
  * **細節即整體**：每一個細節都長得像整體。例如：一根角上還有無數小角，小角上還有更小角；花瓣又是一朵花，花瓣上的花心又是一朵花；一片羽毛的羽枝也是一根完整的羽毛。
* **視覺規則 (Visual Rules)**：
  * **Rule 1（重複次數）**：每個主要造型結構至少在視覺上重複遞歸 **3 次**。
  * **Rule 2（尺寸依序縮小）**：每個遞歸重複結構的尺寸依序縮小（例如：`100% ➔ 50% ➔ 25% ➔ 12%`），形成層次嵌套感。
  * **Rule 3（自然亂度）**：為避免機械感，自相似複製要包含自然亂度。例如：每個嵌套結構的偏轉角度、方向要略有不同，展現出魔法生命自發複製的生動美。

#### 🌌 分形世界 AI 生圖指引 (AI Prompt Workflow)
* **共用 Fractal Prompt Base (固定)**：
  ```text
  masterpiece, best quality, highly detailed fantasy character concept art, elegant humanoid fractal spirit, recursive geometry, self-similar patterns, infinitely nested ornaments, magical entity, centered composition, transparent background, isolated character, intricate recursive structures, glowing magical runes, recursive branches, impossible geometry, mystical elegance, 
  ```
* **分形世界專屬 Style Base (固定加入)**：
  ```text
  self-similar, recursive, nested, infinite, branching, spiral, recursive crystal, recursive lightning, recursive flowers, 
  ```

#### 🌌 成員詳細設定

* **🛡️ 雪鏡 (Snowglass) - 護盾家族**
  * **視覺**：由無數個自相似科赫雪花結晶層層嵌套而成的水晶偏轉盾。
  * **定位**：護盾本身可藉由防禦判定觸發自相似碎裂，在破壞時朝周圍分裂出微型雪花碎片。
  * **專屬附魔變異**：**【超廣角 (Wide Angle)】**
  * **角色概念 (Soul Concept)**：
    他並非拿著雪花盾的人，而是由無數個不同尺寸的雪花冰晶共同凝聚而成的人形守護者。他那剔透的身體沒有固定的人類五官與皮膚——最大的雪花拼湊成他寬闊的肩膀，中等雪花層疊嵌套成精美貼合的冰甲片，更小雪花在甲面蔓延成細碎的防禦刻紋，甚至連眼眸的深處，都閃爍著微縮到極限的精微雪花。玩家拉近放大時，會震撼地發現他的每一寸肌理都是一片自相似的雪花。
  * **AI 生圖 Prompt**：
    ```text
    [共用 Fractal Base] + [分形 Style] + humanoid crystalline guardian composed entirely of recursive snowflakes, every crystal contains smaller snowflakes, translucent magical glass body, infinitely nested ice geometry, elegant frozen spirit, glowing blue fractal ornaments
    ```
* **💥 Bifurcation (分叉) - 多發家族**
  * **視覺**：主彈藥向外分叉，且分叉端點又帶有更小端點的樹狀分形。
  * **定位**：射出的擴散子彈在行進途中，每顆會再度分裂出 2 顆更小的子彈，形成大面積密集彈幕。
  * **專屬附魔變異**：**【連射 (Rapid Fire)】**
  * **角色概念 (Soul Concept)**：
    他的身軀是「分叉規律」的具象化，四肢與邊線具有無限生長、分裂的樹狀姿態。他的手臂向外自然分化為多條分支，而每一根手指末端又精細地分叉出更小的纖細指尖；他的頭髮與身後飄逸的披風，同樣在空氣中不斷地分叉、遞歸、延伸。玩家的視線順著他的肢體看去，永遠找不到終點，只看到無限分叉的優雅魔力流。
  * **AI 生圖 Prompt**：
    ```text
    [共用 Fractal Base] + [分形 Style] + humanoid fractal entity with endlessly branching limbs, recursive tree structures, every branch splits into smaller branches, elegant magical silhouette, infinitely detailed recursive anatomy
    ```
* **🎯 閃電 (Lightning) - 直線家族**
  * **視覺**：沿著分形概率軌跡前進、不斷折返的電弧折線。
  * **定位**：彈道以極高頻率的折線前進，對碰撞目標造成麻痺。
  * **專屬附魔變異**：**【煙火 (Firework)】**
  * **角色概念 (Soul Concept)**：
    他不是普通引導雷擊的人，他就是「雷電自相似規律」的化身。他的身軀沒有任何實體盔甲，所有貼身的長袍、紋理與肢體邊界，完全是由跳躍折返的雷電分枝交織而成。無數分形電脈絡與分裂的能量流在他的體內與光影邊緣中自相似地擴散與折返，使他站在戰場時，宛如一尊優雅、以光速自我複製的雷能雕像。
  * **AI 生圖 Prompt**：
    ```text
    [共用 Fractal Base] + [分形 Style] + humanoid lightning spirit, body formed from recursive electric branches, fractal lightning veins, branching energy streams, glowing electrical anatomy, elegant magical being
    ```
* **💣 深淵 (Abyss) - 地雷家族**
  * **視覺**：緩慢旋轉、中心呈無限嵌套黑洞狀態的遞歸螺旋。
  * **定位**：靜止後會在原地產生微弱的引力拉扯，將周邊小圖騰緩慢向中心拉攏。
  * **專屬附魔變異**：**【擦彈護體 (Interception Field)】**
  * **角色概念 (Soul Concept)**：
    他是分形世界中最為深邃神祕的「遞歸黑洞」。他的身體如同一面能夠映射虛無的無底之鏡，鏡面裡站著另一個微縮的自己，而那個微縮自己的胸口中，又層層嵌套著更微縮的自己，無限延伸。他的胸口中央是一個緩慢旋轉的遞歸虛無螺旋，不論玩家如何凝視、放大，都永遠看不到底，只會隨着螺旋跌入無限層層重複嵌套的漆黑魔法深淵。
  * **AI 生圖 Prompt**：
    ```text
    [共用 Fractal Base] + [分形 Style] + humanoid abyssal spirit, recursive black hole inside the chest, infinite nested silhouette, impossible recursive void, spiral darkness, elegant magical horror, infinitely repeating reflections
    ```
* **⚡ 極光 (Aurora) - 激光家族**
  * **視覺**：折射成多重稜鏡色彩、波狀起伏的絢麗光譜射線。
  * **定位**：發射出不穩定的多波段射線，對重疊位置的敵人造成多重元素判定。
  * **角色概念 (Soul Concept)**：
    他不是單純的彩色光束，他是「光束自我遞歸分裂」的奇蹟。他的身軀由多波段光譜絲帶層層繞而成，一道強烈的光芒投射在他身上時，光線會自發分裂成無數自相似的彩色射線，而每一道細微射線又在空氣中再次折射分裂。他前行時，身後拖曳著無限分裂極光構成的流動綢緞，如同將一整條自相似的極光霓虹披在肩頭。
  * **AI 生圖 Prompt**：
    ```text
    [共用 Fractal Base] + [分形 Style] + humanoid aurora spirit, recursive light spectrum, endlessly splitting rainbow beams, fractal prism lights, magical luminous body, elegant flowing spectral ribbons
    ```

---

### 4. 機械世界成員 (Mechanical Set) —— 視覺：工業、齒輪、模組

幾何世界的成員圖騰具有硬朗、金屬感強烈且螺絲鉚釘密集的重工業機械結構。

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
