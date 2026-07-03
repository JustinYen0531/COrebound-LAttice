# COrebound LAttence AI 生圖指南 (AI Prompt Guide)

本文件收集了 **COrebound LAttence (COLA)** 中所有角色立繪、地圖環境物件、世界地板材質以及 29 種敵方怪物的 AI 生圖 Prompts。這些 Prompts 專為 Stable Diffusion 或 Midjourney 等繪圖模型設計。

---

## 一、角色共用 AI 生圖 Prompt Base (固定)
以下 Prompt 包含了乾淨去背、立繪構圖、精緻幻想風與柔和邊緣光的固定設定，建議在後續生圖時直接作為基礎前綴：
```text
masterpiece, best quality, highly detailed fantasy character concept art, full body, centered composition, transparent background, isolated character, clean silhouette, no background, soft rim lighting, intricate ornamental details, game concept art, 
```

## 二、共通負面 Prompt (Negative Prompt)
```text
background, scenery, environment, frame, border, watermark, logo, text, signature, cropped, blurry, low quality, realistic photo, extra limbs, duplicate body parts, deformed anatomy, messy composition
```

---

## 三、四大世界立繪生圖 Prompts

### 1. 幾何世界成員 (Geometry Set)

#### 幾何世界專屬 Prompt Style (Style Base)
```text
constructed from crystal, prism glass, geometric plates, sacred geometry, precise mathematical patterns, glowing edges, polygonal body, translucent material, hard surface design, clean angular silhouette, elegant humanoid mechanical guardian, 
```

#### 幾何成員 Prompts

* **01. 🛡️ 稜鏡 (Prism)**
  ```text
  [共用 Prompt Base] + [幾何 Style] + humanoid prism guardian, body made of translucent crystal prisms, floating triangular glass shields orbiting around the body, sacred geometry patterns, elegant guardian, futuristic fantasy, transparent crystal armor, glowing refraction, symmetrical composition
  ```

* **02. 💥 矩陣 (Matrix)**
  ```text
  [共用 Prompt Base] + [幾何 Style] + humanoid composed of countless floating cubes, modular body, voxel aesthetic, geometric matrix, elegant digital construct, floating square particles, mathematical symmetry, futuristic mystical being
  ```

* **03. 🎯 向量 (Vector)**
  ```text
  [共用 Prompt Base] + [幾何 Style] + sleek humanoid made from sharp linear geometry, arrow shaped silhouette, aerodynamic body, elongated limbs, precise mathematical proportions, glowing directional lines, minimalistic futuristic warrior
  ```

* **04. 💣 節點 (Node)**
  ```text
  [共用 Prompt Base] + [幾何 Style] + humanoid network keeper, glowing geometric nodes floating around the body, connected by luminous lines, grid architecture, mathematical anchor points, elegant technological mage
  ```

* **05. ⚡ 光錐 (Lightcone)**
  ```text
  [共用 Prompt Base] + [幾何 Style] + humanoid light entity, cone shaped light projections, elegant luminous robes, optical lens motifs, sacred light geometry, concentrated laser aura, radiant futuristic priest
  ```

---

### 2. 有機世界成員 (Organic Set)

#### 有機世界專屬 Style Base (Style Base)
```text
body composed of living vines, leaves, bark, roots, fungi, feathers, pollen, organic flowing curves, asymmetrical natural growth, breathing living textures, bioluminescent accents, graceful pose, 
```

#### 有機成員 Prompts

* **06. 🛡️ 荊棘 (Thorn)**
  ```text
  [共用 Organic Base] + [有機 Style] + humanoid forest guardian, living bark armor, thick tree trunk body, thorn covered branches growing naturally from shoulders and arms, exposed roots wrapping the legs, moss and vines, ancient forest spirit, elegant asymmetrical botanical anatomy
  ```

* **07. 💥 孢粉 (Spore)**
  ```text
  [共用 Organic Base] + [有機 Style] + humanoid pollen spirit, body formed from floating spores and soft feather-like fibers, dandelion aesthetic, glowing pollen particles, ethereal botanical creature, elegant floating posture, delicate organic textures
  ```

* **08. 🎯 藤蔓 (Vine)**
  ```text
  [共用 Organic Base] + [有機 Style] + humanoid vine spirit, body entirely formed from twisting vines and tendrils, spiral growth patterns, curling plant shoots, flexible organic anatomy, elegant flowing movement, botanical guardian
  ```

