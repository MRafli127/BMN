const barangService = require('../services/barang.service');
const barangImportService = require('../services/barangImport.service');
const { bufferKeDataUrl } = require('../utils/fileData');
const { responsSukses } = require('../utils/apiResponse');
const { asyncHandler, AppError } = require('../middleware/error.middleware');

function pathFoto(file) {
  return file ? bufferKeDataUrl(file.buffer, file.mimetype) : null;
}

const getSemua = asyncHandler(async (req, res) => {
  const { q, jenis, kondisi, ketersediaan, kodeSatker, page, limit, includePeminjam } = req.query;
  // Konversi string "true" ke boolean
  const includeDetail = includePeminjam === 'true' || includePeminjam === true;
  const hasil = await barangService.getSemua({ q, jenis, kondisi, ketersediaan, kodeSatker, page, limit, includeDetail });
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

// Ambil daftar merk unik untuk autocomplete
const getDaftarMerk = asyncHandler(async (req, res) => {
  const { q } = req.query;
  const daftarMerk = await barangService.getDaftarMerk(q);
  return responsSukses(res, { pesan: 'Daftar merk.', data: daftarMerk });
});

// Ambil NUP terakhir untuk kombinasi kodeSatker + kodeBarang (merk TIDAK diperhitungkan)
const getNupTerakhir = asyncHandler(async (req, res) => {
  const { kodeSatker, kodeBarangBmn } = req.query;
  if (!kodeSatker || !kodeBarangBmn) {
    throw new AppError('kodeSatker dan kodeBarangBmn wajib diisi.', 400);
  }
  const result = await barangService.getNupTerakhir(kodeSatker, kodeBarangBmn);
  return responsSukses(res, { pesan: 'NUP terakhir.', data: result });
});

// Ambil preview NUP yang akan dipakai (berdasarkan Kode Satker + Kode Barang)
const getPreviewNup = asyncHandler(async (req, res) => {
  const { kodeSatker, kodeBarangBmn, jumlah } = req.query;
  if (!kodeSatker || !kodeBarangBmn || !jumlah) {
    throw new AppError('kodeSatker, kodeBarangBmn, dan jumlah wajib diisi.', 400);
  }
  const result = await barangService.getPreviewNup(kodeSatker, kodeBarangBmn, jumlah);
  return responsSukses(res, { pesan: 'Preview NUP.', data: result });
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

// Bulk insert barang sekaligus (NUP auto-generate) — khusus admin.
const bulkCreate = asyncHandler(async (req, res) => {
  const hasil = await barangService.bulkCreate(req.body, pathFoto(req.file));
  return responsSukses(res, {
    pesan: `${hasil.berhasil} barang berhasil ditambahkan (NUP ${hasil.nupAwal} - ${hasil.nupAkhir}).`,
    data: hasil,
    status: 201,
  });
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

module.exports = { getSemua, getById, create, update, remove, importExcel, unduhTemplate, checkStokTersedia, bulkCreate, getDaftarMerk, getNupTerakhir, getPreviewNup };
