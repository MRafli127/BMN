// ============================================================
//  Service Import Barang dari Excel/CSV (khusus admin).
//
//  Tujuan: menjadikan file daftar aset (BMN) sebagai sumber
//  database permanen. Setiap baris file = satu unit barang
//  (jumlah 1). Re-import melakukan SINKRONISASI CERMIN:
//    - baris baru               -> ditambahkan
//    - baris yang sudah ada      -> diperbarui (bila ada perubahan)
//    - aset yang hilang dari file -> dihapus
//        (KECUALI yang pernah/sedang terlibat peminjaman -> dilindungi)
//
//  Kunci natural pencocokan: (kodeSatker, kodeBarangBmn, nup).
//  Skala: dirancang untuk ribuan baris (createMany + 1 query muat).
// ============================================================

const XLSX = require('xlsx');
const { prisma } = require('../config/database');
const { AppError } = require('../middleware/error.middleware');
const { kodeNaturalBarang } = require('../utils/generateKode');

// Kolom template yang dipahami importer (urut tampil).
const KOLOM_TEMPLATE = [
  'Kode Satker',
  'Nama Satker',
  'Kode Barang',
  'NUP',
  'Nama Barang',
  'Merk',
  'Tipe',
  'Jenis BMN',
  'Kondisi',
  'Lokasi Ruang (BU)',
  'Deskripsi',
];

// Normalisasi teks header: huruf kecil, rapatkan spasi.
function normalHeader(h) {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

// Pemetaan nama header (yang sudah dinormalisasi) -> field internal.
const ALIAS_KOLOM = {
  'nama barang': 'nama',
  nama: 'nama',
  merk: 'merk',
  merek: 'merk',
  tipe: 'tipe',
  kondisi: 'kondisi',
  'jenis bmn': 'jenisBmn',
  jenis: 'jenisBmn',
  'kode satker': 'kodeSatker',
  'nama satker': 'namaSatker',
  'kode barang': 'kodeBarangBmn',
  nup: 'nup',
  'status bmn': 'statusBmn',
  // Lokasi diutamakan dari kolom "Ruang (BU)".
  'lokasi ruang (bu)': 'ruang',
  'ruang (bu)': 'ruang',
  'lokasi ruang': 'ruang',
  ruang: 'ruang',
  'lokasi penyimpanan': 'lokasi',
  lokasi: 'lokasi',
  deskripsi: 'deskripsi',
};

// --- Baca worksheet menjadi grid, tahan terhadap !ref yang rusak ---
// Beberapa file BMN menyimpan dimensi (!ref) yang salah (mis. A1:F1)
// padahal data ada sampai ribuan baris. Kita hitung ulang rentang
// sebenarnya dari sel yang ada agar seluruh baris terbaca.
function bacaGrid(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  if (!wb.SheetNames.length) throw new AppError('File tidak memiliki sheet apa pun.', 400);
  const ws = wb.Sheets[wb.SheetNames[0]];

  const selKeys = Object.keys(ws).filter((k) => !k.startsWith('!'));
  if (selKeys.length === 0) return [];

  let maxRow = 0;
  let maxCol = 0;
  for (const k of selKeys) {
    const c = XLSX.utils.decode_cell(k);
    if (c.r > maxRow) maxRow = c.r;
    if (c.c > maxCol) maxCol = c.c;
  }
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxRow, c: maxCol } });

  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
}

// Temukan baris header (baris pertama yang memuat penanda kolom kunci).
function cariBarisHeader(grid) {
  for (let i = 0; i < grid.length; i += 1) {
    const sel = grid[i].map(normalHeader);
    const adaPenanda = sel.some(
      (s) => s === 'nup' || s === 'nama barang' || s === 'kode barang' || s === 'nama'
    );
    if (adaPenanda) return i;
  }
  return -1;
}

// Bangun peta indeks kolom -> field dari baris header.
function petaKolom(barisHeader) {
  const peta = {};
  barisHeader.forEach((h, idx) => {
    const field = ALIAS_KOLOM[normalHeader(h)];
    if (field && peta[field] === undefined) peta[field] = idx;
  });
  return peta;
}

// --- Pemetaan nilai mentah -> nilai domain ---

function petaKondisi(nilai) {
  const s = normalHeader(nilai);
  if (s.startsWith('rusak berat')) return 'RUSAK_BERAT';
  if (s.startsWith('rusak ringan') || s === 'rusak') return 'RUSAK_RINGAN';
  return 'BAIK'; // default: 'baik', '', atau kondisi lain
}

function petaJenis(jenisBmn, nama) {
  const s = `${normalHeader(jenisBmn)} ${normalHeader(nama)}`;
  if (/(tik|komputer|laptop|elektron|monitor|printer|mesin|server|cctv)/.test(s)) return 'ELEKTRONIK';
  if (/(kendaraan|mobil|motor|sepeda)/.test(s)) return 'KENDARAAN';
  if (/(meja|kursi|lemari|furnitur|rak|sofa)/.test(s)) return 'FURNITUR';
  if (/(atk|alat tulis|kertas)/.test(s)) return 'ATK';
  return 'LAINNYA';
}

