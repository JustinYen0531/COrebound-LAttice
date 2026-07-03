---
name: Lattice Language
description: Guidelines and instructions for generating, evolving, and designing Signature Slices for the Corebound Lattice Totem Texture System.
---

# Corebound Lattice Visual Language (Totem Texture System)

This skill governs the design, generation, and evolution of the **Totem Texture System** in Corebound Lattice. 

In Corebound Lattice, players do not see individual character portraits. Instead, they see a living battle totem composed of "Signature Slices" contributed by each team member. This totem embodies visual elements of **Zen Art**, **Mandala**, **Kaleidoscope**, **Beyblade**, and **Tribal Totems**.

---

## 核心理念 (Core Philosophy)

* **生命圖騰 (Living Totem)**: 玩家操控的不是單一角色，而是一個由眾多隊員共同組成的 Corebound Lattice。每一位隊員都會為整個圖騰貢獻自己的「紋理」。
* **共同編織 (Co-woven)**: 每位角色都是圖騰的一筆，而非圖騰本身。
* **角色肖像定位 (Character Emblem)**: 圖騰紋理不應只是偏向功能辨識的「技能圖示 (Skill Icon)」，而是展現角色獨特身份的「角色肖像 (Character Emblem)」。即使縮小至極限尺寸，也必須具備無可取代的專屬幾何主輪廓。

---

## 生成方式 (Generation Method)

所有角色僅設計**一份 Signature Slice（紋理切片）**，而非完整圖案。
透過以下幾何操作，自動映射成完整圖騰：
1. **Rotation** (旋轉)
2. **Reflection** (鏡射)
3. **Point Symmetry** (點對稱)

---

## Signature Slice 設計規則 (Design Rules)

* **不可繪製完整物件**: 只能抽取該元素最具有辨識度的「視覺語彙」（Visual Vocabulary）。
* **元素語彙萃取範例**:
  * **Wing (羽翼)** → 羽毛曲線、放射線
  * **Blade (小刀/刀刃)** → 刀尖、長三角、刀背折線
  * **Eye (眼睛)** → 橢圓、同心圓
  * **Horn (骨刺/角)** → 外彎曲線、尖端
* **中空圓環佈局 (Doughnut Ring Layout)**: 為了最大化外輪廓的特徵辨識，最內層（r: 0 ~ 55px）為強制中空留白，所有視覺元素等比擠壓在外層圓環（r: 55px ~ 140px）區間內，呈甜甜圈形狀。
* **銜接性**: 左右邊界必須能自然銜接，以防映射後產生雜亂或斷裂感。

---

## 星級演化規則 (Star Evolution Rules)

角色升星不是增加新的圖騰，而是讓原本圖騰逐漸覺醒與生長。**主輪廓必須永遠保持一致**，確保玩家能一眼辨識出是同一個角色。

* **0★ (極簡 - Minimalist)**: 主輪廓、少量線條、幾乎沒有裝飾。
* **1★ (初醒 - Awakening)**: 開始增加支線、小型放射線。
* **2★ (繁茂 - Flowing)**: 增加第二層紋理、能量流、次級花瓣。
* **3★ (完全展開 - Fully Unleashed)**: 多層結構、完整放射、精細幾何、神秘圖騰。

*設計理念*: **簡潔 → 複雜** (如同植物、神經、結晶、羽毛逐漸生長)，而非 粗糙 → 精緻。

---

## 視覺原則 (Visual Principle)

* **Less is More**: 角色辨識來自主輪廓，細節永遠只是強化辨識，不能取代辨識。

---

## AI 繪圖提示詞指南 (AI Prompt Guideline)

AI 不生成完整萬花筒，而是生成一份 **Signature Slice**。

### Prompt 核心要素
1. **45° 扇形 (45-degree sector / wedge)**
2. **黑底 (Black background)**
3. **白色線條 (White lines / stroke)**
4. **SVG / CSS Friendly** (向量/程式友善)
5. **中空圓環佈局 (Doughnut layout with empty inner core)**
6. **可鏡射與旋轉 (Mirrorable and rotatable)**
7. **左右邊界自然銜接 (Seamless boundary connection)**
8. **萃取元素語彙，不畫完整物件 (Extract elemental vocabulary, no complete objects)**
9. **保持 Zen / Mandala 美感 (Maintain Zen/Mandala aesthetics)**

### Prompt 模板
```text
A 45-degree sector (wedge-shaped slice) of a Mandala pattern with an empty inner core (doughnut layout), black background, white lines. 
Subject: [Elemental vocabulary, e.g., feather curves and radiating lines for Wing / sharp triangle and geometric bevels for Blade].
Style: Clean vector line art, SVG/CSS friendly, high contrast, geometric, Zen art, tribal totem style.
Constraints: Must not depict a complete object. No details near the center core vertex (keep inner 35% radius empty). The patterns must organically touch the 45-degree wedge boundaries to allow seamless rotation, reflection, and point symmetry tiling into a full circle kaleidoscope. No colors, no gradients, pure white lines on pure black background.
```
