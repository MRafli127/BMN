#!/usr/bin/env node
// ============================================================
//  BACKUP SCRIPT — SIPP-BMN
//  Backup database PostgreSQL ke file JSON (schema + data)
//  Compatible dengan Windows/Linux tanpa pg_dump
//
//  Usage:
//    npm run backup          - Backup sekarang
//    npm run backup:list     - Lihat daftar backup
// ============================================================

const { Prisma } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');

// Load environment
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL?.replace(/^["']|["']$/g, '');
if (!DATABASE_URL) {
  console.error('[BACKUP] ❌ DATABASE_URL not found in .env');
  process.exit(1);
}

// Vercel serverless: gunakan /tmp untuk backup ( satu-satunya direktori writable )
const IS_VERCEL = process.env.VERCEL === 'true' || process.env.NODE_ENV === 'production';
const BACKUP_DIR = IS_VERCEL
  ? '/tmp/backups'
  : path.join(__dirname, '..', 'backups');

// Create backup directory if not exists
if (!fs.existsSync(BACKUP_DIR)) {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`[BACKUP] Created directory: ${BACKUP_DIR}`);
  } catch (err) {
    // Ignore error if directory already exists (race condition)
    if (err.code !== 'EEXIST') {
      console.error(`[BACKUP] Warning: Could not create backup directory: ${err.message}`);
    }
  }
}

// Tables to backup (order matters for foreign keys)
const TABLES = [
  'User',
  'Barang',
  'Peminjaman',
  'DetailPeminjaman',
  'NomorSuratCounter',
  'BlacklistedToken',
  'Notifikasi',
  'AuditLog',
];

async function runBackup() {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
  const filename = `backup_${timestamp}.json`;
  const filepath = path.join(BACKUP_DIR, filename);

  console.log(`[BACKUP] Starting backup at ${new Date().toISOString()}`);
  console.log(`[BACKUP] Output file: ${filename}`);

  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  const backupData = {
    metadata: {
      version: '1.0',
      createdAt: new Date().toISOString(),
      app: 'SIPP-BMN',
      tables: TABLES,
    },
    data: {},
  };

  try {
    // Backup each table
    for (const table of TABLES) {
      console.log(`[BACKUP] Exporting ${table}...`);

      // Dynamic query based on table name
      const records = await prisma[table.charAt(0).toLowerCase() + table.slice(1)].findMany({});

      backupData.data[table] = records;
      console.log(`[BACKUP]   ✓ ${records.length} records`);
    }

    // Get schema from prisma
    console.log('[BACKUP] Exporting schema...');
    backupData.metadata.schema = await getSchema();

    // Write to file
    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));

    const stats = fs.statSync(filepath);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);

    console.log(`[BACKUP] ✅ Backup successful!`);
    console.log(`[BACKUP] File: ${filename}`);
    console.log(`[BACKUP] Size: ${sizeMB} MB`);

    // Cleanup old backups (keep last 30 - ~1 month of daily backups)
    cleanupOldBackups(30);

    return { success: true, filepath, size: stats.size, recordCount: Object.values(backupData.data).reduce((a, b) => a + b.length, 0) };
  } catch (error) {
    console.error(`[BACKUP] ❌ Backup failed:`, error.message);
    return { success: false, error: error.message };
  } finally {
    await prisma.$disconnect();
  }
}

// Get Prisma schema as reference
async function getSchema() {
  const schemaPath = path.join(__dirname, '..', 'prisma', 'schema.prisma');
  return fs.readFileSync(schemaPath, 'utf-8');
}

// Cleanup old backups, keep only `keepCount` most recent
function cleanupOldBackups(keepCount) {
  if (!fs.existsSync(BACKUP_DIR)) return;

  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
    .map(f => ({
      name: f,
      path: path.join(BACKUP_DIR, f),
      time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime(),
    }))
    .sort((a, b) => b.time - a.time);

  if (files.length > keepCount) {
    const toDelete = files.slice(keepCount);
    console.log(`[BACKUP] Cleaning up ${toDelete.length} old backup(s)...`);
    toDelete.forEach(f => {
      fs.unlinkSync(f.path);
      console.log(`[BACKUP] Deleted: ${f.name}`);
    });
  }

  console.log(`[BACKUP] Total backups: ${files.length} (keeping last ${keepCount})`);
}

// List all backups
function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('[BACKUP] No backups found.');
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
        size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
        date: stats.mtime.toISOString(),
        records: recordCount,
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  console.log(`[BACKUP] Found ${files.length} backup(s):`);
  files.forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.name}`);
    console.log(`     Size: ${f.size} | Records: ${f.records} | ${f.date}`);
  });

  return files;
}

// Run if called directly
if (require.main === module) {
  const command = process.argv[2];

  if (command === 'list') {
    listBackups();
    process.exit(0);
  }

  runBackup()
    .then(result => process.exit(result.success ? 0 : 1))
    .catch(err => {
      console.error('[BACKUP] Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { runBackup, listBackups, cleanupOldBackups };
