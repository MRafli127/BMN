const peminjamanService = require('../services/peminjaman.service');
const auditLogService = require('../services/auditLog.service');
const { bufferKeDataUrl } = require('../utils/fileData');
const { responsSukses } = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/error.middleware');

function pathDokumen(file) {
  return file ? bufferKeDataUrl(file.buffer, file.mimetype) : null;
}

// Helper untuk ekstrak info request
function getRequestInfo(req) {
  return {
    ipAddress: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || null,
    userAgent: req.get('User-Agent') || null,
  };
}

const create = asyncHandler(async (req, res) => {
  const peminjaman = await peminjamanService.create(req.user.id, req.body, pathDokumen(req.file), getRequestInfo(req));
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
  const peminjaman = await peminjamanService.setujui(req.params.id, req.user.id, req.body.catatanAdmin, getRequestInfo(req));
  return responsSukses(res, {
    pesan: 'Peminjaman disetujui. Stok telah diperbarui dan QR Code dibuat.',
    data: peminjaman,
  });
});

const tolak = asyncHandler(async (req, res) => {
  const peminjaman = await peminjamanService.tolak(req.params.id, req.user.id, req.body.catatanAdmin, getRequestInfo(req));
  return responsSukses(res, { pesan: 'Peminjaman telah ditolak.', data: peminjaman });
});

const serahkan = asyncHandler(async (req, res) => {
  const peminjaman = await peminjamanService.serahkan(req.params.id);
  return responsSukses(res, {
    pesan: 'Barang ditandai telah diserahkan kepada peminjam.',
    data: peminjaman,
  });
});

const suratPengembalian = asyncHandler(async (req, res) => {
  const suratUrl = await peminjamanService.generateSuratPengembalian(req.params.id, {
    userId: req.user.id,
    role: req.user.role,
  });
  return responsSukses(res, { pesan: 'Surat pernyataan pengembalian dibuat.', data: { suratUrl } });
});

const mintaPengembalian = asyncHandler(async (req, res) => {
  const peminjaman = await peminjamanService.mintaPengembalian(
    req.params.id,
    { userId: req.user.id, role: req.user.role },
    pathDokumen(req.file),
    getRequestInfo(req)
  );
  return responsSukses(res, {
    pesan: 'Permintaan pengembalian terkirim. Menunggu konfirmasi admin.',
    data: peminjaman,
  });
});

const kembalikan = asyncHandler(async (req, res) => {
  const peminjaman = await peminjamanService.kembalikan(req.params.id, getRequestInfo(req));
  return responsSukses(res, {
    pesan: 'Pengembalian dikonfirmasi. Stok telah dikembalikan.',
    data: peminjaman,
  });
});

const scan = asyncHandler(async (req, res) => {
  const peminjaman = await peminjamanService.getByKode(req.body.kodePeminjaman);
  return responsSukses(res, { pesan: 'Data peminjaman ditemukan.', data: peminjaman });
});

const hapus = asyncHandler(async (req, res) => {
  await peminjamanService.hapus(req.params.id, getRequestInfo(req));
  return responsSukses(res, { pesan: 'Data peminjaman berhasil dihapus.' });
});

const hapusMassal = asyncHandler(async (req, res) => {
  const { dihapus } = await peminjamanService.hapusBanyak(req.body.ids);
  return responsSukses(res, { pesan: `${dihapus} data peminjaman berhasil dihapus.`, data: { dihapus } });
});

const setujuiMassal = asyncHandler(async (req, res) => {
  const hasil = await peminjamanService.setujuiBanyak(req.body.ids, req.user.id);
  const pesan =
    hasil.dilewati > 0
      ? `${hasil.disetujui} pengajuan disetujui, ${hasil.dilewati} dilewati.`
      : `${hasil.disetujui} pengajuan berhasil disetujui.`;
  return responsSukses(res, { pesan, data: hasil });
});

module.exports = {
  create,
  getSemua,
  getById,
  setujui,
  tolak,
  serahkan,
  mintaPengembalian,
  suratPengembalian,
  kembalikan,
  scan,
  hapus,
  hapusMassal,
  setujuiMassal,
};
