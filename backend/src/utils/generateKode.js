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
const logger = require('./logger');

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

// Fallback: format timestamp-based jika komponen natural tidak tersedia.
//
// Dipakai sebagai JARING PENGAMAN agar fitur pengajuan peminjaman tidak lumpuh
// bila ada barang warisan yang belum punya kunci natural lengkap. Setiap kali
// fallback dipakai, kita catat WARNING agar barang yang perlu dirapikan bisa
// dilacak. Idealnya fallback ini TIDAK PERNAH dipakai — pemeliharaan data
// (backfill kodeSatker/kodeBarangBmn/nup) harus dilakukan agar ketergantungan
// ke fallback hilang seiring waktu.
//
// Format: BMN-YYYYMMDD-XXXXX  (mis. BMN-20260719-K7P3M)
function kodeTransaksiFallback({ barangId, kodeBarang } = {}) {
  const tahun = new Date().getFullYear();
  const bulan = String(new Date().getMonth() + 1).padStart(2, '0');
  const hari = String(new Date().getDate()).padStart(2, '0');
  const random = generateRandomString(PANJANG_RANDOM);
  const kode = `${tahun}${bulan}${hari}-${random}`;

  // Logger harus SELALU nyala (tidak di-silence di production) — ini sinyal
  // higienitas data, bukan info biasa.
  logger.warn(
    `[GENERATE-KODE] Fallback dipakai untuk barang id=${barangId ?? '?'} ` +
      `kodeBarang=${kodeBarang ?? '?'} — komponen natural tidak lengkap. ` +
      `Kode sementara: ${kode}. RAPIKAN barang ini agar kodeTransaksiUnik ` +
      `bisa pakai kunci natural (kodeSatker-kodeBarangBmn-NUP).`
  );

  return `BMN-${kode}`;
}

// Generate kode transaksi unik untuk peminjaman.
// Format utama: kodeSatker-kodeBarangBmn-NUP (natural code dari barang)
// Fallback:   BMN-YYYYMMDD-XXXXX (timestamp-based) — dipakai bila komponen
//             natural tidak lengkap, dengan logger.warn agar bisa dilacak.
// Menggunakan retry mechanism untuk menjamin uniqueness di database.
async function kodeTransaksiUnik(barangData = {}) {
  const { barangId, kodeBarang, kodeSatker, kodeBarangBmn, nup } = barangData;

  // Jika komponen natural tidak lengkap, pakai fallback agar fitur tidak
  // terblokir, tapi catat warning agar barang bisa dirapikan kemudian.
  if (!kodeSatker || !kodeBarangBmn || !nup) {
    return kodeTransaksiFallback({ barangId, kodeBarang });
  }

  const kodeNatural = kodeNaturalBarang({ kodeSatker, kodeBarangBmn, nup });

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

  // Jika semua retry gagal, lempar error (seharusnya tidak terjadi)
  throw new Error(
    `Gagal membuat kode transaksi unik untuk ${kodeNatural} setelah ${MAX_RETRY} percobaan.`
  );
}

module.exports = {
  kodeNaturalBarang,
  kodeTransaksiUnik,
  // Diekspor agar bisa diuji (unit test) tanpa harus instantiate Prisma.
  kodeTransaksiFallback,
};
