// ============================================================
//  Penanganan error terpusat & handler rute tidak ditemukan.
//  Menangani:
//   - AppError (error aplikasi dengan statusCode)
//   - Error Prisma yang umum (P2002 unik, P2025 tidak ditemukan)
//   - Error tak terduga lainnya
// ============================================================

const { responsGagal } = require('../utils/apiResponse');
const logger = require('../utils/logger');

// Kelas error aplikasi yang dapat dilempar dari service/controller
class AppError extends Error {
  constructor(pesan, statusCode = 400, errors = null) {
    super(pesan);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
  }
}

// Pembungkus controller async agar error otomatis diteruskan ke errorHandler
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// Handler untuk rute yang tidak ada
function notFoundHandler(req, res) {
  return responsGagal(res, {
    pesan: `Rute tidak ditemukan: ${req.method} ${req.originalUrl}`,
    status: 404,
  });
}

// Handler error utama (dipasang paling akhir)
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // Error aplikasi yang sudah kita tangani
  if (err instanceof AppError) {
    return responsGagal(res, {
      pesan: err.message,
      errors: err.errors,
      status: err.statusCode,
    });
  }

  // Error Prisma yang umum
  if (err.code === 'P2002') {
    const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'data';
    return responsGagal(res, {
      pesan: `Data dengan ${target} tersebut sudah terdaftar.`,
      status: 409,
    });
  }
  if (err.code === 'P2025') {
    return responsGagal(res, { pesan: 'Data tidak ditemukan.', status: 404 });
  }

  // Error JSON body tidak valid
  if (err.type === 'entity.parse.failed') {
    return responsGagal(res, { pesan: 'Format JSON pada body tidak valid.', status: 400 });
  }

  // Error tak terduga
  logger.error('Kesalahan tidak tertangani:', err.message, err.stack);
  return responsGagal(res, {
    pesan: 'Terjadi kesalahan pada server. Silakan coba lagi nanti.',
    status: 500,
  });
}

module.exports = { AppError, asyncHandler, notFoundHandler, errorHandler };
