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

type 折皺層設定 = {
  sizeBase: number;
  sizeRange: number;
  offsetRange: number;
  opacity: number;
  scale: number;
  rotationOffset: number;
  blendMode: string;
};

const 折皺層列表: 折皺層設定[] = [
  { sizeBase: 300, sizeRange: 120, offsetRange: 150, opacity: 0.78, scale: 1.72, rotationOffset: 0, blendMode: "multiply" },
  { sizeBase: 210, sizeRange: 90, offsetRange: 110, opacity: 0.62, scale: 1.84, rotationOffset: 67, blendMode: "multiply" },
  { sizeBase: 148, sizeRange: 72, offsetRange: 72, opacity: 0.46, scale: 1.96, rotationOffset: 131, blendMode: "darken" },
  { sizeBase: 104, sizeRange: 56, offsetRange: 42, opacity: 0.3, scale: 2.08, rotationOffset: 211, blendMode: "darken" },
];

function 確保折皺濾鏡(defs: SVGDefsElement): string {
  const filterId = "world-tile-wrinkle-contrast";
  if (defs.querySelector(`#${filterId}`)) return filterId;

  const filter = document.createElementNS(SVG_NS, "filter");
  filter.setAttribute("id", filterId);
  filter.setAttribute("x", "-20%");
  filter.setAttribute("y", "-20%");
  filter.setAttribute("width", "140%");
  filter.setAttribute("height", "140%");

  const desaturate = document.createElementNS(SVG_NS, "feColorMatrix");
  desaturate.setAttribute("type", "saturate");
  desaturate.setAttribute("values", "0");
  filter.appendChild(desaturate);

  const contrast = document.createElementNS(SVG_NS, "feComponentTransfer");
  const alpha = document.createElementNS(SVG_NS, "feFuncA");
  alpha.setAttribute("type", "gamma");
  alpha.setAttribute("amplitude", "1.22");
  alpha.setAttribute("exponent", "0.88");
  alpha.setAttribute("offset", "0");
  contrast.appendChild(alpha);

  const channelSlope = "1.24";
  const channelOffset = "-0.08";
  ["R", "G", "B"].forEach((channel) => {
    const fn = document.createElementNS(SVG_NS, `feFunc${channel}`);
    fn.setAttribute("type", "linear");
    fn.setAttribute("slope", channelSlope);
    fn.setAttribute("intercept", channelOffset);
    contrast.appendChild(fn);
  });

  filter.appendChild(contrast);
  defs.appendChild(filter);
  return filterId;
}

function 建立折皺圖樣(
  defs: SVGDefsElement,
  world: World,
  hash: number,
  index: number,
  layerIndex: number,
  config: 折皺層設定,
): string {
  const layerHash = 穩定雜湊(`${world}-${hash}-${index}-${layerIndex}`);
  const size = config.sizeBase + (layerHash % config.sizeRange);
  const offsetX = ((layerHash >>> 8) % (config.offsetRange * 2)) - config.offsetRange;
  const offsetY = ((layerHash >>> 16) % (config.offsetRange * 2)) - config.offsetRange;
  const rotation = (layerHash + config.rotationOffset) % 360;
  const patternId = `tile-wrinkle-${world}-${hash}-${index}-${layerIndex}`;

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
  image.setAttribute("x", String(-size * 0.24));
  image.setAttribute("y", String(-size * 0.24));
  image.setAttribute("width", String(size * config.scale));
  image.setAttribute("height", String(size * config.scale));
  image.setAttribute("preserveAspectRatio", "xMidYMid slice");
  pattern.appendChild(image);
  defs.appendChild(pattern);
  return patternId;
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
  const filterId = 確保折皺濾鏡(defs);
  const overlays = 折皺層列表.map((config, layerIndex) => {
    const patternId = 建立折皺圖樣(defs, world, hash, index, layerIndex, config);
    const overlay = tile.cloneNode(false) as SVGPathElement;
    overlay.removeAttribute("class");
    overlay.removeAttribute("style");
    overlay.setAttribute("class", `世界地圖層-折皺覆層 世界地圖層-折皺覆層-${world}`);
    overlay.setAttribute("fill", `url(#${patternId})`);
    overlay.setAttribute("fill-opacity", String(config.opacity));
    overlay.setAttribute("stroke", "none");
    overlay.setAttribute("filter", `url(#${filterId})`);
    overlay.setAttribute("style", `mix-blend-mode:${config.blendMode};pointer-events:none`);
    overlay.dataset.wrinkleOverlay = "true";
    return overlay;
  });
  overlays.forEach((overlay) => tile.after(overlay));
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
