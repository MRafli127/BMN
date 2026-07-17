// ============================================================
//  Middleware ETag conditional GET.
//  MENGGANTIKAN default ETag Express.
//
//  Default ETag Express berjalan SETELAH route handler, menyebabkan:
//  - Full DB query walaupun response tidak berubah
//  - Overhead pembuatan ETag dari response body yang mungkin besar
//
//  Middleware ini berjalan SEBELUM auth middleware:
//  1. Request masuk → verify JWT signature (cryptographic, no DB)
//  2. Jika If-None-Match cocok dengan stored ETag untuk user+endpoint ini → 304
//  3. Jika tidak cocok → lanjut ke auth middleware (bukan bypass!)
//
//  KRITIS: Verifikasi JWT signature WAJIB sebelum keputusan short-circuit.
//  Ini bukan auth check (yang perlu query DB) - hanya cryptographic verification.
// ============================================================

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const etagStore = new Map(); // key: `${userId}:${role}:${satkerKey}:${method}:${url}`, value: etag string

// Cleanup old entries setiap 10 menit
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 10000;
setInterval(() => {
  if (etagStore.size > MAX_ENTRIES) {
    // Hapus 50% oldest entries
    const entries = Array.from(etagStore.entries());
    const toDelete = entries.slice(0, Math.floor(entries.length / 2));
    toDelete.forEach(([key]) => etagStore.delete(key));
  }
}, CLEANUP_INTERVAL_MS);

function getEtagKey(req, tokenPayload) {
  // Key HARUS menyertakan identitas user dari token yang sudah diverifikasi.
  // Token payload sudah diverifikasi signature-nya sebelum fungsi ini dipanggil.
  const userId = tokenPayload.sub || 'unknown';
  const role = tokenPayload.role || tokenPayload.activeRole || 'unknown';

  // Satker key: untuk admin, sertakan satkerAkses agar data antar admin tidak tercampur.
  // Untuk super_admin, satkerAkses adalah array kosong [] yang di-json stringify sama.
  const satkerKey = JSON.stringify(tokenPayload.satkerAkses || []);

  return `${userId}:${role}:${satkerKey}:${req.method}:${req.originalUrl}`;
}

function etagMiddleware(req, res, next) {
  // Hanya handle GET requests
  if (req.method !== 'GET') {
    return next();
  }

  const authHeader = req.headers.authorization || '';

  // Decode + verify JWT SEBELUM keputusan short-circuit.
  // jwt.verify() adalah murni cryptographic - tidak ada query database.
  // Jika token tidak valid/tidak ada, lanjut ke auth middleware (bukan short-circuit).
  let tokenPayload = null;

  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      // Verifikasi signature JWT - ini yang mencegah forged token attack
      tokenPayload = jwt.verify(token, env.jwt.accessSecret);
    } catch (err) {
      // Token tidak valid - lanjut ke auth middleware untuk handle 401
      // JANGAN short-circuit dengan key 'anon' karena itu unsafe
      return next();
    }
  } else {
    // Tidak ada Bearer token - lanjut ke auth middleware
    return next();
  }

  // Sekarang token sudah diverifikasi, baru cek ETag
  const key = getEtagKey(req, tokenPayload);
  const clientEtag = req.headers['if-none-match'];

  if (clientEtag) {
    const storedEtag = etagStore.get(key);
    if (storedEtag && storedEtag === clientEtag) {
      // ETag cocok untuk user+role+satker yang SAMA → 304.
      // Ini aman karena key sudah termasuk identitas user yang diverifikasi.
      return res.status(304).end();
    }
  }

  // Simpan fungsi untuk set ETag setelah response dibuat
  res.setEtag = function(etag) {
    res.setHeader('ETag', etag);
    etagStore.set(key, etag);
  };

  next();
}

// Helper: generate simple ETag dari data response
// Menggunakan hash sederhana untuk performa
function generateEtag(data) {
  if (!data) return null;
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  // Simple hash - cukup untuk deteksi perubahan
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `"${Math.abs(hash).toString(16)}"`;
}

module.exports = { etagMiddleware, generateEtag, etagStore };
