// ============================================================
//  Utilitas hashing & verifikasi password menggunakan bcrypt.
// ============================================================

const bcrypt = require('bcryptjs');

const JUMLAH_SALT = 10;

// Mengubah password mentah menjadi hash
async function hashPassword(passwordMentah) {
  return bcrypt.hash(passwordMentah, JUMLAH_SALT);
}

// Membandingkan password mentah dengan hash tersimpan
async function bandingkanPassword(passwordMentah, passwordHash) {
  return bcrypt.compare(passwordMentah, passwordHash);
}

module.exports = { hashPassword, bandingkanPassword };
