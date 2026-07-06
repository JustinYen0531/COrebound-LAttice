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
};

const 折皺層列表: 折皺層設定[] = [
  { sizeBase: 300, sizeRange: 120, offsetRange: 150, opacity: 0.78, scale: 1.72, rotationOffset: 0 },
  { sizeBase: 210, sizeRange: 90, offsetRange: 110, opacity: 0.62, scale: 1.84, rotationOffset: 67 },
  { sizeBase: 148, sizeRange: 72, offsetRange: 72, opacity: 0.46, scale: 1.96, rotationOffset: 131 },
  { sizeBase: 104, sizeRange: 56, offsetRange: 42, opacity: 0.3, scale: 2.08, rotationOffset: 211 },
];

// ── 折皺對比預烘焙 ───────────────────────────────────────────────
// 舊版在每一片折皺覆層 path 上掛 SVG 濾鏡（去彩度＋對比拉高＋alpha gamma）
// 再用 mix-blend-mode 疊到磁磚上。全地圖近 3600 片覆層 = 近 3600 個獨立的
// 濾鏡＋混色表面，瀏覽器每次重繪都得逐一重算，實測是高細節/中細節模式
// 地圖與物件閃爍、掉幀的最大元凶。
// 這裡改成：載入折皺圖後用 canvas 做一次等效的像素運算（SVG 濾鏡預設在
// linearRGB 色彩空間運作，所以先轉線性、算完再轉回 sRGB），並且把混色也
// 一併烘進圖裡——濾鏡後的折皺是灰階圖，灰度 g 的 multiply 疊色在不透明
// 底上等價於「黑色、alpha = α×(1−g) 的普通疊圖」，因此輸出一張黑色陰影圖，
// 覆層直接用普通繪製即可，完全不需要執行期濾鏡與 mix-blend-mode。

function srgb轉線性(value: number): number {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function 線性轉srgb(value: number): number {
  const v = value <= 0.0031308 ? value * 12.92 : 1.055 * Math.pow(value, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(v * 255)));
}

function 載入圖片(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`載入折皺圖失敗：${url}`));
    image.src = url;
  });
}

async function 烘焙折皺對比(url: string): Promise<string> {
  const image = await 載入圖片(url);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("無法建立 2d canvas");
  context.drawImage(image, 0, 0);
  const data = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = data.data;
  for (let index = 0; index < pixels.length; index += 4) {
    // feColorMatrix saturate=0：linearRGB 亮度加權去彩度。
    const gray =
      0.2126 * srgb轉線性(pixels[index]) +
      0.7152 * srgb轉線性(pixels[index + 1]) +
      0.0722 * srgb轉線性(pixels[index + 2]);
    // feComponentTransfer linear：slope 1.24、intercept -0.08（RGB 同值）。
    const boosted = Math.max(0, Math.min(1, gray * 1.24 - 0.08));
    const channel = 線性轉srgb(boosted);
    // feFuncA gamma：amplitude 1.22、exponent 0.88、offset 0。
    const alpha = Math.min(1, 1.22 * Math.pow(pixels[index + 3] / 255, 0.88));
    // multiply 疊色等價轉換：黑色 + alpha×(1−g)。darken 層以同式近似
    //（folds 多為深色、覆層不透明度低，視覺差異可忽略）。
    pixels[index] = 0;
    pixels[index + 1] = 0;
    pixels[index + 2] = 0;
    pixels[index + 3] = Math.max(0, Math.min(255, Math.round(alpha * (1 - channel / 255) * 255)));
  }
  context.putImageData(data, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("烘焙折皺圖輸出失敗");
  return URL.createObjectURL(blob);
}

const 烘焙後折皺網址: Partial<Record<World, string>> = {};
let 烘焙完成 = false;
const 待處理磁磚: SVGPathElement[] = [];

async function 預先烘焙全部折皺圖(): Promise<void> {
  await Promise.all(
    (Object.keys(世界折皺) as World[]).map(async (world) => {
      try {
        烘焙後折皺網址[world] = await 烘焙折皺對比(世界折皺[world]);
      } catch {
        // 烘焙失敗（例如圖檔缺失）就退回原圖：材質對比較淡，但不影響遊玩，
        // 也絕不退回逐覆層濾鏡的舊路（那正是效能問題來源）。
        烘焙後折皺網址[world] = 世界折皺[world];
      }
    }),
  );
  烘焙完成 = true;
  const queued = 待處理磁磚.splice(0);
  queued.forEach(建立折皺覆層);
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
  image.setAttribute("href", 烘焙後折皺網址[world] ?? 世界折皺[world]);
  image.setAttribute("x", String(-size * 0.24));
  image.setAttribute("y", String(-size * 0.24));
  image.setAttribute("width", String(size * config.scale));
  image.setAttribute("height", String(size * config.scale));
  image.setAttribute("preserveAspectRatio", "xMidYMid slice");
  pattern.appendChild(image);
  defs.appendChild(pattern);
  return patternId;
}

function 建立折皺覆層(tile: SVGPathElement, _index?: number): void {
  if (tile.dataset.wrinkleApplied === "true") return;
  if (!tile.isConnected) return;
  const world = 取得磁磚世界(tile);
  const svg = tile.ownerSVGElement;
  if (!world || !svg) return;

  let defs = svg.querySelector<SVGDefsElement>("defs");
  if (!defs) {
    defs = document.createElementNS(SVG_NS, "defs");
    svg.prepend(defs);
  }

  const pathData = tile.getAttribute("d") ?? world;
  const hash = 穩定雜湊(pathData);
  const overlays = 折皺層列表.map((config, layerIndex) => {
    const patternId = 建立折皺圖樣(defs!, world, hash, 0, layerIndex, config);
    const overlay = tile.cloneNode(false) as SVGPathElement;
    overlay.removeAttribute("class");
    overlay.removeAttribute("style");
    overlay.setAttribute("class", `世界地圖層-折皺覆層 世界地圖層-折皺覆層-${world}`);
    overlay.setAttribute("fill", `url(#${patternId})`);
    overlay.setAttribute("fill-opacity", String(config.opacity));
    overlay.setAttribute("stroke", "none");
    // 混色效果已烘進黑色陰影圖（見上方說明），這裡用普通繪製即可；
    // 逐覆層 mix-blend-mode 會讓瀏覽器無法快取地圖圖層，是閃爍主因之一。
    overlay.setAttribute("style", "pointer-events:none");
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
  if (烘焙完成) tiles.forEach(建立折皺覆層);
  else 待處理磁磚.push(...tiles);
}

export function 啟用世界瓷磚折皺(): void {
  void 預先烘焙全部折皺圖();
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
