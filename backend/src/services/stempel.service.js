const { PDFDocument, rgb, StandardFonts, degrees } = require('pdf-lib');
const path = require('path');
const fs = require('fs');
const { dataUrlKeBuffer, bufferKeDataUrl } = require('../utils/fileData');
const { formatTanggalSaja } = require('../utils/formatTanggal');
const { AppError } = require('../middleware/error.middleware');
const { kodeDariBarang } = require('./peminjaman.service');

async function muatSebagaiPdf(dokumenUrl) {
  const file = dataUrlKeBuffer(dokumenUrl);
  if (!file) throw new AppError('Format dokumen sumber tidak dikenali.', 400);
  const bytes = file.buffer;
  const mime = file.mime;

  if (mime === 'application/pdf') {
    return PDFDocument.load(bytes);
  }

  // Untuk gambar: buat PDF baru lalu sisipkan gambar memenuhi halaman A4
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  let img;
  if (mime === 'image/png') img = await pdf.embedPng(bytes);
  else img = await pdf.embedJpg(bytes);

  const { width: pw, height: ph } = page.getSize();
  const skala = Math.min((pw - 60) / img.width, (ph - 60) / img.height);
  const w = img.width * skala;
  const h = img.height * skala;
  page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
  return pdf;
}

async function gambarStempelVektor(pdf, page, peminjaman, adminNama) {
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const merah = rgb(0.78, 0.13, 0.13);
  const biru = rgb(0.12, 0.23, 0.37);

  const { width } = page.getSize();
  const cx = width - 150;
  const cy = 150;

  page.drawEllipse({ x: cx, y: cy, xScale: 78, yScale: 78, borderColor: merah, borderWidth: 3 });
  page.drawEllipse({ x: cx, y: cy, xScale: 62, yScale: 62, borderColor: merah, borderWidth: 1.5 });

  page.drawText('DISETUJUI', {
    x: cx - 52,
    y: cy + 6,
    size: 18,
    font: fontBold,
    color: merah,
    rotate: degrees(-8),
  });

  page.drawText(kodeDariBarang(peminjaman), {
    x: cx - 48,
    y: cy - 14,
    size: 9,
    font: fontBold,
    color: merah,
  });
  page.drawText(formatTanggalSaja(new Date()), {
    x: cx - 42,
    y: cy - 30,
    size: 8,
    font: fontBold,
    color: merah,
  });

  page.drawText(adminNama || 'Administrator', {
    x: cx - 70,
    y: cy + 95,
    size: 14,
    font: fontItalic,
    color: biru,
  });
  page.drawLine({
    start: { x: cx - 75, y: cy + 90 },
    end: { x: cx + 75, y: cy + 90 },
    thickness: 1,
    color: biru,
  });
  page.drawText('Pejabat Pengelola BMN', {
    x: cx - 60,
    y: cy + 78,
    size: 8,
    font: fontBold,
    color: biru,
  });
}

async function tempelGambarStempel(pdf, page, absStempel) {
  const bytes = fs.readFileSync(absStempel);
  const img = await pdf.embedPng(bytes);
  const { width } = page.getSize();
  const w = 150;
  const h = (img.height / img.width) * w;
  page.drawImage(img, { x: width - w - 60, y: 70, width: w, height: h, opacity: 0.9 });
}

async function stempelDokumen(peminjaman, adminNama) {
  if (!peminjaman.dokumenUrl) {
    throw new AppError('Peminjaman ini tidak memiliki dokumen untuk distempel.', 400);
  }

  const pdf = await muatSebagaiPdf(peminjaman.dokumenUrl);
  const page = pdf.getPage(0);

  const absStempelAsset = path.resolve(__dirname, '../../assets/stempel.png');
  if (fs.existsSync(absStempelAsset)) {
    await tempelGambarStempel(pdf, page, absStempelAsset);
    await gambarStempelVektor(pdf, page, peminjaman, adminNama);
  } else {
    await gambarStempelVektor(pdf, page, peminjaman, adminNama);
  }

  const hasilBytes = await pdf.save();
  return bufferKeDataUrl(Buffer.from(hasilBytes), 'application/pdf');
}

module.exports = { stempelDokumen };
