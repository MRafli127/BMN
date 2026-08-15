// ============================================================
//  Controller Export Data
// ============================================================

const { prisma } = require('../config/database');
const exportService = require('../services/export.service');
const { AppError } = require('../middleware/error.middleware');

const includeLengkap = {
  peminjam: { select: { id: true, nama: true, nip: true, email: true, jabatan: true, unitKerja: true } },
  admin: { select: { id: true, nama: true } },
  detail: { include: { barang: true } },
};

// Export peminjaman
const exportPeminjaman = async (req, res) => {
  const { status, dari, sampai, format } = req.query;

  // Build where clause
  const where = {};
  if (status) where.status = status;
  if (dari || sampai) {
    where.tanggalPengajuan = {};
    if (dari) where.tanggalPengajuan.gte = new Date(dari);
    if (sampai) where.tanggalPengajuan.lte = new Date(sampai + 'T23:59:59.999Z');
  }

  const data = await prisma.peminjaman.findMany({
    where,
    include: includeLengkap,
    orderBy: { createdAt: 'desc' },
    // Batasi export untuk performa
    take: 10000,
  });

  const wb = await exportService.exportPeminjaman(data);
  const buffer = exportService.workbookToBuffer(wb);
  const filename = exportService.generateFilename('peminjaman');

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
};

// Export barang
const exportBarang = async (req, res) => {
  const { kodeSatker, kondisi } = req.query;

  const where = {};
  if (kodeSatker) where.kodeSatker = kodeSatker;
  if (kondisi) where.kondisi = kondisi;

  const data = await prisma.barang.findMany({
    where,
    orderBy: { nama: 'asc' },
    take: 10000,
  });

  const wb = await exportService.exportBarang(data);
  const buffer = exportService.workbookToBuffer(wb);
  const filename = exportService.generateFilename('barang');

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
};

// Export users
const exportUsers = async (req, res) => {
  const { role } = req.query;

  const where = {};
  if (role) where.roles = { has: role };

  const data = await prisma.user.findMany({
    where,
    select: {
      id: true,
      nama: true,
      nip: true,
      email: true,
      jabatan: true,
      unitKerja: true,
      roles: true,
      sumber: true,
      createdAt: true,
      _count: {
        select: { peminjaman: true },
      },
    },
    orderBy: { nama: 'asc' },
    take: 10000,
  });

  // Transform data
  const dataReady = data.map((u) => ({
    ...u,
    totalPeminjaman: u._count.peminjaman,
  }));

  const wb = await exportService.exportUsers(dataReady);
  const buffer = exportService.workbookToBuffer(wb);
  const filename = exportService.generateFilename('users');

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
};

module.exports = {
  exportPeminjaman,
  exportBarang,
  exportUsers,
};
