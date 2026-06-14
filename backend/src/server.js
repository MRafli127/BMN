// ============================================================
//  Titik masuk server — menjalankan aplikasi Express.
// ============================================================

const app = require('./app');
const env = require('./config/env');
const logger = require('./utils/logger');
const { prisma, cekKoneksiDatabase } = require('./config/database');

async function mulai() {
  try {
    await cekKoneksiDatabase();

    const server = app.listen(env.port, () => {
      logger.success(`Server SIPP-BMN berjalan di http://localhost:${env.port}`);
      logger.info(`Mode: ${env.nodeEnv} | API: http://localhost:${env.port}/api`);
    });

    // Penutupan server yang rapi (graceful shutdown)
    const matikan = async (sinyal) => {
      logger.warn(`Menerima ${sinyal}, menutup server...`);
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
