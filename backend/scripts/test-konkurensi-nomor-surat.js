#!/usr/bin/env node
// ============================================================
//  Test Konkurensi Nomor Surat
//
//  Simulasi: menembakkan N request konkuren ke nomorSuratService.ambil()
//  untuk jenis+tahun yang sama, lalu verifikasi:
//  1. Tidak ada nomor duplikat
//  2. Semua request mendapat nomor (tidak ada yang gagal)
//  3. Retry logic TIDAK terpicu (karena lock sudah serialize)
//     — jika retry terpicu, berarti ada masalah di implementasi lock
//
//  Usage:
//    node scripts/test-konkurensi-nomor-surat.js [--prod]
//    --prod  gunakan DATABASE_URL production (bukan .env lokal)
//    default: gunakan .env lokal / Supabase Session Pooler
//
//  Batas test: 20 request konkuren
// ============================================================

const { PrismaClient } = require('@prisma/client');
const path = require('path');

// Load env
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const isProd = process.argv.includes('--prod');
const CONCURRENT = 20;
const JENIS = 'PEMINJAMAN';
const TAHUN = new Date().getFullYear();

// Koneksi berbeda untuk test
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: isProd
        ? process.env.DATABASE_URL
        : 'postgresql://postgres.obtwexsnltpwznrighej:BMN_testing_database@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres'
    }
  }
});

// Service yang di-test (langsung copy implementasi agar test deterministik)
async function ambilNomor(tx, jenis, tahun) {
  const db = tx || prisma;
  // $executeRaw karena pg_advisory_xact_lock mengembalikan void
  await db.$executeRaw`
    SELECT pg_advisory_xact_lock(
      hashtext(${jenis})::int,
      ${tahun}::int
    )
  `;
  const rows = await db.$queryRaw`
    INSERT INTO "nomor_surat_counter" ("id", "jenis", "tahun", "urutan")
    VALUES (gen_random_uuid(), ${jenis}, ${tahun}, 1)
    ON CONFLICT ("jenis", "tahun")
    DO UPDATE SET "urutan" = "nomor_surat_counter"."urutan" + 1
    RETURNING "urutan"
  `;
  return Number(rows[0].urutan);
}

// Wrapper dengan retry (sama persis dengan implementasi working tree)
// Retry untuk P2002 (unique violation) DAN P1001 (koneksi transient Session Pooler)
async function ambilDenganRetry(tx, jenis, tahun, attempt = 1) {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 500; // lebih lambat untuk P1001 (koneksi)
  try {
    return await tx.$transaction(async (t) => {
      const nomor = await ambilNomor(t, jenis, tahun);
      return nomor;
    }, { timeout: 20000, maxWait: 10000 });
  } catch (err) {
    const isRetryable = (
      (err instanceof Error && err.message && err.message.includes('P2002')) ||
      (err instanceof Error && err.message && err.message.includes("Can't reach database server"))
    );
    if (isRetryable && attempt < MAX_RETRIES) {
      const kode = err.message.includes('P2002') ? 'P2002' : 'P1001';
      console.warn(`  [Retry attempt ${attempt}] ${kode} — retrying in ${RETRY_DELAY_MS}ms...`);
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
      return ambilDenganRetry(tx, jenis, tahun, attempt + 1);
    }
    throw err;
  }
}

