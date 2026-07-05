# COrebound LAttence Assets 資料夾總覽

本資料夾用來集中放置 **需要由 AI 生成**，或後續要委託製作的各類素材。

目前依照專案現有規劃，先分成三大類：

1. `images`
2. `video`
3. `audio`

---

## 0. 目前實作中的資產同步重點

這份總覽除了講「應該放什麼」，現在也要同步記錄**目前已經真的被遊戲畫面吃進去的資產形態**：

1. **地圖地板不是單圖，而是三層**：`鑲嵌底板`、`wrinkle 折皺覆層`、`高細節條紋覆層`。
2. **中央廣場有獨立素材**：目前另外有 `plaza-wrinkle.png`，而且中央廣場的條紋與折皺都只用在這唯一一塊中樞廣場。
3. **立繪不是只存完整圖**：目前實作已經用到 `完整立繪`、`透明去背立繪`、`黑白 icon 切片` 三層資產。
4. **主畫面真的有世界舞台影片**：目前四個世界已有對應影片檔可供輪播舞台使用。
5. **圖鑑真的有專用立繪展示舞台背景**：不是只有 UI 框線，而是有專門的舞台底圖。

---

## 1. images

放所有靜態圖像資產。

### 目前需要你自己生成的重點與預估數量

- 隊長立繪：`4` 位
- 成員立繪：目前角色集第一版為 `20` 名
- 角色頭像 / 肖像裁切：至少 `24` 份（4 隊長 + 20 成員）
- 怪物與 Boss 圖騰形體：`29` 種敵方單位
- 世界環境主題圖：`4` 份主世界基底
- 世界環境物件：四大世界各自的障礙物、資源礦、互動機關，建議先抓 `每世界 4 到 8` 份
- 材料圖示：`25` 種（24 種生物材料 + 1 種核心鑰匙）
- 地板材質 / 背景裝飾：建議先抓 `每世界 3 到 6` 份
- UI 圖示、按鈕、面板視覺：依主畫面、HUD、管理介面分批生成，第一版建議先抓 `30 到 60` 份零件
- 地圖縮影與世界預覽圖：至少 `4` 張世界預覽 + `若干` 動態局內縮影底圖
- 宣傳圖 / 商店圖 / 封面圖：第一版建議先抓 `3 到 8` 份

### 主要參考文件與提示詞來源

- 視覺總基調：[世界觀與視覺圖鑑.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/世界觀/世界觀與視覺圖鑑.md)
- 角色數量與定位：[角色圖鑑.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/角色與敵方/角色圖鑑.md)
- 怪物、Boss、材料數量：[怪物圖鑑.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/角色與敵方/怪物圖鑑.md)
- 可直接參考的 AI 生圖提示詞：[提示詞指南.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/素材與提示詞/提示詞指南.md)
- 隊長專用共通 Prompt 與 `4 星` 版本提示詞：[隊長立繪_共通Prompt與四星提示詞.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/素材與提示詞/隊長立繪_共通Prompt與四星提示詞.md)
- UI 視覺語言與頁面結構：[玩家介面_UserFlow方案.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/介面流程/玩家介面_UserFlow方案.md)

### 子資料夾用途

- `images/characters/captains`
  - 放 `4` 位隊長的完整立繪
  - 參考：[角色圖鑑.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/角色與敵方/角色圖鑑.md)、[提示詞指南.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/素材與提示詞/提示詞指南.md)、[隊長立繪_共通Prompt與四星提示詞.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/素材與提示詞/隊長立繪_共通Prompt與四星提示詞.md)

- `images/characters/members`
  - 放第一版 `20` 名成員完整立繪
  - 參考：[角色圖鑑.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/角色與敵方/角色圖鑑.md)、[提示詞指南.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/素材與提示詞/提示詞指南.md)

- `images/characters/portraits`
  - 放隊長與成員頭像、裁切肖像、小卡面
  - 來源通常由完整立繪二次裁切而來

- `transparent-portraits/captains`
  - 放隊長透明去背立繪與形態頭像
  - 目前圖鑑、隊長形態切換、展示舞台會直接使用

- `transparent-portraits/members`
  - 放成員透明去背立繪
  - 目前圖鑑星級切換與展示舞台會直接使用

- `transparent-portraits/icons`
  - 放黑白去背成員 icon
  - 目前 HUD、小頭像、圓盤、迷你頭像等快速辨識元件會直接使用

- `transparent-portraits/avatars`
  - 放角色裁切後的頭像或局部肖像版本
  - 適合拿來接局內、清單、小卡面等縮圖需求

- `images/enemies/geometry`
- `images/enemies/organic`
- `images/enemies/fractal`
- `images/enemies/mechanical`
  - 放 `29` 種怪物中各世界對應的敵方圖騰形體
  - 參考：[怪物圖鑑.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/角色與敵方/怪物圖鑑.md)、[世界觀與視覺圖鑑.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/世界觀/世界觀與視覺圖鑑.md)

