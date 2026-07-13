// ============================================================
//  Script Backup Data - Ekspor semua data dari database
//  Untuk migrasi Neon → Supabase
//  Usage: node scripts/backup-data.js
// ============================================================

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();
const BACKUP_DIR = path.join(__dirname, '..', 'backup_data');

// Pastikan folder backup ada
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

async function backupCollection(collectionName, data) {
  const filePath = path.join(BACKUP_DIR, `${collectionName}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`✓ Saved ${collectionName}: ${data.length} records`);
  return data.length;
}

async function exportAll() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  console.log('='.repeat(60));
  console.log('BACKUP DATA - Export dari Database');
  console.log(`Timestamp: ${timestamp}`);
  console.log('='.repeat(60));
  console.log('');

  try {
    // Export semua koleksi
    const stats = {};

    // 1. Users (tanpa password hash untuk keamanan backup)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        nama: true,
        nip: true,
        email: true,
        jabatan: true,
        unitKerja: true,
        eselon2: true,
        eselon3: true,
        eselon4: true,
        roles: true,
        sumber: true,
        tokenVersion: true,
        retirementDate: true,
        lastActivityAt: true,
        sessionInvalidatedAt: true,
        createdAt: true,
        updatedAt: true,
        // Exclude: password
      }
    });
    stats.users = await backupCollection('users', users);

    // 2. Barang
    const barang = await prisma.barang.findMany();
    stats.barang = await backupCollection('barang', barang);

    // 3. Peminjaman dengan relasi
    const peminjaman = await prisma.peminjaman.findMany({
      include: {
        detail: true,
        peminjam: {
          select: {
            id: true,
            nama: true,
            nip: true,
            email: true
          }
        }
      }
    });
    stats.peminjaman = await backupCollection('peminjaman', peminjaman);

    // 4. Detail Peminjaman (jika ada yang orphan)
    const detailPeminjaman = await prisma.detailPeminjaman.findMany();
    stats.detailPeminjaman = await backupCollection('detailPeminjaman', detailPeminjaman);

    // 5. Notifikasi
    const notifikasi = await prisma.notifikasi.findMany();
    stats.notifikasi = await backupCollection('notifikasi', notifikasi);

    // 6. Audit Logs
    const auditLogs = await prisma.auditLog.findMany();
    stats.auditLogs = await backupCollection('auditLogs', auditLogs);

    // 7. Import Logs
    const importLogs = await prisma.importLog.findMany();
    stats.importLogs = await backupCollection('importLogs', importLogs);

    // 8. Nomor Surat Counter
    const nomorSuratCounter = await prisma.nomorSuratCounter.findMany();
    stats.nomorSuratCounter = await backupCollection('nomorSuratCounter', nomorSuratCounter);

    // 9. Blacklisted Tokens
    const blacklistedTokens = await prisma.blacklistedToken.findMany();
    stats.blacklistedTokens = await backupCollection('blacklistedTokens', blacklistedTokens);

    // Simpan metadata backup
    const metadata = {
      timestamp: new Date().toISOString(),
      databaseProvider: 'neon',
      prismaSchema: 'postgresql',
      stats: stats,
      note: 'Password hashes sengaja tidak di-export untuk keamanan. Password user tidak perlu di-restore karena autentikasi tetap menggunakan hash.'
    };
    fs.writeFileSync(path.join(BACKUP_DIR, '_metadata.json'), JSON.stringify(metadata, null, 2));

    console.log('');
    console.log('='.repeat(60));
    console.log('BACKUP SELESAI');
    console.log('='.repeat(60));
    console.log('');
    console.log('File backup tersimpan di:', BACKUP_DIR);
    console.log('');
    console.log('Statistik:');
    Object.entries(stats).forEach(([key, count]) => {
      console.log(`  - ${key}: ${count} records`);
    });
    console.log('');
    console.log('LANGKAH SELANJUTNYA:');
    console.log('1. Copy folder backup_data ke lokasi aman');
    console.log('2. Jalankan script import ke Supabase setelah setup');
    console.log('3. Hapus folder backup_data setelah migrasi selesai');
    console.log('');

  } catch (error) {
    console.error('ERROR during backup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

exportAll()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
