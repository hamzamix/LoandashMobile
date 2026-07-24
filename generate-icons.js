const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const LOGO = path.join(__dirname, 'public', 'icon-512x512.png');
const RES_DIR = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

const DENSITIES = [
  { name: 'mdpi', px: 108 },
  { name: 'hdpi', px: 162 },
  { name: 'xhdpi', px: 216 },
  { name: 'xxhdpi', px: 324 },
  { name: 'xxxhdpi', px: 432 },
];

const ICON_SIZES = [
  { name: 'mdpi', px: 48 },
  { name: 'hdpi', px: 72 },
  { name: 'xhdpi', px: 96 },
  { name: 'xxhdpi', px: 144 },
  { name: 'xxxhdpi', px: 192 },
];

async function generate() {
  console.log('Generating adaptive icon foreground PNGs...');
  for (const d of DENSITIES) {
    const size = d.px;
    const logoSize = Math.round(size * 0.7);
    const offset = Math.round((size - logoSize) / 2);

    const logoResized = await sharp(LOGO)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .ensureAlpha()
      .png()
      .toBuffer();

    const result = await sharp({
      create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    })
      .composite([{ input: logoResized, left: offset, top: offset }])
      .png()
      .toBuffer();

    const dir = path.join(RES_DIR, `mipmap-${d.name}`);
    fs.writeFileSync(path.join(dir, 'ic_launcher_foreground.png'), result);
    console.log(`  ${d.name} foreground: ${(result.length/1024).toFixed(1)} KB`);
  }

  console.log('Generating launcher icons...');
  for (const d of ICON_SIZES) {
    const size = d.px;
    const logoSize = Math.round(size * 0.85);
    const offset = Math.round((size - logoSize) / 2);

    const logoResized = await sharp(LOGO)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .ensureAlpha()
      .png()
      .toBuffer();

    const result = await sharp({
      create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    })
      .composite([{ input: logoResized, left: offset, top: offset }])
      .png()
      .toBuffer();

    const dir = path.join(RES_DIR, `mipmap-${d.name}`);
    fs.writeFileSync(path.join(dir, 'ic_launcher.png'), result);
    console.log(`  ${d.name} icon: ${(result.length/1024).toFixed(1)} KB`);

    const roundResult = await sharp(LOGO)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .ensureAlpha()
      .png()
      .toBuffer();

    const roundOut = await sharp({
      create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
    })
      .composite([{ input: roundResult, left: offset, top: offset }])
      .png()
      .toBuffer();

    fs.writeFileSync(path.join(dir, 'ic_launcher_round.png'), roundOut);
    console.log(`  ${d.name} round: ${(roundOut.length/1024).toFixed(1)} KB`);
  }

  console.log('Done!');
}

generate().catch(err => { console.error(err); process.exit(1); });
