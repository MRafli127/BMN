// ============================================================
//  Middleware otorisasi berbasis peran (role).
//  Contoh penggunaan: roleMiddleware('ADMIN')
//  Harus dipasang SETELAH authMiddleware.
// ============================================================

const { responsGagal } = require('../utils/apiResponse');

function roleMiddleware(...peranDiizinkan) {
  return (req, res, next) => {
    if (!req.user) {
      return responsGagal(res, {
        pesan: 'Belum terautentikasi.',
        status: 401,
      });
    }

    if (!peranDiizinkan.includes(req.user.role)) {
      return responsGagal(res, {
        pesan: 'Anda tidak memiliki hak akses untuk tindakan ini.',
        status: 403,
      });
    }

    next();
  };
}

module.exports = roleMiddleware;
