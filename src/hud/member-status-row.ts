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

  private cycleHandler: ((direction: -1 | 1) => void) | null = null;

  constructor() {
    this.el = document.createElement("div");
    this.el.className = "hud-member-status-row";
    this.el.addEventListener("click", (event) => this.handleClick(event));
  }

  onCycle(handler: (direction: -1 | 1) => void): void {
    this.cycleHandler = handler;
  }

  render(snapshot: HudSnapshot): void {
    this.el.innerHTML = "";
    const directionLabel = DIR_LABEL();
    const activeRole = snapshot.layerRoster.inner?.role
      ?? snapshot.layerRoster.middle?.role
      ?? snapshot.layerRoster.outer?.role
      ?? "protect";
    const roleIndex = (["protect", "firepower", "supply"] as Role[]).indexOf(activeRole);

    this.el.insertAdjacentHTML("beforeend", `
      <button class="hud-member-page-cycle hud-member-page-cycle--left" type="button" data-dir="-1" aria-label="${directionLabel[-1]}">◀</button>
      <div class="hud-member-page-label" aria-live="polite">
        <strong>${ROLE_LABEL()[activeRole]}</strong><span>${roleIndex + 1}/3</span>
      </div>
    `);
    LAYER_ORDER.forEach((layer) => {
      this.el.appendChild(this.createMemberCard(layer, snapshot.layerRoster[layer]));
    });
    this.el.insertAdjacentHTML("beforeend", `
      <button class="hud-member-page-cycle hud-member-page-cycle--right" type="button" data-dir="1" aria-label="${directionLabel[1]}">▶</button>
    `);
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

  private handleClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof Node)) return;
    const origin = target instanceof Element ? target : target.parentElement;
    if (!origin) return;
    const button = origin.closest(".hud-member-page-cycle");
    if (!(button instanceof HTMLButtonElement)) return;
    const dir = Number(button.dataset.dir) as -1 | 1;
    if (dir !== -1 && dir !== 1) return;
    event.stopPropagation();
    this.cycleHandler?.(dir);
  }
}
