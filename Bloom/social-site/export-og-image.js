/**
 * One-off: copy Bloom logo to frontend/public/og-image.jpg for OG meta.
 * Run from project root: node Bloom/social-site/export-og-image.js
 */
const path = require('path');
const sharp = require('sharp');

const OUT = path.join(__dirname, '..', '..', 'frontend', 'public', 'og-image.jpg');
const LOGO = path.join(__dirname, 'logo-transparent.png');

sharp(LOGO)
  .flatten({ background: { r: 26, g: 26, b: 46 } }) // dark purple so logo stands out
  .jpeg({ quality: 90 })
  .toFile(OUT)
  .then(() => console.log('Written', OUT))
  .catch((err) => { console.error(err); process.exit(1); });
