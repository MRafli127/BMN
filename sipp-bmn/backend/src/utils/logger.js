// ============================================================
//  Logger sederhana dengan label & timestamp.
//  Dipakai untuk mencatat aktivitas penting & error.
// ============================================================

function waktuSekarang() {
  return new Date().toISOString();
}

const logger = {
  info: (...args) => console.log(`[INFO] [${waktuSekarang()}]`, ...args),
  warn: (...args) => console.warn(`[PERINGATAN] [${waktuSekarang()}]`, ...args),
  error: (...args) => console.error(`[ERROR] [${waktuSekarang()}]`, ...args),
  success: (...args) => console.log(`[SUKSES] [${waktuSekarang()}]`, ...args),
};

module.exports = logger;
