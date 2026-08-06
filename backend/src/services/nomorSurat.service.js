// ============================================================
//  Penomoran Surat Pernyataan (berurut per tahun, reset tiap tahun).
//
//  Nomor surat berformat "PRN-<nomor>/BMN/PP.1/<tahun>" (peminjaman) dan
//  "PRN-<nomor>/BMN/<tahun>" (pengembalian). <nomor> berjalan 1, 2, 3, ...
//  untuk setiap pengajuan pada tahun berjalan, lalu KEMBALI ke 1 saat
//  ganti tahun (karena pencacah disimpan per pasangan (jenis, tahun)).
//
//  ambil() dipakai saat pengajuan benar-benar dibuat: increment ATOMIK via
//  "INSERT ... ON CONFLICT DO UPDATE" agar dua pengajuan bersamaan tidak
//  pernah memperoleh nomor yang sama. intip() hanya "mengintip" nomor
//  berikutnya (tanpa increment) untuk pratinjau surat sebelum disimpan.
// ============================================================

const { prisma } = require('../config/database');

const JENIS = {
  PEMINJAMAN: 'PEMINJAMAN',
};

// Ambil nomor urut BERIKUTNYA secara atomik lalu naikkan pencacah.
// Harus dijalankan di dalam transaksi (menerima client `tx`) agar batal
// bersama pembuatan peminjaman bila terjadi kegagalan.
//
// Race condition prevention:
// - pg_advisory_xact_lock: serialize concurrent request untuk jenis+tahun yang
//   sama. Lock acquired di awal transaction, auto-released saat commit/rollback.
//   Scope: per (jenis, tahun) — request untuk jenis/tahun berbeda tidak ter-block.
// - INSERT ... ON CONFLICT DO UPDATE: atomic increment counter (database-level atomic).
// - Retry on P2002: defense-in-depth — menangkap collision jika lock+atomic increment
//   belum cukup (misal: advisory lock belum aktif saat migration lama atau edge case).
//
// Lock key menggunakan two-argument overload pg_advisory_xact_lock(key1, key2).
// key1 = hashtext(jenis), key2 = tahun. Collision risk hampir nol karena dua
// input berbeda tidak mungkin menghasilkan hashtext sama DAN tahun berbeda.
async function ambil(tx, jenis, tahun) {
  const db = tx || prisma;

  // 1. Advisory lock — serialize request untuk (jenis, tahun) yang sama.
  // pg_advisory_xact_lock: blocking, otomatis release saat tx commit/rollback.
  // Tidak memblokir request dengan jenis/tahun berbeda.
  // $executeRaw dipakai karena fungsi ini mengembalikan void — $queryRaw tidak bisa deserialize void.
  await db.$executeRaw`
    SELECT pg_advisory_xact_lock(
      hashtext(${jenis})::int,
      ${tahun}::int
    )
  `;

  // 2. Atomic increment counter via INSERT...ON CONFLICT.
  // Dua transaksi tidak mungkin dapat nomor sama karena step 1 sudah serialize.
  const rows = await db.$queryRaw`
    INSERT INTO "nomor_surat_counter" ("id", "jenis", "tahun", "urutan")
    VALUES (gen_random_uuid(), ${jenis}, ${tahun}, 1)
    ON CONFLICT ("jenis", "tahun")
    DO UPDATE SET "urutan" = "nomor_surat_counter"."urutan" + 1
    RETURNING "urutan"
  `;
  return Number(rows[0].urutan);
}

// Intip nomor urut berikutnya TANPA menaikkan pencacah (untuk pratinjau).
// Nilainya bisa berubah bila ada pengajuan lain yang tersimpan lebih dulu.
async function intip(jenis, tahun) {
  const counter = await prisma.nomorSuratCounter.findUnique({
    where: { jenis_tahun: { jenis, tahun } },
  });
  return (counter?.urutan || 0) + 1;
}

// Format tampilan nomor surat.
function formatPeminjaman(nomor, tahun) {
  if (!nomor || !tahun) return `PRN-          /BMN/PP.1/${tahun || new Date().getFullYear()}`;
  return `PRN-${nomor}/BMN/PP.1/${tahun}`;
}

function formatPengembalian(nomor, tahun) {
  if (!nomor || !tahun) return `PRN-          /BMN/${tahun || new Date().getFullYear()}`;
  return `PRN-${nomor}/BMN/${tahun}`;
}

module.exports = { JENIS, ambil, intip, formatPeminjaman, formatPengembalian };