function teksAtauNull(v) {
  const s = String(v ?? '').trim();
  return s === '' ? null : s;
}

// --- Parse buffer menjadi daftar baris ternormalisasi + daftar error ---
function parse(buffer) {
  const grid = bacaGrid(buffer);
  if (grid.length === 0) {
    return { rows: [], gagal: [{ baris: 0, nama: '-', pesan: 'File kosong.' }] };
  }

  const idxHeader = cariBarisHeader(grid);
  if (idxHeader === -1) {
    throw new AppError(
      'Header kolom tidak ditemukan. Pastikan ada kolom "Nama Barang" dan "NUP" (unduh template untuk format yang benar).',
      400
    );
  }

  const peta = petaKolom(grid[idxHeader]);
  if (peta.nama === undefined) {
    throw new AppError('Kolom "Nama Barang" tidak ditemukan di file.', 400);
  }

  const ambil = (row, field) => (peta[field] === undefined ? '' : row[peta[field]]);

  const rows = [];
  const gagal = [];

  for (let i = idxHeader + 1; i < grid.length; i += 1) {
    const row = grid[i];
    const nomorBaris = i + 1; // 1-based, sesuai tampilan Excel

    // Lewati baris yang benar-benar kosong.
    const adaIsi = row.some((c) => String(c ?? '').trim() !== '');
    if (!adaIsi) continue;

    const nama = teksAtauNull(ambil(row, 'nama'));
    const nup = teksAtauNull(ambil(row, 'nup'));
    const kodeBarangBmn = teksAtauNull(ambil(row, 'kodeBarangBmn'));
    const kodeSatker = teksAtauNull(ambil(row, 'kodeSatker'));

    if (!nama) {
      gagal.push({ baris: nomorBaris, nama: '-', pesan: 'Nama Barang kosong.' });
      continue;
    }
    // Wajib punya penanda identitas agar bisa dicocokkan saat re-import.
    if (!nup && !kodeBarangBmn) {
      gagal.push({ baris: nomorBaris, nama, pesan: 'NUP / Kode Barang kosong (tidak bisa disinkronkan).' });
      continue;
    }

    const namaSatker = teksAtauNull(ambil(row, 'namaSatker'));
    const merk = teksAtauNull(ambil(row, 'merk'));
    const tipe = teksAtauNull(ambil(row, 'tipe'));
    const statusBmn = teksAtauNull(ambil(row, 'statusBmn'));
    const ruang = teksAtauNull(ambil(row, 'ruang'));
    const lokasiKol = teksAtauNull(ambil(row, 'lokasi'));
    const deskripsiKol = teksAtauNull(ambil(row, 'deskripsi'));
    const jenisBmn = ambil(row, 'jenisBmn');

    // Deskripsi: pakai kolom deskripsi bila ada, jika tidak rangkai dari tipe/status.
    let deskripsi = deskripsiKol;
    if (!deskripsi) {
      const bagian = [];
      if (tipe && tipe !== merk) bagian.push(`Tipe: ${tipe}`);
      if (statusBmn) bagian.push(`Status BMN: ${statusBmn}`);
      deskripsi = bagian.length ? bagian.join(' • ') : null;
    }

    rows.push({
      baris: nomorBaris,
      // kunci natural
      kodeSatker,
      kodeBarangBmn,
      nup,
      // nilai domain
      nama,
      merk,
      jenis: petaJenis(jenisBmn, nama),
      kondisi: petaKondisi(ambil(row, 'kondisi')),
      // Lokasi diutamakan dari kolom Ruang (BU); fallback ke kolom lokasi
      // umum, lalu Nama Satker agar tidak kosong.
      lokasiPenyimpanan: ruang || lokasiKol || namaSatker,
      deskripsi,
      namaSatker,
    });
  }

  return { rows, gagal };
}

// Kunci natural sebagai string untuk pencocokan (matching saat re-import).
function kunci(o) {
  return `${o.kodeSatker ?? ''}||${o.kodeBarangBmn ?? ''}||${o.nup ?? ''}`;
}

// Apakah dua nilai (sudah dinormalisasi null) sama.
function sama(a, b) {
  return (a ?? null) === (b ?? null);
}

// Field deskriptif yang ikut diperbarui saat re-import.
// Termasuk kodeBarang agar tersinkron dengan kunci natural satker-barang-NUP.
function adaPerubahan(lama, baru) {
  return (
    !sama(lama.kodeBarang, kodeNaturalBarang(baru)) ||
    !sama(lama.nama, baru.nama) ||
    !sama(lama.merk, baru.merk) ||
    !sama(lama.jenis, baru.jenis) ||
    !sama(lama.kondisi, baru.kondisi) ||
    !sama(lama.lokasiPenyimpanan, baru.lokasiPenyimpanan) ||
    !sama(lama.deskripsi, baru.deskripsi) ||
    !sama(lama.namaSatker, baru.namaSatker)
  );
}

