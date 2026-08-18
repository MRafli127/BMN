// ============================================================
//  Script Import Data - Import semua data ke Supabase
//  Untuk migrasi Neon → Supabase
//  Usage: node scripts/import-data.js
//
//  PRASYARAT:
//  1. Pastikan DATABASE_URL di .env sudah mengarah ke Supabase
//  2. Jalankan 'npx prisma db push' terlebih dahulu
//  3. Pastikan folder backup_data/ ada dengan file JSON backup
// ============================================================

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const BACKUP_DIR = path.join(__dirname, '..', 'backup_data');

// Urutan import penting untuk foreign key constraint!
const IMPORT_ORDER = [
  'users',           // 1. Tanpa dependensi
  'barang',          // 2. Tanpa dependensi
  'nomorSuratCounter', // 3. Tanpa dependensi
  'blacklistedTokens', // 4. Tanpa dependensi
  'peminjaman',      // 5. Bergantung ke users
  'detailPeminjaman', // 6. Bergantung ke peminjaman & barang
  'notifikasi',      // 7. Bergantung ke users
  'auditLogs',       // 8. Bergantung ke users
  'importLogs',      // 9. Tanpa dependensi kuat
];

// Mapping nama file backup ke nama model Prisma (HARUS sama persis!)
const COLLECTION_MAP = {
  'users': 'user',
  'barang': 'barang',
  'peminjaman': 'peminjaman',
  'detailPeminjaman': 'detailPeminjaman',
  'notifikasi': 'notifikasi',
  'auditLogs': 'auditLog',
  'importLogs': 'importLog',
  'nomorSuratCounter': 'nomorSuratCounter',
  'blacklistedTokens': 'blacklistedToken',
};

async function loadBackupFile(filename) {
  const filePath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`  ⚠ File tidak ditemukan: ${filename}, skip`);
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

async function clearTable(modelName) {
  try {
    // Dynamically call Prisma model
    const model = prisma[modelName];
    if (model && typeof model.deleteMany === 'function') {
      const result = await model.deleteMany({});
      console.log(`  ✓ Cleared ${modelName}: ${result.count} records deleted`);
    }
  } catch (error) {
    console.log(`  ⚠ Could not clear ${modelName}: ${error.message}`);
  }
}

async function importCollection(collectionKey, data) {
  const modelName = COLLECTION_MAP[collectionKey] || collectionKey;
  const model = prisma[modelName];

  if (!model) {
    console.log(`  ⚠ Model ${modelName} tidak ditemukan di Prisma, skip`);
    return 0;
  }

  if (!Array.isArray(data) || data.length === 0) {
    console.log(`  - ${collectionKey}: 0 records`);
    return 0;
  }

  let imported = 0;
  let errors = 0;

  // Collections dengan nested relations yang perlu di-flatten
  const flatCollections = ['peminjaman'];

  // Default password hash untuk semua user (bcryptjs)
  const defaultPasswordHash = '$2a$10$8T.GY.EAMScYU1g/rn01uOKoI59ZVZcN1coUmDbLx67fC5gxLAGp2';

  for (const item of data) {
    try {
      // Untuk users, exclude password (ada di backup) atau gunakan default
      if (modelName === 'user') {
        const { password, ...userData } = item;
        await model.upsert({
          where: { id: item.id },
          update: { ...userData, password: password || defaultPasswordHash },
          create: { ...userData, password: password || defaultPasswordHash },
        });
      }
      // Untuk peminjaman, flatten nested relations
      else if (flatCollections.includes(collectionKey)) {
        const { detail, peminjam, ...peminjamanData } = item;
        await model.upsert({
          where: { id: item.id },
          update: peminjamanData,
          create: peminjamanData,
        });
      }
      else {
        await model.upsert({
          where: { id: item.id },
          update: item,
          create: item,
        });
      }
      imported++;
    } catch (error) {
      errors++;
      if (errors <= 3) {
        console.log(`  ⚠ Error importing ${modelName} ${item.id}: ${error.message.split('\n')[0]}`);
      }
    }
  }

  console.log(`  ✓ ${collectionKey}: ${imported} imported${errors > 0 ? `, ${errors} errors` : ''}`);
  return imported;
}

