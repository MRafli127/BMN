// ============================================================
//  Middleware autentikasi — memverifikasi access token JWT.
//  Token diambil dari header Authorization: "Bearer <token>".
//  Bila valid, data pengguna disimpan di req.user.
// ============================================================

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { responsGagal } = require('../utils/apiResponse');
const { validateAccessTokenWithVersion, validateSession, updateLastActivity, pilihActiveRole, rolesEfektif } = require('../services/auth.service');

// Inactivity timeout dalam milidetik (60 menit — diselaraskan dengan access token)
const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;

// Threshold logging untuk request lambat (5 detik)
const SLOW_REQUEST_THRESHOLD_MS = 5000;

// Timestamp mulai request untuk logging performa
const requestStartTimes = new Map();

// Helper: format timestamp ISO
function ts() {
  return new Date().toISOString();
}

async function authMiddleware(req, res, next) {
  // Catat timestamp mulai request
  const startTime = Date.now();
  const requestId = `${req.method}:${req.originalUrl}:${Date.now()}`;

  // Hook untuk logging slow request saat response selesai
  res.on('finish', () => {
    const elapsed = Date.now() - startTime;
    if (elapsed >= SLOW_REQUEST_THRESHOLD_MS) {
      const userId = req.user?.id || 'anonymous';
      const role = req.user?.role || 'unknown';
      console.warn(
        `[SLOW] [${ts()}] ${elapsed}ms | ${req.method} ${req.originalUrl} | user=${userId} role=${role}`
      );
    }
  });

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

    // Validasi sesi: cek apakah sesi di-invalidate atau sudah tidak aktif
    // OPTIMIZED: validateSession menerima user object yang sudah di-fetch oleh validateAccessTokenWithVersion
    const sessionValidation = await validateSession(validation.user);
    if (!sessionValidation.valid) {
      if (sessionValidation.reason === 'SESSION_INVALIDATED') {
        return responsGagal(res, {
          pesan: 'Sesi Anda telah berakhir. Tab lain telah login dengan akun ini atau sesi tidak valid. Silakan login kembali.',
          status: 401,
        });
      }
      if (sessionValidation.reason === 'INACTIVITY_TIMEOUT') {
        return responsGagal(res, {
          pesan: 'Sesi Anda telah berakhir karena tidak aktif selama 60 menit. Silakan login kembali.',
          status: 401,
        });
      }
      return responsGagal(res, {
        pesan: 'Sesi tidak valid. Silakan login kembali.',
        status: 401,
      });
    }

    // Update last activity timestamp.
    // DETACHED: setImmediate memastikan tidak blocking connection pool
    // saat semua koneksi sedang digunakan query berat (mis. pagination besar).
    setImmediate(() => {
      updateLastActivity(payload.sub, payload.jti).catch(() => {});
    });

    // Roles diambil dari DB live (validation.user) agar promote/demote langsung
    // tercermin. Active role di-heal terhadap roles terkini: bila role aktif
    // sudah dicabut, otomatis turun ke role valid berikutnya.
    // Backward-compat token lama: pakai payload.role sbg activeRole awal.
    const rolesLive = validation.user.roles || [];
    const activeRole = pilihActiveRole(rolesLive, payload.activeRole || payload.role);

    req.user = {
      id: payload.sub,
      roles: rolesLive, // seluruh role yang dimiliki (live)
      role: activeRole, // active role — dasar gating ketat (role.middleware & service peminjaman)
      nama: payload.nama,
      email: payload.email,
      jti: payload.jti, // session identifier untuk tracking
      satkerAkses: validation.user.satkerAkses || [], // satker yang boleh dikelola admin
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
