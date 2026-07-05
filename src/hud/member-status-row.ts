import type { HudSnapshot, Layer, RosterMember } from "./types";

const LAYER_ORDER: Record<Layer, number> = { inner: 0, middle: 1, outer: 2 };
const LAYER_LABEL: Record<Layer, string> = { inner: "最內層", middle: "中層", outer: "最外層" };

export class MemberStatusRow {
  readonly el: HTMLElement;

  constructor() {
    this.el = document.createElement("div");
    this.el.className = "hud-member-status-row";
  }

  render(snapshot: HudSnapshot): void {
    const members = [...snapshot.roster]
      .sort((a, b) => LAYER_ORDER[a.layer] - LAYER_ORDER[b.layer])
      .slice(0, 3);

    this.el.innerHTML = "";
    members.forEach((member) => this.el.appendChild(this.createMemberCard(member)));
    this.el.style.display = members.length > 0 ? "flex" : "none";
  }

  private createMemberCard(member: RosterMember): HTMLElement {
    const hpPercent = Math.max(0, Math.min(100, Math.round(member.hpRatio * 100)));
    const displayPercent = hpPercent >= 100 ? 100 : Math.max(0, Math.floor(hpPercent / 10) * 10);
    const star = member.star ?? 1;
    const card = document.createElement("article");
    card.className = `hud-member-status-card hud-member-status-card--${member.layer} hud-member-status-card--${member.role}`;
    if (member.dead) card.classList.add("is-dead");
    if (member.hpRatio <= 0.3) card.classList.add("is-danger");
    card.innerHTML = `
      <div class="hud-member-avatar">
        <img src="/assets/transparent-portraits/avatars/${member.id}.png" alt="${member.label} ${star}星" draggable="false" />
      </div>
      <div class="hud-member-data">
        <div class="hud-member-heading"><span>${LAYER_LABEL[member.layer]}</span><strong>${member.label}</strong></div>
        <div class="hud-member-hp" aria-label="${member.label} 生命 ${displayPercent}%">
          <div class="hud-member-hp-fill" style="width:${displayPercent}%"></div>
          <span>${displayPercent}%</span>
        </div>
      </div>
    `;
    return card;
  }
}
