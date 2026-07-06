/**
 * @file 圖鑑資料庫英文.ts
 * @description 圖鑑條目的完整英文翻譯表（簡介 + 詳細描述），依 id 對照。
 *              由 圖鑑資料庫.ts 的 補英文() 合併進每個條目，取代圖鑑瀏覽器過去
 *              使用的樣板佔位翻譯（"Lore Note: ... still being folded in"）。
 *              隊長圖鑑不在此表中——隊長清單.ts 已自帶英文欄位，直接使用。
 */

export const 英文簡介表: Record<string, string> = {
  // ---- Members ----
  prism: "Interlocking triangles form a hard geometric glass shield that deflects and refracts enemy fire.",
  matrix: "A grid of tiny concentric squares that fires a lattice barrage of square fragments.",
  vector: "An extremely precise, high-speed single straight shot that never curves off its line.",
  node: "A blue-glowing square anchor on the gravity grid that stretches out geometric minefields.",
  lightcone: "A regular conical laser beam that pierces in a line, dealing high-frequency damage to everything in its path.",
  thorn: "Bark bristling with sharp thorns, providing wide arc protection and returning prickling damage.",
  spore: "Bursts in a wide spray at close range, leaving a brief biological mark on anything it hits.",
  vine: "Coiling tendrils that lance forward in a straight line, leaving a 20% slow mark on impact.",
  fungus: "A red living spore pod that detonates when stepped on, spraying a patch of virulent fungus.",
  biolume: "A green bio-luminescent beam of gathered glowing spore particles that swells slightly the longer it fires.",
  snowglass: "A self-similar Koch-snowflake crystal shield, nested layer upon layer, that splinters into shards when broken.",
  bifurcation: "Branching, tree-like main rounds that fork again mid-flight into a wide spread of bullets.",
  lightning: "An arcing, folding bolt that follows a fractal probability path and doubles back on itself.",
  abyss: "A recursive spiral mine with an infinitely nested black hole at its core, pulling with gravity while stationary.",
  aurora: "A dazzling, rippling spectral refraction beam that stacks multiple elemental judgments on overlapping targets.",
  gate: "A riveted steel bulwark with heat-sink fins and heavy hydraulic struts, carrying superarmor-tier collision weight.",
  shrapnel: "Fires flying shards of broken gears and rivets, dealing lingering bleed-style chip damage.",
  needle: "A threaded industrial steel spike round, blisteringly fast, that crushes enemy bullets with ease.",
  springtrap: "A jagged trap of exposed gears and a wound spring, delivering heavy knockback and a grabbing pull.",
  arc: "A high-voltage industrial welding beam whose armor-break and damage grow the longer it stays trained on a target.",

  // ---- Monsters ----
  mon_circle: "Geometry's base resource totem. Never attacks; flees along a circular arc when disturbed.",
  mon_triangle: "A single-ring aggressive weakling of Geometry, carrying a slow control effect.",
  mon_square: "A heavy, slow single-ring defensive weakling that periodically releases a shield wave.",
  mon_hexagon: "A balanced single-ring geometric marksman weakling that fires flat straight shots.",
  mon_penrose: "An impossible triangle defying spatial dimension, shielded by a bullet-reflecting refraction barrier.",
  mon_flower_life: "An overlapping lattice totem that sprays scatter shots whose damage rises the longer it holds a target.",
  mon_seed: "Organic's base resource totem. Gains a burst of speed and flees for its life when attacked.",
  mon_vein: "Finely branching nutrient-conduit lines that fire a stunning straight shot.",
  mon_moss: "A dense field of tiny glowing dots that fires a stunning shield wave.",
  mon_feather: "A feather-patterned biological weakling that sprays stunning scatter shots.",
  mon_nest: "A colony of fine, porous holes that ejects deterrent spores when struck or killed.",
  mon_coral: "A calcified, stacked organic skeleton whose shots track precisely and whose body punishes with thorny retaliation.",
  mon_mother: "Fractal's point of origin. Splits into 3 smaller fractals to flee when attacked.",
  mon_first_fractal: "A star-burst weakling extending from the origin, deploying lingering mines and silencing the squad.",
  mon_koch: "An equilateral, branching snowflake shape that fires scatter shots and silences the squad.",
  mon_dragon: "A self-nesting folded-line weakling that fires a silencing straight shot.",
  mon_sierpinski: "An infinitely hollow triangle that flings side rounds while firing, and splinters into more shots when struck.",
  mon_hilbert: "A space-filling, self-similar folded curve whose mines carry a slow-deflection field, and which can turn invisible.",
  mon_bearing: "Mechanical's base resource part. Enters a rolling state and flees at high speed when hurt.",
  mon_gear: "A powered gear-tooth weakling that scatters shots with a strong knockback on impact.",
  mon_nut: "A heavy hexagonal fastener that fires a knockback shield wave.",
  mon_coil: "An industrial induction coil that fires a high-speed threaded straight shot, knocking the squad back.",
  mon_piston: "A reciprocating mechanical assembly firing recoil-driven scatter shots, capable of spring-loaded charges.",
  mon_sentry: "A multi-legged mechanical turret whose steel-needle shots explode, and which self-destructs into shrapnel on death.",

  // ---- Worlds ----
  world_geo: "A tidy, symmetric white lattice maze, lined with long straight corridors and impossible-prism mirrors.",
  world_org: "A winding trail of warm bioluminescent forest, dotted with toxic-mist zones and snapping venus-flytrap petals.",
  world_fra: "A bitterly cold field of ice where obstacles split further under attack, recursion without end.",
  world_mec: "A wasteland-industrial steel factory, lined with conveyor belts, spinning gears, and high-pressure steam valves.",

  // ---- Materials ----
  mat_01: "A perfect ring of blue concentric crystal.",
  mat_02: "A crisp, glowing geometric triangular core.",
  mat_03: "A pale blue folded-path crystal chip, symmetric front to back.",
  mat_04: "A visually warping Penrose-triangle crystal.",
  mat_05: "A fish-shaped elliptical chip drawn in sacred proportion.",
  mat_06: "A Metatron's-cube core blazing with golden-blue light.",
  mat_07: "A glowing spore germ ringed with pollen filaments.",
  mat_08: "Bright green sap flowing through a transparent plant conduit.",
  mat_09: "A dense cluster of glowing mossy spores.",
  mat_10: "A finely porous organic honeycomb shell.",
  mat_11: "A pale, branching calcified coral skeleton.",
  mat_12: "A slowly pulsing red heart wrapped in glowing leaf veins.",
  mat_13: "A golden five-pointed ice-crystal generator.",
  mat_14: "Pale blue ice-crystal dust splintering into tiny star bursts.",
  mat_15: "A finely serrated Koch-snowflake crystal.",
  mat_16: "A hollow metal chip of triangles nested within triangles.",
  mat_17: "A rainbow-hued crystal strip folded like a dragon's spine.",
  mat_18: "A light-devouring black geometric spiral lens core.",
  mat_19: "A precision-polished bearing steel ball.",
  mat_20: "A finely toothed brass cog component.",
  mat_21: "A precision steel hex nut cut with spiral threads.",
  mat_22: "A hydraulic hinge with an articulated linkage joint.",
  mat_23: "A bright orange, densely wound copper coil.",
  mat_24: "A cast-iron reciprocating pneumatic power unit.",
  mat_25: "A concentric key forged from the Geometry, Organic, Fractal, and Mechanical sigils.",

  // ---- Mechanics ----
  mech_weight: "Both bullets and squad defenses carry collision weight; heavier overwhelms lighter and is worn down in turn.",
  mech_tick: "No traditional attack speed or crits — the whole squad's damage is totaled and settled once every second.",
  mech_death: "Death respawns the squad at the Central Plaza, with a gem penalty and a chance to drop unrefined materials.",
  mech_erosion: "Starting at the 15-minute mark, a collapsing 'void ring' shrinks inward, forcing the squad toward the center.",
  mech_chest: "A glowing chest spawns every 3 minutes; unlocking costs energy but rewards gems and materials.",

  // ---- Bosses ----
  boss_geo: "A three-ring Geometry guardian of a complex projected structure, blending reflective straight shots with converging scatter fire.",
  boss_org: "A three-ring, pulsing plant system wrapped in veins, blending homing straight shots with chained scatter fire.",
  boss_fra: "A golden, hollow, self-nested Fractal boss, blending deflection-field mines with firework straight shots.",
  boss_mec: "A precision, modular piston-and-steam system, blending wind-zone shields with explosive straight shots.",
  boss_cola: "A four-dimensional concentric life-form born of a failed convergence, wielding every world's weapons, enchantments, and controls at once.",

  // ---- World Story ----
  story_0: "In the beginning there were not four worlds — only one whole living core: C.O.L.A.",
  story_1: "In the first reboot, the world split into a lattice maze of reason and order.",
  story_2: "In the second cycle, it spoke to you for the first time. The Organic world rejects order and believes only in growth.",
  story_3: "In the third cycle, you learn the captains are not heroes — only fragments of one life, splintered to survive.",
  story_4: "In the fourth cycle, you understand: you are not here to destroy COLA. You are here to recover your own broken self.",
};

