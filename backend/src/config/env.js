// ============================================================
//  Konfigurasi variabel lingkungan (environment)
//  Memuat .env dan menyediakan nilai default yang aman.
// ============================================================

const dotenv = require('dotenv');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// Muat file .env dari root folder backend
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isProduction = process.env.NODE_ENV === 'production';
const envFilePath = path.resolve(__dirname, '../../.env');

// =============================================================================
//  AUTO-GENERATE JWT SECRETS
//  Sekali generate, simpan ke .env, tidak berubah sampai di-reset manual
// =============================================================================

function ensureJwtSecrets() {
  const accessVar = 'JWT_ACCESS_SECRET';
  const refreshVar = 'JWT_REFRESH_SECRET';

  // Cek apakah secrets sudah ada di .env
  const hasAccessSecret = process.env[accessVar] && process.env[accessVar] !== 'dev_access_secret_minimum_32_chars_xx';
  const hasRefreshSecret = process.env[refreshVar] && process.env[refreshVar] !== 'dev_refresh_secret_minimum_32_chars_yy';

  // Kalau sudah ada, tidak perlu generate ulang
  if (hasAccessSecret && hasRefreshSecret) {
    return;
  }

  // Generate secrets baru
  const newAccessSecret = crypto.randomBytes(32).toString('hex');
  const newRefreshSecret = crypto.randomBytes(32).toString('hex');

  // Baca file .env yang ada
  let envContent = '';
  if (fs.existsSync(envFilePath)) {
    envContent = fs.readFileSync(envFilePath, 'utf8');
  }

  // Update atau tambahkan secrets
  const updateOrAdd = (content, key, value) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      // Update existing
      return content.replace(regex, `${key}=${value}`);
    } else {
      // Add new line
      return content ? `${content.trim()}\n${key}=${value}` : `${key}=${value}`;
    }
  };

  envContent = updateOrAdd(envContent, accessVar, newAccessSecret);
  envContent = updateOrAdd(envContent, refreshVar, newRefreshSecret);

  // Simpan ke .env
  fs.writeFileSync(envFilePath, envContent + '\n', 'utf8');

  // Reload environment variables
  dotenv.config({ path: envFilePath, override: true });

  if (isProduction) {
    console.log('✅ JWT Secrets auto-generated dan disimpan ke .env');
  } else {
    console.log('\n🔐 JWT Secrets baru di-generate:');
    console.log(`   JWT_ACCESS_SECRET=${newAccessSecret}`);
    console.log(`   JWT_REFRESH_SECRET=${newRefreshSecret}`);
    console.log('');
  }
}

// Jalankan auto-generate
ensureJwtSecrets();

// Validasi panjang secret
function validateSecret(secret, name) {
  if (!secret) return null;
  if (secret.length < 32) {
    console.warn(`⚠️  PERINGATAN: ${name} kurang dari 32 karakter. Disarankan menggunakan 64+ karakter.`);
  }
  return secret;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction,
  port: parseInt(process.env.PORT, 10) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  appUrl: process.env.APP_URL || 'http://localhost:5000',

  databaseUrl: process.env.DATABASE_URL,

  jwt: {
    accessSecret: validateSecret(process.env.JWT_ACCESS_SECRET, 'JWT_ACCESS_SECRET'),
    refreshSecret: validateSecret(process.env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Ukuran maksimum file upload (byte)
  maxFileSize: (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 5) * 1024 * 1024,

  // Konfigurasi peminjaman
  peminjaman: {
    maxAktif: parseInt(process.env.MAX_PEMINJAMAN_AKTIF, 10) || 3, // Maksimum peminjaman aktif per user
    maxHari: parseInt(process.env.MAX_HARI_PINJAM, 10) || 365, // Maksimum hari pinjam (opsional, 0 = tidak terbatas)
  },

  // Cookie security - production pakai strict settings
  cookie: {
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
  },

  admin: {
    nama: process.env.ADMIN_NAMA || 'Administrator BMN',
    nip: process.env.ADMIN_NIP || '198001012010011001',
    email: process.env.ADMIN_EMAIL || 'admin@bmn.go.id',
    password: process.env.ADMIN_PASSWORD || 'Admin123!',
  },

  // Petugas BMN penerima pengembalian — ditandatangani secara fisik pada
  // "Surat Pernyataan Pengembalian BMN" sebagai "Yang menerima BMN".
  petugasBmn: {
    nama: process.env.PETUGAS_BMN_NAMA || 'Taufan Sukma Nugraha',
    nip: process.env.PETUGAS_BMN_NIP || '198605132007011001',
    unitKerja: process.env.PETUGAS_BMN_UNIT_KERJA || 'Sekretariat BPPK',
    bagian: process.env.PETUGAS_BMN_BAGIAN || 'Umum',
  },

  // Konfigurasi email/SMTP
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
    from: process.env.SMTP_FROM || '"SIPP-BMN" <noreply@bmn.go.id>',
    // Email admin untuk notifikasi (jika ada pengajuan baru)
    notifyAdmin: process.env.EMAIL_NOTIFY_ADMIN || process.env.ADMIN_EMAIL || 'admin@bmn.go.id',
  },
};

// Helper untuk reset JWT secrets (panggil dari CLI: node -r ./config/env.js reset-secrets)
if (process.argv.includes('reset-secrets')) {
  const fs2 = require('fs');
  if (fs2.existsSync(envFilePath)) {
    let content = fs2.readFileSync(envFilePath, 'utf8');
    content = content.replace(/^JWT_ACCESS_SECRET=.*$/m, 'JWT_ACCESS_SECRET=');
    content = content.replace(/^JWT_REFRESH_SECRET=.*$/m, 'JWT_REFRESH_SECRET=');
    fs2.writeFileSync(envFilePath, content.trim() + '\n', 'utf8');
  }
  console.log('🔄 JWT Secrets di-reset. Jalankan ulang server untuk generate yang baru.');
  process.exit(0);
}

// Peringatkan bila variabel penting belum diisi
if (!env.databaseUrl) {
  console.warn('⚠️  PERINGATAN: DATABASE_URL belum diatur di file .env');
}

module.exports = env;
