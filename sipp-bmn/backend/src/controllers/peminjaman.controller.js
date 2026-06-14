// ============================================================
//  Controller Peminjaman
// ============================================================

const peminjamanService = require('../services/peminjaman.service');
const { responsSukses } = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/error.middleware');

// Path relatif dokumen yang diunggah
function pathDokumen(file) {
  return file ? `/uploads/dokumen/${file.filename}` : null;
}

const create = asyncHandler(async (req, res) => {
  const peminjaman = await peminjamanService.create(req.user.id, req.body, pathDokumen(req.file));
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

// Scan QR untuk pengembalian: cari peminjaman berdasarkan kode lalu tampilkan detail
const scan = asyncHandler(async (req, res) => {
  const peminjaman = await peminjamanService.getByKode(req.body.kodePeminjaman);
  return responsSukses(res, { pesan: 'Data peminjaman ditemukan.', data: peminjaman });
});

module.exports = { create, getSemua, getById, setujui, tolak, serahkan, kembalikan, scan };
