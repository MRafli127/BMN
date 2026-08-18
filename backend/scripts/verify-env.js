#!/usr/bin/env node
// ============================================================
//  Verify Environment Script
//  Memeriksa apakah konfigurasi environment valid dan aman.
//  Jalankan: npm run verify-env
// ============================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT_DIR, '.env');

const MIN_SECRET_LENGTH = 32;
const MIN_PASSWORD_LENGTH = 8;

function check(name, status, details = '') {
  const icon = status === '✅' ? '\x1b[32m✅\x1b[0m' :
               status === '⚠️' ? '\x1b[33m⚠️\x1b[0m' :
               status === '❌' ? '\x1b[31m❌\x1b[0m' : 'ℹ️ ';
  console.log(`  ${icon} ${name}${details}`);
}

function main() {
  console.log('\n================================================');
  console.log('  SIPP-BMN Environment Verification');
  console.log('================================================\n');

  let envContent = '';
  let envExists = fs.existsSync(ENV_FILE);

  console.log('📁 File .env:');
  if (!envExists) {
    console.log('  ❌ File .env tidak ditemukan!\n');
    console.log('  Jalankan setup untuk membuat .env:');
    console.log('    npm run setup\n');
    process.exit(1);
  }
  console.log('  ✅ Ditemukan\n');

  envContent = fs.readFileSync(ENV_FILE, 'utf-8');

  // Parse .env
  const lines = envContent.split('\n');
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
  }

  // ============ SECTION 1: JWT Secrets ============
  console.log('🔐 JWT Secrets:');

  const accessSecret = env.JWT_ACCESS_SECRET || '';
  const refreshSecret = env.JWT_REFRESH_SECRET || '';
  const isProduction = (env.NODE_ENV || 'development') === 'production';

  // Access Secret
  if (!accessSecret) {
    check('JWT_ACCESS_SECRET', '❌', ' - TIDAK ADA!');
    if (isProduction) {
      console.log('    ❌ FATAL: WAJIB diisi di production!');
    } else {
      console.log('    ⚠️ Akan auto-generate saat startup (development only)');
    }
  } else if (accessSecret.includes('default') || accessSecret.includes('secret') ||
             accessSecret.includes('GANTI') || accessSecret.includes('change')) {
    check('JWT_ACCESS_SECRET', '⚠️', ' - Menggunakan placeholder!');
    console.log(`    ⚠️ Nilai terlihat seperti placeholder. Sebaiknya ganti.`);
  } else if (accessSecret.length < MIN_SECRET_LENGTH) {
    check('JWT_ACCESS_SECRET', '⚠️', ` - Terlalu pendek (${accessSecret.length}/${MIN_SECRET_LENGTH} chars)`);
  } else {
    check('JWT_ACCESS_SECRET', '✅', ` - ${accessSecret.length} chars`);
  }

  // Refresh Secret
  if (!refreshSecret) {
    check('JWT_REFRESH_SECRET', '❌', ' - TIDAK ADA!');
    if (isProduction) {
      console.log('    ❌ FATAL: WAJIB diisi di production!');
    } else {
      console.log('    ⚠️ Akan auto-generate saat startup (development only)');
    }
  } else if (refreshSecret.includes('default') || refreshSecret.includes('secret') ||
             refreshSecret.includes('GANTI') || refreshSecret.includes('change')) {
    check('JWT_REFRESH_SECRET', '⚠️', ' - Menggunakan placeholder!');
  } else if (refreshSecret.length < MIN_SECRET_LENGTH) {
    check('JWT_REFRESH_SECRET', '⚠️', ` - Terlalu pendek (${refreshSecret.length}/${MIN_SECRET_LENGTH} chars)`);
  } else {
    check('JWT_REFRESH_SECRET', '✅', ` - ${refreshSecret.length} chars`);
  }

  // Secret uniqueness
  if (accessSecret && refreshSecret && accessSecret === refreshSecret) {
    check('Secret Uniqueness', '⚠️', ' - Access & Refresh secret SAMA!');
    console.log('    ⚠️ Sebaiknya gunakan secret berbeda untuk access dan refresh token.');
  } else if (accessSecret && refreshSecret) {
    check('Secret Uniqueness', '✅', ' - Access & Refresh berbeda');
  }

  console.log('');

  // ============ SECTION 2: Database ============
  console.log('🗄️  Database:');

  if (!env.DATABASE_URL) {
    check('DATABASE_URL', '❌', ' - TIDAK ADA!');
  } else if (env.DATABASE_URL.includes('password') || env.DATABASE_URL.includes('your_password')) {
    check('DATABASE_URL', '⚠️', ' - Menggunakan password default/placeholder!');
  } else {
    // Mask password in URL
    const maskedUrl = env.DATABASE_URL.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
    check('DATABASE_URL', '✅', ` - ${maskedUrl.substring(0, 50)}...`);
  }
  console.log('');

  // ============ SECTION 3: Security Headers ============
  console.log('🛡️  Security:');

  // Node Environment
  if (!env.NODE_ENV) {
    check('NODE_ENV', '⚠️', ' - Default ke "development"');
  } else if (env.NODE_ENV === 'production') {
    check('NODE_ENV', '✅', ' - Production mode');
  } else if (env.NODE_ENV === 'development') {
    check('NODE_ENV', 'ℹ️', ' - Development mode');
  } else {
    check('NODE_ENV', '⚠️', ` - "${env.NODE_ENV}" (akan dianggap development)`);
  }

  // CORS
  if (!env.CLIENT_URL) {
    check('CLIENT_URL (CORS)', '⚠️', ' - Default ke localhost:3000');
  } else {
    check('CLIENT_URL (CORS)', '✅', ` - ${env.CLIENT_URL}`);
  }

  // File Size
  const maxFileSize = parseInt(env.MAX_FILE_SIZE_MB, 10) || 5;
  if (maxFileSize > 10) {
    check('MAX_FILE_SIZE_MB', '⚠️', ` - ${maxFileSize}MB (cukup besar, pastikan perlu)`);
  } else {
    check('MAX_FILE_SIZE_MB', '✅', ` - ${maxFileSize}MB`);
  }

  console.log('');

  // ============ SECTION 4: Admin Account ============
  console.log('👤 Admin Account:');

  if (!env.ADMIN_EMAIL) {
    check('ADMIN_EMAIL', '⚠️', ' - Default ke admin@bmn.go.id');
  } else {
    check('ADMIN_EMAIL', '✅', ` - ${env.ADMIN_EMAIL}`);
  }

  if (!env.ADMIN_PASSWORD) {
    check('ADMIN_PASSWORD', '❌', ' - TIDAK ADA!');
  } else if (env.ADMIN_PASSWORD.length < MIN_PASSWORD_LENGTH) {
    check('ADMIN_PASSWORD', '⚠️', ` - Terlalu pendek (${env.ADMIN_PASSWORD.length} chars)`);
  } else if (env.ADMIN_PASSWORD === 'Admin123!' || env.ADMIN_PASSWORD === 'admin123' || env.ADMIN_PASSWORD === 'password') {
    check('ADMIN_PASSWORD', '⚠️', ' - Menggunakan password default!');
    console.log('    ⚠️ SEGERA ganti password admin di production!');
  } else {
    check('ADMIN_PASSWORD', '✅', ` - ${'*'.repeat(env.ADMIN_PASSWORD.length)} (${env.ADMIN_PASSWORD.length} chars)`);
  }

  console.log('');

  // ============ SUMMARY ============
  console.log('================================================');

  const hasErrors = !accessSecret || !refreshSecret || !env.DATABASE_URL;
  const hasWarnings = accessSecret.includes('GANTI') || refreshSecret.includes('GANTI') ||
                      env.ADMIN_PASSWORD === 'Admin123!';

  if (isProduction && hasErrors) {
    console.log('❌ STATUS: TIDAK AMAN untuk Production!');
    console.log('   Perbaiki error di atas sebelum deploy.\n');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('⚠️  STATUS: Perlu Perhatian');
    console.log('   Beberapa konfigurasi sebaiknya diperbaiki.\n');
  } else {
    console.log('✅ STATUS: KONFIGURASI AMAN\n');
  }

  if (isProduction) {
    console.log('💡 Tips untuk Production:');
    console.log('   - Pastikan .env di-backup di tempat yang aman');
    console.log('   - Gunakan environment variables dari hosting provider');
    console.log('   - Aktifkan HTTPS/SSL');
    console.log('   - Monitor error logs secara reguler\n');
  }
}

main();
