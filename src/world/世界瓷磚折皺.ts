import type { World } from "../data/成員型別";

const SVG_NS = "http://www.w3.org/2000/svg";
const 世界折皺: Record<World, string> = {
  geometry: "/images/maps/wrinkles/geometry.png",
  organic: "/images/maps/wrinkles/organic.png",
  fractal: "/images/maps/wrinkles/fractal.png",
  mechanical: "/images/maps/wrinkles/mechanical.png",
};

const 世界磁磚選擇器 = [
  ".世界地圖層-愛因斯坦磁磚",
  ".世界地圖層-艾雪鳥磁磚",
  ".世界地圖層-彭羅斯磁磚",
  ".世界地圖層-開羅磁磚",
].join(",");

function 取得磁磚世界(tile: SVGPathElement): World | null {
  if (tile.classList.contains("世界地圖層-愛因斯坦磁磚")) return "geometry";
  if (tile.classList.contains("世界地圖層-艾雪鳥磁磚")) return "organic";
  if (tile.classList.contains("世界地圖層-彭羅斯磁磚")) return "fractal";
  if (tile.classList.contains("世界地圖層-開羅磁磚")) return "mechanical";
  return null;
}

function 穩定雜湊(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function 建立折皺覆層(tile: SVGPathElement, index: number): void {
  if (tile.dataset.wrinkleApplied === "true") return;
  const world = 取得磁磚世界(tile);
  const svg = tile.ownerSVGElement;
  if (!world || !svg) return;

  let defs = svg.querySelector<SVGDefsElement>("defs");
  if (!defs) {
    defs = document.createElementNS(SVG_NS, "defs");
    svg.prepend(defs);
  }

  const pathData = tile.getAttribute("d") ?? `${world}-${index}`;
  const hash = 穩定雜湊(pathData);
  const size = 460 + (hash % 180);
  const offsetX = ((hash >>> 8) % 220) - 110;
  const offsetY = ((hash >>> 16) % 220) - 110;
  const rotation = hash % 360;
  const patternId = `tile-wrinkle-${world}-${hash}-${index}`;

  const pattern = document.createElementNS(SVG_NS, "pattern");
  pattern.setAttribute("id", patternId);
  pattern.setAttribute("patternUnits", "userSpaceOnUse");
  pattern.setAttribute("x", String(offsetX));
  pattern.setAttribute("y", String(offsetY));
  pattern.setAttribute("width", String(size));
  pattern.setAttribute("height", String(size));
  pattern.setAttribute("patternTransform", `rotate(${rotation})`);

  const image = document.createElementNS(SVG_NS, "image");
  image.setAttribute("href", 世界折皺[world]);
  image.setAttribute("x", String(-size * 0.22));
  image.setAttribute("y", String(-size * 0.22));
  image.setAttribute("width", String(size * 1.44));
  image.setAttribute("height", String(size * 1.44));
  image.setAttribute("preserveAspectRatio", "xMidYMid slice");
  pattern.appendChild(image);
  defs.appendChild(pattern);

  const overlay = tile.cloneNode(false) as SVGPathElement;
  overlay.removeAttribute("class");
  overlay.removeAttribute("style");
  overlay.setAttribute("class", `世界地圖層-折皺覆層 世界地圖層-折皺覆層-${world}`);
  overlay.setAttribute("fill", `url(#${patternId})`);
  overlay.setAttribute("fill-opacity", "0.72");
  overlay.setAttribute("stroke", "none");
  overlay.setAttribute("style", "mix-blend-mode:multiply;pointer-events:none");
  overlay.dataset.wrinkleOverlay = "true";
  tile.after(overlay);
  tile.dataset.wrinkleApplied = "true";
}

function 掃描世界磁磚(root: ParentNode): void {
  const tiles: SVGPathElement[] = [];
  if (root instanceof SVGPathElement && root.matches(世界磁磚選擇器)) tiles.push(root);
  root.querySelectorAll<SVGPathElement>(世界磁磚選擇器).forEach((tile) => tiles.push(tile));
  tiles.forEach(建立折皺覆層);
}

export function 啟用世界瓷磚折皺(): void {
  掃描世界磁磚(document);
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof Element) 掃描世界磁磚(node);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
