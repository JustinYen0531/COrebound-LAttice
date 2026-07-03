import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const repoRoot = process.cwd();
const assetDir = path.join(repoRoot, "assets");
const outDir = path.join(assetDir, "transparent-portraits");
const targets = [
  "Architect立繪與頭像.png",
  "Conductor立繪與頭像.png",
  "Launcher立繪與頭像.png",
  "Operator立繪與頭像.png",
  "幾何世界所有成員立繪與頭像.png",
  "有機世界所有成員立繪與頭像.png",
  "分形世界所有成員立繪與頭像.png",
  "機械世界所有成員立繪與頭像.png",
];

const memberSheets = [
  {
    world: "geometry",
    file: "幾何世界所有成員立繪與頭像.png",
    members: ["m01_prism", "m02_matrix", "m03_vector", "m04_node", "m05_lightcone"],
  },
  {
    world: "organic",
    file: "有機世界所有成員立繪與頭像.png",
    members: ["m06_thorn", "m07_spore", "m08_vine", "m09_fungus", "m10_biolume"],
  },
  {
    world: "fractal",
    file: "分形世界所有成員立繪與頭像.png",
    members: ["m11_snowglass", "m12_bifurcation", "m13_lightning", "m14_abyss", "m15_aurora"],
  },
  {
    world: "mechanical",
    file: "機械世界所有成員立繪與頭像.png",
    members: ["m16_gate", "m17_shrapnel", "m18_needle", "m19_springtrap", "m20_arc"],
  },
];

const nearWhite = (r, g, b) => {
  const avg = (r + g + b) / 3;
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  return avg >= 224 && spread <= 30;
};

const alphaForPixel = (r, g, b) => {
  const distance = Math.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2);
  const maxDistance = 110;
  return Math.max(0, Math.min(255, Math.round((distance / maxDistance) * 255)));
};

await fs.mkdir(outDir, { recursive: true });
await fs.mkdir(path.join(outDir, "members"), { recursive: true });
await fs.mkdir(path.join(outDir, "avatars"), { recursive: true });

function buildMask(data, width, height, channels) {
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];
      const avg = (r + g + b) / 3;
      const spread = Math.max(r, g, b) - Math.min(r, g, b);
      if (a > 120 && (avg < 240 || spread > 18)) {
        mask[y * width + x] = 1;
      }
    }
  }
  return mask;
}

function findLargestBounds(mask, width, height) {
  const visited = new Uint8Array(width * height);
  let best = null;
  const queueX = new Int32Array(width * height);
  const queueY = new Int32Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const startIndex = y * width + x;
      if (!mask[startIndex] || visited[startIndex]) continue;

      let head = 0;
      let tail = 0;
      let count = 0;
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      visited[startIndex] = 1;
      queueX[tail] = x;
      queueY[tail] = y;
      tail += 1;

      while (head < tail) {
        const cx = queueX[head];
        const cy = queueY[head];
        head += 1;
        count += 1;
        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        const neighbors = [
          [cx - 1, cy],
          [cx + 1, cy],
          [cx, cy - 1],
          [cx, cy + 1],
        ];

        for (const [nx, ny] of neighbors) {
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const nextIndex = ny * width + nx;
          if (!mask[nextIndex] || visited[nextIndex]) continue;
          visited[nextIndex] = 1;
          queueX[tail] = nx;
          queueY[tail] = ny;
          tail += 1;
        }
      }

      if (!best || count > best.count) {
        best = { count, minX, maxX, minY, maxY };
      }
    }
  }

  return best;
}

function findMaskBounds(mask, width, height) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0 || maxY < 0) return null;
  return { minX, minY, maxX, maxY };
}

function padBounds(bounds, maxWidth, maxHeight, padding) {
  return {
    left: Math.max(0, bounds.minX - padding),
    top: Math.max(0, bounds.minY - padding),
    width: Math.min(maxWidth, bounds.maxX + padding) - Math.max(0, bounds.minX - padding) + 1,
    height: Math.min(maxHeight, bounds.maxY + padding) - Math.max(0, bounds.minY - padding) + 1,
  };
}

for (const fileName of targets) {
  const inputPath = path.join(assetDir, fileName);
  const outputPath = path.join(outDir, fileName);
  const { data, info } = await sharp(inputPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (nearWhite(r, g, b)) {
      data[i + 3] = alphaForPixel(r, g, b);
    }
  }

  await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: info.channels,
    },
  })
    .png()
    .toFile(outputPath);

  console.log(`generated ${path.relative(repoRoot, outputPath)}`);
}

for (const sheet of memberSheets) {
  const sourcePath = path.join(outDir, sheet.file);
  const image = sharp(sourcePath);
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const meta = await image.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  const cellWidth = width / 5;
  const cellHeight = height / 3;

  for (let col = 0; col < sheet.members.length; col += 1) {
    const memberId = sheet.members[col];
    for (let starIndex = 0; starIndex < 3; starIndex += 1) {
      const bodyLeft = Math.round(col * cellWidth + cellWidth * 0.04);
      const bodyTop = Math.round(starIndex * cellHeight + cellHeight * 0.0);
      const bodyWidth = Math.round(cellWidth * 0.54);
      const bodyHeight = Math.round(cellHeight * 0.84);
      const bodyOutput = path.join(outDir, "members", `${memberId}_s${starIndex + 1}.png`);
      await sharp(sourcePath)
        .extract({ left: bodyLeft, top: bodyTop, width: bodyWidth, height: bodyHeight })
        .resize({ width: 420, height: 560, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(bodyOutput);
      console.log(`generated ${path.relative(repoRoot, bodyOutput)}`);

      const avatarLeft = Math.round(col * cellWidth + cellWidth * 0.62);
      const avatarTop = Math.round(starIndex * cellHeight + cellHeight * 0.36);
      const avatarWidth = Math.round(cellWidth * 0.28);
      const avatarHeight = Math.round(cellHeight * 0.28);
      const avatarOutput = path.join(outDir, "avatars", `${memberId}_s${starIndex + 1}.png`);
      await sharp(sourcePath)
        .extract({ left: avatarLeft, top: avatarTop, width: avatarWidth, height: avatarHeight })
        .resize({ width: 128, height: 128, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toFile(avatarOutput);
      console.log(`generated ${path.relative(repoRoot, avatarOutput)}`);
    }
  }
}
