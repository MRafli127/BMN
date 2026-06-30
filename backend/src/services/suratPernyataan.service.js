// ============================================================
//  Generator Surat Pernyataan Peminjaman BMN (PDF, pdf-lib).
//  Surat ini DITAMPILKAN sebagai pratinjau, lalu DIUNDUH &
//  DICETAK peminjam untuk ditandatangani secara FISIK. Karena
//  itu blok tanda tangan dibiarkan kosong (bukan tanda tangan
//  elektronik). Hasil dikembalikan sebagai data URL (PDF).
// ============================================================

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const path = require('path');
const fs = require('fs');
const { bufferKeDataUrl } = require('../utils/fileData');
const { formatTanggalSaja } = require('../utils/formatTanggal');

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;

const LABEL_KONDISI = {
  BAIK: 'Baik',
  RUSAK_RINGAN: 'Rusak Ringan',
  RUSAK_BERAT: 'Rusak Berat',
};

const POIN_PERNYATAAN = [
  'menggunakan BMN dalam rangka melaksanakan tugas dan fungsi;',
  'menjaga dan memelihara BMN;',
  'melaporkan kepada atasan langsung jika BMN rusak/hilang;',
  'memperbaiki jika BMN yang dipinjam rusak selama jangka waktu peminjaman;',
  'mengganti jika BMN yang dipinjam hilang selama jangka waktu peminjaman; dan',
  'mengembalikan BMN yang dipinjam sesuai dengan kondisi semula apabila ditugaskan ke unit kerja lain (mutasi)/jangka waktu peminjaman BMN berakhir.',
];

