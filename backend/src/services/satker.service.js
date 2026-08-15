// ============================================================
//  Service Satker
//  CRUD untuk model Satker (Satuan Kerja)
// ============================================================

const { prisma } = require('../config/database');
const { parsePagination } = require('../utils/pagination');
const { AppError } = require('../middleware/error.middleware');

// --- List semua satker ---
async function getSemua({ q, aktif, page = 1, limit = 50 } = {}) {
  const { halaman, perHalaman, skip } = parsePagination({ page, limit });

  const where = {};
  if (aktif !== undefined) where.aktif = aktif === true || aktif === 'true';
  if (q) {
    where.OR = [
      { kode: { contains: q, mode: 'insensitive' } },
      { nama: { contains: q, mode: 'insensitive' } },
      { singkat: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.satker.findMany({
      where,
      orderBy: { nama: 'asc' },
      skip: (halaman - 1) * perHalaman,
      take: perHalaman,
    }),
    prisma.satker.count({ where }),
  ]);

  return {
    data,
    meta: { total, page: halaman, limit: perHalaman, totalHalaman: Math.ceil(total / perHalaman) || 1 },
  };
}

// --- Ambil satu satker ---
async function getById(id) {
  const satker = await prisma.satker.findUnique({ where: { id } });
  if (!satker) throw new AppError('Satker tidak ditemukan.', 404);
  return satker;
}

// --- Ambil satker berdasarkan kode ---
async function getByKode(kode) {
  const satker = await prisma.satker.findUnique({ where: { kode } });
  if (!satker) throw new AppError('Satker tidak ditemukan.', 404);
  return satker;
}

// --- Buat satker baru ---
async function create(data) {
  // Cek kode unik
  const sudahAda = await prisma.satker.findUnique({ where: { kode: data.kode } });
  if (sudahAda) {
    throw new AppError('Kode satker sudah terdaftar.', 409);
  }

  const satker = await prisma.satker.create({
    data: {
      kode: data.kode.trim().toUpperCase(),
      nama: data.nama.trim(),
      singkat: data.singkat ? data.singkat.trim() : null,
      aktif: data.aktif !== false,
    },
  });
  return satker;
}

// --- Update satker ---
async function update(id, data) {
  const satkerLama = await prisma.satker.findUnique({ where: { id } });
  if (!satkerLama) throw new AppError('Satker tidak ditemukan.', 404);

  // Cek kode unik jika diubah
  if (data.kode && data.kode !== satkerLama.kode) {
    const bentrok = await prisma.satker.findUnique({ where: { kode: data.kode } });
    if (bentrok) throw new AppError('Kode satker sudah digunakan.', 409);
  }

  const satker = await prisma.satker.update({
    where: { id },
    data: {
      kode: data.kode ? data.kode.trim().toUpperCase() : satkerLama.kode,
      nama: data.nama ? data.nama.trim() : satkerLama.nama,
      singkat: data.singkat !== undefined ? (data.singkat ? data.singkat.trim() : null) : satkerLama.singkat,
      aktif: data.aktif !== undefined ? Boolean(data.aktif) : satkerLama.aktif,
    },
  });
  return satker;
}

// --- Hapus satker ---
async function remove(id) {
  const satker = await prisma.satker.findUnique({ where: { id } });
  if (!satker) throw new AppError('Satker tidak ditemukan.', 404);

  // Cek apakah ada barang dengan satker ini
  const jumlahBarang = await prisma.barang.count({ where: { kodeSatker: satker.kode } });
  if (jumlahBarang > 0) {
    throw new AppError(`Satker tidak dapat dihapus karena masih memiliki ${jumlahBarang} barang.`, 400);
  }

  await prisma.satker.delete({ where: { id } });
  return { id };
}

// --- Sync satker dari data barang yang ada ---
// Membaca semua kodeSatker unik dari barang dan memastikan ada record Satker
async function syncDariBarang() {
  const kodeSatkerUnik = await prisma.barang.findMany({
    where: { kodeSatker: { not: null } },
    select: { kodeSatker: true, namaSatker: true },
    distinct: ['kodeSatker'],
  });

  const hasil = { dibuat: 0, dilewati: 0 };
  for (const { kodeSatker, namaSatker } of kodeSatkerUnik) {
    const ada = await prisma.satker.findUnique({ where: { kode: kodeSatker } });
    if (!ada) {
      await prisma.satker.create({
        data: {
          kode: kodeSatker,
          nama: namaSatker || `Satker ${kodeSatker}`,
        },
      });
      hasil.dibuat++;
    } else {
      hasil.dilewati++;
    }
  }
  return hasil;
}

module.exports = {
  getSemua,
  getById,
  getByKode,
  create,
  update,
  remove,
  syncDariBarang,
};
