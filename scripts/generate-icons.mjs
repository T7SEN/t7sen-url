// scripts/generate-icons.mjs
// Renders the T7 favicon (src/app/icon.svg) onto opaque black tiles for the
// apple-touch-icon and the web manifest (src/app/manifest.ts), and writes
// public/icon-live.svg (the favicon plus a red dot; LiveAmbience swaps it in
// while the stream is live). The files are committed, so serving them costs
// no function; rerun this after changing icon.svg:
//   node scripts/generate-icons.mjs
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = new URL("../", import.meta.url);
const svg = await readFile(new URL("src/app/icon.svg", root));
const black = { r: 0, g: 0, b: 0, alpha: 1 };

// `art` is the logo's share of the tile width. "any" icons use ~70%; the
// maskable one uses 56% so the logo's corners stay inside the 40%-radius safe
// circle that Android crops to. iOS wants an opaque 180x180 apple-touch-icon.
const outputs = [
  { file: "src/app/apple-icon.png", size: 180, art: 0.7 },
  { file: "public/icon-192.png", size: 192, art: 0.7 },
  { file: "public/icon-512.png", size: 512, art: 0.7 },
  { file: "public/icon-maskable-512.png", size: 512, art: 0.56 },
];

for (const { file, size, art } of outputs) {
  const logo = await sharp(svg, { density: 144 })
    .resize({ width: Math.round(size * art) })
    .png()
    .toBuffer();

  const out = fileURLToPath(new URL(file, root));
  await sharp({
    create: { width: size, height: size, channels: 4, background: black },
  })
    .composite([{ input: logo, gravity: "center" }])
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(out);

  console.log(`${file} ${size}x${size}`);
}

// The dot sits in the logo's empty bottom-right corner (viewBox
// -20 -20 504.22 482.36), about 7px across at 16px
const liveFile = "public/icon-live.svg";
const liveSvg = svg
  .toString()
  .replace(
    "</svg>",
    '  <circle cx="374" cy="352" r="110" fill="#ef4444"/>\n</svg>',
  );
if (liveSvg === svg.toString()) throw new Error("icon.svg has no </svg>");
await writeFile(fileURLToPath(new URL(liveFile, root)), liveSvg);
console.log(liveFile);
