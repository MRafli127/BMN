// ============================================================
//  Controller untuk Log Import — admin only
// ============================================================

const { prisma } = require('../config/database');
const { responsSukses } = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/error.middleware');

// Ambil semua log import (paginated)
const ambilSemuaLog = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.importLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.importLog.count(),
  ]);

  return responsSukses(res, {
    pesan: 'Daftar log import.',
    data: logs,
    meta: {
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

// Ambil satu log import berdasarkan ID
const ambilLogById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const log = await prisma.importLog.findUnique({
    where: { id },
  });

  if (!log) {
    return res.status(404).json({ sukses: false, pesan: 'Log tidak ditemukan.' });
  }

  return responsSukses(res, { data: log });
});

// Hapus log import (opsional, admin only)
const hapusLog = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await prisma.importLog.delete({
    where: { id },
  });

  return responsSukses(res, { pesan: 'Log berhasil dihapus' });
});

// Statistik ringkasan import
const statistikImport = asyncHandler(async (req, res) => {
  const [totalImport, totalAkunDitambahkan, totalAkunDiperbarui, totalPeminjamanDibuat, totalGagal] =
    await Promise.all([
      prisma.importLog.count(),
      prisma.importLog.aggregate({ _sum: { akunDitambahkan: true } }),
      prisma.importLog.aggregate({ _sum: { akunDiperbarui: true } }),
      prisma.importLog.aggregate({ _sum: { peminjamanDibuat: true } }),
      prisma.importLog.aggregate({ _sum: { gagal: true } }),
    ]);

  return responsSukses(res, {
    pesan: 'Statistik import.',
    data: {
      totalImport,
      totalAkunDitambahkan: totalAkunDitambahkan._sum.akunDitambahkan || 0,
      totalAkunDiperbarui: totalAkunDiperbarui._sum.akunDiperbarui || 0,
      totalPeminjamanDibuat: totalPeminjamanDibuat._sum.peminjamanDibuat || 0,
      totalGagal: totalGagal._sum.gagal || 0,
    },
  });
});

module.exports = {
  ambilSemuaLog,
  ambilLogById,
  hapusLog,
  statistikImport,
};
