import type { World } from "../data/成員型別";

const SVG_NS = "http://www.w3.org/2000/svg";
const 世界折皺: Record<World, string> = {
  geometry: "/images/maps/wrinkles/geometry.png",
  organic: "/images/maps/wrinkles/organic.png",
  fractal: "/images/maps/wrinkles/fractal.png",
  mechanical: "/images/maps/wrinkles/mechanical.png",
};

function 注入折皺(pattern: SVGPatternElement, world: World): void {
  if (pattern.dataset.wrinkleApplied === "true") return;

  const image = document.createElementNS(SVG_NS, "image");
  image.setAttribute("href", 世界折皺[world]);
  image.setAttribute("x", "0");
  image.setAttribute("y", "0");
  image.setAttribute("width", "887");
  image.setAttribute("height", "887");
  image.setAttribute("preserveAspectRatio", "xMidYMid slice");
  image.setAttribute("opacity", "0.24");
  image.setAttribute("style", "mix-blend-mode:multiply;pointer-events:none");
  pattern.appendChild(image);
  pattern.dataset.wrinkleApplied = "true";
}

function 掃描世界圖樣(root: ParentNode): void {
  for (const world of ["geometry", "organic", "fractal", "mechanical"] as World[]) {
    root.querySelectorAll<SVGPatternElement>(`pattern[id^="${world}-floor-"]`).forEach((pattern) => {
      注入折皺(pattern, world);
    });
  }
}

export function 啟用世界瓷磚折皺(): void {
  掃描世界圖樣(document);
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const node of record.addedNodes) {
        if (node instanceof Element) 掃描世界圖樣(node);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
