// ============================================================
//  Konfigurasi variabel lingkungan (environment)
//  Memuat .env dan menyediakan nilai default yang aman.
// ============================================================

const dotenv = require('dotenv');
const path = require('path');

// Muat file .env dari root folder backend
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  appUrl: process.env.APP_URL || 'http://localhost:5000',

  databaseUrl: process.env.DATABASE_URL,

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'access_secret_default',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh_secret_default',
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
  console.warn('⚠️  PERINGATAN: DATABASE_URL belum diatur di file .env');
}

module.exports = env;