* **09. 💣 真菌 (Fungus)**
  ```text
  [共用 Organic Base] + [有機 Style] + humanoid fungal entity, layered mushroom caps growing from the back, glowing mycelium veins across the body, breathing spore sacs, ancient decomposition spirit, organic asymmetrical anatomy, living colony aesthetic
  ```

* **10. ⚡ 螢光 (Biolume)**
  ```text
  [共用 Organic Base] + [有機 Style] + humanoid bioluminescent forest spirit, translucent botanical body, glowing spores flowing inside plant veins, luminous flowers blooming from the hands, soft green natural light, elegant ethereal organic creature
  ```

---

### 3. 分形世界成員 (Fractal Set)

#### 分形世界專屬 Style Base (Style Base)
```text
self-similar, recursive, nested, infinite, branching, spiral, recursive crystal, recursive lightning, recursive flowers, 
```

#### 分形成員 Prompts

* **11. 🛡️ 雪鏡 (Snowglass)**
  ```text
  [共用 Fractal Base] + [分形 Style] + humanoid crystalline guardian composed entirely of recursive snowflakes, every crystal contains smaller snowflakes, translucent magical glass body, infinitely nested ice geometry, elegant frozen spirit, glowing blue fractal ornaments
  ```

* **12. 💥 Bifurcation (分叉)**
  ```text
  [共用 Fractal Base] + [分形 Style] + humanoid fractal entity with endlessly branching limbs, recursive tree structures, every branch splits into smaller branches, elegant magical silhouette, infinitely detailed recursive anatomy
  ```

* **13. 🎯 閃電 (Lightning)**
  ```text
  [共用 Fractal Base] + [分形 Style] + humanoid lightning spirit, body formed from recursive electric branches, fractal lightning veins, branching energy streams, glowing electrical anatomy, elegant magical being
  ```

* **14. 💣 深淵 (Abyss)**
  ```text
  [共用 Fractal Base] + [分形 Style] + humanoid abyssal spirit, recursive black hole inside the chest, infinite nested silhouette, impossible recursive void, spiral darkness, elegant magical horror, infinitely repeating reflections
  ```

* **15. ⚡ 極光 (Aurora)**
  ```text
  [共用 Fractal Base] + [分形 Style] + humanoid aurora spirit, recursive light spectrum, endlessly splitting rainbow beams, fractal prism lights, magical luminous body, elegant flowing spectral ribbons
  ```

---

### 4. 機械世界成員 (Mechanical Set)

#### 機械世界專屬 Style Base (Style Base)
```text
industrial construct, modular machinery, functional engineering, exposed mechanisms, layered armor plates, mechanical precision, ancient industrial civilization, 
```

#### 機械成員 Prompts

* **16. 🛡️ 閘門 (Gate)**
  ```text
  [共用 Mechanical Base] + [機械 Style] + humanoid fortress construct, massive blast door chest, hydraulic pistons on the back, thick armored gate body, industrial guardian, heavy steel plates, gigantic mechanical shield integrated into the body, ancient industrial colossus
  ```

* **17. 💥 彈片 (Shrapnel)**
  ```text
  [共用 Mechanical Base] + [機械 Style] + humanoid fragmentation construct, floating gears, bolts, metal shards orbiting around the body, partially disassembled mechanical warrior, industrial debris constantly rotating, elegant destructive machinery
  ```

* **18. 🎯 鋼針 (Needle)**
  ```text
  [共用 Mechanical Base] + [機械 Style] + slender humanoid precision machine, industrial steel needle arms, linear guide rails, piston powered limbs, CNC inspired mechanical anatomy, elegant precision engineering, minimal industrial design
  ```

* **19. 💣 發條 (Springtrap)**
  ```text
  [共用 Mechanical Base] + [機械 Style] + humanoid spring powered construct, enormous exposed mainspring inside the chest, mechanical trap aesthetic, toothed gears, coiled steel mechanisms, tension loaded industrial body, ancient mechanical hunter
  ```

* **20. ⚡ 電弧 (Arc)**
  ```text
  [共用 Mechanical Base] + [機械 Style] + humanoid arc reactor construct, industrial welding machine aesthetic, glowing electric arcs, exposed transformers, cooling fins, copper coils, high voltage mechanical guardian, elegant industrial engineering
  ```

