// ============================================================
//  Konfigurasi variabel lingkungan (environment)
//  Memuat .env dan menyediakan nilai default yang aman.
//  Auto-generate JWT secrets jika tidak ada.
// ============================================================

const crypto = require('crypto');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Minimum 32 karakter untuk keamanan yang memadai (256-bit)
const MIN_SECRET_LENGTH = 32;

// Path ke file .env (bisa override via ENV_CONFIG_PATH)
const ENV_PATH = process.env.ENV_CONFIG_PATH || path.resolve(__dirname, '../../.env');

// Generate secret acak
function generateSecret() {
  return crypto.randomBytes(32).toString('hex');
}

// Baca isi file .env saat ini
function bacaEnv() {
  if (fs.existsSync(ENV_PATH)) {
    const content = fs.readFileSync(ENV_PATH, 'utf-8');
    const result = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const idx = trimmed.indexOf('=');
        if (idx > 0) {
          const key = trimmed.substring(0, idx).trim();
          const value = trimmed.substring(idx + 1).trim();
          result[key] = value;
        }
      }
    }
    return result;
  }
  return {};
}

// Simpan key=value ke file .env
function simpanKeEnv(key, value) {
  try {
    let content = '';
    if (fs.existsSync(ENV_PATH)) {
      content = fs.readFileSync(ENV_PATH, 'utf-8');
    }

    // Cek apakah key sudah ada
    const pattern = new RegExp(`^${key}=.*$`, 'm');
    if (pattern.test(content)) {
      // Replace existing
      content = content.replace(pattern, `${key}=${value}`);
    } else {
      // Append new
      content += (content.endsWith('\n') ? '' : '\n') + `${key}=${value}\n`;
    }

    fs.writeFileSync(ENV_PATH, content, 'utf-8');
    return true;
  } catch (err) {
    console.error(`Gagal menyimpan ${key} ke .env:`, err.message);
    return false;
  }
}

// Cek apakah secret perlu auto-generate
function butuhGenerate(nilai) {
  if (!nilai || nilai.trim() === '') return true;

  const lowerNilai = nilai.toLowerCase();
  const placeholder = ['default', 'secret', 'ganti', 'generate', 'change', 'please_replace', 'your_', 'placeholder', 'xxx'];
  for (const p of placeholder) {
    if (lowerNilai.includes(p)) return true;
  }

  return false;
}

// Validasi dan generate JWT secret
function prosesJwtSecret(nama, nilai, isProduction) {
  const varName = nama === 'JWT_ACCESS_SECRET' ? 'JWT_ACCESS_SECRET' : 'JWT_REFRESH_SECRET';

  // Cek apakah perlu generate
  if (butuhGenerate(nilai)) {
    if (isProduction) {
      const hint = nama === 'JWT_ACCESS_SECRET'
        ? 'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
        : 'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"';

      throw new Error(
        `❌ FATAL: ${varName} WAJIB diisi di production!\n` +
        `   Generate secret aman:\n` +
        `   ${hint}\n` +
        `   Atau jalankan: npm run setup`
      );
    }

    // Development: auto-generate + save
    const generated = generateSecret();
    console.log(`🔑 Auto-generating ${varName}...`);

    if (simpanKeEnv(varName, generated)) {
      console.log(`   ✅ Saved ke .env`);
    } else {
      console.log(`   ⚠️  Gagal simpan, pakai in-memory (akan beda setiap restart)`);
    }

    return generated;
  }

  // Validasi panjang
  if (nilai.length < MIN_SECRET_LENGTH) {
    if (isProduction) {
      throw new Error(
        `❌ FATAL: ${varName} terlalu pendek (${nilai.length}/${MIN_SECRET_LENGTH} chars).\n` +
        `   Minimum ${MIN_SECRET_LENGTH} karakter diperlukan untuk keamanan.`
      );
    }
    console.warn(`⚠️  ${varName} terlalu pendek (${nilai.length}/${MIN_SECRET_LENGTH} chars).`);
  }

  return nilai;
}

// Muat dotenv SEBELUM kita proses agar dapat nilai saat ini
dotenv.config({ path: ENV_PATH });

const isProduction = (process.env.NODE_ENV || 'development') === 'production';

// Load existing .env values
const envLama = bacaEnv();

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  appUrl: process.env.APP_URL || 'http://localhost:5000',

  databaseUrl: process.env.DATABASE_URL,

  jwt: {
    accessSecret: prosesJwtSecret(
      'JWT_ACCESS_SECRET',
      envLama.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET,
      isProduction
    ),
    refreshSecret: prosesJwtSecret(
      'JWT_REFRESH_SECRET',
      envLama.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET,
      isProduction
    ),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Ukuran maksimum file upload (byte)
  maxFileSize: (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 5) * 1024 * 1024,

  admin: {
    nama: process.env.ADMIN_NAMA || 'Administrator BMN',
    nip: process.env.ADMIN_NIP || '198001012010011001',
    email: process.env.ADMIN_EMAIL || 'admin@bmn.go.id',
    password: process.env.ADMIN_PASSWORD || 'Admin123!',
  },
};

// Peringatkan bila variabel penting belum diisi
if (!env.databaseUrl) {
  if (isProduction) {
    console.error('❌ FATAL: DATABASE_URL belum diatur di .env!');
    console.error('   Set DATABASE_URL dengan connection string PostgreSQL Anda.');
    process.exit(1);
  }
  console.warn('⚠️  PERINGATAN: DATABASE_URL belum diatur di file .env');
}

// Catat startup info (tidak log secret)
console.log(`📦 SIPP-BMN Config: Node=${env.nodeEnv}, Port=${env.port}`);

module.exports = env;