- `images/enemies/bosses`
  - 放世界守護者與最終 Boss 的主視覺
  - 建議至少 `5` 份以上主圖（4 個 T3 + 1 個 T4 COLA）

- `images/worlds/geometry`
- `images/worlds/organic`
- `images/worlds/fractal`
- `images/worlds/mechanical`
  - 放各世界概念圖、氣氛圖、遠景圖、區域基底
  - 最少每世界先做 `1 到 3` 張主氣氛圖

- `images/materials/icons`
  - 放 `25` 種材料的小圖示 / 背包圖示
  - 參考：[怪物圖鑑.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/角色與敵方/怪物圖鑑.md)

- `images/materials/ores`
  - 放礦物、素材原件、可開採物的較大尺寸圖

- `images/props/interaction_objects`
  - 放合成台、熔爐、雕像、商店、召喚裝置等互動物件
  - 建議第一版先抓 `10 到 20` 份
  - 參考：[世界觀與視覺圖鑑.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/世界觀/世界觀與視覺圖鑑.md)、[提示詞指南.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/素材與提示詞/提示詞指南.md)

- `images/props/environment_objects`
  - 放障礙物、裝飾物、資源節點等場景物件

- `images/props/floor_textures`
  - 放地板材質、圖騰紋樣、地面花紋

- `images/maps/floors`
  - 放四世界的主地板圖、共同條紋圖
  - 目前已實際使用：
    - `geometry.png`
    - `organic.png`
    - `fractal.png`
    - `mechanical.png`
    - `chatgpt-stripes.png`

- `images/maps/wrinkles`
  - 放四世界與中央廣場的折皺覆層
  - 目前已實際使用：
    - `geometry.png`
    - `organic.png`
    - `fractal.png`
    - `mechanical.png`
    - `plaza-wrinkle.png`

- `images/ui/main_menu`
  - 放主畫面主按鈕、右側彈出子按鈕、背景視覺零件
  - 參考：[玩家介面_UserFlow方案.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/介面流程/玩家介面_UserFlow方案.md)

- `images/ui/hud`
  - 放底部核心 HUD、技能圖示、生命條、能量條、小地圖等零件

- `images/ui/management`
  - 放管理介面資料夾、書籤、內頁卡片、圖鑑頁零件

- `images/立繪展示舞台.png`
  - 目前圖鑑立繪舞台直接使用的背景圖
  - 性質上屬於 UI 展示台資產，不是角色圖本體

- `images/ui/icons_buttons`
  - 放通用 icon、功能按鈕、狀態圖示、互動提示符號

- `images/maps/thumbnails`
  - 放局內地圖縮影、戰術小圖

- `images/maps/world_previews`
  - 放四大世界的大圖預覽或選單縮圖

- `images/marketing/cover_art`
  - 放封面圖、標題圖、商店頁主視覺

- `images/marketing/promotional`
  - 放宣傳海報、社群宣傳圖、橫幅圖

---

## 2. video

放所有動態影片與動態預覽資產。

### 目前需要你自己生成或製作的重點與預估數量

- 主畫面 / 標題動態背景：建議先做 `1 到 2` 支
- UI 動態示意：主畫面、HUD、管理頁至少各 `1` 支，建議先抓 `3 到 6` 支
- 世界展示短片：四大世界至少各 `1` 支，共 `4` 支起跳
- 技能展示短片：隊長主動技能、週期技能、代表性武器群組，建議先抓 `8 到 15` 支
- 道場 / 新手導覽示範短片：建議先抓 `3 到 8` 支
- 宣傳預告 / 商店頁影片：第一版建議 `1 到 3` 支

### 主要參考文件與提示詞來源

- 世界與視覺氣氛：[世界觀與視覺圖鑑.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/世界觀/世界觀與視覺圖鑑.md)
- 角色、技能、怪物設計：[角色圖鑑.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/角色與敵方/角色圖鑑.md)、[怪物圖鑑.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/角色與敵方/怪物圖鑑.md)
- UI 動效與頁面 flow：[玩家介面_UserFlow方案.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/介面流程/玩家介面_UserFlow方案.md)
- 靜態素材提示詞基底：[提示詞指南.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/素材與提示詞/提示詞指南.md)

### 子資料夾用途

- `video/title_sequences`
  - 主畫面動態背景、標題進場、品牌視覺

- `video/幾何世界.mp4`
- `video/有機世界.mp4`
- `video/分形世界.mp4`
- `video/機械世界.mp4`
  - 目前主畫面世界輪播舞台直接使用的四支世界影片

- `video/ui_motion`
  - 主按鈕展開、圓盤展圈、管理頁開啟等動態示範

- `video/world_showcases`
  - 四大世界的環境展示、風格總覽、世界 intro

