// ============================================================
//  Generator Surat Pernyataan Pengembalian BMN (PDF, pdf-lib).
//  Dibuat otomatis saat peminjam hendak mengembalikan barang.
//  Surat ini DIUNDUH & DICETAK peminjam, lalu ditandatangani
//  secara FISIK oleh "Yang menerima BMN" (petugas BMN). Karena
//  itu blok tanda tangan dibiarkan kosong (bukan tanda tangan
//  elektronik). Hasil dikembalikan sebagai data URL (PDF).
// ============================================================

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const path = require('path');
const fs = require('fs');
const { bufferKeDataUrl } = require('../utils/fileData');
const { formatTanggalSaja } = require('../utils/formatTanggal');
const nomorSuratService = require('./nomorSurat.service');
const env = require('../config/env');

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;

const LABEL_KONDISI = {
  BAIK: 'Baik',
  RUSAK_RINGAN: 'Rusak Ringan',
  RUSAK_BERAT: 'Rusak Berat',
};

// Pecah teks menjadi baris-baris agar muat dalam maxWidth.
function wrapText(text, font, size, maxWidth) {
  const hasil = [];
  const kata = String(text ?? '').split(/\s+/).filter(Boolean);
  let baris = '';
  for (let w of kata) {
    while (font.widthOfTextAtSize(w, size) > maxWidth) {
      let i = 1;
      while (i <= w.length && font.widthOfTextAtSize(w.slice(0, i), size) <= maxWidth) i++;
      if (baris) {
        hasil.push(baris);
        baris = '';
      }
      hasil.push(w.slice(0, i - 1));
      w = w.slice(i - 1);
    }
    const coba = baris ? `${baris} ${w}` : w;
    if (font.widthOfTextAtSize(coba, size) > maxWidth && baris) {
      hasil.push(baris);
      baris = w;
    } else {
      baris = coba;
    }
  }
  if (baris) hasil.push(baris);
  return hasil.length ? hasil : [''];
}

function nomorSurat(peminjaman) {
  // Surat pengembalian memakai nomor & tahun yang sama dengan surat
  // peminjamannya (satu transaksi = satu nomor PRN), hanya beda format
  // (tanpa segmen "PP.1"). Nomor ditetapkan saat pengajuan peminjaman dibuat.
  const tahun =
    peminjaman.tahunSurat ||
    new Date(peminjaman.tanggalPengajuan || Date.now()).getFullYear();
  return nomorSuratService.formatPengembalian(peminjaman.nomorSurat, tahun);
}