async function importAll() {
  console.log('='.repeat(60));
  console.log('IMPORT DATA - Import ke Supabase');
  console.log('='.repeat(60));
  console.log('');
  console.log('PERHATIAN:');
  console.log('- Pastikan DATABASE_URL sudah mengarah ke Supabase');
  console.log('- Jalankan "npx prisma db push" sebelum import');
  console.log('- Folder backup_data/ harus ada dengan file backup');
  console.log('');

  // Cek apakah backup ada
  if (!fs.existsSync(BACKUP_DIR)) {
    console.error('ERROR: Folder backup_data/ tidak ditemukan!');
    console.error('Jalankan script backup-data.js terlebih dahulu.');
    process.exit(1);
  }

  const metadataPath = path.join(BACKUP_DIR, '_metadata.json');
  if (fs.existsSync(metadataPath)) {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    console.log(`Backup dari: ${metadata.timestamp}`);
    console.log(`Database source: ${metadata.databaseProvider}`);
    console.log('');
  }

  const stats = {};
  let totalImported = 0;
  let totalErrors = 0;

  for (const collectionKey of IMPORT_ORDER) {
    console.log(`\n[${collectionKey}]`);

    try {
      // Load data
      const filename = `${collectionKey}.json`;
      const data = await loadBackupFile(filename);

      if (data.length === 0) {
        continue;
      }

      // Option to clear first (uncomment jika ingin clear sebelum import)
      // console.log('  Clearing existing data...');
      // await clearTable(COLLECTION_MAP[collectionKey] || collectionKey);

      // Import data
      const imported = await importCollection(collectionKey, data);
      stats[collectionKey] = imported;
      totalImported += imported;

    } catch (error) {
      console.error(`  ✗ ERROR: ${error.message}`);
      stats[collectionKey] = { error: error.message };
      totalErrors++;
    }
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('IMPORT SELESAI');
  console.log('='.repeat(60));
  console.log('');
  console.log('Statistik:');
  Object.entries(stats).forEach(([key, count]) => {
    if (typeof count === 'object' && count.error) {
      console.log(`  - ${key}: ERROR - ${count.error}`);
    } else {
      console.log(`  - ${key}: ${count} records`);
    }
  });
  console.log('');
  console.log(`Total: ${totalImported} records imported${totalErrors > 0 ? `, ${totalErrors} collections with errors` : ''}`);
  console.log('');

  // Verifikasi
  console.log('Verifikasi data:');
  const userCount = await prisma.user.count();
  const barangCount = await prisma.barang.count();
  const peminjamanCount = await prisma.peminjaman.count();
  console.log(`  - Users: ${userCount}`);
  console.log(`  - Barang: ${barangCount}`);
  console.log(`  - Peminjaman: ${peminjamanCount}`);

  console.log('');
  console.log('CATATAN PENTING:');
  console.log('- Password user TIDAK di-import (hash bcrypt tidak bisa di-transfer)');
  console.log('- User perlu reset password setelah migrasi');
  console.log('- Checklist pasca-migrasi:');
  console.log('  1. Test login dengan user admin (password default: Admin123!)');
  console.log('  2. Test login dengan user lain');
  console.log('  3. Verifikasi semua data tampil dengan benar');
  console.log('  4. Hapus folder backup_data/ jika migrasi berhasil');
  console.log('');

  await prisma.$disconnect();
}

// Menu untuk pilih mode
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: node import-data.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --clear     Clear all tables before import');
  console.log('  --help      Show this help');
  console.log('');
  process.exit(0);
}

importAll()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
