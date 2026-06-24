// ============================================================
//  Controller Manajemen User
// ============================================================

const userManagementService = require('../services/userManagement.service');
const { responsSukses } = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/error.middleware');

// List user dengan filter
const getSemua = asyncHandler(async (req, res) => {
  const { q, role, page, limit } = req.query;
  const hasil = await userManagementService.getSemua({ q, role, page, limit });
  return responsSukses(res, {
    pesan: 'Daftar user.',
    data: hasil.data,
    meta: hasil.meta,
  });
});

// Ambil satu user
const getById = asyncHandler(async (req, res) => {
  const user = await userManagementService.getById(req.params.id);
  return responsSukses(res, { pesan: 'Detail user.', data: user });
});

// Statistik user
const getStatistik = asyncHandler(async (req, res) => {
  const statistik = await userManagementService.getStatistik();
  return responsSukses(res, { pesan: 'Statistik user.', data: statistik });
});

// Buat user baru
const create = asyncHandler(async (req, res) => {
  const hasil = await userManagementService.create(req.body);
  return responsSukses(res, {
    pesan: 'User berhasil dibuat.',
    data: hasil,
    status: 201,
  });
});

// Update user
const update = asyncHandler(async (req, res) => {
  const user = await userManagementService.update(req.params.id, req.body);
  return responsSukses(res, { pesan: 'User berhasil diperbarui.', data: user });
});

// Reset password user
const resetPassword = asyncHandler(async (req, res) => {
  const hasil = await userManagementService.resetPassword(req.params.id);
  return responsSukses(res, {
    pesan: 'Password berhasil direset.',
    data: { passwordBaru: hasil.passwordBaru },
  });
});

// Hapus user
const remove = asyncHandler(async (req, res) => {
  await userManagementService.remove(req.params.id);
  return responsSukses(res, { pesan: 'User berhasil dihapus.' });
});

module.exports = {
  getSemua,
  getById,
  getStatistik,
  create,
  update,
  resetPassword,
  remove,
};
