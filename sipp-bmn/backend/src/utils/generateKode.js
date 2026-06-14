// ============================================================
//  Generator kode unik untuk Barang & Peminjaman.
//  Format Barang     : BMN-<TAHUN>-0001
//  Format Peminjaman : PJM-<TAHUN>-0001
//  Nomor urut mengikuti tahun berjalan & data terakhir.
//  Harus dipanggil di dalam transaksi agar tidak bentrok.
// ============================================================

const { prisma } = require('../config/database');

// Ambil nomor urut berikutnya berdasarkan kode terakhir pada prefix tertentu
function nomorBerikutnya(kodeTerakhir, prefix) {
  if (!kodeTerakhir) return 1;
  // kode contoh: BMN-2026-0042  -> ambil bagian "0042"
  const bagian = kodeTerakhir.split('-');
  const angka = parseInt(bagian[bagian.length - 1], 10);
  return Number.isNaN(angka) ? 1 : angka + 1;
}

// Generate kode barang baru (BMN-2026-0001)
async function generateKodeBarang(tx = prisma) {
  const tahun = new Date().getFullYear();
  const prefix = `BMN-${tahun}-`;

  const terakhir = await tx.barang.findFirst({
    where: { kodeBarang: { startsWith: prefix } },
    orderBy: { kodeBarang: 'desc' },
    select: { kodeBarang: true },
  });

  const urut = nomorBerikutnya(terakhir?.kodeBarang, prefix);
  return `${prefix}${String(urut).padStart(4, '0')}`;
}

// Generate kode peminjaman baru (PJM-2026-0001)
async function generateKodePeminjaman(tx = prisma) {
  const tahun = new Date().getFullYear();
  const prefix = `PJM-${tahun}-`;

  const terakhir = await tx.peminjaman.findFirst({
    where: { kodePeminjaman: { startsWith: prefix } },
    orderBy: { kodePeminjaman: 'desc' },
    select: { kodePeminjaman: true },
  });

  const urut = nomorBerikutnya(terakhir?.kodePeminjaman, prefix);
  return `${prefix}${String(urut).padStart(4, '0')}`;
}

module.exports = { generateKodeBarang, generateKodePeminjaman };