---

## 四、地圖環境物件生圖 Prompts (Isolated World Assets)
本節 Prompts 專為生出單個帶去背、高精度的 3D 遊戲環境物件所設計，已添加白底去背前綴以利自動切圖：

### 1. 幾何世界物件
* **幾何晶體石柱 (Euclidean Pillar)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a tall hexagonal crystal pillar made of translucent blue optical prism glass, glowing precise geometric grid lines, sacred geometry details, white background, isolated object, clean silhouette, game concept art, 3D render
  ```
* **不可能稜鏡 (Impossible Prism)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a floating impossible penrose triangle sculpture made of glowing optical glass, refracting rainbows, sacred geometry Metatron cube details, white background, isolated object, clean silhouette
  ```
* **幾何晶格礦脈 (Lattice Mineral Node)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a geometric ore mineral cluster made of glowing cubic and triangular crystal formations, white background, isolated object, game mining resource node
  ```
* **折射鏡面陷阱 (Refraction Mirror)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a brass stands supporting a dual-sided highly reflective geometric mirror, reflecting laser beams, sacred geometry ornaments, white background, isolated object
  ```

### 2. 有機世界物件
* **巨型古木樹根 (Giant Ancient Root)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a giant twisting tree root covered in leaf veins and bioluminescent moss, organic flowing curves, ancient botanical structure, white background, isolated object
  ```
* **捕食者孢子囊 (Predatory Spore Pod)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a pulsing organic spore pod, glowing red and orange bioluminescence, venting red pollen dust, organic fungal anatomy, white background, isolated object
  ```
* **古木原石礦 (Ancient Timber Ore)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, an organic raw mineral node wrapped in thick green vines and glowing sprouts, organic texture, white background, isolated object
  ```
* **捕蠅草彈射板 (Venus Flytrap Launcher)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a giant venus flytrap leaf platform, glowing green sap, organic spikes, botanical catapult mechanism, white background, isolated object
  ```

### 3. 分形世界物件
* **分形結晶樹 (Fractal Branch Tree)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a crystal tree with branches formed from Sierpinski triangles and Koch snowflakes, recursive ice branches, translucent frozen crystal, white background, isolated object
  ```
* **遞歸石門 (Recursive Gateway)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a gateway made of nested stone archways scaling down in size, Koch snowflake stone engravings, recursive ancient architecture, white background, isolated object
  ```
* **分形源石簇 (Fractal Cluster Ore)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a fractal crystal cluster ore endlessly nesting crystals within crystals, reflecting rainbow colors, white background, isolated object
  ```
* **重力扭曲漩渦 (Gravity Vortex)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a swirling gravitational vortex, infinite nested black hole spiral in the center, gravitational lensing effect, magical distortion, white background, isolated object
  ```

### 4. 機械世界物件
* **防爆焊接擋板 (Welded Blast Shield)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a heavy copper welded blast shield plate, thick weld seams, industrial bolts, cooling fins, heavy steel plating, white background, isolated object
  ```
* **嚙合大型齒輪組 (Active Gearing Block)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a heavy industrial machinery gearing block, interlocking iron gears, piston attachments, steam pipes, mechanical construct, white background, isolated object
  ```
* **廢鐵提煉堆 (Scrap Iron Pile)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a pile of discarded machine parts, rusty gears, springs, cylinder rods, industrial scrap iron heap, white background, isolated object
  ```
* **高壓蒸汽閥門 (Steam Vent Valve)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, an industrial floor valve vent with glowing pressure gauges, red and green signal lights, venting high pressure steam jets, white background, isolated object
  ```

---

## 五、雙層同心圓地板材質生圖 Prompts (Seamless Floor Textures)
本節 Prompts 專為生出無縫拼接的地表紋理貼圖所設計，已包含 `seamless tiling texture, top-down view` 等特徵詞：

### 1. 幾何世界地板
* **中央：完美的晶格核心 (Perfect Lattice Core)**
  ```text
  masterpiece, best quality, highly detailed, top-down view, seamless tiling texture, perfect hexagonal Voronoi cell lattice floor pattern, translucent blue quartz glass material, glowing grid lines, mathematical precision, clean vector aesthetic
  ```
