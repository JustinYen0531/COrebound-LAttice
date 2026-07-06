import type { HudSnapshot, Layer, Role, RosterMember } from "./types";
import { 應用程式狀態 } from "../ui/應用程式狀態";
import { 選文 } from "../ui/語系";

function 雙語(中文: string, 英文: string): string {
  return 選文(應用程式狀態.額外.語言, 中文, 英文);
}

const LAYER_ORDER: Layer[] = ["inner", "middle", "outer"];
const LAYER_LABEL = (): Record<Layer, string> => ({
  inner: 雙語("最內層", "Inner"),
  middle: 雙語("中層", "Middle"),
  outer: 雙語("最外層", "Outer"),
});
const ROLE_LABEL = (): Record<Role, string> => ({
  protect: 雙語("防守位", "Defense"),
  firepower: 雙語("進攻位", "Offense"),
  supply: 雙語("效果位", "Effect"),
});
const DIR_LABEL = (): Record<-1 | 1, string> => ({
  [-1]: 雙語("上一組職能", "Previous role"),
  [1]: 雙語("下一組職能", "Next role"),
});

export class MemberStatusRow {
  readonly el: HTMLElement;

  private readonly cardsEl: HTMLElement;
  private readonly roleNameEl: HTMLElement;
  private readonly roleCounterEl: HTMLElement;
  private cycleHandler: ((direction: -1 | 1) => void) | null = null;

  constructor() {
    this.el = document.createElement("div");
    this.el.className = "hud-member-status-row";

    const leftButton = this.createCycleButton(-1);
    const pageLabel = document.createElement("div");
    pageLabel.className = "hud-member-page-label";
    pageLabel.setAttribute("aria-live", "polite");
    this.roleNameEl = document.createElement("strong");
    this.roleCounterEl = document.createElement("span");
    pageLabel.append(this.roleNameEl, this.roleCounterEl);

    this.cardsEl = document.createElement("div");
    this.cardsEl.className = "hud-member-cards";

    const rightButton = this.createCycleButton(1);
    this.el.append(leftButton, pageLabel, this.cardsEl, rightButton);
  }

  onCycle(handler: (direction: -1 | 1) => void): void {
    this.cycleHandler = handler;
  }

  render(snapshot: HudSnapshot): void {
    const activeRole = snapshot.layerRoster.inner?.role
      ?? snapshot.layerRoster.middle?.role
      ?? snapshot.layerRoster.outer?.role
      ?? "protect";
    const roleIndex = (["protect", "firepower", "supply"] as Role[]).indexOf(activeRole);

    this.roleNameEl.textContent = ROLE_LABEL()[activeRole];
    this.roleCounterEl.textContent = `${roleIndex + 1}/3`;
    this.cardsEl.replaceChildren(
      ...LAYER_ORDER.map((layer) => this.createMemberCard(layer, snapshot.layerRoster[layer])),
    );
  }

  private createCycleButton(direction: -1 | 1): HTMLButtonElement {
    const button = document.createElement("button");
    button.className = `hud-member-page-cycle hud-member-page-cycle--${direction < 0 ? "left" : "right"}`;
    button.type = "button";
    button.textContent = direction < 0 ? "◀" : "▶";
    button.setAttribute("aria-label", DIR_LABEL()[direction]);
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.cycleHandler?.(direction);
    });
    return button;
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
      ${body}
    `;
    return card;
  }

  private memberCardBody(member: RosterMember): string {
    const 層標籤 = LAYER_LABEL();
    const hpPercent = Math.max(0, Math.min(100, Math.round(member.hpRatio * 100)));
    const displayPercent = hpPercent >= 100 ? 100 : Math.max(0, Math.floor(hpPercent / 10) * 10);
    const star = member.star ?? 1;
    return `
      <div class="hud-member-avatar">
        <img src="/assets/transparent-portraits/avatars/${member.id}.png" alt="${member.label} ${star}${雙語("星", " star")}" draggable="false" />
      </div>
      <div class="hud-member-data">
        <div class="hud-member-heading"><span>${層標籤[member.layer]}</span><strong>${member.label}</strong></div>
        <div class="hud-member-hp" aria-label="${member.label} ${雙語("生命", "HP")} ${member.hpCurrent} / ${member.hpMax}">
          <div class="hud-member-hp-fill" style="width:${displayPercent}%"></div>
          <span>${displayPercent}%</span>
        </div>
      </div>
    `;
  }

  private emptyCardBody(layer: Layer): string {
    const 層標籤 = LAYER_LABEL();
    return `
      <div class="hud-member-avatar hud-member-avatar--empty">
        <span>?</span>
      </div>
      <div class="hud-member-data">
        <div class="hud-member-heading"><span>${層標籤[layer]}</span><strong>${雙語("空缺", "Empty")}</strong></div>
        <div class="hud-member-empty-note">${雙語("目前沒有隊員", "No member assigned")}</div>
      </div>
    `;
  }

}
