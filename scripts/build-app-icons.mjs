import fs from "fs";
import sharp from "sharp";

const src = "public/brand/e-shop-wordmark.png";
const { data, info } = await sharp(src)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

function isOrange(r, g, b, a) {
  return (
    a > 40 && r > 180 && g > 40 && g < 210 && b < 130 && r - b > 70
  );
}
function isInk(r, g, b, a) {
  return a > 40 && !isOrange(r, g, b, a) && r < 100 && g < 100 && b < 100;
}

let minX = info.width;
let minY = info.height;
let maxX = 0;
let maxY = 0;
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 4;
    if (data[i + 3] > 20) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
}

let seenOrange = false;
let shopStart = null;
for (let x = minX; x <= maxX; x++) {
  let orange = 0;
  let ink = 0;
  for (let y = minY; y <= maxY; y++) {
    const i = (y * info.width + x) * 4;
    const a = data[i + 3];
    if (a < 20) continue;
    if (isOrange(data[i], data[i + 1], data[i + 2], a)) orange++;
    else if (isInk(data[i], data[i + 1], data[i + 2], a)) ink++;
  }
  if (orange > 8) seenOrange = true;
  if (seenOrange && ink > 25 && orange < 3) {
    shopStart = x;
    break;
  }
}

const cutX = (shopStart ?? Math.round(minX + (maxX - minX) * 0.34)) - 2;
const left = Math.max(0, minX - 2);
const top = Math.max(0, minY - 2);
const width = cutX - left;
const height = Math.min(info.height - top, maxY - minY + 4);

let eBuf = await sharp(src)
  .extract({ left, top, width, height })
  .ensureAlpha()
  .png()
  .toBuffer();

{
  const raw = await sharp(eBuf).raw().toBuffer({ resolveWithObject: true });
  const d = Buffer.from(raw.data);
  let lastOrangeX = 0;
  for (let x = 0; x < raw.info.width; x++) {
    for (let y = 0; y < raw.info.height; y++) {
      const i = (y * raw.info.width + x) * 4;
      if (isOrange(d[i], d[i + 1], d[i + 2], d[i + 3])) {
        lastOrangeX = Math.max(lastOrangeX, x);
      }
    }
  }
  const keepUntil = Math.min(raw.info.width - 1, lastOrangeX + 4);
  for (let x = keepUntil + 1; x < raw.info.width; x++) {
    for (let y = 0; y < raw.info.height; y++) {
      const i = (y * raw.info.width + x) * 4;
      d[i + 3] = 0;
    }
  }
  eBuf = await sharp(d, {
    raw: {
      width: raw.info.width,
      height: raw.info.height,
      channels: 4,
    },
  })
    .trim({ threshold: 5 })
    .png()
    .toBuffer();
}

await sharp(eBuf).toFile("public/brand/e-shop-e-only.png");

/** Dark mark accents → near-black so they read on white tiles. */
async function markForLightBg(input) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const d = Buffer.from(data);
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a < 20) continue;
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    if (isInk(r, g, b, a)) {
      d[i] = 18;
      d[i + 1] = 18;
      d[i + 2] = 18;
    }
  }
  return sharp(d, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();
}

async function makeAppIcon(size, outPath, padRatio = 0.17) {
  const bg = { r: 255, g: 255, b: 255, alpha: 255 };
  const inner = Math.round(size * (1 - padRatio * 2));
  const lightMark = await markForLightBg(eBuf);
  const resized = await sharp(lightMark)
    .resize({
      width: inner,
      height: inner,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  const meta = await sharp(resized).metadata();
  const leftPad = Math.round((size - (meta.width ?? inner)) / 2);
  const topPad = Math.max(
    0,
    Math.round((size - (meta.height ?? inner)) / 2) - Math.round(size * 0.01),
  );
  await sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([{ input: resized, left: leftPad, top: topPad }])
    .png({ compressionLevel: 9 })
    .toFile(outPath);
}

await makeAppIcon(512, "public/brand/app-icon-512.png", 0.17);
await makeAppIcon(512, "public/brand/app-icon-maskable.png", 0.22);
await makeAppIcon(192, "public/brand/app-icon-192.png", 0.17);
await makeAppIcon(180, "public/brand/apple-touch-icon.png", 0.18);
await makeAppIcon(32, "public/brand/favicon-32.png", 0.14);
await makeAppIcon(16, "public/brand/favicon-16.png", 0.12);

fs.copyFileSync("public/brand/app-icon-512.png", "src/app/icon.png");
fs.copyFileSync("public/brand/apple-touch-icon.png", "src/app/apple-icon.png");
fs.copyFileSync("public/brand/favicon-32.png", "public/favicon-32.png");
fs.copyFileSync("public/brand/favicon-16.png", "public/favicon-16.png");
fs.copyFileSync(
  "public/brand/apple-touch-icon.png",
  "public/apple-touch-icon.png",
);
fs.copyFileSync("public/brand/app-icon-192.png", "public/icon-192.png");
fs.copyFileSync("public/brand/app-icon-512.png", "public/icon-512.png");
fs.copyFileSync(
  "public/brand/app-icon-maskable.png",
  "public/icon-maskable.png",
);

console.log("App icons built from E-shop logo mark.");