- `video/skill_demos`
  - 隊長技能、武器群組、週期技能、Boss 技能展示

- `video/tutorial_demos`
  - 新手導覽、訓練道場、互動設施操作示範

- `video/trailers`
  - 宣傳預告、Steam 商店影片、發表用 teaser

---

## 3. audio

放所有音樂與音效資產。

### 目前需要你自己生成或委託的重點與預估數量

- 音樂主題曲 / BGM：目前總表第一版已列出約 `19` 類
- UI / HUD / 技能 / 物品 / 管理 / 互動 / 戰鬥 / 怪物 / 環境 / 結算音效：目前總表第一版已列出約 `72` 類
- 如果先做 MVP，建議優先生成 `15` 類，詳見音樂總表最後一節

### 主要參考文件與提示詞來源

- 完整音樂與音效提示詞：[音樂與音效設計總表.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/素材與提示詞/音樂與音效設計總表.md)
- 世界氣氛與音樂身份：[世界觀與視覺圖鑑.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/世界觀/世界觀與視覺圖鑑.md)
- 遊戲節奏與階段：[遊戲設計文件.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/遊戲總覽/遊戲設計文件.md)
- UI 音效落點：[玩家介面_UserFlow方案.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/介面流程/玩家介面_UserFlow方案.md)

### 子資料夾用途

- `audio/music/title`
  - 主畫面主題曲、標題主題

- `audio/music/menu_subpages`
  - 圖鑑、遊玩記錄、新手導覽等主畫面分支音樂

- `audio/music/tutorial_training`
  - 新手導覽與訓練道場 BGM

- `audio/music/gameplay/early`
- `audio/music/gameplay/mid`
- `audio/music/gameplay/late`
- `audio/music/gameplay/showdown`
  - 正式遊玩各階段 BGM

- `audio/music/worlds/...`
  - 四大世界專屬區域主題

- `audio/music/bosses/t3_guardians`
  - 世界守護者 Boss 戰音樂

- `audio/music/bosses/t4_cola`
  - 最終 Boss COLA 戰音樂

- `audio/music/results/victory`
- `audio/music/results/defeat`
  - 勝利 / 失敗 / 通關結算音樂

- `audio/sfx/ui`
  - 主畫面、按鈕、切頁、不可操作提示

- `audio/sfx/hud`
  - 隊長頭像停留、展圈、返回戰場等 HUD 聲

- `audio/sfx/skills`
  - 主動位移技能、武器群組、週期技能、自動施法

- `audio/sfx/items`
  - 藥水拖曳、使用、回復聲

- `audio/sfx/management`
  - 管理頁打開、角色選取、資料夾切換

- `audio/sfx/interactions`
  - 合成台、熔爐、雕像、商店、召喚裝置

- `audio/sfx/combat`
  - 小隊碰撞、子彈、地雷、護盾、縮圈

- `audio/sfx/enemies_bosses`
  - 怪物出現、死亡、Boss 登場與死亡

- `audio/sfx/ambience/...`
  - 四大世界的環境底噪與空氣聲

- `audio/sfx/results`
  - 成就解鎖、結算揭露、戰報翻看

---

## 4. 目前資料夾配置原則

- `images`：依角色、怪物、世界、物件、UI、地圖、宣傳分組
- `video`：依用途分成標題、UI、世界展示、技能展示、預告
- `audio`：分成 `music` 與 `sfx`

---

## 5. 搭配文件總索引

目前最適合一起參考的規劃文件：

- 視覺生成提示詞：[提示詞指南.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/素材與提示詞/提示詞指南.md)
- 隊長一般版 / 四星版專用提示詞：[隊長立繪_共通Prompt與四星提示詞.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/素材與提示詞/隊長立繪_共通Prompt與四星提示詞.md)
- 角色數量、技能、隊長設定：[角色圖鑑.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/角色與敵方/角色圖鑑.md)
- 怪物、Boss、材料數量：[怪物圖鑑.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/角色與敵方/怪物圖鑑.md)
- 世界氣氛與美術基調：[世界觀與視覺圖鑑.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/世界觀/世界觀與視覺圖鑑.md)
- 音樂 / 音效提示詞：[音樂與音效設計總表.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/素材與提示詞/音樂與音效設計總表.md)
- UI / 頁面結構 / 按鈕規則：[玩家介面_UserFlow方案.md](C:/Users/閻星澄/Desktop/COrebound-LAttence-main/doc/介面流程/玩家介面_UserFlow方案.md)

---

## 6. 最適合先做的資產

如果你要先開始生成，我建議優先順序是：

1. `隊長與成員立繪`
2. `怪物與 Boss 主視覺`
3. `互動物件與世界環境物件`
4. `主畫面與 HUD 的 UI 零件`
5. `主畫面音樂、前期探索音樂、UI 音效`

先把這五塊做起來，整個遊戲的臉就會先長出來，不會像只有企劃、沒有肉身。
