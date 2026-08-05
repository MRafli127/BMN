// ============================================================
//  Service Notifikasi — operasi CRUD notifikasi
// ============================================================

const { prisma } = require('../config/database');
const { Role } = require('@prisma/client');

// Tipe notifikasi
const TIPE_NOTIFIKASI = {
  PEMINJAMAN_BARU: 'PEMINJAMAN_BARU',
  PEMINJAMAN_DISETUJUI: 'PEMINJAMAN_DISETUJUI',
  PEMINJAMAN_DITOLAK: 'PEMINJAMAN_DITOLAK',
  BARANG_DISERAHKAN: 'BARANG_DISERAHKAN',
  PENGEMBALIAN: 'PENGEMBALIAN',
  TERLAMBAT: 'TERLAMBAT',
  KERUSAKAN: 'KERUSAKAN',
  KEHILANGAN: 'KEHILANGAN',
  EXPORT_SELESAI: 'EXPORT_SELESAI',
  IMPORT_SELESAI: 'IMPORT_SELESAI',
  SISTEM: 'SISTEM',
  PENSIUN_MENDEKATI: 'PENSIUN_MENDEKATI',
};

// Prioritas default berdasarkan tipe
const PRIORITAS_DEFAULT = {
  [TIPE_NOTIFIKASI.PEMINJAMAN_BARU]: 'TINGGI',
  [TIPE_NOTIFIKASI.TERLAMBAT]: 'TINGGI',
  [TIPE_NOTIFIKASI.KERUSAKAN]: 'TINGGI',
  [TIPE_NOTIFIKASI.KEHILANGAN]: 'TINGGI',
  [TIPE_NOTIFIKASI.PENSIUN_MENDEKATI]: 'TINGGI',
  [TIPE_NOTIFIKASI.BARANG_DISERAHKAN]: 'TINGGI',
  [TIPE_NOTIFIKASI.PEMINJAMAN_DISETUJUI]: 'RENDAH',
  [TIPE_NOTIFIKASI.PEMINJAMAN_DITOLAK]: 'RENDAH',
  [TIPE_NOTIFIKASI.PENGEMBALIAN]: 'RENDAH',
  [TIPE_NOTIFIKASI.EXPORT_SELESAI]: 'SEDANG',
  [TIPE_NOTIFIKASI.IMPORT_SELESAI]: 'SEDANG',
  [TIPE_NOTIFIKASI.SISTEM]: 'SEDANG',
};

/**
 * Buat notifikasi baru
 */
async function buat(data) {
  const { userId, tipe, judul, pesan, prioritas, referenceId, referenceType } = data;

  return prisma.notifikasi.create({
    data: {
      userId,
      tipe: tipe || TIPE_NOTIFIKASI.SISTEM,
      judul,
      pesan,
      prioritas: prioritas || PRIORITAS_DEFAULT[tipe] || 'SEDANG',
      referenceId,
      referenceType,
    },
  });
}

/**
 * Kirim notifikasi ke semua admin
 */
async function kirimKeSemuaAdmin(data) {
  const admins = await prisma.user.findMany({
    where: { roles: { has: Role.ADMIN } },
    select: { id: true },
  });

  const notifikasiList = admins.map((admin) => ({
    userId: admin.id,
    tipe: data.tipe,
    judul: data.judul,
    pesan: data.pesan,
    prioritas: data.prioritas || PRIORITAS_DEFAULT[data.tipe] || 'SEDANG',
    referenceId: data.referenceId,
    referenceType: data.referenceType,
  }));

  if (notifikasiList.length > 0) {
    await prisma.notifikasi.createMany({
      data: notifikasiList,
    });
  }
}

/**
 * Kirim notifikasi ke satu user
 */
async function kirimKeUser(userId, data) {
  return buat({
    userId,
    ...data,
  });
}

/**
 * Ambil notifikasi untuk user (dengan pagination)
 */
async function ambilUntukUser(userId, { page = 1, limit = 20, hanyaBelumBaca = false } = {}) {
  const skip = (page - 1) * limit;

  const where = {
    userId,
    ...(hanyaBelumBaca && { isBaca: false }),
  };

  const [notifikasi, total] = await Promise.all([
    prisma.notifikasi.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.notifikasi.count({ where }),
  ]);

  return {
    notifikasi,
    meta: {
      total,
      page,
      limit,
      totalHalaman: Math.ceil(total / limit),
    },
  };
}

/**
 * Ambil jumlah notifikasi belum dibaca
 */
async function hitungBelumBaca(userId) {
  return prisma.notifikasi.count({
    where: {
      userId,
      isBaca: false,
    },
  });
}

/**
 * Tandai satu notifikasi sebagai sudah dibaca
 */
async function tandaiSudahBaca(id, userId) {
  return prisma.notifikasi.updateMany({
    where: {
      id,
      userId, // Pastikan milik user yang login
    },
    data: {
      isBaca: true,
    },
  });
}

/**
 * Tandai semua notifikasi user sebagai sudah dibaca
 */
async function tandaiSemuaSudahBaca(userId) {
  return prisma.notifikasi.updateMany({
    where: {
      userId,
      isBaca: false,
    },
    data: {
      isBaca: true,
    },
  });
}

/**
 * Hapus notifikasi
 */
async function hapus(id, userId) {
  return prisma.notifikasi.deleteMany({
    where: {
      id,
      userId,
    },
  });
}

/**
 * Hapus semua notifikasi user
 */
async function hapusSemua(userId) {
  return prisma.notifikasi.deleteMany({
    where: { userId },
  });
}

module.exports = {
  TIPE_NOTIFIKASI,
  buat,
  kirimKeSemuaAdmin,
  kirimKeUser,
  ambilUntukUser,
  hitungBelumBaca,
  tandaiSudahBaca,
  tandaiSemuaSudahBaca,
  hapus,
  hapusSemua,
};