// Pecah teks menjadi baris-baris agar muat dalam maxWidth.
function wrapText(text, font, size, maxWidth) {
  const hasil = [];
  const kata = String(text ?? '').split(/\s+/).filter(Boolean);
  let baris = '';
  for (let w of kata) {
    // Pecah paksa kata yang lebih panjang dari kolom.
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
  // Kode mengikuti kode barang terkini (kunci natural); seq = segmen terakhir (NUP).
  const kode =
    peminjaman.detail?.find((d) => d.barang)?.barang?.kodeBarang || peminjaman.kodePeminjaman || '';
  const seq = String(kode).split('-').pop() || '0000';
  const tahun = new Date(peminjaman.tanggalPengajuan || Date.now()).getFullYear();
  return `PRN-${seq}/BMN/PP.1/${tahun}`;
}

// Decode base64 signature image
async function loadSignatureImage(pdf, signatureDataUrl) {
  if (!signatureDataUrl || !signatureDataUrl.startsWith('data:image/png;base64,')) {
    return null;
  }
  try {
    const base64Data = signatureDataUrl.replace('data:image/png;base64,', '');
    const imageBytes = Buffer.from(base64Data, 'base64');
    return await pdf.embedPng(imageBytes);
  } catch (err) {
    console.error('Gagal embed signature:', err);
    return null;
  }
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

  // ---------- Kop surat ----------
  const absLogo = path.resolve(__dirname, '../../assets/logo_surat.png');
  if (fs.existsSync(absLogo)) {
    try {
      const logo = await pdf.embedPng(fs.readFileSync(absLogo));
      const lw = 80;
      const lh = (logo.height / logo.width) * lw;
      // pusatkan logo secara vertikal terhadap blok kop surat (tinggi ±58pt)
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
  teksTengah('SEKRETARIAT BADAN PENDIDIKAN DAN PELATIHAN KEUANGAN', { font: fontBold, size: 10 });
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
  teksTengah('SURAT PERNYATAAN PEMINJAMAN BARANG MILIK NEGARA', { font: fontBold, size: 11 });
  y -= 14;
  teksTengah(`NOMOR ${nomorSurat(peminjaman)}`, { font: fontBold, size: 11 });
  y -= 26;

  // ---------- Identitas ----------
  const u = peminjaman.peminjam || {};
  teks('Yang bertanda tangan di bawah ini:', MARGIN, { size: 10 });
  y -= 18;

  const identitas = [
    ['Nama', u.nama || '-'],
    ['NIP', u.nip || '-'],
    ['Eselon IV', u.jabatan || '-'],
    ['Eselon III', u.unitKerja || '-'],
  ];
  const xLabel = MARGIN;
  const xTitik = MARGIN + 90;
  const xNilai = xTitik + 10;
  for (const [label, nilai] of identitas) {
    teks(label, xLabel, { size: 10 });
    teks(':', xTitik, { size: 10 });
    const baris = wrapText(nilai, font, 10, PAGE_W - MARGIN - xNilai);
    baris.forEach((b, i) => {
      if (i > 0) y -= 13;
      teks(b, xNilai, { size: 10 });
    });
    y -= 16;
  }
  y -= 4;
  teks('melakukan peminjaman BMN dengan perincian data:', MARGIN, { size: 10 });
  y -= 18;

  // ---------- Tabel barang ----------
  const kolom = [
    { judul: 'No.', w: 26, key: 'no', align: 'center' },
    { judul: 'Nama Barang', w: 100, key: 'nama' },
    { judul: 'Merek dan Tipe', w: 120, key: 'merk' },
    { judul: 'NUP', w: 40, key: 'nup', align: 'center' },
    { judul: 'Jumlah (unit)', w: 47, key: 'jumlah', align: 'center' },
    { judul: 'Kondisi', w: 55, key: 'kondisi', align: 'center' },
    { judul: 'Status Join Domain**', w: CONTENT_W - (26 + 100 + 120 + 40 + 47 + 55), key: 'join' },
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
    // Hitung tinggi baris dari sel terpanjang.
    const selBaris = kolom.map((c) => wrapText(sel[c.key], f, sizeTabel, c.w - padX * 2));
    const maksBaris = Math.max(...selBaris.map((l) => l.length));
    const tinggi = maksBaris * lineH + padY * 2;
    pastikanRuang(tinggi);

    const yAtas = y;
    let x = MARGIN;
    kolom.forEach((c, idx) => {
      // border sel
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
  y -= 22;

  // ---------- Pernyataan ----------
  pastikanRuang(40);
  for (const ln of wrapText(
    'dengan ini menyatakan bahwa dalam rangka peminjaman Barang Milik Negara, akan:',
    font,
    10,
    CONTENT_W
  )) {
    teks(ln, MARGIN, { size: 10 });
    y -= 14;
  }
  y -= 4;

  const xNomor = MARGIN + 6;
  const xPoin = MARGIN + 24;
  POIN_PERNYATAAN.forEach((poin, i) => {
    const baris = wrapText(poin, font, 10, PAGE_W - MARGIN - xPoin);
    pastikanRuang(baris.length * 14 + 4);
    teks(`${i + 1}.`, xNomor, { size: 10 });
    baris.forEach((b, li) => {
      if (li > 0) y -= 13;
      teks(b, xPoin, { size: 10 });
    });
    y -= 16;
  });
  y -= 6;

  pastikanRuang(30);
  for (const ln of wrapText(
    'Demikian pernyataan ini kami buat dengan sebenar-benarnya untuk dipergunakan sebagaimana mestinya.',
    font,
    10,
    CONTENT_W
  )) {
    teks(ln, MARGIN, { size: 10 });
    y -= 14;
  }
  y -= 16;

  // ---------- Blok tanda tangan (kanan) ----------
  // Signature digital di-embed ke PDF jika tersedia
  const SIG_AREA_H = 60;
  pastikanRuang(SIG_AREA_H + 70);
  const blokKiri = PAGE_W - MARGIN - 200;
  const tanggal = formatTanggalSaja(peminjaman.tanggalPengajuan || new Date());
  teks(`Jakarta, ${tanggal}`, blokKiri, { size: 10 });
  y -= 14;
  teks('Peminjam BMN', blokKiri, { size: 10 });
  y -= 8;

  // Load dan embed signature jika ada
  const signatureImage = await loadSignatureImage(pdf, peminjaman.signatureDataUrl);
  const garisY = y - (signatureImage ? 70 : SIG_AREA_H);
  y = garisY;

  // Gambar garis untuk tanda tangan
  page.drawLine({ start: { x: blokKiri, y }, end: { x: blokKiri + 190, y }, thickness: 0.8, color: hitam });
  y -= 14;

  // Embed signature image jika ada
  if (signatureImage) {
    const maxSigW = 120;
    const maxSigH = 45;
    const sigScale = Math.min(maxSigW / signatureImage.width, maxSigH / signatureImage.height);
    const sigW = signatureImage.width * sigScale;
    const sigH = signatureImage.height * sigScale;
    page.drawImage(signatureImage, { x: blokKiri, y: y - sigH, width: sigW, height: sigH });
    y -= sigH + 5;
  }

  teks(u.nama || 'Peminjam BMN', blokKiri, { font: fontBold, size: 10 });
  y -= 14;
  teks('Tanda tangan & nama jelas', blokKiri, { font: fontItalic, size: 8, color: abu });
  y -= 22;

  // ---------- Catatan kaki ----------
  page.drawText('**diisi khusus BMN berupa Laptop/Tablet/PC', {
    x: MARGIN,
    y: MARGIN - 6,
    size: 8,
    font: fontItalic,
    color: abu,
  });

  const bytes = await pdf.save();
  return bufferKeDataUrl(Buffer.from(bytes), 'application/pdf');
}

module.exports = { generate, nomorSurat };
