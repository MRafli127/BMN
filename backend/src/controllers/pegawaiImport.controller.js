// ============================================================
//  Controller Import Data Pegawai (Daftar Peminjam) — khusus admin.
//  Mengisi & menyinkronkan data diri peminjam dari file master
//  pegawai; membuat akun baru bila NIP belum terdaftar.
// ============================================================

const pegawaiImportService = require('../services/pegawaiImport.service');
const { responsSukses } = require('../utils/apiResponse');
const { asyncHandler, AppError } = require('../middleware/error.middleware');

const importExcel = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('File belum diunggah.', 400);
  const hasil = await pegawaiImportService.importDariExcel(req.file.buffer);
  return responsSukses(res, { pesan: 'Sinkronisasi data pegawai selesai diproses.', data: hasil });
});

const unduhTemplate = asyncHandler(async (req, res) => {
  const buffer = pegawaiImportService.buatTemplateBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="template-import-pegawai.xlsx"');
  return res.send(buffer);
});

module.exports = { importExcel, unduhTemplate };
