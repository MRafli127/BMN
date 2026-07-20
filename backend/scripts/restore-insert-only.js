#!/usr/bin/env node
// ============================================================
//  RESTORE-INSERT-ONLY — SIPP-BMN
//  Versi AMAN dari restore.js untuk kasus khusus:
//    - Tabel target SUDAH KOSONG
//    - Hanya INSERT, TIDAK ADA DELETE dalam bentuk apapun
//    - Pertahankan UUID asli dari backup JSON (relasi FK tetap valid)
//
//  PERBEDAAN DARI restore.js:
//    1. TIDAK ada fase "Clearing existing data"
//    2. TIDAK strip kolom id — createMany pakai UUID asli dari backup
//    3. FK integrity check (verifyFkIntegrity) tetap dijalankan
//    4. Tabel target HARUS sudah kosong sebelum eksekusi
//
//  Usage:
//    node scripts/restore-insert-only.js <backup_filename>
//    Contoh: node scripts/restore-insert-only.js backup_pre_restore_2026-07-19.json
//
//  CATATAN: Script ini TIDAK touch BlacklistedToken/User/Barang/AuditLog.
//  Fokus: pulihkan 3 tabel turunan yang hilang setelah restore gagal.
// ============================================================

const fs = require('fs');
const path = require('path');
const readline = require('readline');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL?.replace(/^["']|["']$/g, '');
if (!DATABASE_URL) {
  console.error('[RESTORE-IO] ❌ DATABASE_URL not found in .env');
  process.exit(1);
}
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

// Tabel yang di-restore oleh script ini (FK child only).
// Urutan: parent (Peminjaman) dulu, baru child (DetailPeminjaman, Notifikasi).
// Catatan: User & Barang diasumsikan sudah ada dan valid di DB target
// (tidak disentuh oleh script ini).
const TARGET_TABLES = [
  'Peminjaman',
  'DetailPeminjaman',
  'Notifikasi',
];

// Tabel yang HARUS sudah ada isinya (sebagai FK parent). Script akan cek
// sebelum insert — kalau kosong, abort.
const REQUIRED_PARENTS = {
  User: 'users',
  Barang: 'barang',
};

function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

async function runRestoreInsertOnly(backupFilename) {
  if (!backupFilename) {
    console.error('[RESTORE-IO] Usage: node scripts/restore-insert-only.js <filename>');
    process.exit(1);
  }

  const filepath = path.join(BACKUP_DIR, backupFilename);
  if (!fs.existsSync(filepath)) {
    console.error(`[RESTORE-IO] ❌ Backup file not found: ${backupFilename}`);
    process.exit(1);
  }

  console.log(`[RESTORE-IO] Backup file: ${backupFilename}`);
  console.log(`[RESTORE-IO] Database: ${DATABASE_URL.split('@')[1]?.split('?')[0] || 'current'}`);
  console.log(`[RESTORE-IO] Target tables: ${TARGET_TABLES.join(', ')}`);
  console.log(`[RESTORE-IO] Mode: INSERT-ONLY (no DELETE, no clear, no overwrite of other tables)\n`);

  const ok = await confirm('Type "yes" to confirm INSERT-ONLY restore: ');
  if (!ok) {
    console.log('[RESTORE-IO] Cancelled.');
    process.exit(0);
  }

  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    // 1. Safety gate: pastikan tabel target benar-benar kosong
    console.log('[RESTORE-IO] Pre-check: memastikan tabel target kosong...');
    for (const table of TARGET_TABLES) {
      const modelName = table.charAt(0).toLowerCase() + table.slice(1);
      const count = await prisma[modelName].count();
      if (count > 0) {
        console.error(`[RESTORE-IO] ❌ Tabel ${table} tidak kosong (${count} rows). Script ini hanya untuk tabel kosong.`);
        await prisma.$disconnect();
        process.exit(1);
      }
      console.log(`[RESTORE-IO]   ✓ ${table}: 0 rows`);
    }

    // 2. Safety gate: pastikan parent tables (User, Barang) ada isinya
    console.log('\n[RESTORE-IO] Pre-check: memastikan parent tables ada isinya...');
    for (const [modelName, tableLabel] of Object.entries(REQUIRED_PARENTS)) {
      const lower = modelName.charAt(0).toLowerCase() + modelName.slice(1);
      const count = await prisma[lower].count();
      if (count === 0) {
        console.error(`[RESTORE-IO] ❌ Parent table ${tableLabel} kosong. Tidak ada FK target untuk dirujuk.`);
        await prisma.$disconnect();
        process.exit(1);
      }
      console.log(`[RESTORE-IO]   ✓ ${tableLabel}: ${count} rows (FK target tersedia)`);
    }

    // 3. Baca backup
    console.log('\n[RESTORE-IO] Reading backup file...');
    const backupData = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    console.log(`[RESTORE-IO] Backup created: ${backupData.metadata.createdAt}`);
    console.log(`[RESTORE-IO] Tables in backup: ${Object.keys(backupData.data).join(', ')}`);

    // 4. INSERT — pertahankan id asli
    console.log('\n[RESTORE-IO] Inserting records (id asli dari backup dipertahankan)...');
    let firstError = null;
    for (const table of TARGET_TABLES) {
      const records = backupData.data[table] || [];
      if (records.length === 0) {
        console.log(`[RESTORE-IO]   - ${table}: no data in backup`);
        continue;
      }

      const modelName = table.charAt(0).toLowerCase() + table.slice(1);
      try {
        await prisma[modelName].createMany({ data: records });
        console.log(`[RESTORE-IO]   ✓ Inserted ${table}: ${records.length} records`);
      } catch (e) {
        console.error(`[RESTORE-IO]   ❌ Failed to insert ${table}: ${e.message}`);
        console.error(`[RESTORE-IO]     First record:`, JSON.stringify(records[0]).substring(0, 300));
        if (!firstError) firstError = { table, message: e.message };
        break;
      }
    }

    if (firstError) {
      console.error(`\n[RESTORE-IO] ❌ ABORTED pada tabel ${firstError.table}.`);
      console.error(`[RESTORE-IO]    Tabel yang SEBELUMnya sudah ter-insert akan tetap ada.`);
      console.error(`[RESTORE-IO]    Status parsial perlu ditangani manual.`);
      await prisma.$disconnect();
      process.exit(1);
    }

    // 5. Verifikasi FK integrity pasca-insert
    console.log('\n[RESTORE-IO] Verifying FK integrity...');
    const fk = await verifyFkIntegrity(prisma);
    if (!fk.ok) {
      console.error('[RESTORE-IO] ❌ FK integrity check GAGAL:');
      for (const issue of fk.issues) console.error('  - ' + issue);
      await prisma.$disconnect();
      process.exit(1);
    }
    console.log('[RESTORE-IO]   ✓ FK integrity OK');

    console.log('\n[RESTORE-IO] ✅ INSERT-ONLY restore completed successfully!');
    return { success: true };
  } catch (error) {
    console.error(`[RESTORE-IO] ❌ Restore failed:`, error.message);
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

async function verifyFkIntegrity(prisma) {
  const issues = [];
  const orphanPeminjaman = await prisma.peminjaman.count({
    where: { user: { is: null } },
  });
  if (orphanPeminjaman > 0) issues.push(`peminjaman.userId orphan: ${orphanPeminjaman} rows`);
  const orphanDetailByPeminjaman = await prisma.detailPeminjaman.count({
    where: { peminjaman: { is: null } },
  });
  if (orphanDetailByPeminjaman > 0) issues.push(`detail_peminjaman.peminjamanId orphan: ${orphanDetailByPeminjaman} rows`);
  const orphanDetailByBarang = await prisma.detailPeminjaman.count({
    where: { barang: { is: null } },
  });
  if (orphanDetailByBarang > 0) issues.push(`detail_peminjaman.barangId orphan: ${orphanDetailByBarang} rows`);
  const orphanNotif = await prisma.notifikasi.count({
    where: { user: { is: null } },
  });
  if (orphanNotif > 0) issues.push(`notifikasi.userId orphan: ${orphanNotif} rows`);
  return { ok: issues.length === 0, issues };
}

if (require.main === module) {
  const backupFilename = process.argv[2];
  runRestoreInsertOnly(backupFilename)
    .then((result) => process.exit(result.success ? 0 : 1))
    .catch((err) => {
      console.error('[RESTORE-IO] Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { runRestoreInsertOnly, verifyFkIntegrity };