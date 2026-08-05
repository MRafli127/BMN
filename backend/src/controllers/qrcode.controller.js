// ============================================================
//  Controller QR Code
//  Mengembalikan URL QR Code peminjaman. Bila peminjaman
//  sudah disetujui namun QR belum ada, QR akan dibuat.
// ============================================================

const peminjamanService = require('../services/peminjaman.service');
const qrcodeService = require('../services/qrcode.service');
const { prisma } = require('../config/database');
const { responsSukses, urlPublik } = require('../utils/apiResponse');
const { asyncHandler, AppError } = require('../middleware/error.middleware');

const getQrcode = asyncHandler(async (req, res) => {
  const raw = await peminjamanService.getRawById(req.params.id);

  // Otorisasi: peminjam hanya boleh melihat miliknya
  if (req.user.role === 'PEMINJAM' && raw.userId !== req.user.id) {
    throw new AppError('Anda tidak memiliki akses ke QR Code ini.', 403);
  }

  if (['MENUNGGU', 'DITOLAK'].includes(raw.status)) {
    throw new AppError('QR Code belum tersedia karena peminjaman belum disetujui.', 400);
  }

  // Generate bila belum ada (kode = kodeBarang terkini agar sinkron).
  let qrCodeUrl = raw.qrCodeUrl;
  if (!qrCodeUrl) {
    const dataQr = { ...raw, kodePeminjaman: peminjamanService.kodeDariBarang(raw) };
    qrCodeUrl = await qrcodeService.generateUntukPeminjaman(dataQr);
    await prisma.peminjaman.update({ where: { id: raw.id }, data: { qrCodeUrl } });
  }

  return responsSukses(res, {
    pesan: 'QR Code peminjaman.',
    data: {
      kodePeminjaman: raw.kodePeminjaman,
      qrCodeUrl: urlPublik(qrCodeUrl),
      isi: qrcodeService.bangunPayload(raw),
    },
  });
});

module.exports = { getQrcode };