async function generate(peminjaman) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const hitam = rgb(0.1, 0.1, 0.1);
  const abu = rgb(0.45, 0.45, 0.45);

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const tambahHalaman = () => {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };
  const pastikanRuang = (butuh) => {
    if (y - butuh < MARGIN) tambahHalaman();
  };

  const teks = (str, x, opt = {}) => {
    const f = opt.font || font;
    const size = opt.size || 10;
    page.drawText(String(str ?? ''), { x, y: y - size, size, font: f, color: opt.color || hitam });
  };
  const teksTengah = (str, opt = {}) => {
    const f = opt.font || font;
    const size = opt.size || 10;
    const w = f.widthOfTextAtSize(String(str ?? ''), size);
    teks(str, (PAGE_W - w) / 2, opt);
  };

  // Blok identitas: label : nilai (dengan wrap)
  const blokIdentitas = (rows) => {
    const xLabel = MARGIN;
    const xTitik = MARGIN + 90;
    const xNilai = xTitik + 10;
    for (const [label, nilai] of rows) {
      teks(label, xLabel, { size: 10 });
      teks(':', xTitik, { size: 10 });
      const baris = wrapText(nilai, font, 10, PAGE_W - MARGIN - xNilai);
      baris.forEach((b, i) => {
        if (i > 0) y -= 13;
        teks(b, xNilai, { size: 10 });
      });
      y -= 16;
    }
  };

  // ---------- Kop surat ----------
  const absLogo = path.resolve(__dirname, '../../assets/logo_surat.png');
  if (fs.existsSync(absLogo)) {
    try {
      const logo = await pdf.embedPng(fs.readFileSync(absLogo));
      const lw = 80;
      const lh = (logo.height / logo.width) * lw;
      const kopH = 58;
      page.drawImage(logo, { x: MARGIN, y: y - lh + (lh - kopH) / 2, width: lw, height: lh });
    } catch {
      // abaikan bila logo gagal dimuat
    }
  }

  teksTengah('KEMENTERIAN KEUANGAN REPUBLIK INDONESIA', { font: fontBold, size: 11 });
  y -= 14;
  teksTengah('BADAN PENDIDIKAN DAN PELATIHAN KEUANGAN', { font: fontBold, size: 11 });
  y -= 13;
  teksTengah('SEKRETARIAT BADAN', { font: fontBold, size: 10 });
  y -= 12;
  teksTengah(
    'GEDUNG ARIMURTI LANTAI 3, JALAN PURNAWARMAN NOMOR 99 KEBAYORAN BARU, JAKARTA SELATAN 12110',
    { size: 6.5, color: abu }
  );
  y -= 9;
  teksTengah('TELEPON (021) 7394666, 7204131; FAKSIMILE (021) 7261775; SITUS: www.bppk.kemenkeu.go.id', {
    size: 6.5,
    color: abu,
  });
  y -= 10;
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 1.2, color: hitam });
  y -= 22;

  // ---------- Judul ----------
  teksTengah('SURAT PERNYATAAN PENGEMBALIAN BMN', { font: fontBold, size: 12 });
  y -= 15;
  teksTengah(nomorSurat(peminjaman), { font: fontBold, size: 11 });
  y -= 26;

  // ---------- Identitas penerima (petugas BMN) ----------
  const petugas = env.petugasBmn || {};
  teks('Yang bertanda tangan di bawah ini:', MARGIN, { size: 10 });
  y -= 18;
  blokIdentitas([
    ['nama', petugas.nama || '-'],
    ['NIP', petugas.nip || '-'],
    ['unit kerja', petugas.unitKerja || '-'],
    ['bagian', petugas.bagian || '-'],
  ]);
  y -= 4;

  // ---------- Identitas pegawai (peminjam) ----------
  const u = peminjaman.peminjam || {};
  teks('telah menerima pengembalian BMN dari pegawai', MARGIN, { size: 10 });
  y -= 18;
  blokIdentitas([
    ['nama', u.nama || '-'],
    ['NIP', u.nip || '-'],
    ['unit kerja', u.unitKerjaPegawai || u.unitKerja || '-'],
    ['bagian', u.jabatanPegawai || u.jabatan || '-'],
  ]);
  y -= 4;
  teks('berupa :', MARGIN, { size: 10 });
  y -= 18;

  // ---------- Tabel barang ----------
  const kolom = [
    { judul: 'No', w: 26, key: 'no', align: 'center' },
    { judul: 'Nama Barang', w: 100, key: 'nama' },
    { judul: 'Merk dan Tipe', w: 120, key: 'merk' },
    { judul: 'NUP', w: 40, key: 'nup', align: 'center' },
    { judul: 'Jumlah (unit)', w: 47, key: 'jumlah', align: 'center' },
    { judul: 'Kondisi', w: 55, key: 'kondisi', align: 'center' },
    { judul: 'Status Join Domain', w: CONTENT_W - (26 + 100 + 120 + 40 + 47 + 55), key: 'join' },
  ];
  const sizeTabel = 8;
  const padX = 3;
  const padY = 4;
  const lineH = 10;

  const barisData = (peminjaman.detail || []).map((d, i) => {
    const b = d.barang || {};
    return {
      no: String(i + 1),
      nama: b.nama || '-',
      merk: b.merk || '-',
      nup: String(b.kodeBarang || '').split('-').pop() || '-',
      jumlah: String(d.jumlahPinjam ?? '-'),
      kondisi: LABEL_KONDISI[b.kondisi] || b.kondisi || '-',
      join: '',
    };
  });

  const gambarBarisTabel = (sel, header = false) => {
    const f = header ? fontBold : font;
    const selBaris = kolom.map((c) => wrapText(sel[c.key], f, sizeTabel, c.w - padX * 2));
    const maksBaris = Math.max(...selBaris.map((l) => l.length));
    const tinggi = maksBaris * lineH + padY * 2;
    pastikanRuang(tinggi);

    const yAtas = y;
    let x = MARGIN;
    kolom.forEach((c, idx) => {
      page.drawRectangle({
        x,
        y: yAtas - tinggi,
        width: c.w,
        height: tinggi,
        borderColor: hitam,
        borderWidth: 0.7,
      });
      const lines = selBaris[idx];
      lines.forEach((ln, li) => {
        const tw = f.widthOfTextAtSize(ln, sizeTabel);
        let tx = x + padX;
        if (c.align === 'center') tx = x + (c.w - tw) / 2;
        page.drawText(ln, { x: tx, y: yAtas - padY - sizeTabel - li * lineH, size: sizeTabel, font: f, color: hitam });
      });
      x += c.w;
    });
    y = yAtas - tinggi;
  };

  // header
  gambarBarisTabel(
    kolom.reduce((acc, c) => ({ ...acc, [c.key]: c.judul }), {}),
    true
  );
  if (barisData.length === 0) {
    gambarBarisTabel({ no: '', nama: '', merk: '', nup: '', jumlah: '', kondisi: '', join: '' });
  } else {
    barisData.forEach((r) => gambarBarisTabel(r));
  }
  y -= 26;

  // ---------- Penutup ----------
  pastikanRuang(30);
  for (const ln of wrapText(
    'Demikian Surat Pernyataan ini dibuat, agar digunakan sebagaimana mestinya.',
    font,
    10,
    CONTENT_W
  )) {
    teks(ln, MARGIN, { size: 10 });
    y -= 14;
  }
  y -= 26;

  // ---------- Blok tanda tangan (kanan) ----------
  // Sesuai templat: "Jakarta," / "Yang menerima BMN," / (ruang) /
  // "Ditandatangani secara elektronik" (abu) / Nama / NIP penerima BMN.
  const abuTtd = rgb(0.749, 0.749, 0.749); // BFBFBF — warna teks tanda tangan elektronik pada templat
  pastikanRuang(100);
  const blokKiri = PAGE_W - MARGIN - 200;
  teks('Jakarta,', blokKiri, { size: 10 });
  y -= 14;
  teks('Yang menerima BMN,', blokKiri, { size: 10 });
  y -= 46; // ruang tanda tangan elektronik
  teks('Ditandatangani secara elektronik', blokKiri, { size: 9, color: abuTtd });
  y -= 13;
  teks(petugas.nama || 'Petugas BMN', blokKiri, { font: fontBold, size: 10 });
  y -= 14;
  teks(`NIP ${petugas.nip || '-'}`, blokKiri, { size: 10 });

  const bytes = await pdf.save();
  return bufferKeDataUrl(Buffer.from(bytes), 'application/pdf');
}

module.exports = { generate, nomorSurat };
