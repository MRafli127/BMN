// ============================================================
//  Service Barang
//  CRUD barang + pencarian, filter, dan pagination.
//  Kode barang dibuat otomatis & unik.
// ============================================================

const { prisma } = require('../config/database');
const { generateKodeBarang } = require('../utils/generateKode');
const { urlPublik } = require('../utils/apiResponse');
const { AppError } = require('../middleware/error.middleware');

// Ubah fotoUrl relatif menjadi absolut untuk client
function serialisasi(barang) {
  if (!barang) return barang;
  return { ...barang, fotoUrl: urlPublik(barang.fotoUrl) };
}

// --- Ambil daftar barang dengan pencarian/filter/pagination ---
async function getSemua({ q, jenis, kondisi, page = 1, limit = 10 } = {}) {
  const halaman = Math.max(1, parseInt(page, 10) || 1);
  const perHalaman = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));

  const where = {};
  if (q) {
    where.OR = [
      { nama: { contains: q, mode: 'insensitive' } },
      { kodeBarang: { contains: q, mode: 'insensitive' } },
      { lokasiPenyimpanan: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (jenis) where.jenis = jenis;
  if (kondisi) where.kondisi = kondisi;

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
async function create(data, fotoPath) {
  // Generate kode & buat barang dalam satu transaksi agar nomor urut aman
  const barang = await prisma.$transaction(async (tx) => {
    const kodeBarang = await generateKodeBarang(tx);
    return tx.barang.create({
      data: {
        kodeBarang,
        nama: data.nama,
        jenis: data.jenis,
        jumlahTotal: data.jumlahTotal,
        jumlahTersedia: data.jumlahTotal, // awalnya semua tersedia
        kondisi: data.kondisi || 'BAIK',
        lokasiPenyimpanan: data.lokasiPenyimpanan || null,
        deskripsi: data.deskripsi || null,
        fotoUrl: fotoPath || null,
      },
    });
  });
  return serialisasi(barang);
}

// --- Edit barang ---
async function update(id, data, fotoPath) {
  const barang = await prisma.barang.findUnique({ where: { id } });
  if (!barang) throw new AppError('Barang tidak ditemukan.', 404);

  // Jika jumlahTotal diubah, sesuaikan jumlahTersedia secara proporsional.
  // Jumlah yang sedang dipinjam = total lama - tersedia lama.
  const dataUpdate = { ...data };
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

  const updated = await prisma.barang.update({ where: { id }, data: dataUpdate });
  return serialisasi(updated);
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
