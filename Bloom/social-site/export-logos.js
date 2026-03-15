/**
 * Export Bloom logo from SVG sources to social-media-ready PNGs.
 * Run from project root: node Bloom/social-site/export-logos.js
 * Requires: sharp (installed on first run if missing).
 */
const fs = require('fs');
const path = require('path');

const OUT_DIR = __dirname;
const SVG_TRANSPARENT = fs.readFileSync(path.join(OUT_DIR, 'logo-source-transparent.svg'), 'utf8');
const SVG_WHITE = fs.readFileSync(path.join(OUT_DIR, 'logo-source-white.svg'), 'utf8');
const SVG_DARK = fs.readFileSync(path.join(OUT_DIR, 'logo-source-dark.svg'), 'utf8');

async function ensureSharp() {
  try {
    return require('sharp');
  } catch (e) {
    if (e.code === 'MODULE_NOT_FOUND') {
      const { execSync } = require('child_process');
      const root = path.join(OUT_DIR, '..', '..');
      console.log('Installing sharp in project root...');
      execSync('npm install sharp --no-save', { cwd: root, stdio: 'inherit' });
      return require('sharp');
    }
    throw e;
  }
}

async function main() {
  const sharp = await ensureSharp();

  const sizes = {
    highRes: 1080,
    square: 1080,
    storyW: 1080,
    storyH: 1920,
  };

  // Helper: resize SVG buffer to width (keeps aspect 1:1)
  async function svgToPng(svgString, width) {
    const buf = Buffer.from(svgString);
    return sharp(buf).resize(width, width).png().toBuffer();
  }

  // logo-transparent.png — high-res transparent
  const transparentPng = await svgToPng(SVG_TRANSPARENT, sizes.highRes);
  await sharp(transparentPng).toFile(path.join(OUT_DIR, 'logo-transparent.png'));
  console.log('Written logo-transparent.png');

  // logo-white.png — for dark backgrounds
  const whitePng = await svgToPng(SVG_WHITE, sizes.highRes);
  await sharp(whitePng).toFile(path.join(OUT_DIR, 'logo-white.png'));
  console.log('Written logo-white.png');

  // logo-dark.png — for light backgrounds
  const darkPng = await svgToPng(SVG_DARK, sizes.highRes);
  await sharp(darkPng).toFile(path.join(OUT_DIR, 'logo-dark.png'));
  console.log('Written logo-dark.png');

  // logo-square.png — 1080x1080
  await sharp(await svgToPng(SVG_TRANSPARENT, sizes.square))
    .toFile(path.join(OUT_DIR, 'logo-square.png'));
  console.log('Written logo-square.png (1080x1080)');

  // logo-story.png — 1080x1920, logo centered on transparent
  const logoBuf = await svgToPng(SVG_TRANSPARENT, 720);
  const storyComposite = [
    {
      input: logoBuf,
      top: Math.round((sizes.storyH - 720) / 2),
      left: Math.round((sizes.storyW - 720) / 2),
    },
  ];
  await sharp({
    create: {
      width: sizes.storyW,
      height: sizes.storyH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(storyComposite)
    .png()
    .toFile(path.join(OUT_DIR, 'logo-story.png'));
  console.log('Written logo-story.png (1080x1920)');

  console.log('All logo PNGs exported to', OUT_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
