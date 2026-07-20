// ============================================================
//  Service pencarian global — mencari di Barang, Peminjaman,
//  dan User/Peminjam.
// ============================================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Cari barang berdasarkan query string.
 * Field yang dicocokkan: nama, kodeBarang, merk, tipe, lokasiPenyimpanan.
 */
async function cariBarang(q, limit = 5) {
  const results = await prisma.barang.findMany({
    where: {
      OR: [
        { nama: { contains: q, mode: 'insensitive' } },
        { kodeBarang: { contains: q, mode: 'insensitive' } },
        { merk: { contains: q, mode: 'insensitive' } },
        { tipe: { contains: q, mode: 'insensitive' } },
        { lokasiPenyimpanan: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      kodeBarang: true,
      nama: true,
      merk: true,
      tipe: true,
      jumlahTersedia: true,
      jumlahTotal: true,
      kondisi: true,
    },
    take: limit,
    orderBy: { nama: 'asc' },
  });
  return results;
}

/**
 * Cari peminjaman berdasarkan query string.
 * Cocokkan: kodePeminjaman, nama peminjam.
 */
async function cariPeminjaman(q, limit = 5) {
  const results = await prisma.peminjaman.findMany({
    where: {
      OR: [
        { kodePeminjaman: { contains: q, mode: 'insensitive' } },
        { peminjam: { nama: { contains: q, mode: 'insensitive' } } },
      ],
    },
    select: {
      id: true,
      kodePeminjaman: true,
      status: true,
      tanggalPengajuan: true,
      tanggalKembaliRencana: true,
      peminjam: {
        select: { id: true, nama: true, nip: true },
      },
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
  });
  return results;
}

/**
 * Cari pengguna (kecuali admin) berdasarkan query string.
 * Cocokkan: nama, nip, email.
 */
async function cariPeminjam(q, limit = 5) {
  const results = await prisma.user.findMany({
    where: {
      role: 'PEMINJAM',
      OR: [
        { nama: { contains: q, mode: 'insensitive' } },
        { nip: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      nama: true,
      nip: true,
      email: true,
      unitKerja: true,
    },
    take: limit,
    orderBy: { nama: 'asc' },
  });
  return results;
}

/**
 * Pencarian global — menggabungkan hasil dari semua entity.
 * @param {string} q - Query pencarian (minimal 2 karakter)
 * @param {number} limitPerKategori - Batas hasil per kategori
 */
async function pencarianGlobal(q, limitPerKategori = 5) {
  if (!q || q.trim().length < 2) {
    return { barang: [], peminjaman: [], peminjam: [] };
  }

  const query = q.trim();

  const [barang, peminjaman, peminjam] = await Promise.all([
    cariBarang(query, limitPerKategori),
    cariPeminjaman(query, limitPerKategori),
    cariPeminjam(query, limitPerKategori),
  ]);

  return { barang, peminjaman, peminjam };
}

module.exports = { pencarianGlobal, cariBarang, cariPeminjaman, cariPeminjam };
