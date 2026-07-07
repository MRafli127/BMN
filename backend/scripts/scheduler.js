#!/usr/bin/env node
// ============================================================
//  AUTOMATED BACKUP SCHEDULER — SIPP-BMN
//  Menjadwalkan backup otomatis menggunakan node-cron
//  Backup berjalan setiap jam 00:00 (midnight)
// ============================================================

const cron = require('node-cron');
const path = require('path');
const fs = require('fs');

// Import backup/restore functions
const { runBackup } = require('./backup');
const { runRestore } = require('./restore');

let backupJob = null;

// Default schedule: setiap hari jam 00:00 (Asia/Jakarta)
const DEFAULT_CRON = '0 0 * * *';

function formatDate(date) {
  return new Date(date).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const prefix = type === 'ERROR' ? '❌' : type === 'SUCCESS' ? '✅' : '📅';
  console.log(`[${timestamp}] ${prefix} [CRON] ${message}`);
}

/**
 * Start the automated backup scheduler
 * @param {string} cronExpression - Cron expression (default: '0 0 * * *' = midnight daily)
 */
function startScheduler(cronExpression = DEFAULT_CRON) {
  if (backupJob) {
    log('Scheduler sudah berjalan, stop dulu sebelum restart', 'WARN');
    stopScheduler();
  }

  // Validate cron expression
  if (!cron.validate(cronExpression)) {
    log(`Invalid cron expression: ${cronExpression}`, 'ERROR');
    return false;
  }

  log(`Starting backup scheduler: ${cronExpression}`);
  log('Jadwal: Setiap hari jam 00:00 (Asia/Jakarta)');

  backupJob = cron.schedule(cronExpression, async () => {
    log('Memulai backup terjadwal...');

    const startTime = Date.now();
    const result = await runBackup();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (result.success) {
      log(`Backup berhasil! (${duration}s)`);
      logToFile({
        type: 'BACKUP_SUCCESS',
        timestamp: new Date().toISOString(),
        duration: `${duration}s`,
        filepath: result.filepath,
        size: result.size,
      });
    } else {
      log(`Backup gagal: ${result.error}`, 'ERROR');
      logToFile({
        type: 'BACKUP_FAILED',
        timestamp: new Date().toISOString(),
        error: result.error,
      });
    }
  }, {
    timezone: 'Asia/Jakarta',
    scheduled: true,
  });

  log('Scheduler berhasil dimulai!');
  return true;
}

/**
 * Stop the scheduler
 */
function stopScheduler() {
  if (backupJob) {
    backupJob.stop();
    backupJob = null;
    log('Scheduler dihentikan');
    return true;
  }
  log('Scheduler tidak sedang berjalan', 'WARN');
  return false;
}

/**
 * Get scheduler status
 */
function getStatus() {
  return {
    running: backupJob !== null,
    nextRun: backupJob ? '00:00 besok' : null, // Simplified
    cronExpression: DEFAULT_CRON,
  };
}

/**
 * Run backup immediately (for testing)
 */
async function runNow() {
  log('Memulai backup manual...');
  const result = await runBackup();
  return result;
}

/**
 * Log events to file for monitoring
 */
function logToFile(data) {
  const logDir = path.join(__dirname, '..', 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const logFile = path.join(logDir, `backup-cron-${new Date().getFullYear()}.json`);
  const entry = JSON.stringify(data) + '\n';

  fs.appendFileSync(logFile, entry);
}

// CLI Interface
if (require.main === module) {
  const command = process.argv[2] || 'status';

  switch (command) {
    case 'start':
      startScheduler();
      break;

    case 'stop':
      stopScheduler();
      break;

    case 'run':
      runNow()
        .then(r => {
          console.log(r.success ? '✅ Backup berhasil!' : '❌ Backup gagal!');
          process.exit(r.success ? 0 : 1);
        })
        .catch(err => {
          console.error('❌ Error:', err);
          process.exit(1);
        });
      break;

    case 'status':
      const status = getStatus();
      console.log('📅 Backup Scheduler Status:');
      console.log(`   Running: ${status.running ? '✅ Ya' : '❌ Tidak'}`);
      console.log(`   Schedule: ${status.cronExpression}`);
      console.log(`   Next Run: ${status.nextRun || 'N/A'}`);
      break;

    default:
      console.log('Usage: node scripts/scheduler.js [start|stop|run|status]');
      break;
  }
}

module.exports = {
  startScheduler,
  stopScheduler,
  getStatus,
  runNow,
  logToFile,
};
