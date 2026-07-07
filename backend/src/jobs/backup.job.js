// ============================================================
//  Backup Job — Cron Job untuk auto-backup database
//
//  Menjadwalkan backup otomatis setiap jam 00:00 (midnight)
//  Menggunakan Prisma untuk export data ke JSON
// ============================================================

const cron = require('node-cron');
const { runBackup } = require('../../scripts/backup');

const JOB_NAME = 'AUTO_BACKUP';
const CRON_EXPRESSION = '0 0 * * *'; // Jam 00:00 setiap hari
const TIMEZONE = 'Asia/Jakarta';

/**
 * Register the backup job
 */
function register() {
  console.log(`[CRON:${JOB_NAME}] Mendaftarkan cron job...`);
  console.log(`[CRON:${JOB_NAME}] Jadwal: ${CRON_EXPRESSION} (${TIMEZONE})`);

  const task = cron.schedule(CRON_EXPRESSION, async () => {
    console.log(`[CRON:${JOB_NAME}] Memulai backup otomatis...`);

    const startTime = Date.now();

    try {
      const result = await runBackup();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      if (result.success) {
        console.log(`[CRON:${JOB_NAME}] ✅ Backup berhasil! (${duration}s)`);
        console.log(`[CRON:${JOB_NAME}] 📁 File: ${result.filepath}`);
        console.log(`[CRON:${JOB_NAME}] 📊 Records: ${result.recordCount || 'N/A'}`);
      } else {
        console.error(`[CRON:${JOB_NAME}] ❌ Backup gagal: ${result.error}`);
      }
    } catch (error) {
      console.error(`[CRON:${JOB_NAME}] ❌ Error:`, error.message);
    }
  }, {
    timezone: TIMEZONE,
    scheduled: true,
  });

  console.log(`[CRON:${JOB_NAME}] ✅ Cron job berhasil didaftarkan.`);

  return task;
}

module.exports = {
  name: JOB_NAME,
  cronExpression: CRON_EXPRESSION,
  register,
};
