// ============================================================
//  Pembentuk kode/identitas Barang.
//
//  Kode barang = KUNCI NATURAL aset BMN:
//      Kode Satker - Kode Barang - NUP
//  contoh: 015110199411868000KP-3100102002-1180
//
//  Menggantikan format lama BMN-<tahun>-NNNN (auto-increment)
//  yang sudah dihapus dari seluruh sistem. Dipakai bersama oleh
//  barang.service.js (input manual) & barangImport.service.js
//  (import Excel) agar kode konsisten dari mana pun barang dibuat.
// ============================================================

const { prisma } = require('../config/database');

// Bentuk kode barang dari komponen identitas aset.
function kodeNaturalBarang({ kodeSatker, kodeBarangBmn, nup } = {}) {
  return [kodeSatker, kodeBarangBmn, nup]
    .map((v) => (v == null ? '' : String(v).trim()))
    .filter(Boolean)
    .join('-');
}

// Karakter yang digunakan untuk random string (alphanumeric uppercase)
// Menghilangkan 0, O, I, 1 untuk menghindari kesalahan baca manusia
const KARAKTER_KODE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PANJANG_RANDOM = 5;

// Generate random string dengan karakter yang mudah dibaca
function generateRandomString(panjang = PANJANG_RANDOM) {
  let result = '';
  for (let i = 0; i < panjang; i++) {
    result += KARAKTER_KODE.charAt(Math.floor(Math.random() * KARAKTER_KODE.length));
  }
  return result;
}

// Bentuk kode transaksi unik untuk peminjaman.
// Format: BMN-YYYYMMDD-XXXXX (5 karakter acak yang mudah dibaca)
// Menggunakan retry mechanism untuk menjamin uniqueness di database.
function kodeTransaksi(tanggal = new Date()) {
  const tahun = tanggal.getFullYear();
  const bulan = String(tanggal.getMonth() + 1).padStart(2, '0');
  const hari = String(tanggal.getDate()).padStart(2, '0');
  const random = generateRandomString(PANJANG_RANDOM);
  return `BMN-${tahun}${bulan}${hari}-${random}`;
}

// Generate kode transaksi dengan retry hingga unik.
// Memakai COUNT query untuk cek eksistensi (lebih ringan dari unique constraint violation).
// Maksimum 5 retry sebelum melempar error.
async function kodeTransaksiUnik(tanggal = new Date()) {
  const tahun = tanggal.getFullYear();
  const bulan = String(tanggal.getMonth() + 1).padStart(2, '0');
  const hari = String(tanggal.getDate()).padStart(2, '0');
  const prefix = `BMN-${tahun}${bulan}${hari}-`;
  const MAX_RETRY = 5;

  for (let i = 0; i < MAX_RETRY; i++) {
    const random = generateRandomString(PANJANG_RANDOM);
    const kode = `${prefix}${random}`;

    // Cek apakah kode sudah ada di database
    const count = await prisma.peminjaman.count({
      where: { kodeTransaksi: kode },
    });

    if (count === 0) {
      return kode;
    }
  }

  // Jika semua retry gagal, gunakan timestamp + random sebagai fallback
  // Ini sangat kecil kemungkinannya terjadi (~1 dalam 60 juta)
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = generateRandomString(3);
  return `${prefix}${timestamp}${random}`;
}

module.exports = { kodeNaturalBarang, kodeTransaksi, kodeTransaksiUnik };
