#!/usr/bin/env node
// ============================================================
//  Setup Script - Generate .env dengan JWT secrets aman
//  Jalankan: node scripts/setup-env.js
// ============================================================

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT_DIR, '.env');
const ENV_EXAMPLE = path.join(ROOT_DIR, '.env.example');

function generateSecret() {
  return crypto.randomBytes(32).toString('hex');
}

function warn(message) {
  console.log(`\x1b[33m[WARNING]\x1b[0m ${message}`);
}

function info(message) {
  console.log(`\x1b[36m[INFO]\x1b[0m ${message}`);
}

function success(message) {
  console.log(`\x1b[32m[SUCCESS]\x1b[0m ${message}`);
}

function error(message) {
  console.log(`\x1b[31m[ERROR]\x1b[0m ${message}`);
}

function main() {
  console.log('\n================================================');
  console.log('  SIPP-BMN Environment Setup');
  console.log('================================================\n');

  // Cek apakah .env sudah ada
  if (fs.existsSync(ENV_FILE)) {
    warn('File .env sudah ada!');
    console.log('  Jika ingin me-reset, hapus .env terlebih dahulu.\n');

    // Cek apakah JWT secrets valid
    const envContent = fs.readFileSync(ENV_FILE, 'utf-8');
    const hasAccessSecret = /JWT_ACCESS_SECRET=.{32,}/.test(envContent);
    const hasRefreshSecret = /JWT_REFRESH_SECRET=.{32,}/.test(envContent);

    if (hasAccessSecret && hasRefreshSecret) {
      success('JWT secrets sudah ter-set dengan benar!');
    } else {
      warn('JWT secrets mungkin tidak valid. Jalankan setup ulang:');
      console.log('  1. Hapus file .env');
      console.log('  2. Jalankan: node scripts/setup-env.js\n');
    }

    console.log('Untuk verifikasi environment, jalankan: npm run verify-env\n');
    return;
  }

  // Cek apakah .env.example ada
  if (!fs.existsSync(ENV_EXAMPLE)) {
    error(`File ${ENV_EXAMPLE} tidak ditemukan!`);
    console.log('Pastikan Anda menjalankan script dari folder backend.\n');
    process.exit(1);
  }

  // Generate secrets baru
  const accessSecret = generateSecret();
  const refreshSecret = generateSecret();

  // Baca .env.example
  let envContent = fs.readFileSync(ENV_EXAMPLE, 'utf-8');

  // Replace JWT secrets dengan yang baru
  envContent = envContent.replace(
    /JWT_ACCESS_SECRET=GENERATE_.*/,
    `JWT_ACCESS_SECRET=${accessSecret}`
  );
  envContent = envContent.replace(
    /JWT_REFRESH_SECRET=GENERATE_.*/,
    `JWT_REFRESH_SECRET=${refreshSecret}`
  );

  // Tulis .env
  fs.writeFileSync(ENV_FILE, envContent, 'utf-8');

  console.log('================================================');
  console.log('  Setup Selesai!');
  console.log('================================================\n');

  success('File .env telah dibuat dengan JWT secrets aman!\n');

  console.log(`JWT_ACCESS_SECRET = ${accessSecret.substring(0, 20)}...`);
  console.log(`JWT_REFRESH_SECRET = ${refreshSecret.substring(0, 20)}...\n`);

  console.log('\x1b[33m[⚠️  IMPORTANT]\x1b[0m');
  console.log('  - JANGAN pernah commit .env ke git!');
  console.log('  - Simpan backup .env di tempat yang aman!');
  console.log('  - File ini sudah ada di .gitignore\n');

  console.log('[NEXT] Langkah selanjutnya:');
  console.log('  1. Setup database:');
  console.log('     npm run prisma:migrate');
  console.log('  2. Seed admin user:');
  console.log('     npm run seed');
  console.log('  3. Start server:');
  console.log('     npm run dev\n');
}

main();
