// ============================================================
//  Generator Surat Pernyataan Pengembalian BMN (PDF, pdf-lib).
//  Tata letak, font, ukuran, dan susunan dibuat SAMA dengan templat resmi
//  backend/assets/Surat-Pengembalian-BMN.docx:
//    - Font: Arial (di-embed dari assets/fonts/Arial*.ttf; bila berkas font
//      tidak ada — mis. lingkungan tanpa font — otomatis fallback ke Helvetica
//      yang metriknya setara Arial).
//    - Ukuran isi surat: 11pt (mengikuti default templat: w:sz 22 half-point).
//      Judul & nomor surat 12pt bold (w:sz 24).
//    - Halaman A4 & margin mengikuti sectPr templat.
//    - Lebar kolom tabel mengikuti tblGrid templat.
//
//  ATURAN TANDA TANGAN:
//  - Peminjam dari IMPORT → Yang menerima BMN = Petugas BMN statis (Taufan)
//  - Peminjam dari MANUAL/registrasi → Yang menerima BMN = Admin yang ACC
//
//  Nomor surat memakai nomor & tahun yang sama dengan surat peminjamannya
//  (satu transaksi = satu nomor PRN yang ditetapkan saat pengajuan dibuat),
//  hanya beda format: "PRN-<nomor>/BMN/<tahun>" (tanpa segmen "PP.1"). Nomor
//  berjalan 1, 2, 3, ... per tahun dan RESET ke 1 saat berganti tahun (lihat
//  nomorSurat.service). Hasil dikembalikan sebagai data URL (PDF).
// ============================================================

const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const path = require('path');
const fs = require('fs');
const { bufferKeDataUrl } = require('../utils/fileData');
const { formatTanggalSaja } = require('../utils/formatTanggal');
const { wrapText } = require('../utils/pdfHelper');
const { LABEL_KONDISI } = require('../constants');
const nomorSuratService = require('./nomorSurat.service');
const env = require('../config/env');

// Ukuran halaman A4 & margin sesuai sectPr templat (twips -> pt, 1pt = 20 twips).
const PAGE_W = 595.28; // 11906 twips
const PAGE_H = 841.89; // 16838 twips
const MARGIN_L = 62.95; // 1259 twips
const MARGIN_R = 53.85; // 1077 twips
const MARGIN_T = 56.7; //  ruang kop surat (kop digambar di body, bukan header)
const MARGIN_B = 35.45; // 709 twips
const RIGHT_EDGE = PAGE_W - MARGIN_R;
const CONTENT_W = RIGHT_EDGE - MARGIN_L;

// Ukuran isi surat (default templat w:sz 22 = 11pt); judul/nomor 12pt (w:sz 24).
const SIZE = 11;
const SIZE_JUDUL = 12;
const LINE = 15; // tinggi baris untuk teks 11pt (spasi tunggal + sedikit lega)

// Helper: cek apakah teks adalah checkmark
function adalahCheckmark(str) {
  return str === '✓' || str === 'V';
}

// Nomor surat: pakai nomor tersimpan (nomorSurat/tahunSurat) bila ada.
// Satu transaksi peminjaman memakai satu nomor PRN yang sama untuk surat
// peminjaman & pengembalian; format pengembalian tanpa segmen "PP.1".
function nomorSurat(peminjaman) {
  const tahun =
    peminjaman.tahunSurat ||
    new Date(peminjaman.tanggalPengajuan || Date.now()).getFullYear();
  return nomorSuratService.formatPengembalian(peminjaman.nomorSurat, tahun);
}

