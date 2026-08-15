// ============================================================
//  Titik masuk server — menjalankan aplikasi Express.
// ============================================================

const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const { prisma, cekKoneksiDatabase } = require('./config/database');
const { registerAllJobs } = require('./jobs');

async function mulai() {
  try {
    await cekKoneksiDatabase();

    // Daftarkan cron jobs
    registerAllJobs();

    const server = app.listen(env.port, () => {
      logger.success(`Server SIPP-BMN berjalan di http://localhost:${env.port}`);
      logger.info(`Mode: ${env.nodeEnv} | API: http://localhost:${env.port}/api`);
    });

    // Jaga koneksi DB tetap "hangat". Neon (serverless) menidurkan compute
    // saat idle (scale-to-zero); query pertama setelahnya kena cold start
    // beberapa detik — inilah yang membuat halaman terasa lama saat dibuka.
    // Ping ringan berkala mencegah compute tidur selama server hidup.
    const KEEPALIVE_MS = 4 * 60 * 1000; // 4 menit (di bawah ambang idle ~5 menit)
    const keepAlive = setInterval(() => {
      prisma.$queryRaw`SELECT 1`.catch(() => {});
    }, KEEPALIVE_MS);
    if (typeof keepAlive.unref === 'function') keepAlive.unref();

    // Penutupan server yang rapi (graceful shutdown)
    const matikan = async (sinyal) => {
      logger.warn(`Menerima ${sinyal}, menutup server...`);
      clearInterval(keepAlive);
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('Koneksi database ditutup. Server berhenti.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => matikan('SIGINT'));
    process.on('SIGTERM', () => matikan('SIGTERM'));
  } catch (error) {
    logger.error('Gagal memulai server:', error.message);
    process.exit(1);
  }
}

mulai();
