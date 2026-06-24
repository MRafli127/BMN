// ============================================================
//  Middleware autentikasi — memverifikasi access token JWT.
//  Token diambil dari header Authorization: "Bearer <token>".
//  Bila valid, data pengguna disimpan di req.user.
// ============================================================

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { responsGagal } = require('../utils/apiResponse');
const { validateAccessTokenWithVersion } = require('../services/auth.service');

async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [tipe, token] = header.split(' ');

    if (tipe !== 'Bearer' || !token) {
      return responsGagal(res, {
        pesan: 'Akses ditolak. Token tidak ditemukan, silakan login terlebih dahulu.',
        status: 401,
      });
    }

    // Verifikasi keaslian & masa berlaku token
    let payload;
    try {
      payload = jwt.verify(token, env.jwt.accessSecret);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return responsGagal(res, {
          pesan: 'Sesi Anda telah berakhir. Silakan perbarui token atau login kembali.',
          status: 401,
        });
      }
      return responsGagal(res, {
        pesan: 'Token tidak valid.',
        status: 401,
      });
    }

    // Validasi tokenVersion (untuk invalidate saat password berubah)
    const validation = await validateAccessTokenWithVersion(payload);
    if (!validation.valid) {
      if (validation.reason === 'TOKEN_VERSION_MISMATCH') {
        return responsGagal(res, {
          pesan: 'Sesi Anda telah berakhir. Silakan login kembali.',
          status: 401,
        });
      }
      return responsGagal(res, {
        pesan: 'Pengguna tidak ditemukan.',
        status: 401,
      });
    }

    req.user = {
      id: payload.sub,
      role: payload.role,
      nama: payload.nama,
      email: payload.email,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return responsGagal(res, {
        pesan: 'Sesi Anda telah berakhir. Silakan perbarui token atau login kembali.',
        status: 401,
      });
    }
    return responsGagal(res, {
      pesan: 'Token tidak valid.',
      status: 401,
    });
  }
}

module.exports = authMiddleware;
