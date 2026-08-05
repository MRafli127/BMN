// ============================================================
//  Controller pencarian global
// ============================================================

const searchService = require('../services/search.service');
const { responsSukses } = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/error.middleware');

const cariGlobal = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim().length < 2) {
    return responsSukses(res, {
      pesan: 'Query minimal 2 karakter.',
      data: { barang: [], peminjaman: [], peminjam: [] },
    });
  }

  const hasil = await searchService.pencarianGlobal(q);
  return responsSukses(res, {
    pesan: 'Pencarian selesai.',
    data: hasil,
  });
});

module.exports = { cariGlobal };
