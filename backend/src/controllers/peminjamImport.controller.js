// ============================================================
//  Controller Import Peminjam dari Excel/CSV — khusus admin.
// ============================================================

const peminjamImportService = require('../services/peminjamImport.service');
const { responsSukses } = require('../utils/apiResponse');
const { asyncHandler, AppError } = require('../middleware/error.middleware');

const importExcel = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('File belum diunggah.', 400);

  // Ambil info user dari auth middleware
  const user = req.user;
  const namaFile = req.file.originalname || 'file-import.xlsx';

  const hasil = await peminjamImportService.importDariExcel(req.file.buffer, {
    userId: user.id,
    userEmail: user.email,
    userNama: user.nama,
    namaFile,
  });

  return responsSukses(res, {
    pesan: 'Sinkronisasi data peminjam selesai diproses.',
    data: hasil
  });
});

const unduhTemplate = asyncHandler(async (req, res) => {
  const buffer = peminjamImportService.buatTemplateBuffer();
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', 'attachment; filename="template-import-peminjam.xlsx"');
  return res.send(buffer);
});

module.exports = { importExcel, unduhTemplate };
