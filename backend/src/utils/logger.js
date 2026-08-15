// ============================================================
//  Logger sederhana dengan label & timestamp.
//  Dipakai untuk mencatat aktivitas penting & error.
//  DI DEVELOPMENT: log semua
//  DI PRODUCTION: hanya warn & error (silent untuk info/success)
// ============================================================

const isProduction = process.env.NODE_ENV === 'production';

function waktuSekarang() {
  return new Date().toISOString();
}

const logger = {
  info: (...args) => {
    if (!isProduction) console.log(`[INFO] [${waktuSekarang()}]`, ...args);
  },
  warn: (...args) => {
    if (!isProduction) console.warn(`[WARN] [${waktuSekarang()}]`, ...args);
    else console.warn(...args);
  },
  error: (...args) => {
    if (!isProduction) console.error(`[ERROR] [${waktuSekarang()}]`, ...args);
    else console.error(...args);
  },
  success: (...args) => {
    if (!isProduction) console.log(`[OK] [${waktuSekarang()}]`, ...args);
  },
};

module.exports = logger;
