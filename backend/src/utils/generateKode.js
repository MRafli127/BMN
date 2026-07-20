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

// Generate kode transaksi unik untuk peminjaman.
// Format: kodeSatker-kodeBarangBmn-NUP (natural code dari barang)
// Menggunakan retry mechanism untuk menjamin uniqueness di database.
//Tidak menggunakan format "BMN-........-......" atau timestamp-based.
// Hanya menggunakan kunci natural aset BMN.
async function kodeTransaksiUnik(barangData = {}) {
  const { kodeSatker, kodeBarangBmn, nup } = barangData;

  // Kode harus menggunakan komponen natural BMN
  if (!kodeSatker || !kodeBarangBmn || !nup) {
    throw new Error(
      `Kode transaksi peminjaman harus menggunakan kunci natural BMN (kodeSatker-kodeBarangBmn-NUP). ` +
        `Komponen tidak lengkap: kodeSatker=${kodeSatker}, kodeBarangBmn=${kodeBarangBmn}, nup=${nup}`
    );
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

module.exports = { kodeNaturalBarang, kodeTransaksiUnik };
