const path = require('path');
const barangService = require('../services/barang.service');
const { uploadKeBlob } = require('../utils/blob');
const { responsSukses } = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/error.middleware');

async function pathFoto(file) {
  if (!file) return null;
  const ext = path.extname(file.originalname).toLowerCase();
  const namaFile = `foto-barang/foto-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  return uploadKeBlob(namaFile, file.buffer, file.mimetype);
}

const getSemua = asyncHandler(async (req, res) => {
  const { q, jenis, kondisi, page, limit } = req.query;
  const hasil = await barangService.getSemua({ q, jenis, kondisi, page, limit });
  return responsSukses(res, {
    pesan: 'Daftar barang berhasil dimuat.',
    data: hasil.data,
    meta: hasil.meta,
  });
});

const getById = asyncHandler(async (req, res) => {
  const barang = await barangService.getById(req.params.id);
  return responsSukses(res, { pesan: 'Detail barang.', data: barang });
});

const create = asyncHandler(async (req, res) => {
  const barang = await barangService.create(req.body, await pathFoto(req.file));
  return responsSukses(res, { pesan: 'Barang berhasil ditambahkan.', data: barang, status: 201 });
});

const update = asyncHandler(async (req, res) => {
  const barang = await barangService.update(req.params.id, req.body, await pathFoto(req.file));
  return responsSukses(res, { pesan: 'Barang berhasil diperbarui.', data: barang });
});

const remove = asyncHandler(async (req, res) => {
  await barangService.remove(req.params.id);
  return responsSukses(res, { pesan: 'Barang berhasil dihapus.' });
});

module.exports = { getSemua, getById, create, update, remove };
