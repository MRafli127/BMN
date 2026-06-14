const path = require('path');
const peminjamanService = require('../services/peminjaman.service');
const { uploadKeBlob } = require('../utils/blob');
const { responsSukses } = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/error.middleware');

async function pathDokumen(file) {
  if (!file) return null;
  const ext = path.extname(file.originalname).toLowerCase();
  const namaFile = `dokumen/dokumen-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  return uploadKeBlob(namaFile, file.buffer, file.mimetype);
}

const create = asyncHandler(async (req, res) => {
  const peminjaman = await peminjamanService.create(req.user.id, req.body, await pathDokumen(req.file));
  return responsSukses(res, {
    pesan: 'Pengajuan peminjaman berhasil dikirim. Menunggu persetujuan admin.',
    data: peminjaman,
    status: 201,
  });
});

const getSemua = asyncHandler(async (req, res) => {
  const { status, q, page, limit } = req.query;
  const hasil = await peminjamanService.getSemua({
    status,
    q,
    page,
    limit,
    userId: req.user.id,
    role: req.user.role,
  });
  return responsSukses(res, {
    pesan: 'Daftar peminjaman berhasil dimuat.',
    data: hasil.data,
    meta: hasil.meta,
  });
});

const getById = asyncHandler(async (req, res) => {
  const peminjaman = await peminjamanService.getById(req.params.id, {
    userId: req.user.id,
    role: req.user.role,
  });
  return responsSukses(res, { pesan: 'Detail peminjaman.', data: peminjaman });
});

const setujui = asyncHandler(async (req, res) => {
  const peminjaman = await peminjamanService.setujui(req.params.id, req.user.id, req.body.catatanAdmin);
  return responsSukses(res, {
    pesan: 'Peminjaman disetujui. Stok telah diperbarui dan QR Code dibuat.',
    data: peminjaman,
  });
});

const tolak = asyncHandler(async (req, res) => {
  const peminjaman = await peminjamanService.tolak(req.params.id, req.user.id, req.body.catatanAdmin);
  return responsSukses(res, { pesan: 'Peminjaman telah ditolak.', data: peminjaman });
});

const serahkan = asyncHandler(async (req, res) => {
  const peminjaman = await peminjamanService.serahkan(req.params.id);
  return responsSukses(res, {
    pesan: 'Barang ditandai telah diserahkan kepada peminjam.',
    data: peminjaman,
  });
});

const kembalikan = asyncHandler(async (req, res) => {
  const peminjaman = await peminjamanService.kembalikan(req.params.id);
  return responsSukses(res, {
    pesan: 'Pengembalian dikonfirmasi. Stok telah dikembalikan.',
    data: peminjaman,
  });
});

const scan = asyncHandler(async (req, res) => {
  const peminjaman = await peminjamanService.getByKode(req.body.kodePeminjaman);
  return responsSukses(res, { pesan: 'Data peminjaman ditemukan.', data: peminjaman });
});

module.exports = { create, getSemua, getById, setujui, tolak, serahkan, kembalikan, scan };
