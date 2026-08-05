// ============================================================
//  Generator Surat Pernyataan Peminjaman BMN (PDF, pdf-lib).
//  Tata letak, font, ukuran, margin, dan susunan dibuat SAMA PERSIS dengan
//  templat resmi backend/assets/Surat-Pernyataan-Peminjaman-BMN.docx:
//    - Font: Arial (di-embed dari assets/fonts/Arial*.ttf; jika berkas font
//      tidak ada — mis. lingkungan tanpa font — otomatis fallback ke Helvetica
//      yang metriknya setara Arial).
//    - Ukuran isi surat: 11pt (mengikuti default templat: w:sz 22 half-point).
//    - Kop: KEMENTERIAN 13pt bold, BADAN/SEKRETARIAT 11pt bold, alamat 7pt.
//    - Ukuran halaman A4 & margin (kiri 1418, kanan 1134, atas 1134,
//      bawah 709 twips) mengikuti sectPr templat.
//    - Lebar kolom tabel mengikuti tblGrid templat.
//
//  Surat DITAMPILKAN sebagai pratinjau, lalu DIUNDUH & DICETAK/ditandatangani
//  peminjam. Blok tanda tangan memakai keterangan "Ditandatangani secara
//  elektronik" (abu #BFBFBF) sesuai templat. Nomor surat berurut otomatis per
//  tahun (lihat nomorSurat.service). Hasil dikembalikan sebagai data URL (PDF).
// ============================================================

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const path = require('path');
const fs = require('fs');
const { bufferKeDataUrl } = require('../utils/fileData');
const { formatTanggalSaja } = require('../utils/formatTanggal');
const { wrapText, adalahCheckmark, gambarCheckbox } = require('../utils/pdfHelper');
const { LABEL_KONDISI } = require('../constants');
const nomorSuratService = require('./nomorSurat.service');

// Ukuran halaman A4 & margin sesuai sectPr templat (twips -> pt, 1pt = 20 twips).
const PAGE_W = 595.28; // 11906 twips
const PAGE_H = 841.89; // 16838 twips
const MARGIN_L = 70.9; // 1418 twips
const MARGIN_R = 56.7; // 1134 twips
const MARGIN_T = 56.7; // 1134 twips
const MARGIN_B = 35.45; // 709 twips
const RIGHT_EDGE = PAGE_W - MARGIN_R;
const CONTENT_W = RIGHT_EDGE - MARGIN_L;

// Ukuran isi surat (default templat w:sz 22 = 11pt).
const SIZE = 11;
const LINE = 15; // tinggi baris untuk teks 11pt (spasi tunggal + sedikit lega)

const POIN_PERNYATAAN = [
  'menggunakan BMN dalam rangka melaksanakan tugas dan fungsi;',
  'menjaga dan memelihara BMN;',
  'melaporkan kepada atasan langsung jika BMN rusak/hilang;',
  'memperbaiki jika BMN yang dipinjam rusak selama jangka waktu peminjaman;',
  'mengganti jika BMN yang dipinjam hilang selama jangka waktu peminjaman; dan',
  'mengembalikan BMN yang dipinjam sesuai dengan kondisi semula apabila ditugaskan ke unit kerja lain (mutasi)/jangka waktu peminjaman BMN berakhir.',
];

// Nomor surat: pakai nomor tersimpan (nomorSurat/tahunSurat) bila ada;
// saat pratinjau nilai tersebut diisi hasil "intip" di peminjaman.service.
function nomorSurat(peminjaman) {
  const tahun =
    peminjaman.tahunSurat ||
    new Date(peminjaman.tanggalPengajuan || Date.now()).getFullYear();
  return nomorSuratService.formatPeminjaman(peminjaman.nomorSurat, tahun);
}

