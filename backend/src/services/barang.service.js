// ============================================================
//  Service Barang
//  CRUD barang + pencarian, filter, dan pagination.
//  Kode barang dibuat otomatis & unik.
// ============================================================

const { prisma } = require('../config/database');
const { kodeNaturalBarang } = require('../utils/generateKode');
const { urlPublik } = require('../utils/apiResponse');
const { AppError } = require('../middleware/error.middleware');

// Ubah fotoUrl relatif menjadi absolut untuk client
function serialisasi(barang) {
  if (!barang) return barang;
  return { ...barang, fotoUrl: urlPublik(barang.fotoUrl) };
}

// --- Ambil daftar barang dengan pencarian/filter/pagination ---
async function getSemua({ q, jenis, kondisi, ketersediaan, page = 1, limit = 10 } = {}) {
  const halaman = Math.max(1, parseInt(page, 10) || 1);
  const perHalaman = Math.min(200, Math.max(1, parseInt(limit, 10) || 10));

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

module.exports = { getSemua, getById, create, update, remove, serialisasi };
