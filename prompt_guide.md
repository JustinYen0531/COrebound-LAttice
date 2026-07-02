# COrebound LAttence AI 生圖提示詞指南 (AI Prompt Guide)

本文件詳細記載了 **COrebound LAttence (COLA)** 小隊成員立繪生圖專用的 AI Prompts，包含共用 Base、負面 Prompt、四大世界風格 Base，以及 20 位成員的一鍵複製生圖提示詞。

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

* **🛡️ 稜鏡 (Prism)**
  ```text
  [共用 Prompt Base] + [幾何 Style] + humanoid prism guardian, body made of translucent crystal prisms, floating triangular glass shields orbiting around the body, sacred geometry patterns, elegant guardian, futuristic fantasy, transparent crystal armor, glowing refraction, symmetrical composition
  ```

* **💥 矩陣 (Matrix)**
  ```text
  [共用 Prompt Base] + [幾何 Style] + humanoid composed of countless floating cubes, modular body, voxel aesthetic, geometric matrix, elegant digital construct, floating square particles, mathematical symmetry, futuristic mystical being
  ```

* **🎯 向量 (Vector)**
  ```text
  [共用 Prompt Base] + [幾何 Style] + sleek humanoid made from sharp linear geometry, arrow shaped silhouette, aerodynamic body, elongated limbs, precise mathematical proportions, glowing directional lines, minimalistic futuristic warrior
  ```

* **💣 節點 (Node)**
  ```text
  [共用 Prompt Base] + [幾何 Style] + humanoid network keeper, glowing geometric nodes floating around the body, connected by luminous lines, grid architecture, mathematical anchor points, elegant technological mage
  ```

* **⚡ 光錐 (Lightcone)**
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

* **🛡️ 荊棘 (Thorn)**
  ```text
  [共用 Organic Base] + [有機 Style] + humanoid forest guardian, living bark armor, thick tree trunk body, thorn covered branches growing naturally from shoulders and arms, exposed roots wrapping the legs, moss and vines, ancient forest spirit, elegant asymmetrical botanical anatomy
  ```

* **💥 孢粉 (Spore)**
  ```text
  [共用 Organic Base] + [有機 Style] + humanoid pollen spirit, body formed from floating spores and soft feather-like fibers, dandelion aesthetic, glowing pollen particles, ethereal botanical creature, elegant floating posture, delicate organic textures
  ```

* **🎯 藤蔓 (Vine)**
  ```text
  [共用 Organic Base] + [有機 Style] + humanoid vine spirit, body entirely formed from twisting vines and tendrils, spiral growth patterns, curling plant shoots, flexible organic anatomy, elegant flowing movement, botanical guardian
  ```

* **💣 真菌 (Fungus)**
  ```text
  [共用 Organic Base] + [有機 Style] + humanoid fungal entity, layered mushroom caps growing from the back, glowing mycelium veins across the body, breathing spore sacs, ancient decomposition spirit, organic asymmetrical anatomy, living colony aesthetic
  ```

* **⚡ 螢光 (Biolume)**
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

* **🛡️ 雪鏡 (Snowglass)**
  ```text
  [共用 Fractal Base] + [分形 Style] + humanoid crystalline guardian composed entirely of recursive snowflakes, every crystal contains smaller snowflakes, translucent magical glass body, infinitely nested ice geometry, elegant frozen spirit, glowing blue fractal ornaments
  ```

* **💥 Bifurcation (分叉)**
  ```text
  [共用 Fractal Base] + [分形 Style] + humanoid fractal entity with endlessly branching limbs, recursive tree structures, every branch splits into smaller branches, elegant magical silhouette, infinitely detailed recursive anatomy
  ```

* **🎯 閃電 (Lightning)**
  ```text
  [共用 Fractal Base] + [分形 Style] + humanoid lightning spirit, body formed from recursive electric branches, fractal lightning veins, branching energy streams, glowing electrical anatomy, elegant magical being
  ```

* **💣 深淵 (Abyss)**
  ```text
  [共用 Fractal Base] + [分形 Style] + humanoid abyssal spirit, recursive black hole inside the chest, infinite nested silhouette, impossible recursive void, spiral darkness, elegant magical horror, infinitely repeating reflections
  ```

* **⚡ 極光 (Aurora)**
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

* **🛡️ 閘門 (Gate)**
  ```text
  [共用 Mechanical Base] + [機械 Style] + humanoid fortress construct, massive blast door chest, hydraulic pistons on the back, thick armored gate body, industrial guardian, heavy steel plates, gigantic mechanical shield integrated into the body, ancient industrial colossus
  ```

* **💥 彈片 (Shrapnel)**
  ```text
  [共用 Mechanical Base] + [機械 Style] + humanoid fragmentation construct, floating gears, bolts, metal shards orbiting around the body, partially disassembled mechanical warrior, industrial debris constantly rotating, elegant destructive machinery
  ```

* **🎯 鋼針 (Needle)**
  ```text
  [共用 Mechanical Base] + [機械 Style] + slender humanoid precision machine, industrial steel needle arms, linear guide rails, piston powered limbs, CNC inspired mechanical anatomy, elegant precision engineering, minimal industrial design
  ```

* **💣 發條 (Springtrap)**
  ```text
  [共用 Mechanical Base] + [機械 Style] + humanoid spring powered construct, enormous exposed mainspring inside the chest, mechanical trap aesthetic, toothed gears, coiled steel mechanisms, tension loaded industrial body, ancient mechanical hunter
  ```

* **⚡ 電弧 (Arc)**
  ```text
  [共用 Mechanical Base] + [機械 Style] + humanoid arc reactor construct, industrial welding machine aesthetic, glowing electric arcs, exposed transformers, cooling fins, copper coils, high voltage mechanical guardian, elegant industrial engineering
  ```
