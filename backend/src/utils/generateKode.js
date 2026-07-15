// ============================================================
//  Pembentuk kode/identitas Barang & Transaksi.
//
//  Kode barang & transaksi = KUNCI NATURAL aset BMN:
//      Kode Satker - Kode Barang - NUP
//  contoh: 015110199411868000KP-3100102002-1180
//
//  Dipakai oleh:
//  - barang.service.js: membentuk kodeBarang saat barang dibuat/di-import
//  - peminjaman.service.js: membentuk kodeTransaksi saat peminjaman dibuat
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

// Generate kode transaksi unik untuk peminjaman.
// Format: kodeSatker-kodeBarangBmn-NUP (natural code dari barang)
// Menggunakan retry mechanism untuk menjamin uniqueness di database.
async function kodeTransaksiUnik(barangData = {}) {
  const { kodeSatker, kodeBarangBmn, nup } = barangData;

  // Bangun kode dari komponen natural
  const kodeNatural = kodeNaturalBarang({ kodeSatker, kodeBarangBmn, nup });

  // Jika komponen tidak lengkap, fallback ke format timestamp-based
  if (!kodeNatural || !kodeSatker || !kodeBarangBmn || !nup) {
    return kodeTransaksiFallback();
  }

  // Cek apakah kode sudah ada (uniqueness)
  const count = await prisma.peminjaman.count({
    where: { kodeTransaksi: kodeNatural },
  });

  if (count === 0) {
    return kodeNatural;
  }

  // Jika sudah ada, tambahkan suffix nomor urut
  // Cari berapa kali kode ini sudah dipakai
  const MAX_RETRY = 10;
  for (let i = 1; i <= MAX_RETRY; i++) {
    const kodeDenganSuffix = `${kodeNatural}-${i}`;
    const existing = await prisma.peminjaman.count({
      where: { kodeTransaksi: kodeDenganSuffix },
    });
    if (existing === 0) {
      return kodeDenganSuffix;
    }
  }

  // Fallback jika semua retry gagal
  return kodeTransaksiFallback();
}

// Fallback: format timestamp-based jika komponen tidak tersedia
function kodeTransaksiFallback() {
  const tahun = new Date().getFullYear();
  const bulan = String(new Date().getMonth() + 1).padStart(2, '0');
  const hari = String(new Date().getDate()).padStart(2, '0');
  const random = generateRandomString(PANJANG_RANDOM);
  return `${tahun}${bulan}${hari}-${random}`;
}

module.exports = { kodeNaturalBarang, kodeTransaksiUnik };
