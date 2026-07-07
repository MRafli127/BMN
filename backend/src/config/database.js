// ============================================================
//  Koneksi database menggunakan Prisma Client
//  Menggunakan pola singleton agar koneksi tidak berganda
//  saat hot-reload pada mode pengembangan.
// ============================================================

const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

// Simpan instance di global agar tidak membuat koneksi baru berulang kali
const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Fungsi pengecekan koneksi database
async function cekKoneksiDatabase() {
  try {
    await prisma.$connect();
    logger.success('Berhasil terhubung ke database PostgreSQL.');
  } catch (error) {
    logger.error('Gagal terhubung ke database:', error.message);
    throw error;
  }
}

module.exports = { prisma, cekKoneksiDatabase };
