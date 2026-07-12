// ============================================================
//  Service Barang
//  CRUD barang + pencarian, filter, dan pagination.
//  Kode barang dibuat otomatis & unik.
// ============================================================

const { prisma } = require('../config/database');
const { kodeNaturalBarang } = require('../utils/generateKode');
const { urlPublik } = require('../utils/apiResponse');
const { parsePagination } = require('../utils/pagination');
const { AppError } = require('../middleware/error.middleware');

// Ubah fotoUrl relatif menjadi absolut untuk client
function serialisasi(barang) {
  if (!barang) return barang;
  return { ...barang, fotoUrl: urlPublik(barang.fotoUrl) };
}

// --- Ambil daftar barang dengan pencarian/filter/pagination ---
async function getSemua({ q, jenis, kondisi, ketersediaan, kodeSatker, page = 1, limit = 10 } = {}) {
  const { halaman, perHalaman, skip } = parsePagination({ page, limit });

  const where = {};
  if (q) {
    where.OR = [
      { nama: { contains: q, mode: 'insensitive' } },
      { kodeBarang: { contains: q, mode: 'insensitive' } },
      { merk: { contains: q, mode: 'insensitive' } },
      { lokasiPenyimpanan: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (jenis) where.jenis = jenis;
  if (kondisi) where.kondisi = kondisi;
  if (kodeSatker) where.kodeSatker = kodeSatker;
  // Ketersediaan stok: 'tersedia' = masih ada unit (>0), 'habis' = nol/terpinjam penuh.
  if (ketersediaan === 'tersedia') where.jumlahTersedia = { gt: 0 };
  else if (ketersediaan === 'habis') where.jumlahTersedia = { lte: 0 };

  const [data, total] = await Promise.all([
    prisma.barang.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (halaman - 1) * perHalaman,
      take: perHalaman,
    }),
    prisma.barang.count({ where }),
  ]);

  return {
    data: data.map(serialisasi),
    meta: {
      total,
      page: halaman,
      limit: perHalaman,
      totalHalaman: Math.ceil(total / perHalaman) || 1,
    },
  };
}

// --- Ambil satu barang ---
async function getById(id) {
  const barang = await prisma.barang.findUnique({ where: { id } });
  if (!barang) throw new AppError('Barang tidak ditemukan.', 404);
  return serialisasi(barang);
}

// --- Tambah barang baru ---
// Kode barang = kunci natural aset (Kode Satker - Kode Barang - NUP),
// sama seperti barang hasil import. Tidak ada lagi kode auto-increment.
async function create(data, fotoPath) {
  const kodeBarang = kodeNaturalBarang(data);
  if (!kodeBarang) {
    throw new AppError('Kode Satker, Kode Barang, dan NUP wajib diisi untuk membentuk kode aset.', 400);
  }

  try {
    const barang = await prisma.barang.create({
      data: {
        kodeBarang,
        nama: data.nama,
        merk: data.merk || null,
        jenis: data.jenis,
        jumlahTotal: data.jumlahTotal,
        jumlahTersedia: data.jumlahTotal, // awalnya semua tersedia
        kondisi: data.kondisi || 'BAIK',
        lokasiPenyimpanan: data.lokasiPenyimpanan || null,
        deskripsi: data.deskripsi || null,
        fotoUrl: fotoPath || null,
        sumber: 'MANUAL',
        kodeSatker: data.kodeSatker,
        kodeBarangBmn: data.kodeBarangBmn,
        nup: data.nup,
      },
    });
    return serialisasi(barang);
  } catch (e) {
    if (e.code === 'P2002') {
      throw new AppError('Aset dengan kombinasi Kode Satker + Kode Barang + NUP tersebut sudah terdaftar.', 409);
    }
    throw e;
  }
}

// --- Edit barang ---
async function update(id, data, fotoPath) {
  const barang = await prisma.barang.findUnique({ where: { id } });
  if (!barang) throw new AppError('Barang tidak ditemukan.', 404);

  const dataUpdate = { ...data };

  // Bila komponen identitas aset dikirim, bentuk ulang kodeBarang dari
  // kunci natural (gabungan nilai baru + nilai lama yang tidak diubah).
  if (data.kodeSatker !== undefined || data.kodeBarangBmn !== undefined || data.nup !== undefined) {
    const kodeBarang = kodeNaturalBarang({
      kodeSatker: data.kodeSatker ?? barang.kodeSatker,
      kodeBarangBmn: data.kodeBarangBmn ?? barang.kodeBarangBmn,
      nup: data.nup ?? barang.nup,
    });
    if (!kodeBarang) {
      throw new AppError('Kode Satker, Kode Barang, dan NUP wajib diisi untuk membentuk kode aset.', 400);
    }
    dataUpdate.kodeBarang = kodeBarang;
  }

  // Jika jumlahTotal diubah, sesuaikan jumlahTersedia secara proporsional.
  // Jumlah yang sedang dipinjam = total lama - tersedia lama.
  if (typeof data.jumlahTotal === 'number') {
    const sedangDipinjam = barang.jumlahTotal - barang.jumlahTersedia;
    const tersediaBaru = data.jumlahTotal - sedangDipinjam;
    if (tersediaBaru < 0) {
      throw new AppError(
        `Jumlah total tidak boleh kurang dari jumlah yang sedang dipinjam (${sedangDipinjam}).`,
        400
      );
    }
    dataUpdate.jumlahTersedia = tersediaBaru;
  }
  if (fotoPath) dataUpdate.fotoUrl = fotoPath;

  try {
    const updated = await prisma.barang.update({ where: { id }, data: dataUpdate });
    return serialisasi(updated);
  } catch (e) {
    if (e.code === 'P2002') {
      throw new AppError('Aset dengan kombinasi Kode Satker + Kode Barang + NUP tersebut sudah terdaftar.', 409);
    }
    throw e;
  }
}

// --- Hapus barang ---
async function remove(id) {
  const barang = await prisma.barang.findUnique({
    where: { id },
    include: { detailPeminjaman: { where: { statusItem: 'DIPINJAM' } } },
  });
  if (!barang) throw new AppError('Barang tidak ditemukan.', 404);

  if (barang.detailPeminjaman.length > 0) {
    throw new AppError('Barang tidak dapat dihapus karena sedang dipinjam.', 400);
  }

  await prisma.barang.delete({ where: { id } });
  return { id };
}

// --- Cek stok barang untuk polling cart ---
// Input: array of barang IDs
// Output: barang yang tidak tersedia lagi (stok = 0 atau tidak ada)
async function checkStokTersedia(barangIds) {
  if (!barangIds || barangIds.length === 0) return [];

  const barang = await prisma.barang.findMany({
    where: { id: { in: barangIds } },
    select: {
      id: true,
      nama: true,
      merk: true,
      kodeBarang: true,
      jumlahTersedia: true,
      fotoUrl: true,
    },
  });

  // Barang yang sudah tidak tersedia (stok habis atau dihapus)
  const tidakTersedia = barang.filter((b) => b.jumlahTersedia < 1);

  return tidakTersedia.map((b) => ({
    ...b,
    fotoUrl: urlPublik(b.fotoUrl),
  }));
}

// --- Bulk Insert barang ---
// Bulk insert banyak barang sekaligus dengan NUP auto-generate.
// NUP berdasarkan Kode Satker + Kode Barang SAJA (merk TIDAK mempengaruhi sequence).
async function bulkCreate(data, fotoPath) {
  const { nama, merk, jenis, kondisi, lokasiPenyimpanan, deskripsi, kodeSatker, kodeBarangBmn, jumlahBarang } = data;

  // Normalize merk: uppercase, trim
  const merkNormalized = merk.trim().toUpperCase();

  // Parse jumlahBarang ke number
  const jumlah = parseInt(jumlahBarang, 10);
  if (isNaN(jumlah) || jumlah < 1) {
    throw new AppError('Jumlah barang harus angka positif.', 400);
  }

  const kodeSatkerTrim = kodeSatker.trim();
  const kodeBarangBmnTrim = kodeBarangBmn.trim();

  // Cek NUP terakhir untuk Kode Satker + Kode Barang (merk TIDAK diperhitungkan)
  const existingBarang = await prisma.barang.findFirst({
    where: {
      kodeSatker: kodeSatkerTrim,
      kodeBarangBmn: kodeBarangBmnTrim,
    },
    orderBy: { nup: 'desc' },
    select: { nup: true },
  });

  // Tentukan NUP awal berdasarkan Kode Satker + Kode Barang
  let nupSekarang = 1;
  if (existingBarang && existingBarang.nup) {
    const nupTerakhir = parseInt(existingBarang.nup, 10);
    if (!isNaN(nupTerakhir)) {
      nupSekarang = nupTerakhir + 1;
    }
  }

  // Generate NUP (langsung dari nupSekarang, tidak perlu skip karena sudah berdasarkan Kode Satker + Kode Barang)
  const daftarNup = [];
  for (let i = 0; i < jumlah; i++) {
    daftarNup.push(String(nupSekarang + i));
  }

  // Bangun data untuk bulk insert
  const dataBulk = daftarNup.map((nup) => ({
    kodeBarang: `${kodeSatkerTrim}-${kodeBarangBmnTrim}-${nup}`,
    nama: nama,
    merk: merkNormalized,
    jenis: jenis,
    jumlahTotal: 1,
    jumlahTersedia: 1,
    kondisi: kondisi || 'BAIK',
    lokasiPenyimpanan: lokasiPenyimpanan || null,
    deskripsi: deskripsi || null,
    fotoUrl: fotoPath || null,
    sumber: 'MANUAL',
    kodeSatker: kodeSatkerTrim,
    kodeBarangBmn: kodeBarangBmnTrim,
    nup: nup,
  }));

  // Bulk insert
  const hasil = await prisma.barang.createMany({
    data: dataBulk,
  });

  return {
    berhasil: hasil.count,
    nupAwal: daftarNup[0],
    nupAkhir: daftarNup[daftarNup.length - 1],
    merkNormalized,
  };
}

// --- Ambil daftar merk unik untuk autocomplete ---
async function getDaftarMerk(search = '') {
  const where = {};
  if (search) {
    where.merk = { mode: 'insensitive', contains: search };
  }
  const hasil = await prisma.barang.findMany({
    where,
    select: { merk: true },
    distinct: ['merk'],
    orderBy: { merk: 'asc' },
  });
  return hasil
    .map((r) => r.merk)
    .filter((m) => m !== null && m !== '');
}

// --- Ambil NUP terakhir untuk kombinasi kodeSatker + kodeBarang (merk TIDAK diperhitungkan) ---
async function getNupTerakhir(kodeSatker, kodeBarangBmn) {
  const barang = await prisma.barang.findFirst({
    where: {
      kodeSatker: kodeSatker.trim(),
      kodeBarangBmn: kodeBarangBmn.trim(),
    },
    orderBy: { nup: 'desc' },
    select: { nup: true },
  });

  return {
    nupTerakhir: barang?.nup || null,
    adaBarang: barang !== null,
  };
}

// --- Ambil preview NUP yang akan digunakan (berdasarkan Kode Satker + Kode Barang) ---
async function getPreviewNup(kodeSatker, kodeBarangBmn, jumlah) {
  const kodeSatkerTrim = kodeSatker.trim();
  const kodeBarangBmnTrim = kodeBarangBmn.trim();
  const jumlahInt = parseInt(jumlah, 10);

  if (isNaN(jumlahInt) || jumlahInt < 1) {
    return { nupAwal: null, nupAkhir: null, tersedia: 0 };
  }

  // Cek NUP terakhir untuk Kode Satker + Kode Barang
  const existingBarang = await prisma.barang.findFirst({
    where: {
      kodeSatker: kodeSatkerTrim,
      kodeBarangBmn: kodeBarangBmnTrim,
    },
    orderBy: { nup: 'desc' },
    select: { nup: true },
  });

  let nupSekarang = 1;
  if (existingBarang && existingBarang.nup) {
    const nupTerakhir = parseInt(existingBarang.nup, 10);
    if (!isNaN(nupTerakhir)) {
      nupSekarang = nupTerakhir + 1;
    }
  }

  const nupAwal = String(nupSekarang);
  const nupAkhir = String(nupSekarang + jumlahInt - 1);

  return {
    nupAwal,
    nupAkhir,
    tersedia: jumlahInt,
  };
}

module.exports = { getSemua, getById, create, update, remove, serialisasi, checkStokTersedia, bulkCreate, getDaftarMerk, getNupTerakhir, getPreviewNup };