async function main() {
  console.log('========================================================');
  console.log('  TEST KONKURENSI NOMOR SURAT');
  console.log('========================================================');
  console.log('');
  console.log(`Mode:    ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log(`Target:  ${CONCURRENT} request konkuren`);
  console.log(`Jenis:   ${JENIS}`);
  console.log(`Tahun:  ${TAHUN}`);
  console.log('');

  // Simpan counter sebelum test
  const sebelum = await prisma.nomorSuratCounter.findUnique({
    where: { jenis_tahun: { jenis: JENIS, tahun: TAHUN } }
  });
  const counterAwal = sebelum?.urutan || 0;
  console.log(`Counter awal: ${counterAwal}`);
  console.log('');
  console.log('Menembakkan request konkuren...');

  const startTime = Date.now();
  const errors = [];
  const retryLog = [];

  // Patch console.warn untuk menangkap retry
  const origWarn = console.warn;
  console.warn = (...args) => {
    if (args[0] && typeof args[0] === 'string' && args[0].includes('[Retry attempt]')) {
      retryLog.push(args[0]);
    }
    origWarn.apply(console, args);
  };

  // Jalankan N request konkuren
  const promises = Array.from({ length: CONCURRENT }, async (_, i) => {
    try {
      const nomor = await ambilDenganRetry(prisma, JENIS, TAHUN);
      return { index: i + 1, nomor, error: null };
    } catch (err) {
      return { index: i + 1, nomor: null, error: err.message };
    }
  });

  const results = await Promise.all(promises);

  console.warn = origWarn; // restore

  const elapsed = Date.now() - startTime;

  // Analisis hasil
  const berhasil = results.filter(r => r.nomor !== null);
  const gagal = results.filter(r => r.error !== null);
  const nomorList = berhasil.map(r => r.nomor);
  const duplikat = nomorList.filter((n, i) => nomorList.indexOf(n) !== i);
  const unik = [...new Set(nomorList)];

  console.log('');
  console.log('--- HASIL ---');
  console.log(`Total request:   ${CONCURRENT}`);
  console.log(`Berhasil:        ${berhasil.length}`);
  console.log(`Gagal:          ${gagal.length}`);
  console.log(`Nomor unik:     ${unik.length}`);
  console.log(`Duplikat found: ${duplikat.length}`);
  console.log(`Retry triggered: ${retryLog.length}x`);
  console.log(`Waktu total:    ${elapsed}ms`);
  console.log('');

  if (gagal.length > 0) {
    console.log('--- ERROR ---');
    gagal.forEach(r => console.log(`  Request #${r.index}: ${r.error}`));
    console.log('');
  }

  if (retryLog.length > 0) {
    console.log('--- RETRY LOG ---');
    retryLog.forEach(r => console.log(' ', r));
    console.log('');
  }

  // Verifikasi
  const tests = [
    {
      name: 'Semua request berhasil',
      pass: gagal.length === 0,
      detail: `${berhasil.length}/${CONCURRENT} berhasil`
    },
    {
      name: 'Tidak ada nomor duplikat',
      pass: duplikat.length === 0,
      detail: duplikat.length === 0 ? 'Tidak ada duplikat' : `Duplikat: ${JSON.stringify(duplikat)}`
    },
    {
      name: 'Semua nomor unik',
      pass: unik.length === berhasil.length,
      detail: `${unik.length} unik dari ${berhasil.length} hasil`
    },
    {
      name: 'Retry tidak terpicu',
      pass: retryLog.length === 0,
      detail: retryLog.length === 0 ? 'Tidak ada retry' : `Retry terpicu ${retryLog.length}x — PERINGATAN`
    },
    {
      name: 'Counter naik tepat sebanyak request',
      pass: unik.length === CONCURRENT,
      detail: `${unik.length} nomor dihasilkan untuk ${CONCURRENT} request`
    }
  ];

  console.log('--- VERIFIKASI ---');
  let allPass = true;
  for (const t of tests) {
    const status = t.pass ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${status}  ${t.name}`);
    console.log(`          ${t.detail}`);
    if (!t.pass) allPass = false;
  }

  console.log('');
  if (allPass) {
    console.log('========================================================');
    console.log('  ✅ SEMUA TEST PASSED');
    console.log('========================================================');
  } else {
    console.log('========================================================');
    console.log('  ❌ ADA TEST YANG GAGAL');
    console.log('========================================================');
    console.log('');
    console.log('⚠️  Retry terpicu berarti ada masalah di implementasi lock.');
    console.log('    Atau: ini expected jika implementasi lock belum di-deploy');
    console.log('    (lock belum ada, retry satu-satunya defense).');
    console.log('');
    console.log('⚠️  Jika semua gagal (koneksi error):');
    console.log('    - Pastikan Supabase Session Pooler reachable');
    console.log('    - Atau gunakan --prod untuk connection string dari .env');
  }

  await prisma.$disconnect();
  process.exit(allPass ? 0 : 1);
}

main().catch(async (e) => {
  console.error('FATAL:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});
