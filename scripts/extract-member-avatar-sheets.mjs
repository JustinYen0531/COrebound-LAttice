import { readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const avatarDir = path.resolve("assets/transparent-portraits/avatars");
const standardCenters = [
  { x: 260, y: 330 },
  { x: 768, y: 330 },
  { x: 1276, y: 330 },
  { x: 510, y: 720 },
  { x: 1024, y: 720 },
];
const sheetLayouts = new Map([
  ["幾何頭像.png", { firstMemberNo: 1, centers: standardCenters, cropSize: 420 }],
  ["有機頭像.png", { firstMemberNo: 6, centers: standardCenters, cropSize: 420 }],
  ["分形頭像.png", { firstMemberNo: 11, centers: standardCenters, cropSize: 420 }],
  [
    "機械頭像.png",
    {
      firstMemberNo: 16,
      centers: [205, 493, 768, 1062, 1355].map((x) => ({ x, y: 465 })),
      cropSize: 286,
    },
  ],
]);

const files = await readdir(avatarDir);
for (const [sheetName, { firstMemberNo, centers, cropSize }] of sheetLayouts) {
  if (!files.includes(sheetName)) throw new Error(`Missing avatar sheet: ${sheetName}`);
  const sheetPath = path.join(avatarDir, sheetName);
  for (const [index, center] of centers.entries()) {
    const memberNo = firstMemberNo + index;
    const memberPrefix = `m${String(memberNo).padStart(2, "0")}_`;
    const legacyName = files.find((name) => name.startsWith(memberPrefix) && name.endsWith("_s1.png"));
    if (!legacyName) throw new Error(`Cannot resolve member filename for ${memberPrefix}`);
    const outputName = legacyName.replace(/_s1\.png$/, ".png");
    await sharp(sheetPath)
      .extract({
        left: center.x - cropSize / 2,
        top: center.y - cropSize / 2,
        width: cropSize,
        height: cropSize,
      })
      .resize(320, 320, { fit: "contain" })
      .png()
      .toFile(path.join(avatarDir, outputName));
  }
}

console.log("Extracted 20 canonical member avatars.");
