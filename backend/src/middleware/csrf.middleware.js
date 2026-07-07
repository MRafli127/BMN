// ============================================================
//  CSRF Protection Middleware
//  Menggunakan pola Double Submit Cookie untuk proteksi CSRF.
//  - CSRF token di-generate saat login/register
//  - Disimpan di cookie (bisa dibaca JS) dan signed
//  - State-changing requests harus kirim token di header
// ============================================================

const crypto = require('crypto');
const { responsGagal } = require('../utils/apiResponse');
const env = require('../config/env');

const isProduction = env.isProduction;

// Nama cookie dan header CSRF
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

// Generate CSRF token (32 bytes hex)
function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Verify CSRF token (constant-time comparison)
function verifyCsrfToken(token, expected) {
  if (!token || !expected) return false;
  if (token.length !== expected.length) return false;

  // Constant-time comparison untuk hindari timing attacks
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

// Cookie options untuk CSRF token (bisa dibaca JS frontend)
// sameSite HARUS 'none' di production (cross-origin request dari frontend ke backend)
// secure: true WAJIB untuk sameSite: 'none'
const csrfCookieOptions = {
  httpOnly: false, // JS perlu baca untuk kirim di header
  secure: env.cookie.secure,
  sameSite: isProduction ? 'none' : 'lax', // Ikuti env untuk cross-origin
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
  domain: isProduction ? undefined : undefined, // Biarkan browser atur otomatis
};

// Middleware: Generate CSRF token dan set cookie
// Dipanggil SETELAH auth middleware (butuh userId)
function generateCsrfTokenMiddleware(req, res, next) {
  // Generate token baru untuk setiap sesi
  const token = generateCsrfToken();

  // Simpan hashed version di cookie (前端 kirim token plain, backend compare)
  // Kita simpan plain token di cookie karena httpOnly=false
  res.cookie(CSRF_COOKIE_NAME, token, csrfCookieOptions);

  // Kirim juga di response body untuk convenience
  res.locals.csrfToken = token;

  next();
}

// Middleware: Validate CSRF token untuk state-changing requests
// WAJIB dipasang SETELAH authMiddleware
function validateCsrfTokenMiddleware(req, res, next) {
  // Method yang aman (GET, HEAD, OPTIONS) tidak perlu CSRF check
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Ambil token dari cookie dan header
  const tokenCookie = req.cookies?.[CSRF_COOKIE_NAME];
  const tokenHeader = req.headers[CSRF_HEADER_NAME.toLowerCase()];

  // Validasi: cookie dan header harus ada dan cocok
  if (!tokenCookie || !tokenHeader) {
    return responsGagal(res, {
      pesan: 'CSRF token tidak valid. Segarkan halaman dan coba lagi.',
      status: 403,
    });
  }

  if (!verifyCsrfToken(tokenCookie, tokenHeader)) {
    return responsGagal(res, {
      pesan: 'CSRF token tidak valid. Segarkan halaman dan coba lagi.',
      status: 403,
    });
  }

  next();
}

// Helper untuk dapat CSRF token (untuk endpoint yang butuh token baru)
function getCsrfToken(req, res) {
  const token = generateCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, token, csrfCookieOptions);
  return token;
}

module.exports = {
  generateCsrfToken,
  generateCsrfTokenMiddleware,
  validateCsrfTokenMiddleware,
  verifyCsrfToken,
  getCsrfToken,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
};