* **外圍：發散重力網格 (Radiating Gravity Grid)**
  ```text
  masterpiece, best quality, highly detailed, top-down view, seamless tiling texture, dark blue technical floor, thin radiating mathematical grid lines spreading outwards as an archimedean spiral, futuristic vector interface style
  ```

### 2. 有機世界地板
* **中央：生命搏動孢子床 (Pulsing Mycelium Spore Bed)**
  ```text
  masterpiece, best quality, highly detailed, top-down view, seamless tiling texture, pulsing warm green bioluminescent moss grass carpet, glowing network of plant veins and mycelium threads, breathing organic textures
  ```
* **外圍：輕盈落葉林徑 (Drifting Canopy Paths)**
  ```text
  masterpiece, best quality, highly detailed, top-down view, seamless tiling texture, dark brown ancient tree bark texture, scattered translucent glowing fallen leaves and pollen particles, organic flow lines
  ```

### 3. 分形世界地板
* **中央：無限謝爾賓斯基印記 (Infinite Sierpinski Seal)**
  ```text
  masterpiece, best quality, highly detailed, top-down view, seamless tiling texture, golden Sierpinski triangle seal engraved on a crystalline ice floor, high contrast, infinite nested geometry, glowing fractals
  ```
* **外圍：科赫雪花漣漪 (Koch Snowflake Ripples)**
  ```text
  masterpiece, best quality, highly detailed, top-down view, seamless tiling texture, light blue frosted ice sheet, engraved with recursive Koch snowflake ripple patterns fading into the edges
  ```

### 4. 機械世界地板
* **中央：黃銅動力反應爐 (Brass Reactor Plating)**
  ```text
  masterpiece, best quality, highly detailed, top-down view, seamless tiling texture, polished golden brass plates puzzle fitting, glowing coolant channels in seams, rivets, large rotating engine gear relief in center
  ```
* **外圍：粗獷鏽蝕鋼網 (Industrial Grated Plating)**
  ```text
  masterpiece, best quality, highly detailed, top-down view, seamless tiling texture, dark grey industrial steel grating mesh floor, rusty metal texture, visible pneumatic copper pipes and small gears rotating underneath
  ```

---

## 六、四大世界與最終 Boss 敵方圖騰生圖 Prompts (Enemy Totem Assets)
> [!NOTE]
> **開發實作註記 (Development Annotation)**
> * 敵方怪物圖騰主要使用**禪繞畫直線**並利用**萬花筒方式（進行六個方位的 60 度對稱映射）**進行程序化/快速繪製實現。
> * 本章節提供的精緻立繪 Prompts 專為後續開發時間充裕時，生成高品質怪獸立繪/宣傳配圖使用。

### 1. 幾何世界怪物 (Geometry Enemies)
* **01. 圓形 (Circle - T0)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a flat circular totem made of translucent blue glass with glowing neon concentric circle patterns, sacred geometry details, white background, isolated object
  ```
* **02. 三角形 (Triangle - T1)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a flat triangular crystal totem, sharp glowing neon edges, precise mathematical lines, sacred geometry, white background, isolated object
  ```
* **03. 正方形 (Square - T1)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a heavy square-shaped stone block with glowing blue grid lines, thick borders, solid geometric geometry, white background, isolated object
  ```
* **04. 正六角形 (Hexagon - T1)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a flat hexagonal prism glass shield, glowing cellular honeycomb pattern inside, sacred geometry details, white background, isolated object
  ```
* **05. 彭羅斯三角 (Penrose Triangle - T2)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a flat double-ring totem containing an impossible penrose triangle made of glowing glass, sacred geometry Metatron cube engravings, white background, isolated object
  ```
* **06. 生命之花 (Flower of Life - T2)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a flat double-ring geometric totem, complex overlapping circles forming the flower of life pattern, glowing neon lines, white background, isolated object
  ```
* **07. 超立方體 (Tesseract - T3 Boss)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a massive three-ring geometric totem, animated rotating tesseract hypercube lines projected on flat rings, glowing laser matrix, white background, isolated object
  ```

### 2. 有機世界怪物 (Organic Enemies)
* **08. 種子 (Seed - T0)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a flat seed-shaped organic pod, glowing warm green core, surrounded by fine radiating feather-like dandelion lines in Zentangle style, white background, isolated object
  ```
