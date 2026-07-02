// ============================================================
//  Rate Limiting Middleware
//  Proteksi terhadap brute force attack dan DoS.
// ============================================================

const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const { responsGagal } = require('../utils/apiResponse');
const env = require('../config/env');

// Helper: handler ketika rate limit exceeded
function handleRateLimit(res, message = 'Terlalu banyak request. Coba lagi nanti.') {
  return responsGagal(res, {
    pesan: message,
    status: 429,
  });
}

// Rate limiting hanya aktif di PRODUCTION. Di development (npm run dev) limiter
// dilewati agar reload berulang, React StrictMode, dan multi-tab di localhost
// (semua berbagi satu IP) tidak terkunci 429 lalu terlempar ke halaman login.
const skipDiDev = () => !env.isProduction;

// 1. Login Rate Limit
//    5 percobaan per 15 menit per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 10, // 10 percobaan gagal per email/IP — cukup untuk salah ketik, tetap menahan brute force
  message: null, // pakai custom handler
  standardHeaders: true, // Return rate limit info di headers
  legacyHeaders: false,
  skip: skipDiDev,
  skipSuccessfulRequests: true, // login yang BERHASIL tidak menghabiskan kuota
  handler: (req, res) => {
    return handleRateLimit(
      res,
      'Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.'
    );
  },
  keyGenerator: (req) => {
    // Gunakan IP + email untuk limit per user (lebih secure)
    const email = req.body?.email || '';
    return `${ipKeyGenerator(req)}-${email.toLowerCase()}`;
  },
});

// 2. Register Rate Limit
//    3 percobaan per jam per IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 jam
  max: 3, // 3 percobaan
  message: null,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipDiDev,
  handler: (req, res) => {
    return handleRateLimit(
      res,
      'Terlalu banyak percobaan registrasi. Silakan coba lagi dalam 1 jam.'
    );
  },
  keyGenerator: (req) => {
    return ipKeyGenerator(req);
  },
});

// 3. Refresh Token Rate Limit
//    Akses token berumur pendek (15 menit), jadi klien yang aktif WAJAR
//    me-refresh tiap ~15 menit. Batas dibuat per-SESI (refresh token), bukan
//    per-IP, supaya banyak pengguna di balik satu IP (kantor/NAT) tidak saling
//    mengunci dan terlempar ke login. Tetap longgar untuk multi-tab.
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 60,
  message: null,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipDiDev,
  handler: (req, res) => {
    return handleRateLimit(
      res,
      'Terlalu banyak percobaan refresh token. Silakan login kembali.'
    );
  },
  keyGenerator: (req) => {
    // Kunci per sesi (refresh token), fallback ke IP (dengan ipKeyGenerator untuk IPv6)
    return req.cookies?.refreshToken || ipKeyGenerator(req);
  },
});

// 4. API Global Rate Limit
//    100 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: 100, // 100 request per menit
  message: null,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipDiDev,
  handler: (req, res) => {
    return handleRateLimit(
      res,
      'Terlalu banyak request. Silakan kurangi frekuensi request.'
    );
  },
  keyGenerator: (req) => {
    return ipKeyGenerator(req);
  },
});

// 5. Scan QR Rate Limit
//    20 percobaan per 5 menit per IP (prevents QR scanning abuse)
const scanLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 menit
  max: 20,
  message: null,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipDiDev,
  handler: (req, res) => {
    return handleRateLimit(
      res,
      'Terlalu banyak percobaan scan. Silakan tunggu beberapa menit.'
    );
  },
  keyGenerator: (req) => {
    return ipKeyGenerator(req);
  },
});

// 6. Password Change Rate Limit
//    5 percobaan per jam per user
const passwordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 jam
  max: 5,
  message: null,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipDiDev,
  handler: (req, res) => {
    return handleRateLimit(
      res,
      'Terlalu banyak percobaan ganti password. Silakan coba lagi dalam 1 jam.'
    );
  },
  keyGenerator: (req) => {
    return `${ipKeyGenerator(req)}-password`;
  },
});

module.exports = {
  loginLimiter,
  registerLimiter,
  refreshLimiter,
  apiLimiter,
  scanLimiter,
  passwordLimiter,
};
