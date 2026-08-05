// ============================================================
//  Generator ikon PWA — merasterisasi SVG sumber menjadi PNG.
//  Jalankan: node scripts/gen-pwa-icons.js
// ============================================================

const sharp = require('sharp');
const path = require('path');

const dir = path.resolve(__dirname, '../public/icons');
const src = path.join(dir, 'icon-source.svg');
const srcMaskable = path.join(dir, 'icon-maskable-source.svg');

const tugas = [
  { input: src, size: 192, out: 'icon-192.png' },
  { input: src, size: 512, out: 'icon-512.png' },
  { input: src, size: 180, out: 'apple-touch-icon.png' },
  { input: srcMaskable, size: 512, out: 'icon-maskable-512.png' },
  { input: srcMaskable, size: 192, out: 'icon-maskable-192.png' },
];

(async () => {
  for (const t of tugas) {
    await sharp(t.input)
      .resize(t.size, t.size)
      .png()
      .toFile(path.join(dir, t.out));
    console.log('✓', t.out);
  }
  console.log('Selesai membuat ikon PWA.');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
