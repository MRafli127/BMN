// ============================================================
//  Controller Audit Log
// ============================================================

const auditLogService = require('../services/auditLog.service');
const { responsSukses } = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/error.middleware');

// List audit log dengan filter & pagination
const getSemua = asyncHandler(async (req, res) => {
  const { entitas, aksi, userId, dari, sampai, page, limit } = req.query;
  const hasil = await auditLogService.getSemua({ entitas, aksi, userId, dari, sampai, page, limit });
  return responsSukses(res, {
    pesan: 'Daftar audit log.',
    data: hasil.data,
    meta: hasil.meta,
  });
});

// Ambil satu audit log
const getById = asyncHandler(async (req, res) => {
  const entry = await auditLogService.getById(req.params.id);
  if (!entry) {
    return res.status(404).json({ sukses: false, pesan: 'Audit log tidak ditemukan.' });
  }
  return responsSukses(res, { pesan: 'Detail audit log.', data: entry });
});

// Statistik audit log
const getStatistik = asyncHandler(async (req, res) => {
  const { dari, sampai } = req.query;
  const statistik = await auditLogService.getStatistik({ dari, sampai });
  return responsSukses(res, { pesan: 'Statistik audit log.', data: statistik });
});

module.exports = {
  getSemua,
  getById,
  getStatistik,
};
