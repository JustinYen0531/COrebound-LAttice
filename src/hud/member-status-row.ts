import type { HudSnapshot, Layer, RosterMember } from "./types";

const LAYER_ORDER: Layer[] = ["inner", "middle", "outer"];
const LAYER_LABEL: Record<Layer, string> = { inner: "最內層", middle: "中層", outer: "最外層" };
const DIR_LABEL: Record<-1 | 1, string> = { [-1]: "上一位", [1]: "下一位" };

export class MemberStatusRow {
  readonly el: HTMLElement;

  private cycleHandler: ((layer: Layer, direction: -1 | 1) => void) | null = null;

  constructor() {
    this.el = document.createElement("div");
    this.el.className = "hud-member-status-row";
    this.el.addEventListener("click", (event) => this.handleClick(event));
  }

  onCycle(handler: (layer: Layer, direction: -1 | 1) => void): void {
    this.cycleHandler = handler;
  }

  render(snapshot: HudSnapshot): void {
    this.el.innerHTML = "";
    LAYER_ORDER.forEach((layer) => {
      this.el.appendChild(this.createMemberCard(layer, snapshot.layerRoster[layer]));
    });
    this.el.style.display = "flex";
  }

  private createMemberCard(layer: Layer, member: RosterMember | null): HTMLElement {
    const card = document.createElement("article");
    const accent = member?.role ?? "protect";
    card.className = `hud-member-status-card hud-member-status-card--${layer} hud-member-status-card--${accent}`;
    if (!member) card.classList.add("is-empty");
    if (member?.dead) card.classList.add("is-dead");
    if ((member?.hpRatio ?? 1) <= 0.3) card.classList.add("is-danger");

    const body = member ? this.memberCardBody(member) : this.emptyCardBody(layer);
    card.innerHTML = `
      <button class="hud-member-cycle hud-member-cycle--left" type="button" data-layer="${layer}" data-dir="-1" aria-label="${LAYER_LABEL[layer]} ${DIR_LABEL[-1]}">◀</button>
      <button class="hud-member-cycle hud-member-cycle--right" type="button" data-layer="${layer}" data-dir="1" aria-label="${LAYER_LABEL[layer]} ${DIR_LABEL[1]}">▶</button>
      ${body}
    `;
    return card;
  }

  private memberCardBody(member: RosterMember): string {
    const hpPercent = Math.max(0, Math.min(100, Math.round(member.hpRatio * 100)));
    const displayPercent = hpPercent >= 100 ? 100 : Math.max(0, Math.floor(hpPercent / 10) * 10);
    const star = member.star ?? 1;
    return `
      <div class="hud-member-avatar">
        <img src="/assets/transparent-portraits/avatars/${member.id}.png" alt="${member.label} ${star}星" draggable="false" />
      </div>
      <div class="hud-member-data">
        <div class="hud-member-heading"><span>${LAYER_LABEL[member.layer]}</span><strong>${member.label}</strong></div>
        <div class="hud-member-hp" aria-label="${member.label} 生命 ${member.hpCurrent} / ${member.hpMax}">
          <div class="hud-member-hp-fill" style="width:${displayPercent}%"></div>
          <span>${displayPercent}%</span>
        </div>
      </div>
    `;
  }

  private emptyCardBody(layer: Layer): string {
    return `
      <div class="hud-member-avatar hud-member-avatar--empty">
        <span>?</span>
      </div>
      <div class="hud-member-data">
        <div class="hud-member-heading"><span>${LAYER_LABEL[layer]}</span><strong>空缺</strong></div>
        <div class="hud-member-empty-note">目前沒有隊員</div>
      </div>
    `;
  }

  private handleClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest(".hud-member-cycle");
    if (!(button instanceof HTMLButtonElement)) return;
    const layer = button.dataset.layer as Layer | undefined;
    const dir = Number(button.dataset.dir) as -1 | 1;
    if (!layer || (dir !== -1 && dir !== 1)) return;
    event.stopPropagation();
    this.cycleHandler?.(layer, dir);
  }
}
