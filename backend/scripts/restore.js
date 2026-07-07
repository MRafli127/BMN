#!/usr/bin/env node
// ============================================================
//  RESTORE SCRIPT — SIPP-BMN
//  Restore database dari file JSON backup
//
//  Usage:
//    npm run restore           - Lihat daftar backup
//    npm run restore <filename> - Restore dari backup tertentu
// ============================================================

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Load environment
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL?.replace(/^["']|["']$/g, '');
if (!DATABASE_URL) {
  console.error('[RESTORE] ❌ DATABASE_URL not found in .env');
  process.exit(1);
}
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

// Tables to restore (order matters for foreign keys)
const TABLES = [
  'BlacklistedToken',
  'User',
  'Barang',
  'NomorSuratCounter',
  'Peminjaman',
  'DetailPeminjaman',
  'Notifikasi',
  'AuditLog',
];

function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('[RESTORE] No backups directory found.');
    return [];
  }

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
    .map(f => {
      const stats = fs.statSync(path.join(BACKUP_DIR, f));
      const data = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, f), 'utf-8'));
      const recordCount = Object.values(data.data).reduce((a, b) => a + b.length, 0);
      return {
        name: f,
        path: path.join(BACKUP_DIR, f),
        size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
        date: stats.mtime.toISOString(),
        records: recordCount,
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  console.log(`[RESTORE] Found ${files.length} backup(s):\n`);
  files.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.name}`);
    console.log(`     Size: ${f.size} | Records: ${f.records} | ${f.date}\n`);
  });

  return files;
}

async function runRestore(backupFilename) {
  if (!backupFilename) {
    console.log('[RESTORE] Usage: npm run restore <filename>\n');
    const files = listBackups();
    if (files.length === 0) {
      console.log('No backups found. Run `npm run backup` first.');
    }
    process.exit(1);
  }

  const filepath = path.join(BACKUP_DIR, backupFilename);

  if (!fs.existsSync(filepath)) {
    console.error(`[RESTORE] ❌ Backup file not found: ${backupFilename}`);
    listBackups();
    process.exit(1);
  }

  // Confirmation
  console.log(`[RESTORE] ⚠️  WARNING: This will OVERWRITE the current database!`);
  console.log(`[RESTORE] Backup file: ${backupFilename}`);
  console.log(`[RESTORE] Database: ${DATABASE_URL.split('@')[1]?.split('?')[0] || 'current'}\n`);

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise(resolve => {
    rl.question('Type "yes" to confirm: ', resolve);
  });
  rl.close();

  if (answer.toLowerCase() !== 'yes') {
    console.log('[RESTORE] Cancelled.');
    process.exit(0);
  }

  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    // Read backup file
    console.log('[RESTORE] Reading backup file...');
    const backupData = JSON.parse(fs.readFileSync(filepath, 'utf-8'));

    console.log(`[RESTORE] Backup created: ${backupData.metadata.createdAt}`);
    console.log(`[RESTORE] Tables: ${Object.keys(backupData.data).join(', ')}\n`);

    // Clear existing data
    console.log('[RESTORE] Clearing existing data...');
    for (const table of [...TABLES].reverse()) { // Reverse for foreign key order
      const modelName = table.charAt(0).toLowerCase() + table.slice(1);
      try {
        const count = await prisma[modelName].deleteMany({});
        console.log(`[RESTORE]   ✓ Cleared ${table}: ${count.count} records`);
      } catch (e) {
        // Table might be empty or have constraints
        console.log(`[RESTORE]   - Cleared ${table}`);
      }
    }

    // Restore data
    console.log('\n[RESTORE] Restoring data...');
    for (const table of TABLES) {
      const records = backupData.data[table] || [];
      if (records.length === 0) {
        console.log(`[RESTORE]   - ${table}: no data`);
        continue;
      }

      const modelName = table.charAt(0).toLowerCase() + table.slice(1);
      try {
        // Remove id field from records to let DB generate new IDs
        const recordsToInsert = records.map(({ id, ...rest }) => rest);
        await prisma[modelName].createMany({ data: recordsToInsert });
        console.log(`[RESTORE]   ✓ Restored ${table}: ${records.length} records`);
      } catch (e) {
        console.error(`[RESTORE]   ❌ Failed to restore ${table}: ${e.message}`);
        console.error(`[RESTORE]     First record:`, JSON.stringify(records[0]).substring(0, 200));
      }
    }

    console.log('\n[RESTORE] ✅ Restore completed successfully!');
    return { success: true };
  } catch (error) {
    console.error(`[RESTORE] ❌ Restore failed:`, error.message);
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  const backupFilename = process.argv[2];
  runRestore(backupFilename)
    .then(result => process.exit(result.success ? 0 : 1))
    .catch(err => {
      console.error('[RESTORE] Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { runRestore, listBackups };