export const 英文詳細描述表: Record<string, string> = {
  // ============================================================
  // Members
  // ============================================================
  prism: `
**Visual Design**: A body of transparent refracting prisms, shimmering light drifting through the crystal, ringed by floating triangular geometric shield plates.
**Diversity Class**: Squad Buffers
**Signature Enchant**: **Repel** — when the shield's weight fully overwhelms an enemy bullet, it can be reflected back as friendly fire. 1★ reflects at 30% damage, 2★ at 50%, 3★ at 80% with +20% speed.

**Star-Level Growth:**
* **1★**: *Refraction Line* — the whole squad's max HP is boosted by an extra **6%**.
* **2★**: Stats double (HP: 2400, ATK: 200, Weight: 12).
* **3★ Transformation**: *Spectral Blessing* — the whole squad gains **10%** damage reduction against overlapping collisions.
  `,
  matrix: `
**Visual Design**: A humanoid spirit assembled from tens of thousands of floating squares and cubic chips, its whole body flowing like a living mathematical matrix.
**Diversity Class**: Squad Buffers
**Signature Enchant**: **Focus** — narrows the spread and extends bullet range. 1★: spread -20% / lifespan +25%. 2★: spread -35% / lifespan +40%. 3★: spread -50% / lifespan +60% / speed +20%.

**Star-Level Growth:**
* **1★**: *Matrix Calibration* — the whole squad's base move speed rises **6%**, and energy regen rises **6%**.
* **2★**: Stats double (HP: 1600, ATK: 300, Weight: 6).
* **3★ Transformation**: *Overclocked Computation* — the whole squad's **damage tick interval shortens by 15%**.
  `,
  vector: `
**Visual Design**: The purest, most minimal assassin of the Geometry world — a body built entirely from taut straight lines, sharp arrowheads, and streamlined lance shapes.
**Diversity Class**: Individual Specialists — pure stat scaling
**Signature Enchant**: **Snipe** — power grows with flight distance. 1★: every half-range traveled, damage/weight +15%, speed +10% (cap +30%). 2★: +25%/+15%. 3★: +40%/+25% (cap +80%).

**Star-Level Growth:**
* **1★**: *Linear Focus* — affects only itself; Vector's own base attack contribution rises an extra **20%**.
* **2★**: Stats double (HP: 1200, ATK: 500, Weight: 6).
* **3★ Transformation**: *Vector Pursuit* — whenever the squad lands a kill, it instantly gains a **20%** move-speed buff lasting 2.5 seconds.
  `,
  node: `
**Visual Design**: A keeper of the gravity grid, its soul woven into the network's anchor points, ringed by hovering ghostly-blue geometric sparks.
**Diversity Class**: Squad Buffers
**Signature Enchant**: **Empowered Cast** — every few shots, the next volley drops multiple mines in a fan (1★: every 4th shot drops 2; 2★: every 3rd drops 2; 3★: every 3rd drops 3).

**Star-Level Growth:**
* **1★**: *Network Link* — the whole squad gains **5%** collision damage reduction, and energy regen rises **10%**.
* **2★**: Stats double (HP: 2000, ATK: 200, Weight: 8).
* **3★ Transformation**: *Overloaded Grid* — whenever the captain casts an active movement skill, the whole squad gains a **15%** damage buff for 2.0 seconds.
  `,
  lightcone: `
**Visual Design**: A high-dimensional cleric draped in a robe of light, a huge, searing cone of light naturally forming behind it.
**Diversity Class**: Squad Buffers

**Star-Level Growth:**
* **1★**: *Conical Lens* — the whole squad gains **5%** collision damage reduction, and energy regen rises **10%**.
* **2★**: Stats double (HP: 2000, ATK: 200, Weight: 6).
* **3★ Transformation**: *Refracted Veil* — once every 5 collision hits taken, the squad automatically nullifies that hit (deterministic).
  `,
  thorn: `
**Visual Design**: A guardian spirit born of the forest, its body sheathed in thick mossy bark, thorns growing naturally along its arms.
**Diversity Class**: Individual Specialists — pure stat type
**Signature Enchant**: **Splinter** — when the shield disperses or shatters, it splits forward into miniature shockwaves (1★: 2 splinters at 30% weight; 2★: 3 at 40%; 3★: 4 at 50%).

**Star-Level Growth:**
* **1★**: *Thorned Bark* — affects only itself; Thorn's own max HP rises **15%**.
* **2★**: Stats double (HP: 3200, ATK: 200, Weight: 20).
* **3★ Transformation**: *Ironwood Body* — damage taken from enemy bullets and weapon collisions drops **30%**.
  `,
  spore: `
**Visual Design**: A body formed from gathered pollen, downy feathers, and spores, drifting like a dandelion caught in the breeze.
**Diversity Class**: Resource Providers
**Signature Enchant**: **Kill Chain** — kills trigger a chained barrage. 1★ power 35%, 2★ 50%, 3★ 70% with chain speed +20%.

**Star-Level Growth:**
* **1★**: *Pollen Propagation* — enemies or objects marked/killed by Spore have a **15%** chance to drop double bio-materials.
* **2★**: Stats double (HP: 1600, ATK: 200, Weight: 2).
* **3★ Transformation**: *Spore Parasitism* — killing a T2-or-higher elite guarantees (100%) double bio-material drops.
  `,
  vine: `
**Visual Design**: An elegant body woven from emerald vines, its limbs coiled, twisting tendrils that move with fluid grace.
**Diversity Class**: Resource Providers
**Signature Enchant**: **Homing** — bullets curve toward the nearest target (1★: up to 15°/s; 2★: 30°/s; 3★: 50°/s with detection radius +50%).

**Star-Level Growth:**
* **1★**: *Deep Roots* — the squad auto-mines nearby gem ore, yielding **20%** more gems.
* **2★**: Stats double (HP: 2000, ATK: 200, Weight: 6).
* **3★ Transformation**: *Falling Leaves Return to Roots* — whenever a squad member dies in battle, Vine reclaims nutrients and refunds **60%** of the materials spent crafting that member.
  `,
  fungus: `
**Visual Design**: The forest's oldest decomposer, its body built from stacked mushroom caps, woven mycelium, and pulsing spore pods.
**Diversity Class**: Resource Providers
**Signature Enchant**: **Gigantism** — significantly increases mine size and durability (1★: radius +25% / weight +30%; 2★: +45%/+50%; 3★: +70%/+80%).

**Star-Level Growth:**
* **1★**: *Corpse Decomposition* — killing any monster auto-absorbs nutrients, yielding an extra **15%** gem drop.
* **2★**: Stats double (HP: 2400, ATK: 200, Weight: 6).
* **3★ Transformation**: *Mycelial Propagation* — killing a group of monsters **guarantees (100%)** a direct drop of a random 0-1★ world material.
  `,
  biolume: `
**Visual Design**: A body of translucent plant fiber laced with veins of pure cold light, glowing spores flowing within.
**Diversity Class**: Resource Providers

**Star-Level Growth:**
* **1★**: *Cold Light Capture* — killing low-tier monsters has a **20%** chance to drop 1 extra gem.
* **2★**: Stats double (HP: 1800, ATK: 200, Weight: 6).
* **3★ Transformation Branch**:
  * **Branch A — Bioluminescent Tide**: killing an elite yields 3 extra gems instead.
  * **Branch B — Aurora Reclamation**: star-upgrading or crafting a squad member refunds **25%** of the gems spent.
  `,
  snowglass: `
**Visual Design**: A humanoid guardian formed from layered snowflake crystals, the largest flakes joining together into broad shoulders.
**Diversity Class**: Auto-Casters
**Signature Enchant**: **Wide Angle** — widens the shield's fan spread (1★: +15%; 2★: +30%; 3★: +50%).

**Star-Level Growth:**
* **1★**: *Miniature Storm* — every 10 ticks, a 2-second shard-storm auto-erupts around the squad, dealing minor damage and slowing enemies by 15%.
* **2★**: Stats double (HP: 2000, ATK: 200, Weight: 6).
* **3★ Transformation**: *Frozen Ward* — the storm extends to 4 seconds with +50% width; enemy bullets passing through it lose **30%** speed.
  `,
  bifurcation: `
**Visual Design**: The embodiment of branching regularity, its limbs and silhouette endlessly forking and splitting like a growing tree.
**Diversity Class**: Auto-Casters
**Signature Enchant**: **Rapid Fire** — auto-fires follow-up volleys (1★: +1 volley at 40% damage; 2★: +1 at 60%; 3★: +2 volleys at 80% and 60%).

**Star-Level Growth:**
* **1★**: *Fractal Barrage* — every 7 ticks, auto-fires 3 splitting rounds at the nearest enemy (20% damage each).
* **2★**: Stats double (HP: 1600, ATK: 300, Weight: 6).
* **3★ Transformation**: *Infinite Tree* — the interval shortens to every 4 ticks, and splitting rounds split again on impact.
  `,
  lightning: `
**Visual Design**: The self-similar rhythm of a lightning bolt made flesh — no true armor, its every seam and edge woven from branching bolts.
**Diversity Class**: Auto-Casters
**Signature Enchant**: **Firework** — flings side rounds while in flight (1★: every 0.3s, a round at 15% damage; 2★: 0.25s/25%; 3★: 0.2s/35% inheriting 10% of the main bullet's weight).

**Star-Level Growth:**
* **1★**: *Chain Lightning* — every 8 ticks, auto-releases a chaining arc that bounces up to 3 targets.
* **2★**: Stats double (HP: 1400, ATK: 400, Weight: 2).
* **3★ Transformation**: *Electric Paralysis* — targets struck by the arc are stunned for **0.8 seconds**.
  `,
  abyss: `
**Visual Design**: At its chest, a slowly spinning recursive void spiral — zoom in as far as you like, and it never shows a bottom.
**Diversity Class**: Individual Specialists — pure stat type
**Signature Enchant**: **Interception Field** — the mine projects a slowing zone (1★: 2x radius / 20% slow; 2★: 2.5x / 35%; 3★: 3x / 50%).

**Star-Level Growth:**
* **1★**: *Abyssal Void* — affects only itself; Abyss's own max HP rises an extra **15%**.
* **2★**: Stats double (HP: 2800, ATK: 100, Weight: 10).
* **3★ Transformation Branch**:
  * **Branch A — Infinite Gravity**: every 5 ticks, gains a personal void-shield worth **15%** of max HP.
  * **Branch B — Mirror Refraction**: gains an 8% shield that, when shattered, auto-fires a gravitational shockwave outward.
  `,
  aurora: `
**Visual Design**: A miracle of a self-recursing spectrum, its body wrapped layer upon layer in ribbons of multicolored light.
**Diversity Class**: Auto-Casters

**Star-Level Growth:**
* **1★**: *Fractal Light Band* — every 8 ticks, auto-unfurls a ring of rainbow spectrum around the squad, preventing any enemy caught inside from triggering passives for 2s.
* **2★**: Stats double (HP: 2000, ATK: 200, Weight: 6).
* **3★ Transformation**: *Spectral Proliferation* — the interval shortens to every 5 ticks, and the aurora zone lasts 4 seconds.
  `,
  gate: `
**Visual Design**: An immensely broad and heavy frame with a blast-proof gate set into its chest, hydraulic struts extending and retracting with every heavy step.
**Diversity Class**: Resource Providers
**Signature Enchant**: **Wind Zone** — creates a wind field behind the shield; squad members passing through gain move speed (1★: +15% for 2 ticks; 2★: +25% for 3 ticks; 3★: +40% for 4.5 ticks).

**Star-Level Growth:**
* **1★**: *Scrap Reclamation* — blocking or absorbing collision damage accumulates scrap; at 100 points, produces **5 gems**.
* **2★**: Stats double (HP: 4000, ATK: 100, Weight: 40).
* **3★ Transformation Branch**:
  * **Branch A — Smelted Refinement**: scrap now yields 10 gems, with a **15%** chance to also refine 1 universal family shard.
  * **Branch B — Tactical Salvage**: scrap yields 10 gems; when destroyed (shattered), refunds **50%** of the materials used to craft it.
  `,
  shrapnel: `
**Visual Design**: A weapon perpetually mid-disassembly, its precision gears and razor rivets spinning at high speed under magnetic guidance.
**Diversity Class**: Individual Specialists — pure stat type
**Signature Enchant**: **Recoil** — firing kicks it backward (1★: 1.5 distance; 2★: 2.5 distance with +10% move speed for 1s; 3★: 4.0 distance with +20% move speed for 1.5s).

**Star-Level Growth:**
* **1★**: *Shrapnel Rounds* — affects only itself; Shrapnel's own base attack contribution rises an extra **15%**.
* **2★**: Stats double (HP: 1400, ATK: 400, Weight: 6).
* **3★ Transformation**: *Blade Vampirism* — whenever Shrapnel's own attacks deal damage, **8%** of that damage is converted into squad healing.
  `,
  needle: `
**Visual Design**: A high-speed CNC-machining unit, its limbs pneumatic piston rods, its hands tipped with precision steel spikes.
**Diversity Class**: Squad Buffers
**Signature Enchant**: **Explosion** — detonates on flight's end or impact (1★: 4 fragments in a ring; 2★: 6 fragments with moderate knockback; 3★: 8 fragments with strong knockback and 10% weight).

**Star-Level Growth:**
* **1★**: *Precision Machining* — the whole squad's base attack rises **6%**, move speed rises **4%**.
* **2★**: Stats double (HP: 2000, ATK: 400, Weight: 8).
* **3★ Transformation**: *Pneumatic Charge* — the whole squad's base attack rises to **15%**, move speed to **8%**, and it gains **10%** collision damage reduction.
  `,
  springtrap: `
**Visual Design**: A trap standing in silence, its chest wound tight with an alloy spring, poised to snap.
**Diversity Class**: Auto-Casters
**Signature Enchant**: **Charge** — surges forward just before it expires (1★: charges in the final 1s at +20% damage; 2★: 1.5s at +40%; 3★: 2s at +60%).

**Star-Level Growth:**
* **1★**: *Spring Launch* — every 9 ticks, auto-releases the spring, carrying the squad forward in a small knockback charge.
* **2★**: Stats double (HP: 1200, ATK: 100, Weight: 2).
* **3★ Transformation**: *Energy Recharge* — whenever a spring charge successfully knocks back any enemy target, the squad instantly recovers **20%** energy.
  `,
  arc: `
**Visual Design**: A walking high-voltage welding plant, exhaust vanes and heat sinks mounted on its shoulders, its arms tipped with carbon-rod electrodes.
**Diversity Class**: Individual Specialists — pure stat type

**Star-Level Growth:**
* **1★**: *Electromagnetic Welding* — affects only itself; Arc's own basic-attack contribution rises **15%**.
* **2★**: Stats double (HP: 2000, ATK: 300, Weight: 8).
* **3★ Transformation Branch**:
  * **Branch A — Overloaded Torch**: own base attack rises to **45%**, own collision weight rises an extra **20%**.
  * **Branch B — Electrical Conduction**: own ATK +35%; killing an enemy also raises the whole squad's energy regen **25%** for 2 seconds.
  `,

  // ============================================================
  // Monsters
  // ============================================================
  mon_circle: `
**Ring Structure**: Single ring.
**Combat Stats**: HP 100, Weight 1, Speed 250.
**Drops**: 1x \`01. Circular Orbit\` [1★ Common], a small amount of gems.
  `,
  mon_triangle: `
**Ring Structure**: Single ring.
**Combat Stats**: HP 150, Weight 2, Speed 250. Fires a scatter of bullets; on hit, slows the player 20% for 1.5 seconds.
**Drops**: 1x \`02. Spiky Vertex\` [1★ Fine], 2x \`03. Linear Path\` [2★ Common].
  `,
  mon_square: `
**Ring Structure**: Single ring.
**Combat Stats**: HP 450, Weight 10, Speed 70. Fires a fan-shaped shield shockwave with a 20% slow effect attached.
**Drops**: 1x \`02. Spiky Vertex\` [1★ Fine], 2x \`03. Linear Path\` [2★ Common].
  `,
  mon_hexagon: `
**Ring Structure**: Single ring.
**Combat Stats**: HP 250, Weight 4, Speed 140. Fires a flat straight beam; on hit, slows 20% for 1.5 seconds.
**Drops**: 1x \`02. Spiky Vertex\` [1★ Fine], 2x \`03. Linear Path\` [2★ Common].
  `,
  mon_penrose: `
**Ring Structure**: Two-ring concentric structure.
**Rookie Protection**: Non-hostile for the first 10 minutes of the match; retaliates once attacked.
**Combat**: HP 900, Weight 15, Speed 110. Straight bullets carry **Repel 2★**; passively auto-casts *Refraction Barrier* to block damage, adding a 1.0 knockback control.
**Drops**: 1x \`04. Penrose Void\` [2★ Fine], 1x \`05. Overlapping Disc\` [3★ Common]. After Enrage, 30% chance to also drop \`06. Sacred Core\` [3★ Fine].
  `,
  mon_flower_life: `
**Ring Structure**: Two-ring concentric structure.
**Rookie Protection**: Non-hostile for the first 10 minutes of the match.
**Combat**: HP 1200, Weight 22, Speed 90. Scatter bullets carry **Focus 2★**, plus an Architect-style 20% slow; passively auto-casts *Focused Radiance*, whose sustained damage rises 15% per second held.
**Drops**: 1x \`04. Penrose Void\` [2★ Fine], 1x \`05. Overlapping Disc\` [3★ Common]. After Enrage, 30% chance to also drop \`06. Sacred Core\` [3★ Fine].
  `,
  mon_seed: `
**Ring Structure**: Single ring.
**Combat Stats**: HP 120, Weight 1, Speed 200.
**Drops**: 1x \`07. Glowing Germ\` [1★ Common], a small amount of gems.
  `,
  mon_vein: `
**Ring Structure**: Single ring.
**Combat Stats**: HP 180, Weight 2, Speed 230. Fires a straight bullet; on hit, stuns the squad for 0.5 seconds.
**Drops**: 1x \`08. Vein Sap\` [1★ Fine], 2x \`09. Mossy Spore\` [2★ Common].
  `,
  mon_moss: `
**Ring Structure**: Single ring.
**Combat Stats**: HP 450, Weight 12, Speed 60. Fires a shield wave; on hit, stuns the player for 0.5 seconds.
**Drops**: 1x \`08. Vein Sap\` [1★ Fine], 2x \`09. Mossy Spore\` [2★ Common].
  `,
  mon_feather: `
**Ring Structure**: Single ring.
**Combat Stats**: HP 100, Weight 1, Speed 180. Scatters bullets; on hit, stuns the player for 0.5 seconds.
**Drops**: 1x \`08. Vein Sap\` [1★ Fine], 2x \`09. Mossy Spore\` [2★ Common].
  `,
  mon_nest: `
**Ring Structure**: Two-ring concentric structure.
**Rookie Protection**: Non-hostile for the first 10 minutes of the match.
**Combat**: HP 900, Weight 15, Speed 100. Scatter bullets carry **Kill Chain 2★**, silencing on hit for 1.5 seconds. Passively auto-casts *Splitting Spores* every 3 seconds, showering nearby spores that knock back on contact.
**Drops**: 1x \`10. Porous Nest\` [2★ Fine], 1x \`11. Calcified Shell\` [3★ Common]. After Enrage, 30% chance to also drop \`12. Bio-Heart\` [3★ Fine].
  `,
  mon_coral: `
**Ring Structure**: Two-ring concentric structure.
**Rookie Protection**: Non-hostile for the first 10 minutes of the match.
**Combat**: HP 1100, Weight 25, Speed 120. Straight bullets carry **Homing 2★** (auto-curves up to 30°), stunning for 0.5 seconds. Passively auto-casts *Thorny Retaliation* (reflects 20% of collision weight as damage on contact).
**Drops**: 1x \`10. Porous Nest\` [2★ Fine], 1x \`11. Calcified Shell\` [3★ Common]. After Enrage, 30% chance to also drop \`12. Bio-Heart\` [3★ Fine].
  `,
  mon_mother: `
**Ring Structure**: Single ring.
**Combat Stats**: HP 150, Weight 1, Speed 160.
**Drops**: 1x \`13. Fractal Origin\` [1★ Common], a small amount of gems.
  `,
  mon_first_fractal: `
**Ring Structure**: Single ring.
**Combat Stats**: HP 220, Weight 3, Speed 160. Fires a basic mine; on hit, silences the squad for 1.5 seconds.
**Drops**: 1x \`14. Branching Dust\` [1★ Fine], 2x \`15. Snowflake Crystal\` [2★ Common].
  `,
  mon_koch: `
**Ring Structure**: Single ring.
**Combat Stats**: HP 180, Weight 2, Speed 200. Scatters bullets; on hit, silences the player for 1.5 seconds.
**Drops**: 1x \`14. Branching Dust\` [1★ Fine], 2x \`15. Snowflake Crystal\` [2★ Common].
  `,
  mon_dragon: `
**Ring Structure**: Single ring.
**Combat Stats**: HP 160, Weight 2, Speed 250. Fires a straight bullet; on hit, silences the player for 1.5 seconds.
**Drops**: 1x \`14. Branching Dust\` [1★ Fine], 2x \`15. Snowflake Crystal\` [2★ Common].
  `,
  mon_sierpinski: `
**Ring Structure**: Two-ring concentric structure.
**Rookie Protection**: Non-hostile for the first 10 minutes of the match.
**Combat**: HP 1300, Weight 30, Speed 80. Straight bullets carry **Firework 2★** (flings side rounds at 25% damage), knockback 1.0. Passively auto-casts *Split Munitions* (every 5th shot fires two extra parallel splitting rounds).
**Drops**: 1x \`16. Hollow Lattice\` [2★ Fine], 1x \`17. Dragon Fold\` [3★ Common]. After Enrage, 30% chance to also drop \`18. Abyssal Core\` [3★ Fine].
  `,
  mon_hilbert: `
**Ring Structure**: Two-ring concentric structure.
**Rookie Protection**: Non-hostile for the first 10 minutes of the match.
**Combat**: HP 1000, Weight 15, Speed 100. Mines carry **Interception Field 2★** (35% slow), silencing on hit for 1.5 seconds. Passively auto-casts *Aurora Veil* (turns invisible for 1.5 seconds when heavily struck, halving collision damage during that window).
**Drops**: 1x \`16. Hollow Lattice\` [2★ Fine], 1x \`17. Dragon Fold\` [3★ Common]. After Enrage, 30% chance to also drop \`18. Abyssal Core\` [3★ Fine].
  `,
  mon_bearing: `
**Ring Structure**: Single ring.
**Combat Stats**: HP 160, Weight 2, Speed 260.
**Drops**: 1x \`19. Steel Ball\` [1★ Common], a small amount of gems.
  `,
  mon_gear: `
**Ring Structure**: Single ring.
**Combat Stats**: HP 200, Weight 3, Speed 180. Scatters bullets; on hit, knocks the squad back 1.0 distance.
**Drops**: 1x \`20. Brass Cog\` [1★ Fine], 2x \`21. Steel Thread\` [2★ Common].
  `,
  mon_nut: `
**Ring Structure**: Single ring.
**Combat Stats**: HP 500, Weight 12, Speed 70. Fires a fan-shaped shield shockwave with a 1.0 knockback attached.
**Drops**: 1x \`20. Brass Cog\` [1★ Fine], 2x \`21. Steel Thread\` [2★ Common].
  `,
  mon_coil: `
**Ring Structure**: Single ring.
**Combat Stats**: HP 180, Weight 2, Speed 150. Fires a straight bullet; on hit, knocks the player back 1.0 distance.
**Drops**: 1x \`20. Brass Cog\` [1★ Fine], 2x \`21. Steel Thread\` [2★ Common].
  `,
  mon_piston: `
**Ring Structure**: Two-ring concentric structure.
**Rookie Protection**: Non-hostile for the first 10 minutes of the match.
**Combat**: HP 1400, Weight 35, Speed 90. Scatter bullets carry **Recoil 2★** (2.5 distance displacement with +10% move speed), knockback 1.0. Passively auto-casts *Spring Charge* (charges once every 5 seconds).
**Drops**: 1x \`22. Hinge Linkage\` [2★ Fine], 1x \`23. Copper Loop\` [3★ Common]. After Enrage, 30% chance to also drop \`24. Industrial Heart\` [3★ Fine].
  `,
  mon_sentry: `
**Ring Structure**: Two-ring concentric structure.
**Rookie Protection**: Non-hostile for the first 10 minutes of the match.
**Combat**: HP 1000, Weight 20, Speed 80. Straight bullets carry **Explosion 2★** (detonates into 6 fragments), stun 0.5s. Passively auto-casts *Fragment Scatter* (fires 8 high-speed shards for 40 damage each on death).
**Drops**: 1x \`22. Hinge Linkage\` [2★ Fine], 1x \`23. Copper Loop\` [3★ Common]. After Enrage, 30% chance to also drop \`24. Industrial Heart\` [3★ Fine].
  `,

  // ============================================================
  // Worlds
  // ============================================================
  world_geo: `
Geometry embodies highly rational order and the beauty of artificial form.
* **Signature Linework**: Basic geometric shapes and multi-dimensional projection lines.
* **Furnace**: 🛡️ **Shield Furnace** (smelting Geometry materials here yields an extra +20% family shards).
* **Crafting Stations**: 2, offering skill star-ups and character upgrades.
* **Environment Objects**:
  * **Geometric Crystal Pillar**: blocks bullets, carries 30 collision weight.
  * **Impossible Prism**: permanently indestructible, reflects bullets at 90° or 120°.
  * **Refraction Mirror Trap**: alters bullet trajectories on contact.
* **Floor Textures**:
  * *Core*: A perfect lattice core (pale blue hexagonal glass-textured hex grid).
  * *Outer*: A radiating gravity grid (deep blue Archimedean spiral lines).
  `,
  world_org: `
The Organic world is a cradle of life, embodying nature's most primal, thriving growth.
* **Signature Linework**: Leaf veins, mycelial networks, asymmetric feather-growth streamlines.
* **Furnace**: 💥 **Multishot Furnace** (smelting Organic materials here yields an extra +20% family shards).
* **Crafting Stations**: 2, offering skill star-ups and character upgrades.
* **Environment Objects**:
  * **Giant Ancient Root**: provides 60 collision weight as a blockade.
  * **Predatory Spore Pod**: shatters on impact into a 3-second slowing toxic mist.
  * **Venus Flytrap Launcher**: snaps shut and launches the squad 5 distance units toward its point.
* **Floor Textures**:
  * *Core*: A pulsing spore bed of life (warm green vascular mycelium moss, breathing slowly).
  * *Outer*: A light, fallen-leaf forest trail (dark tan bark scattered with leaves and pollen).
  `,
  world_fra: `
The Fractal world embodies exquisite order within chaos — the cosmos repeating itself at infinite scale.
* **Signature Linework**: Koch snowflakes, Sierpinski triangles, self-similar nesting.
* **Furnace**: 🎯 **Straight Furnace** (smelting Fractal materials here yields an extra +20% family shards).
* **Crafting Stations**: 3, offering skill star-ups and character upgrades.
* **Environment Objects**:
  * **Fractal Crystal Tree**: fires ice shards to both sides when struck, 30 collision weight.
  * **Recursive Stone Gate**: only blocks objects larger than its frame; bullets smaller than 50% pass through unharmed.
  * **Gravity Distortion Vortex**: pulls in bullets and the squad within a 3-unit radius.
* **Floor Textures**:
  * *Core*: An infinite Sierpinski sigil (hollowed nested-triangle gold sigil, ice-refracting texture).
  * *Outer*: Koch-snowflake ripples (frosted ice-field with recursively shrinking Koch-snowflake ripples).
  `,
  world_mec: `
The Mechanical world embodies the precision modularity and raw meshing gears of an industrial age.
* **Signature Linework**: Heat-sink fins, drive shafts, gear-train components, and rivets.
* **Furnace**: 💣 **Mine Furnace**, ⚡ **Laser Furnace**.
* **Crafting Stations**: 3.
* **Environment Objects**:
  * **Blast-Proof Welded Shield**: extremely high blockade, 100 collision weight.
  * **Meshing Large Gear Train**: indestructible, delivers physical knockback along the gear's tangent.
  * **High-Pressure Steam Valve**: jets steam that damages monsters or accelerates the squad 25% forward.
* **Floor Textures**:
  * *Core*: A brass power reactor (polished brass armor plating with glowing coolant and reactor gears).
  * *Outer*: Rough, rusted steel mesh (dark gray steel mesh, revealing pipework and slowly turning parts below).
  `,

  // ============================================================
  // Materials
  // ============================================================
  mat_01: "Used to initialize (0→1★) Geometry squad members (01-05).",
  mat_02: "Used for Geometry member unlocks, or 1★→2★ star-ups.",
  mat_03: "Used for Geometry member 1★→2★ star-ups.",
  mat_04: "Used for Geometry member 1★→2★ and 2★→3★ star-ups.",
  mat_05: "Used for Geometry member 2★→3★ star-ups.",
  mat_06: "Used for Geometry member 2★→3★ transformation star-ups.",
  mat_07: "Used to initialize (0→1★) Organic squad members (06-10).",
  mat_08: "Used for Organic member unlocks, or 1★→2★ star-ups.",
  mat_09: "Used for Organic member 1★→2★ star-ups.",
  mat_10: "Used for Organic member 1★→2★ and 2★→3★ star-ups.",
  mat_11: "Used for Organic member 2★→3★ star-ups.",
  mat_12: "Used for Organic member 2★→3★ transformation star-ups.",
  mat_13: "Used to initialize (0→1★) Fractal squad members (11-15).",
  mat_14: "Used for Fractal member unlocks, or 1★→2★ star-ups.",
  mat_15: "Used for Fractal member 1★→2★ star-ups.",
  mat_16: "Used for Fractal member 1★→2★ and 2★→3★ star-ups.",
  mat_17: "Used for Fractal member 2★→3★ star-ups.",
  mat_18: "Used for Fractal member 2★→3★ transformation star-ups.",
  mat_19: "Used to initialize (0→1★) Mechanical squad members (16-20).",
  mat_20: "Used for Mechanical member unlocks, or 1★→2★ star-ups.",
  mat_21: "Used for Mechanical member 1★→2★ star-ups.",
  mat_22: "Used for Mechanical member 1★→2★ and 2★→3★ star-ups.",
  mat_23: "Used for Mechanical member 2★→3★ star-ups.",
  mat_24: "Used for Mechanical member 2★→3★ transformation star-ups.",
  mat_25: "Obtained after defeating the final boss COLA; picking it up triggers the ending cutscene.",

  // ============================================================
  // Mechanics
  // ============================================================
  mech_weight: `
* **Weight Suppression**: On collision, the heavier side instantly destroys the lighter side. A heavy bullet spends its remaining weight fighting through and keeps moving.
* **Attrition**: Several small bullets colliding in succession can whittle a large bullet's weight down to 0 and destroy it.
* **Layer Penetration**: After a bullet hits the squad's outer ring, **if any collision weight remains, it continues piercing into the inner rings for further resolution**, until its weight reaches 0.
  `,
  mech_tick: `
* **One-Second Tick**: While the squad is in contact with an enemy, the sum of the whole squad's attack power is settled once every 1.0 second (Tick).
* **Fire Cadence**: Weapon and auto-cast triggers are all rewritten as "once every X damage Ticks" (e.g., Straight every 1 tick, Mine every 2 ticks, Shield every 3 ticks).
  `,
  mech_death: `
* **Respawn Camp**: When the squad's HP hits zero, it auto-reforms at the "Central Plaza."
* **Penalty Details**:
  1. Permanently lose **30% of currently held gems**.
  2. **Unrefined** world bio-materials in the backpack randomly **drop 20%** at the death site, recoverable by returning to the spot.
  * *Note*: Family shards already smelted at a furnace, and equipment star-ups already unlocked, are never lost.
  `,
  mech_erosion: `
* **Time Erosion**: Starting at **minute 15**, the map's outermost lattice collapses into a pitch-black void.
* **True Damage**: Squads caught in the erosion void take **5% of max HP as true damage** every 1 second (ignores shields and defense).
* **Shrink Cadence**: The erosion zone shrinks one ring toward the center every 5 minutes, limiting passive stalling.
  `,
  mech_chest: `
* **Chest Spawns**: Every **3 minutes**, a glowing Zentangle Chest spawns in a random monster-free corner of the battlefield.
* **Unlock Cost**: No key needed — approach and hold to unlock, at the cost of **50% of the squad's max energy**.
* **Reward**: Guaranteed 150–300 gems plus a random 1-2★ world bio-material.
  `,

  // ============================================================
  // Bosses
  // ============================================================
  boss_geo: `
**Stats**: HP 8000 | Weight 100 | Speed 150.
**Combat Mechanics**:
1. **Weapons & Enchants**: Alternates firing "Straight bullets (Repel 3★)" and "Scatter bullets (Focus 3★)."
2. **Control Effect**: Carries Architect 4★ control (50% slow + 15% vulnerability, 3s duration).
3. **Passive/Auto-Cast**: *Refraction Barrier* (fully blocks the next hit every 4 seconds) and *Network Anchor* (own weight +50% while stationary and firing).
4. **Movement Skill**: *Blink Mark* (drops a beacon every 8 seconds; teleports there after 1.5 seconds).
**Kill Reward**: 100% drops the \`Geometry Sigil\`, plus 2x \`06. Sacred Core\` [3★ Fine]. Killing it Enrages the Geometry world.
  `,
  boss_org: `
**Stats**: HP 9000 | Weight 120 | Speed 120.
**Combat Mechanics**:
1. **Weapons & Enchants**: Alternates firing "Straight bullets (Homing 3★, auto-curves up to 50°)" and "Scatter bullets (Kill Chain 3★, 70% power)."
2. **Control Effect**: Carries Launcher 4★ control (stun 1.5s, bursts into a knockback wave on release).
3. **Passive/Auto-Cast**: *Thorny Retaliation* (reflects 20% weight damage on collision) and *Spore Chain* (pollen extends the player's skill cooldowns by 2 seconds).
4. **Movement Skill**: *Grapple Drag* (fires a vine every 9 seconds, dragging the boss toward the player).
**Kill Reward**: 100% drops the \`Organic Sigil\`, plus 2x \`12. Bio-Heart\` [3★ Fine]. Killing it Enrages the Organic world.
  `,
  boss_fra: `
**Stats**: HP 8500 | Weight 100 | Speed 110.
**Combat Mechanics**:
1. **Weapons & Enchants**: Alternates firing "Mines (Interception Field 3★, 50% slow)" and "Straight bullets (Firework 3★)."
2. **Control Effect**: Carries Operator 4★ control (silence 4.0s, cooldowns and charge fully frozen, slow 20%).
3. **Passive/Auto-Cast**: *Aurora Veil* (turns invisible for 1.5s when heavily struck, halving collision damage) and *Chained Arc* (an arc bounces every 4s for 80 damage).
4. **Movement Skill**: *Slow Field* (activates a slow zone every 10s, reducing player move speed 40%).
**Kill Reward**: 100% drops the \`Fractal Sigil\`, plus 2x \`18. Abyssal Core\` [3★ Fine]. Killing it Enrages the Fractal world.
  `,
  boss_mec: `
**Stats**: HP 9500 | Weight 150 | Speed 80.
**Combat Mechanics**:
1. **Weapons & Enchants**: Alternates firing "Shield (Wind Zone 3★)" and "Straight bullets (Explosion 3★)."
2. **Control Effect**: Carries Conductor 4★ control (knockback 2.5 distance, applies 20% armor-break for 3s).
3. **Passive/Auto-Cast**: *Spring Charge* (a high-speed charge every 5 seconds) and *Overload* (below 40% HP, generates a silencing electromagnetic field dealing 30 damage per second).
4. **Movement Skill**: *Dash Knockback* (every 7s, a pneumatic dash that knocks back everything in its path).
**Kill Reward**: 100% drops the \`Mechanical Sigil\`, plus 2x \`24. Industrial Heart\` [3★ Fine]. Killing it Enrages the Mechanical world.
  `,
  boss_cola: `
**Stats**: HP 30000 | Weight 500 | Speed 130.
**Combat Mechanics**:
1. **Every weapon family, firing at once**: Geometry's Straight, Organic's Scatter, Fractal's Mine, Mechanical's Shield.
2. **Four 3★ Enchants loaded**: **Snipe 3★** + **Rapid Fire 3★** + **Charge 3★** + **Wind Zone 3★**.
3. **Four control engines stacked**: Architect 4★ slow/vulnerability + Conductor 4★ knockback/armor-break + Launcher 4★ stun/burst wave + Operator 4★ silence/cooldown freeze.
4. **Passive/Auto-Cast Signature**:
   * Geometry & Organic: *Refraction Barrier* & *Thorny Retaliation*.
   * Fractal & Organic residue: *Aurora Veil* & *Spore Chain*.
   * Mechanical self-destruct: below 20% HP, enters a self-destruct rage (electric-field damage doubles, move speed +60%, collision damage +80%).
5. **Rotating movement skills**: cycles every 6s through *Blink Mark* → *Grapple Drag* → *Dash Knockback* → *Slow Field*.
**Kill Reward**: 1x \`25. COrebound Core Key\` — picking it up triggers the final victory cutscene.
  `,

  // ============================================================
  // World Story
  // ============================================================
  story_0: `
**[Shot 1]**
* *Text*: In the beginning, there were not four worlds. There was only one life. Its name was C.O.L.A.
* *Visual*: At the center of the cosmos floats a vast concentric-ring lifeform, sacred geometry and a living crystal lattice pulsing with light.

**[Shot 2]**
* *Text*: Until that day. The core shattered. The world split into four mutually incompatible possibilities.
* *Visual*: The central lifeform cracks open from its core, four bursts of light in different colors and styles tearing outward in four directions.
  `,
  story_1: `
**[Shot 1]**
* *Text*: First reboot. The first thing you see is order. Geometry believes that only structure deserves to be called a world.
* *Visual*: A mathematical world built from lines, circles, angles, and crystal.

**[Shot 2]**
* *Text*: You think you're exploring. In truth, you're reenacting a convergence.
* *Visual*: The squad crosses vast geometric rings and lattice floors.
  `,
  story_2: `
**[Shot 1]**
* *Text*: Second cycle. It speaks to you for the first time. "You are different."
* *Visual*: COLA's vast concentric core glows like an eye, watching the tiny player.

**[Shot 2]**
* *Text*: Organic does not believe in order. It believes that as long as something is still growing, it is still real.
* *Visual*: A breathing ecosystem-totem forest woven from roots, spores, veins, and pulsing life.
  `,
  story_3: `
**[Shot 1]**
* *Text*: Third cycle. You finally see the truth of the captains. They are not four heroes.
* *Visual*: A glowing figure at the center spins; its edges tear apart into the silhouettes of four captains.

**[Shot 2]**
* *Text*: Conductor, Operator, Launcher, Architect — all just different ways the same life found to survive.
* *Visual*: The four captains each stand before the symbols of Geometry, Organic, Fractal, and Mechanical, linked by a beam of light from the core.
  `,
  story_4: `
**[Shot 1]**
* *Text*: Fourth cycle. You finally understand. You are not here to defeat COLA. You are here to recover it.
* *Visual*: A shattered, broken concentric assembly slowly reaches a mechanical arm toward the player, radiating sorrow and longing.

**[Shot 2]**
* *Text*: When all four fragments of the self return to the center, COLA — for the first time — comes truly close to whole.
* *Visual*: The four captains' faint lights merge back into the central core as one; outside, the cracks in the worlds begin to heal.
  `,
};
