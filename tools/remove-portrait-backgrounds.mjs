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
