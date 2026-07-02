// ============================================================
//  Controller Notifikasi — endpoint API notifikasi
// ============================================================

const notificationService = require('../services/notification.service');
const { responsSukses } = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/error.middleware');

// Ambil semua notifikasi untuk user yang login
const getSemua = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, belumBaca = false } = req.query;

  const hasil = await notificationService.ambilUntukUser(req.user.id, {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    hanyaBelumBaca: belumBaca === 'true',
  });

  return responsSukses(res, {
    pesan: 'Daftar notifikasi berhasil dimuat.',
    data: hasil.notifikasi,
    meta: hasil.meta,
  });
});

// Ambil jumlah notifikasi belum dibaca
const getBelumBaca = asyncHandler(async (req, res) => {
  const jumlah = await notificationService.hitungBelumBaca(req.user.id);
  return responsSukses(res, {
    pesan: 'Jumlah notifikasi belum dibaca.',
    data: { jumlah },
  });
});

// Tandai satu notifikasi sebagai sudah dibaca
const markSudahBaca = asyncHandler(async (req, res) => {
  await notificationService.tandaiSudahBaca(req.params.id, req.user.id);
  return responsSukses(res, {
    pesan: 'Notifikasi ditandai sudah dibaca.',
  });
});

// Tandai semua notifikasi sebagai sudah dibaca
const markSemuaSudahBaca = asyncHandler(async (req, res) => {
  await notificationService.tandaiSemuaSudahBaca(req.user.id);
  return responsSukses(res, {
    pesan: 'Semua notifikasi ditandai sudah dibaca.',
  });
});

// Hapus satu notifikasi
const hapus = asyncHandler(async (req, res) => {
  await notificationService.hapus(req.params.id, req.user.id);
  return responsSukses(res, {
    pesan: 'Notifikasi berhasil dihapus.',
  });
});

// Hapus semua notifikasi
const hapusSemua = asyncHandler(async (req, res) => {
  await notificationService.hapusSemua(req.user.id);
  return responsSukses(res, {
    pesan: 'Semua notifikasi berhasil dihapus.',
  });
});

module.exports = {
  getSemua,
  getBelumBaca,
  markSudahBaca,
  markSemuaSudahBaca,
  hapus,
  hapusSemua,
};
