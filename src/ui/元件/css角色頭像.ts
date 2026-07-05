import { MEMBERS } from "../../data/成員資料庫";

type 世界類型 = "geometry" | "organic" | "fractal" | "mechanical";
type 家族類型 = "shield" | "multishot" | "straight" | "mine" | "laser";

const 世界基底色相: Record<世界類型, number> = {
  geometry: 214,
  organic: 126,
  fractal: 272,
  mechanical: 28,
};

const 家族色相偏移: Record<家族類型, number> = {
  shield: 0,
  multishot: 18,
  straight: -16,
  mine: 34,
  laser: -34,
};

function 正規化色相(value: number): number {
  let hue = value % 360;
  if (hue < 0) hue += 360;
  return hue;
}

function 取角色資料(memberId: string) {
  return MEMBERS.find((entry) => entry.id === memberId) ?? MEMBERS.find((entry) => entry.id.endsWith(`_${memberId}`)) ?? MEMBERS[0];
}

function 建立樣式字串(memberId: string, star: number): string {
  const member = 取角色資料(memberId);
  const world = member.world as 世界類型;
  const family = member.family as 家族類型;
  const baseHue = 正規化色相(世界基底色相[world] + 家族色相偏移[family] + member.no * 7);
  const accentHue = 正規化色相(baseHue + 34 + member.no * 3);
  const rimHue = 正規化色相(baseHue - 28);
  const angle = 18 + (member.no % 6) * 12;
  const tilt = -10 + (member.no % 5) * 5;
  const rise = 18 + (member.no % 4) * 4;
  const spread = 28 + (member.no % 3) * 6;
  const glow = 0.22 + Math.min(0.12, star * 0.035);

  return [
    `--avatar-a:hsl(${baseHue} 82% 58%)`,
    `--avatar-b:hsl(${accentHue} 78% 46%)`,
    `--avatar-c:hsl(${rimHue} 92% 74%)`,
    `--avatar-dark:hsl(${baseHue} 28% 10%)`,
    `--avatar-angle:${angle}deg`,
    `--avatar-tilt:${tilt}deg`,
    `--avatar-rise:${rise}%`,
    `--avatar-spread:${spread}%`,
    `--avatar-glow:${glow}`,
  ].join(";");
}

export function 生成角色迷你頭像HTML(memberId: string, star: number, extraClass = ""): string {
  const member = 取角色資料(memberId);
  const world = member.world as 世界類型;
  const family = member.family as 家族類型;
  const classes = ["角色迷你頭像", `世界-${world}`, `家族-${family}`, `星級-${Math.max(1, Math.min(3, star))}`, extraClass]
    .filter(Boolean)
    .join(" ");
  return `
    <span class="${classes}" style="${建立樣式字串(memberId, star)}" aria-hidden="true">
      <span class="角色迷你頭像-背光"></span>
      <span class="角色迷你頭像-底盤"></span>
      <span class="角色迷你頭像-左翼"></span>
      <span class="角色迷你頭像-右翼"></span>
      <span class="角色迷你頭像-輪廓"></span>
      <span class="角色迷你頭像-冠飾"></span>
      <span class="角色迷你頭像-核心"></span>
    </span>
  `;
}

let svg序號 = 0;

export function 建立角色迷你頭像SVG徽章(
  memberId: string,
  star: number,
  半徑: number,
  外框顏色: string,
  角度: number,
): SVGElement {
  svg序號 += 1;
  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("transform", `rotate(${角度}) translate(0, ${-半徑})`);

  const outer = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  outer.setAttribute("cx", "0");
  outer.setAttribute("cy", "0");
  outer.setAttribute("r", "21");
  outer.setAttribute("fill", "#05060b");
  outer.setAttribute("stroke", 外框顏色);
  outer.setAttribute("stroke-width", "3");
  outer.setAttribute("opacity", "0.98");
  g.appendChild(outer);

  const inner = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  inner.setAttribute("cx", "0");
  inner.setAttribute("cy", "0");
  inner.setAttribute("r", "17.8");
  inner.setAttribute("fill", "#0a0d17");
  inner.setAttribute("stroke", "rgba(255,255,255,0.9)");
  inner.setAttribute("stroke-width", "1");
  g.appendChild(inner);

  const fo = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
  fo.setAttribute("x", "-16");
  fo.setAttribute("y", "-16");
  fo.setAttribute("width", "32");
  fo.setAttribute("height", "32");

  const host = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
  host.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  host.className = "角色迷你頭像-徽章容器";
  host.innerHTML = 生成角色迷你頭像HTML(memberId, star, "角色迷你頭像-徽章");
  fo.appendChild(host);
  g.appendChild(fo);

  return g;
}