// --- Proses import + sinkronisasi cermin ---
async function importDariExcel(buffer) {
  const { rows, gagal } = parse(buffer);

  // Buang duplikat kunci dalam file (baris terakhir menang); catat sebagai gagal.
  const petaFile = new Map();
  for (const r of rows) {
    const k = kunci(r);
    if (petaFile.has(k)) {
      gagal.push({ baris: r.baris, nama: r.nama, pesan: 'NUP/Kode duplikat dalam file (baris ini diabaikan).' });
    }
    petaFile.set(k, r); // last-wins
  }

  // Muat seluruh barang hasil import beserta jumlah keterkaitan peminjaman.
  const existing = await prisma.barang.findMany({
    where: { sumber: 'IMPORT' },
    select: {
      id: true,
      kodeBarang: true,
      kodeSatker: true,
      kodeBarangBmn: true,
      nup: true,
      nama: true,
      merk: true,
      jenis: true,
      kondisi: true,
      lokasiPenyimpanan: true,
      deskripsi: true,
      namaSatker: true,
      _count: { select: { detailPeminjaman: true } },
    },
  });
  const petaExisting = new Map(existing.map((b) => [kunci(b), b]));

  // Klasifikasi: insert / update.
  const toInsert = [];
  const toUpdate = [];
  for (const [k, r] of petaFile) {
    const lama = petaExisting.get(k);
    if (!lama) {
      toInsert.push(r);
    } else if (adaPerubahan(lama, r)) {
      toUpdate.push({ id: lama.id, data: dataDeskriptif(r) });
    }
  }

  // Klasifikasi: hapus (ada di DB, tidak ada di file).
  const toDelete = [];
  const dilindungiList = [];
  for (const b of existing) {
    if (!petaFile.has(kunci(b))) {
      if (b._count.detailPeminjaman > 0) dilindungiList.push(b);
      else toDelete.push(b.id);
    }
  }

  // Baris baru: kode barang = kunci natural (Kode Satker - Kode Barang - NUP),
  // disertakan lewat dataDeskriptif().
  const dataInsert = toInsert.map((r) => ({
    jumlahTotal: 1,
    jumlahTersedia: 1,
    sumber: 'IMPORT',
    kodeSatker: r.kodeSatker,
    kodeBarangBmn: r.kodeBarangBmn,
    nup: r.nup,
    ...dataDeskriptif(r),
  }));

  // Eksekusi dalam satu transaksi agar konsisten.
  await prisma.$transaction(
    async (tx) => {
      if (dataInsert.length) {
        // createMany cepat untuk ribuan baris (satu pernyataan).
        await tx.barang.createMany({ data: dataInsert, skipDuplicates: true });
      }
      for (const u of toUpdate) {
        await tx.barang.update({ where: { id: u.id }, data: u.data });
      }
      if (toDelete.length) {
        await tx.barang.deleteMany({ where: { id: { in: toDelete } } });
      }
    },
    { timeout: 120000, maxWait: 20000 }
  );

  return {
    ditambahkan: dataInsert.length,
    diperbarui: toUpdate.length,
    dihapus: toDelete.length,
    dilindungi: dilindungiList.length,
    gagal: gagal.length,
    detailGagal: gagal.slice(0, 50), // batasi agar respons tidak membengkak
    detailDilindungi: dilindungiList.slice(0, 50).map((b) => ({
      nama: b.nama,
      nup: b.nup,
      kodeBarangBmn: b.kodeBarangBmn,
    })),
  };
}

// Bidang yang dipakai untuk create & update (termasuk kodeBarang = kunci natural).
function dataDeskriptif(r) {
  return {
    kodeBarang: kodeNaturalBarang(r),
    nama: r.nama,
    merk: r.merk,
    jenis: r.jenis,
    kondisi: r.kondisi,
    lokasiPenyimpanan: r.lokasiPenyimpanan,
    deskripsi: r.deskripsi,
    namaSatker: r.namaSatker,
  };
}

// --- Buffer template Excel untuk diunduh admin ---
function buatTemplateBuffer() {
  const contoh = [
    '015110199411868000KP',
    'BADAN PENDIDIKAN DAN PELATIHAN KEUANGAN',
    '3100102002',
    '212',
    'Lap Top',
    'Asus Notebook ROG',
    'ROG Strix G16',
    'MESIN PERALATAN KHUSUS TIK',
    'Baik',
    'Ruang BU 201',
    'Catatan opsional',
  ];
  const ws = XLSX.utils.aoa_to_sheet([KOLOM_TEMPLATE, contoh]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Master Aset');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { importDariExcel, buatTemplateBuffer, parse, KOLOM_TEMPLATE };
