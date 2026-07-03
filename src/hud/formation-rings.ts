/**
 * @file formation-rings.ts
 * @description 三層同心圓展開系統(陣型閱讀)。
 *              對應「玩家介面_戰鬷HUD與操作骨架.md」§2。
 *
 *              職責(純檢視):
 *              - 維護三層圓圈的 DOM 與旋轉動畫
 *              - 依層級展開進度(0~3)更新可見性與透明度
 *              - 依陣型快照渲染藍/紅/黃槽位
 *              - 點擊圓圈時通知上層(進管理介面)
 *
 *              展開「時序」由 controller 控制(expandedLayers),本類別只負責呈現。
 */

import {
  LAYER_RADIUS,
  LAYER_SPIN,
  ROLE_COLOR,
  ROLE_ORDER,
  TIMING,
  type FormationGrid,
  type HudSnapshot,
  type Layer,
  type Role,
} from "./types";

const LAYERS: Layer[] = ["inner", "middle", "outer"];

interface RingNodes {
  group: SVGGElement; // 整層的旋轉群組(承載 spin 動畫)
  slots: Record<Role, { wrap: SVGGElement; fill: SVGPathElement; label: SVGTextElement }>;
}

/**
 * 三層同心圓。
 *
 * SVG 結構(以 (0,0) 為圓心):
 *   <g class="layer inner" data-layer="inner">
 *     <circle class="ring-track" r="..." />
 *     <g class="spin-group">  ← 旋轉動畫在此
 *       <g class="slot protect"><path class="slot-fill"/><text/></g>
 *       <g class="slot firepower">...</g>
 *       <g class="slot supply">...</g>
 *     </g>
 *   </g>
 */
export class FormationRings {
  readonly el: SVGSVGElement;

  private readonly rings: Record<Layer, RingNodes>;
  /** 目前展開的層數 0~3(由 controller 推入) */
  private expandedCount = 0;

  constructor() {
    this.el = this.build();
    this.rings = {
      inner: this.grabRing("inner"),
      middle: this.grabRing("middle"),
      outer: this.grabRing("outer"),
    };
    this.renderExpansion(0);
  }

  /** 點擊圓圈區(非頭像本體) → 進管理介面 — 規格 §2.4 */
  onRingClick(handler: (focusMemberId?: string) => void): void {
    this.el.addEventListener("click", (e) => {
      const target = (e.target as Element).closest("[data-slot-key]") as Element | null;
      if (target) {
        const key = target.getAttribute("data-slot-key");
        if (key) {
          handler(key);
          e.stopPropagation();
          return;
        }
      }
      handler(undefined);
    });
  }

  /**
   * 設定展開層數(0=全收,3=全開)。
   * 每層用透明度 + transform 縮放呈現淡入。
   */
  setExpandedCount(count: number): void {
    this.expandedCount = Math.max(0, Math.min(3, count));
    this.renderExpansion(this.expandedCount);
  }

  /** 更新陣型槽位內容 */
  renderFormation(grid: FormationGrid): void {
    for (const layer of LAYERS) {
      const ring = this.rings[layer];
      for (const role of ROLE_ORDER) {
        const slot = grid[layer][role];
        const nodes = ring.slots[role];
        this.renderSlot(nodes, slot, layer, role);
      }
    }
  }

  /** 完整快照更新(含移動時的旋轉加速 — 規格 §2.3) */
  render(snap: HudSnapshot): void {
    this.renderFormation(snap.formation);
    // 移動時旋轉 +30% — 規格 §2.3
    this.applySpinSpeed(snap.moving ? 1.3 : 1.0);
  }

  // ----------------------------------------------------------
  // 內部
  // ----------------------------------------------------------

  private renderExpansion(count: number): void {
    LAYERS.forEach((layer, idx) => {
      const group = this.rings[layer].group;
      const visible = idx < count; // 0→全收,1→只內圈,2→內+中,3→全開
      group.style.opacity = visible ? "0.85" : "0"; // 半透明不擋戰場 — 規格 §6.8
      group.style.pointerEvents = visible ? "auto" : "none";
      group.style.transition = `opacity ${TIMING.RING_FADE_MS}ms ease`;
    });
  }

  private renderSlot(
    nodes: RingNodes["slots"][Role],
    slot: FormationGrid[Layer][Role],
    _layer: Layer,
    _role: Role,
  ): void {
    const { wrap, fill, label } = nodes;
    if (!slot.occupied) {
      // 空槽:暗色
      wrap.classList.add("empty");
      wrap.classList.remove("dead", "shielded", "filled");
      fill.setAttribute("fill", "rgba(255,255,255,0.06)");
      fill.setAttribute("stroke", "rgba(255,255,255,0.1)");
      label.textContent = "";
      return;
    }
    wrap.classList.remove("empty");
    wrap.classList.toggle("dead", slot.dead);
    wrap.classList.toggle("shielded", slot.shielded);
    wrap.classList.add("filled");
    // 死亡 → 虛線外框(保留位置記憶) — 規格 §2.2
    if (slot.dead) {
      fill.setAttribute("fill", "rgba(255,255,255,0.04)");
      fill.setAttribute("stroke", "rgba(255,255,255,0.3)");
      fill.setAttribute("stroke-dasharray", "4 3");
    } else {
      fill.setAttribute("fill", ROLE_COLOR[_role]);
      fill.setAttribute("stroke", "rgba(255,255,255,0.5)");
      fill.setAttribute("stroke-dasharray", "none");
      // 護盾 → 灰色外框 — 規格 §2.2
      if (slot.shielded) {
        fill.setAttribute("stroke", "var(--c-shield-stroke)");
      }
    }
    label.textContent = slot.label;
  }

