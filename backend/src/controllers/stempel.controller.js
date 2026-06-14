// ============================================================
//  Controller Stempel/Cap Digital
//  Menempelkan stempel ke dokumen peminjaman lalu menyimpan
//  URL hasil ke field dokumenStempelUrl.
// ============================================================

const peminjamanService = require('../services/peminjaman.service');
const stempelService = require('../services/stempel.service');
const { responsSukses } = require('../utils/apiResponse');
const { asyncHandler, AppError } = require('../middleware/error.middleware');

const stempel = asyncHandler(async (req, res) => {
  // Ambil data mentah (dokumenUrl masih path relatif untuk diproses pdf-lib)
  const raw = await peminjamanService.getRawById(req.params.id);

  if (['MENUNGGU', 'DITOLAK'].includes(raw.status)) {
    throw new AppError('Dokumen hanya dapat distempel setelah peminjaman disetujui.', 400);
  }

  const pathStempel = await stempelService.stempelDokumen(raw, req.user.nama);
  const peminjaman = await peminjamanService.setDokumenStempel(req.params.id, pathStempel);

  return responsSukses(res, {
    pesan: 'Dokumen berhasil distempel dan ditandatangani secara digital.',
    data: peminjaman,
  });
});

module.exports = { stempel };