// Susun "Unit Kerja" lengkap mulai dari Eselon IV, III, dst. (sesuai catatan templat).
function unitKerjaLengkap(u) {
  const bagian = [u.eselon4, u.eselon3, u.eselon2].map((x) => (x || '').trim()).filter(Boolean);
  if (bagian.length) return bagian.join(', ');
  return u.unitKerja || u.eselon3 || '-';
}

// Muat font Arial dari assets; fallback Helvetica bila berkas tak tersedia.
async function muatFont(pdf) {
  const dirFont = path.resolve(__dirname, '../../assets/fonts');
  const reg = path.join(dirFont, 'Arial.ttf');
  const bold = path.join(dirFont, 'Arial-Bold.ttf');

  // Cek keberadaan kedua file sekaligus
  if (fs.existsSync(reg) && fs.existsSync(bold)) {
    try {
      pdf.registerFontkit(fontkit);
      const font = await pdf.embedFont(fs.readFileSync(reg), { subset: true });
      const fontBold = await pdf.embedFont(fs.readFileSync(bold), { subset: true });
      return { font, fontBold };
    } catch {
      // gagal memuat Arial -> pakai fallback
    }
  }

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  return { font, fontBold };
}

async function generate(peminjaman) {
  const pdf = await PDFDocument.create();
  const { font, fontBold } = await muatFont(pdf);
  const hitam = rgb(0, 0, 0);
  const abu = rgb(0.35, 0.35, 0.35); // alamat kop
  const abuTtd = rgb(0.749, 0.749, 0.749); // BFBFBF — "Ditandatangani secara elektronik" sesuai templat

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN_T;

  const tambahHalaman = () => {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN_T;
  };
  const pastikanRuang = (butuh) => {
    if (y - butuh < MARGIN_B) tambahHalaman();
  };

  const teks = (str, x, opt = {}) => {
    const f = opt.font || font;
    const size = opt.size || SIZE;
    page.drawText(String(str ?? ''), { x, y: y - size, size, font: f, color: opt.color || hitam });
  };
  // Rata tengah pada rentang [opt.kiri, opt.kanan] (default: seluruh lebar halaman).
  const teksTengah = (str, opt = {}) => {
    const f = opt.font || font;
    const size = opt.size || SIZE;
    const w = f.widthOfTextAtSize(String(str ?? ''), size);
    const kiri = opt.kiri ?? 0;
    const kanan = opt.kanan ?? PAGE_W;
    teks(str, kiri + (kanan - kiri - w) / 2, opt);
  };

  // ---------- Kop surat ----------
  // Teks kop dipusatkan pada area DI KANAN logo agar tidak menabrak logo.
  const LOGO_W = 80;
  const kopKiri = MARGIN_L + LOGO_W + 8; // batas kiri area teks kop (setelah logo + jarak)
  const absLogo = path.resolve(__dirname, '../../assets/logo_surat.png');
  if (fs.existsSync(absLogo)) {
    try {
      const logo = await pdf.embedPng(fs.readFileSync(absLogo));
      const lh = (logo.height / logo.width) * LOGO_W;
      // pusatkan logo secara vertikal terhadap blok kop surat (tinggi ±60pt)
      const kopH = 60;
      page.drawImage(logo, { x: MARGIN_L, y: y - lh + (lh - kopH) / 2, width: LOGO_W, height: lh });
    } catch {
      // abaikan bila logo gagal dimuat
    }
  }

  teksTengah('KEMENTERIAN KEUANGAN REPUBLIK INDONESIA', { font: fontBold, size: 13, kiri: kopKiri, kanan: RIGHT_EDGE });
  y -= 16;
  teksTengah('BADAN PENDIDIKAN DAN PELATIHAN KEUANGAN', { font: fontBold, size: 11, kiri: kopKiri, kanan: RIGHT_EDGE });
  y -= 14;
  teksTengah('SEKRETARIAT BADAN PENDIDIKAN DAN PELATIHAN KEUANGAN', { font: fontBold, size: 11, kiri: kopKiri, kanan: RIGHT_EDGE });
  y -= 12;
  teksTengah(
    'GEDUNG ARIMURTI LANTAI 3, JALAN PURNAWARMAN NOMOR 99 KEBAYORAN BARU, JAKARTA SELATAN 12110',
    { size: 7, color: abu, kiri: kopKiri, kanan: RIGHT_EDGE }
  );
  y -= 9;
  teksTengah('TELEPON (021) 7394666, 7204131; FAKSIMILE (021) 7261775; SITUS: www.bppk.kemenkeu.go.id', {
    size: 7,
    color: abu,
    kiri: kopKiri,
    kanan: RIGHT_EDGE,
  });
  y -= 11;
  page.drawLine({ start: { x: MARGIN_L, y }, end: { x: RIGHT_EDGE, y }, thickness: 1.2, color: hitam });
  y -= 26;

  // ---------- Judul ---------- (templat: 11pt, tidak bold, rata tengah)
  teksTengah('SURAT PERNYATAAN PEMINJAMAN BARANG MILIK NEGARA', { size: SIZE });
  y -= LINE;
  teksTengah(`NOMOR ${nomorSurat(peminjaman)}`, { size: SIZE });
  y -= 28;

  // ---------- Identitas peminjam ----------
  const u = peminjaman.peminjam || {};
  teks('Yang bertanda tangan di bawah ini:', MARGIN_L);
  y -= 20;

  const identitas = [
    ['Nama', u.nama || '-'],
    ['NIP', u.nip || '-'],
    ['Pangkat/Gol.', u.pangkatGolongan || '-'],
    ['Unit Kerja', unitKerjaLengkap(u)],
  ];
  const xLabel = MARGIN_L;
  const xTitik = MARGIN_L + 95;
  const xNilai = xTitik + 12;
  for (const [label, nilai] of identitas) {
    teks(label, xLabel);
    teks(':', xTitik);
    const baris = wrapText(nilai, font, SIZE, RIGHT_EDGE - xNilai);
    baris.forEach((b, i) => {
      if (i > 0) y -= 14;
      teks(b, xNilai);
    });
    y -= 18;
  }
  y -= 4;
  teks('melakukan peminjaman BMN dengan perincian data:', MARGIN_L);
  y -= 20;

  // ---------- Tabel barang ---------- (lebar kolom mengikuti tblGrid templat, twips/20)
  const kolom = [
    // Lebar dasar mengikuti tblGrid templat; kolom "Jumlah" & "Kondisi"
    // sedikit dilebarkan (mengambil ruang dari Nama/Merek yang longgar) agar
    // judulnya tidak terpotong di tengah kata (mis. "Jumla"+"h", "Kondis"+"i").
    { judul: 'No.', w: 28.1, key: 'no', align: 'center' },
    { judul: 'Nama Barang', w: 124.6, key: 'nama', align: 'center' },
    { judul: 'Merek dan Tipe', w: 117.5, key: 'merk', align: 'center' },
    { judul: 'NUP', w: 35.4, key: 'nup', align: 'center' },
    { judul: 'Jumlah (unit)', w: 46, key: 'jumlah', align: 'center' },
    { judul: 'Kondisi', w: 48.55, key: 'kondisi', align: 'center' },
    { judul: 'Status Join Domain**', w: CONTENT_W - (28.1 + 124.6 + 117.5 + 35.4 + 46 + 48.55), key: 'join', align: 'center' },
  ];
  const sizeTabel = SIZE;
  const padX = 3;
  const padY = 5;
  const lineH = 13;

  const barisData = (peminjaman.detail || []).map((d, i) => {
    const b = d.barang || {};
    return {
      no: String(i + 1),
      nama: b.nama || '-',
      merk: b.merk || '-',
      nup: String(b.kodeBarang || '').split('-').pop() || '-',
      jumlah: String(d.jumlahPinjam ?? '-'),
      kondisi: LABEL_KONDISI[b.kondisi] || b.kondisi || '-',
      join: '✓',
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
    let x = MARGIN_L;
    kolom.forEach((c, idx) => {
      // border sel (isian putih untuk header, sesuai shd FFFFFF templat)
      page.drawRectangle({
        x,
        y: yAtas - tinggi,
        width: c.w,
        height: tinggi,
        borderColor: hitam,
        borderWidth: 0.7,
        color: rgb(1, 1, 1),
      });
      const lines = selBaris[idx];
      lines.forEach((ln, li) => {
        // Jika checkmark, gambar checkbox dengan border dan centang
        if (c.key === 'join' && ln === '✓') {
          gambarCheckbox(page, x, yAtas - tinggi, c.w, tinggi);
        } else {
          const tw = f.widthOfTextAtSize(ln, sizeTabel);
          let tx = x + padX;
          if (c.align === 'center') tx = x + (c.w - tw) / 2;
          page.drawText(ln, { x: tx, y: yAtas - padY - sizeTabel - li * lineH, size: sizeTabel, font: f, color: hitam });
        }
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
    // tiga baris kosong seperti templat
    for (let i = 0; i < 3; i += 1) {
      gambarBarisTabel({ no: '', nama: '', merk: '', nup: '', jumlah: '', kondisi: '', join: '' });
    }
  } else {
    barisData.forEach((r) => gambarBarisTabel(r));
  }
  y -= 24;

  // ---------- Pernyataan ----------
  pastikanRuang(40);
  for (const ln of wrapText(
    'dengan ini menyatakan bahwa dalam rangka peminjaman Barang Milik Negara, akan:',
    font,
    SIZE,
    CONTENT_W
  )) {
    teks(ln, MARGIN_L);
    y -= LINE;
  }
  y -= 4;

  const xNomor = MARGIN_L + 8;
  const xPoin = MARGIN_L + 28;
  POIN_PERNYATAAN.forEach((poin, i) => {
    const baris = wrapText(poin, font, SIZE, RIGHT_EDGE - xPoin);
    pastikanRuang(baris.length * LINE + 4);
    teks(`${i + 1}.`, xNomor);
    baris.forEach((b, li) => {
      if (li > 0) y -= 14;
      teks(b, xPoin);
    });
    y -= 18;
  });
  y -= 6;

  pastikanRuang(30);
  for (const ln of wrapText(
    'Demikian pernyataan ini kami buat dengan sebenar-benarnya untuk dipergunakan sebagaimana mestinya.',
    font,
    SIZE,
    CONTENT_W
  )) {
    teks(ln, MARGIN_L);
    y -= LINE;
  }
  y -= 18;

  // ---------- Blok tanda tangan (kanan) ----------
  // Sesuai templat: "Jakarta, <tanggal>" / "Peminjam BMN" / (ruang) /
  // "Ditandatangani secara elektronik" (abu #BFBFBF) / Nama Lengkap.
  pastikanRuang(96);
  const blokKiri = RIGHT_EDGE - 210;
  const tanggal = formatTanggalSaja(peminjaman.tanggalPengajuan || new Date());
  teks(`Jakarta, ${tanggal}`, blokKiri);
  y -= LINE;
  teks('Peminjam BMN', blokKiri);
  y -= LINE * 5; // 5 baris kosong (ruang tanda tangan) sebelum keterangan elektronik
  teks('Ditandatangani secara elektronik', blokKiri, { size: SIZE, color: abuTtd });
  y -= LINE;
  teks(u.nama || 'Nama Lengkap', blokKiri);
  y -= 24;

  // ---------- Catatan kaki ----------
  page.drawText('**diisi khusus BMN berupa Laptop/Tablet/PC', {
    x: MARGIN_L,
    y: MARGIN_B - 6,
    size: SIZE,
    font,
    color: hitam,
  });

  const bytes = await pdf.save();
  return bufferKeDataUrl(Buffer.from(bytes), 'application/pdf');
}

module.exports = { generate, nomorSurat };
