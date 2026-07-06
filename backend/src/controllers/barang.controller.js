const barangService = require('../services/barang.service');
const barangImportService = require('../services/barangImport.service');
const { bufferKeDataUrl } = require('../utils/fileData');
const { responsSukses } = require('../utils/apiResponse');
const { asyncHandler, AppError } = require('../middleware/error.middleware');

function pathFoto(file) {
  return file ? bufferKeDataUrl(file.buffer, file.mimetype) : null;
}

const getSemua = asyncHandler(async (req, res) => {
  const { q, jenis, kondisi, ketersediaan, page, limit } = req.query;
  const hasil = await barangService.getSemua({ q, jenis, kondisi, ketersediaan, page, limit });
  return responsSukses(res, {
    pesan: 'Daftar barang berhasil dimuat.',
    data: hasil.data,
    meta: hasil.meta,
  });
});

const checkStokTersedia = asyncHandler(async (req, res) => {
  const { barangIds } = req.body;
  if (!Array.isArray(barangIds)) {
    throw new AppError('barangIds harus berupa array.', 400);
  }
  const tidakTersedia = await barangService.checkStokTersedia(barangIds);
  return responsSukses(res, {
    pesan: 'Cek stok selesai.',
    data: tidakTersedia,
  });
});

const getById = asyncHandler(async (req, res) => {
  const barang = await barangService.getById(req.params.id);
  return responsSukses(res, { pesan: 'Detail barang.', data: barang });
});

const create = asyncHandler(async (req, res) => {
  const barang = await barangService.create(req.body, pathFoto(req.file));
  return responsSukses(res, { pesan: 'Barang berhasil ditambahkan.', data: barang, status: 201 });
});

const update = asyncHandler(async (req, res) => {
  const barang = await barangService.update(req.params.id, req.body, pathFoto(req.file));
  return responsSukses(res, { pesan: 'Barang berhasil diperbarui.', data: barang });
});

const remove = asyncHandler(async (req, res) => {
  await barangService.remove(req.params.id);
  return responsSukses(res, { pesan: 'Barang berhasil dihapus.' });
});

// Import barang dari Excel/CSV (sinkronisasi cermin) — khusus admin.
const importExcel = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('File belum diunggah.', 400);
  const hasil = await barangImportService.importDariExcel(req.file.buffer);
  return responsSukses(res, { pesan: 'Import selesai diproses.', data: hasil });
});

// Unduh template Excel untuk import barang.
const unduhTemplate = asyncHandler(async (req, res) => {
  const buffer = barangImportService.buatTemplateBuffer();
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', 'attachment; filename="template-import-barang.xlsx"');
  return res.send(buffer);
});

module.exports = { getSemua, getById, create, update, remove, importExcel, unduhTemplate, checkStokTersedia };