* **09. 葉脈 (Leaf Veins - T1)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a flat organic leaf totem, branching green plant veins and glowing fibers, elegant asymmetrical botanical illustration, white background, isolated object
  ```
* **10. 苔蘚 (Moss - T1)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a flat round patch of textured moss and tiny glowing lichen dots, soft organic forest green texture, white background, isolated object
  ```
* **11. 羽毛 (Feather - T1)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a flat feather-shaped organic totem, repeating delicate botanical fiber lines, soft glowing rim light, white background, isolated object
  ```
* **12. 蟲巢 (Insect Nest - T2)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a flat double-ring biological totem, countless tiny organic honeycomb-like holes venting glowing spores, asymmetrical forest textures, white background, isolated object
  ```
* **13. 珊瑚 (Coral - T2)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a flat double-ring organic totem, calcified coral branch skeleton wrapping around the rings, bioluminescent accents, white background, isolated object
  ```
* **14. 根系系統 (Root System - T3 Boss)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a massive three-ring organic totem, interlocking ancient roots and twisting vines in a Zentangle pattern, glowing green canopy leaves, white background, isolated object
  ```

### 3. 分形世界怪物 (Fractal Enemies)
* **15. 母圖形 (Mother Pattern - T0)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a flat crystal star generator totem, golden border, simple geometry, recursive fractal seeds glowing on corners, white background, isolated object
  ```
* **16. 初級分形 (First-order Fractal - T1)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a flat five-pointed star with smaller identical stars branching from each point, glowing ice crystal lines, recursive fractal geometry, white background, isolated object
  ```
* **17. 科赫雪花 (Koch Snowflake - T1)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a flat ice crystal snowflake, edges recursively branching into smaller triangles forming a Koch snowflake, glowing blue neon, white background, isolated object
  ```
* **18. 龍形曲線 (Dragon Curve - T1)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a flat recursive curving folding line pattern, snake-like dragon curve geometry, infinite nested details, white background, isolated object
  ```
* **19. 謝爾賓斯基三角形 (Sierpinski Triangle - T2)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a flat double-ring triangular crystal shield, hollowed out recursive triangles in a Sierpinski pattern, glowing blue fractals, white background, isolated object
  ```
* **20. 希爾伯特曲線 (Hilbert Curve - T2)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a flat double-ring maze totem, glowing square-grid lines endlessly folding in a Hilbert curve fractal pattern, white background, isolated object
  ```
* **21. 無盡維度 (Infinite Recursion - T3 Boss)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a massive three-ring fractal totem, infinite nested self-similar geometric patterns, recursive black hole in the center, white background, isolated object
  ```

### 4. 機械世界怪物 (Mechanical Enemies)
* **22. 軸承 (Bearing - T0)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a flat steel ball bearing totem, shiny metal balls in a circular brass track, industrial gear lines, white background, isolated object
  ```
* **23. 齒輪 (Gear - T1)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a flat copper gear wheel with sharp outer teeth, exposed pinions, rotating industrial component, white background, isolated object
  ```
* **24. 螺帽 (Nut - T1)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a heavy hexagonal steel bolt nut, textured thread grooves in the center hole, flat industrial design, white background, isolated object
  ```
* **25. 線圈 (Coil - T1)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a flat circular copper coil, tightly wrapped glowing orange wire, sparking electric arcs, industrial electrical motif, white background, isolated object
  ```
* **26. 活塞曲柄 (Piston & Crank - T2)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a flat double-ring mechanical totem, exposed sliding pistons and turning crank linkage, steam engine valves, white background, isolated object
  ```
* **27. 自動砲塔 (Sentry Turret - T2)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a flat double-ring industrial turret, heavy gun barrel, gears, bolts, armored shield, white background, isolated object
  ```
* **28. 超級工廠 (Super Factory - T3 Boss)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a massive three-ring industrial totem, conveyor belt tracks, steel structural girders, active steam vents and gears, white background, isolated object
  ```

### 5. 最終通關 Boss
* **29. 核心晶格 (Core Lattice - T4 Final Boss)**
  ```text
  masterpiece, best quality, highly detailed 3D game asset, isometric view, a colossal four-ring sacred mandala totem, combining geometric blue quartz crystals, pulsing organic green leaves, golden recursive fractals, and heavy brass industrial gears, extremely intricate, white background, isolated object
  ```