// Muat font Arial dari assets; fallback Helvetica bila berkas tak tersedia.
async function muatFont(pdf) {
  const dirFont = path.resolve(__dirname, '../../assets/fonts');
  const reg = path.join(dirFont, 'Arial.ttf');
  const bold = path.join(dirFont, 'Arial-Bold.ttf');

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

  // Gambar checkbox dengan border dan centang ✓
  // Style: 18x18px border 1.5px solid #000, checkmark di tengah
  const gambarCheckbox = (selX, selY, selW, selH) => {
    const boxSize = 18;
    const cx = selX + selW / 2; // center x sel
    const cy = selY + selH / 2; // center y sel
    const boxX = cx - boxSize / 2;
    const boxY = cy - boxSize / 2;

    // Kotak checkbox dengan border 1.5px
    page.drawRectangle({
      x: boxX,
      y: boxY,
      width: boxSize,
      height: boxSize,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1.5,
      color: rgb(1, 1, 1),
    });

    // Checkmark ✓ di tengah kotak (diagonal line 1: bottom-left ke top-right)
    const ckL = 4;  // offset kiri
    const ckR = 14; // offset kanan
    const ckBot = 5; // offset bawah
    const ckTop = 13; // offset atas
    const ckMid = 8; // titik tengah-y

    // Garis 1: dari kiri-bawah ke tengah
    page.drawLine({
      start: { x: boxX + ckL, y: boxY + ckBot },
      end: { x: boxX + ckMid, y: boxY + ckTop },
      thickness: 1.8,
      color: rgb(0, 0, 0),
    });
    // Garis 2: dari tengah ke kanan-atas
    page.drawLine({
      start: { x: boxX + ckMid, y: boxY + ckTop },
      end: { x: boxX + ckR, y: boxY + ckBot },
      thickness: 1.8,
      color: rgb(0, 0, 0),
    });
  };

  // Blok identitas: "label : nilai" (dengan wrap pada kolom nilai).
  const blokIdentitas = (rows) => {
    const xLabel = MARGIN_L;
    const xTitik = MARGIN_L + 95;
    const xNilai = xTitik + 12;
    for (const [label, nilai] of rows) {
      teks(label, xLabel);
      teks(':', xTitik);
      const baris = wrapText(nilai, font, SIZE, RIGHT_EDGE - xNilai);
      baris.forEach((b, i) => {
        if (i > 0) y -= 14;
        teks(b, xNilai);
      });
      y -= 18;
    }
  };

  // ---------- Kop surat ----------
  // Teks kop dipusatkan pada area DI KANAN logo agar tidak menabrak logo.
  const LOGO_W = 80;
  const kopKiri = MARGIN_L + LOGO_W + 8;
  const absLogo = path.resolve(__dirname, '../../assets/logo_surat.png');
  if (fs.existsSync(absLogo)) {
    try {
      const logo = await pdf.embedPng(fs.readFileSync(absLogo));
      const lh = (logo.height / logo.width) * LOGO_W;
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

  // ---------- Judul ---------- (templat: 12pt bold, rata tengah)
  teksTengah('SURAT PERNYATAAN PENGEMBALIAN BMN', { font: fontBold, size: SIZE_JUDUL });
  y -= LINE + 3;
  teksTengah(nomorSurat(peminjaman), { font: fontBold, size: SIZE_JUDUL });
  y -= 28;

  // ---------- Identitas penanda tangan ----------
  // ATURAN:
  // - Peminjam dari IMPORT → Yang menerima BMN = Petugas BMN statis (Taufan)
  // - Peminjam dari MANUAL/registrasi → Yang menerima BMN = Admin yang ACC
  const peminjam = peminjaman.peminjam;
  const adalahImport = peminjam?.sumber === 'IMPORT';

  let penandaTangan;
  if (adalahImport) {
    // Data import → tandatangan petugas BMN statis
    const pb = env.petugasBmn || {};
    penandaTangan = {
      nama: pb.nama || 'Taufan Sukma Nugraha',
      nip: pb.nip || '198605132007011001',
      unitKerja: pb.unitKerja || 'Sekretariat BPPK',
      bagian: pb.bagian || 'Umum',
    };
  } else {
    // Data manual/registrasi → tandatangan admin yang ACC
    const admin = peminjaman.admin;
    penandaTangan = {
      nama: admin?.nama || '-',
      nip: admin?.nip || '-',
      unitKerja: admin?.unitKerja || admin?.eselon3 || '-',
      bagian: admin?.jabatan || admin?.eselon4 || '-',
    };
  }
  teks('Yang bertandatangan di bawah ini:', MARGIN_L);
  y -= 20;
  blokIdentitas([
    ['nama', penandaTangan.nama],
    ['NIP', penandaTangan.nip],
    ['unit kerja', penandaTangan.unitKerja],
    ['bagian', penandaTangan.bagian],
  ]);
  y -= 4;

  // ---------- Identitas pegawai (peminjam) ----------
  const u = peminjaman.peminjam || {};
  teks('telah menerima pengembalian BMN dari pegawai', MARGIN_L);
  y -= 20;
  blokIdentitas([
    ['nama', u.nama || '-'],
    ['NIP', u.nip || '-'],
    ['unit kerja', u.unitKerja || u.eselon3 || '-'],
    ['bagian', u.jabatan || u.eselon4 || '-'],
  ]);
  y -= 4;
  teks('berupa :', MARGIN_L);
  y -= 20;

  // ---------- Tabel barang ---------- (lebar kolom mengikuti tblGrid templat, twips/20)
  const kolom = [
    { judul: 'No', w: 24.9, key: 'no', align: 'center' },
    { judul: 'Nama Barang', w: 104.9, key: 'nama', align: 'center' },
    { judul: 'Merk dan Tipe', w: 89.7, key: 'merk', align: 'center' },
    { judul: 'NUP', w: 36.25, key: 'nup', align: 'center' },
    { judul: 'Jumlah (unit)', w: 62.95, key: 'jumlah', align: 'center' },
    { judul: 'Kondisi', w: 82.45, key: 'kondisi', align: 'center' },
    { judul: 'Status Join Domain', w: CONTENT_W - (24.9 + 104.9 + 89.7 + 36.25 + 62.95 + 82.45), key: 'join', align: 'center' },
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
    const selBaris = kolom.map((c) => wrapText(sel[c.key], f, sizeTabel, c.w - padX * 2));
    const maksBaris = Math.max(...selBaris.map((l) => l.length));
    const tinggi = maksBaris * lineH + padY * 2;
    pastikanRuang(tinggi);

    const yAtas = y;
    let x = MARGIN_L;
    kolom.forEach((c, idx) => {
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
          gambarCheckbox(x, yAtas - tinggi, c.w, tinggi);
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
    SIZE,
    CONTENT_W
  )) {
    teks(ln, MARGIN_L);
    y -= LINE;
  }
  y -= 24;

  // ---------- Blok tanda tangan (kanan) ----------
  // Sesuai templat: "Jakarta, <tanggal hari ini>" / "Yang menerima BMN," /
  // (7 baris kosong untuk ruang tanda tangan) / "Ditandatangani secara
  // elektronik" (abu #BFBFBF) / Nama & NIP admin yang ACC.
  pastikanRuang(LINE * 12);
  const blokKanan = RIGHT_EDGE - 210;
  teks(`Jakarta, ${formatTanggalSaja(new Date())}`, blokKanan);
  y -= LINE;
  teks('Yang menerima BMN,', blokKanan);
  y -= LINE; //     pindah ke baris berikutnya
  y -= LINE * 7; // 7 baris kosong (ruang tanda tangan) sebelum keterangan elektronik
  teks('Ditandatangani secara elektronik ', blokKanan, { color: abuTtd });
  y -= LINE;
  teks(penandaTangan.nama, blokKanan);
  y -= LINE;
  teks(`NIP ${penandaTangan.nip}`, blokKanan);

  const bytes = await pdf.save();
  return bufferKeDataUrl(Buffer.from(bytes), 'application/pdf');
}

module.exports = { generate, nomorSurat };
