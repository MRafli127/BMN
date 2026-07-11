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
  // Surat pernyataan yang sudah ditandatangani diunggah sebagai file (field "dokumen").
  // Bila field "draft" bernilai true, pengajuan disimpan tanpa surat (status DRAFT).
  const peminjaman = await peminjamanService.create(
    req.user.id,
    req.body,
    pathDokumen(req.file),
    getRequestInfo(req)
  );
  const draft = peminjaman.status === 'DRAFT';
  return responsSukses(res, {
    pesan: draft
      ? 'Pengajuan disimpan ke Riwayat. Unggah Surat Pernyataan untuk melanjutkan ke persetujuan admin.'
      : 'Pengajuan peminjaman berhasil dikirim. Menunggu persetujuan admin.',
    data: peminjaman,
    status: 201,
  });
});

// Peminjam mengunggah Surat Pernyataan untuk pengajuan DRAFT (field "dokumen").
const unggahSurat = asyncHandler(async (req, res) => {
  const peminjaman = await peminjamanService.unggahSurat(
    req.params.id,
    { userId: req.user.id, role: req.user.role },
    pathDokumen(req.file),
    getRequestInfo(req)
  );
  return responsSukses(res, {
    pesan: 'Surat pernyataan berhasil diunggah. Pengajuan kini menunggu persetujuan admin.',
    data: peminjaman,
  });
});

// Peminjam membatalkan pengajuan DRAFT miliknya.
const batalDraft = asyncHandler(async (req, res) => {
  await peminjamanService.batalDraft(
    req.params.id,
    { userId: req.user.id, role: req.user.role },
    getRequestInfo(req)
  );
  return responsSukses(res, { pesan: 'Pengajuan draft berhasil dibatalkan.' });
});

// Surat Pernyataan Peminjaman (PDF) untuk pengajuan tersimpan (mis. draft).
const suratPernyataan = asyncHandler(async (req, res) => {
  const suratUrl = await peminjamanService.generateSuratPernyataan(req.params.id, {
    userId: req.user.id,
    role: req.user.role,
  });
  return responsSukses(res, { pesan: 'Surat pernyataan peminjaman dibuat.', data: { suratUrl } });
});

const previewSurat = asyncHandler(async (req, res) => {
  const suratUrl = await peminjamanService.previewSurat(req.user.id, req.body);
  return responsSukses(res, { pesan: 'Pratinjau surat pernyataan dibuat.', data: { suratUrl } });
});

const getSemua = asyncHandler(async (req, res) => {
  const { status, q, page, limit, importMode, kodeSatker } = req.query;
  const hasil = await peminjamanService.getSemua({
    status,
    q,
    page,
    limit,
    importMode,
    kodeSatker,
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
  const peminjaman = await peminjamanService.kembalikan(req.params.id, req.user.id, req.body.catatan, getRequestInfo(req));
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
  const hasil = await peminjamanService.setujuiBanyak(
    req.body.ids,
    req.user.id,
    req.body.catatanAdmin,
    getRequestInfo(req)
  );
  const pesan =
    hasil.dilewati > 0
      ? `${hasil.disetujui} pengajuan disetujui, ${hasil.dilewati} dilewati.`
      : `${hasil.disetujui} pengajuan berhasil disetujui.`;
  return responsSukses(res, { pesan, data: hasil });
});

const serahkanMassal = asyncHandler(async (req, res) => {
  const hasil = await peminjamanService.serahkanBanyak(req.body.ids);
  const pesan =
    hasil.dilewati > 0
      ? `${hasil.berhasil} barang ditandai diserahkan, ${hasil.dilewati} dilewati.`
      : `${hasil.berhasil} barang berhasil ditandai diserahkan.`;
  return responsSukses(res, { pesan, data: hasil });
});

const kembalikanMassal = asyncHandler(async (req, res) => {
  const hasil = await peminjamanService.kembalikanBanyak(req.body.ids, req.user.id, getRequestInfo(req));
  const pesan =
    hasil.dilewati > 0
      ? `${hasil.berhasil} pengembalian dikonfirmasi, ${hasil.dilewati} dilewati.`
      : `${hasil.berhasil} pengembalian berhasil dikonfirmasi.`;
  return responsSukses(res, { pesan, data: hasil });
});

module.exports = {
  create,
  unggahSurat,
  batalDraft,
  suratPernyataan,
  previewSurat,
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
  serahkanMassal,
  kembalikanMassal,
};