  /** 設定各層旋轉速度(CSS animation-duration) */
  private applySpinSpeed(multiplier: number): void {
    for (const layer of LAYERS) {
      const spin = LAYER_SPIN[layer];
      const group = this.rings[layer].group.querySelector(".spin-group") as SVGGElement;
      const duration = spin.speed / multiplier; // 越大越快
      group.style.animationDuration = `${duration}s`;
      group.style.animationDirection = spin.dir === 1 ? "normal" : "reverse";
      // 暫停條件由 controller 透過 class 控制
    }
  }

  /** 暫停/恢復旋轉(主動技能施放中暫停 0.5s — 規格 §2.3) */
  setSpinPaused(paused: boolean): void {
    for (const layer of LAYERS) {
      const group = this.rings[layer].group.querySelector(".spin-group") as SVGGElement;
      group.style.animationPlayState = paused ? "paused" : "running";
    }
  }

  private grabRing(layer: Layer): RingNodes {
    const group = this.el.querySelector(`[data-layer="${layer}"]`) as SVGGElement;
    const grab = (role: Role) => {
      const wrap = group.querySelector(`[data-role="${role}"]`) as unknown as SVGGElement;
      const fill = wrap.querySelector(".slot-fill") as unknown as SVGPathElement;
      const label = wrap.querySelector("text") as unknown as SVGTextElement;
      return { wrap, fill, label };
    };
    return {
      group,
      slots: {
        protect: grab("protect"),
        firepower: grab("firepower"),
        supply: grab("supply"),
      },
    };
  }

  // ----------------------------------------------------------
  // DOM 建構:以 (0,0) 為圓心,viewBox 中央對齊
  // ----------------------------------------------------------
  private build(): SVGSVGElement {
    const maxR = LAYER_RADIUS.outer + 20;
    const size = maxR * 2;
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "formation-rings");
    svg.setAttribute("viewBox", `${-maxR} ${-maxR} ${size} ${size}`);
    svg.setAttribute("width", `${size}`);
    svg.setAttribute("height", `${size}`);

    const layerHtml = LAYERS.map((layer) => this.buildLayer(layer)).join("");
    svg.innerHTML = layerHtml;
    return svg;
  }

  private buildLayer(layer: Layer): string {
    const r = LAYER_RADIUS[layer];
    const thickness = layer === "inner" ? 28 : layer === "middle" ? 26 : 24;
    const slots = ROLE_ORDER.map((role, i) =>
      this.buildSlot(role, r, thickness, i, ROLE_ORDER.length, layer),
    ).join("");
    return `
      <g class="layer" data-layer="${layer}" style="opacity:0;">
        <circle class="ring-track" r="${r}" fill="none"
          stroke="rgba(255,255,255,0.08)" stroke-width="${thickness}"
          stroke-dasharray="2 4" />
        <g class="spin-group">
          ${slots}
        </g>
      </g>
    `;
  }

  /**
   * 建構單一槽位:在三等分圓弧上的扇形 path。
   * 為視覺清晰,槽位之間留小間隙。
   */
  private buildSlot(
    role: Role,
    r: number,
    thickness: number,
    index: number,
    total: number,
    layer: Layer,
  ): string {
    const gapDeg = 6; // 槽位間隙
    const segDeg = 360 / total - gapDeg;
    const startDeg = index * (360 / total) + gapDeg / 2 - 90; // 從 12 點鐘開始
    const path = this.arcSegmentPath(r, thickness, startDeg, segDeg);
    const color = ROLE_COLOR[role];
    const midDeg = startDeg + segDeg / 2;
    const labelR = r;
    const lx = Math.cos((midDeg * Math.PI) / 180) * labelR;
    const ly = Math.sin((midDeg * Math.PI) / 180) * labelR;
    const slotKey = `${layer}:${role}`;
    return `
      <g class="slot" data-role="${role}" data-slot-key="${slotKey}"
        style="cursor:pointer;">
        <path class="slot-fill" d="${path}"
          fill="${color}" stroke="rgba(255,255,255,0.5)" stroke-width="1.5"
          opacity="0.9" />
        <text x="${lx}" y="${ly + 4}" text-anchor="middle"
          font-size="11" fill="#fff" style="pointer-events:none;">·</text>
      </g>
    `;
  }

  /**
   * 圓弧扇形 path(外弧 - 內弧閉合)。
   * @param r 中心半徑
   * @param thickness 厚度
   * @param startDeg 起始角(0=12點鐘,順時針)
   * @param sweepDeg 跨度
   */
  private arcSegmentPath(
    r: number,
    thickness: number,
    startDeg: number,
    sweepDeg: number,
  ): string {
    const rOuter = r + thickness / 2;
    const rInner = r - thickness / 2;
    const a1 = (startDeg * Math.PI) / 180;
    const a2 = ((startDeg + sweepDeg) * Math.PI) / 180;
    const large = sweepDeg > 180 ? 1 : 0;
    const p = (radius: number, angle: number) => [
      radius * Math.cos(angle),
      radius * Math.sin(angle),
    ];
    const [x1, y1] = p(rOuter, a1);
    const [x2, y2] = p(rOuter, a2);
    const [x3, y3] = p(rInner, a2);
    const [x4, y4] = p(rInner, a1);
    return [
      `M ${x1.toFixed(2)} ${y1.toFixed(2)}`,
      `A ${rOuter} ${rOuter} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`,
      `L ${x3.toFixed(2)} ${y3.toFixed(2)}`,
      `A ${rInner} ${rInner} 0 ${large} 0 ${x4.toFixed(2)} ${y4.toFixed(2)}`,
      "Z",
    ].join(" ");
  }
}
