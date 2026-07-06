// ============================================================
//  Cron Jobs Registry
//
//  mendaftarkan semua cron job yang ada di aplikasi.
//  Dipanggil oleh server.js saat aplikasi start.
// ============================================================

const notifikasiPensiunJob = require('./notifikasiPensiun.job');

/**
 * Daftarkan semua cron jobs
 * Semua job akan berjalan otomatis sesuai jadwal masing-masing
 */
function registerAllJobs() {
  console.log('[CRON] Memulai registrasi cron jobs...');

  // Daftar semua cron job
  const jobs = [
    notifikasiPensiunJob,
  ];

  // Register setiap job
  const registeredTasks = [];
  for (const job of jobs) {
    if (job && typeof job.register === 'function') {
      const task = job.register();
      registeredTasks.push(task);
      console.log(`[CRON] ✓ ${job.constructor?.name || 'job'} berhasil didaftarkan`);
    }
  }

  console.log(`[CRON] Total cron jobs terdaftar: ${registeredTasks.length}`);
  console.log('[CRON] Registrasi cron jobs selesai.');
  console.log('');

  return registeredTasks;
}

module.exports = {
  registerAllJobs,
};
