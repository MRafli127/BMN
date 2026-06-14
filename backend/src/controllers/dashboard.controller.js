// ============================================================
//  Controller Dashboard
//  Menyediakan ringkasan statistik untuk admin & peminjam.
// ============================================================

const { prisma } = require('../config/database');
const { responsSukses } = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/error.middleware');
const peminjamanService = require('../services/peminjaman.service');

const STATUS_AKTIF = ['DISETUJUI', 'DIPINJAM', 'TERLAMBAT'];

// Tandai peminjaman yang sudah lewat tanggal kembali menjadi TERLAMBAT
async function tandaiTerlambat() {
  await prisma.peminjaman.updateMany({
    where: {
      status: { in: ['DISETUJUI', 'DIPINJAM'] },
      tanggalKembaliAktual: null,
      tanggalKembaliRencana: { lt: new Date() },
    },
    data: { status: 'TERLAMBAT' },
  });
}

// --- Dashboard Admin ---
const dashboardAdmin = asyncHandler(async (req, res) => {
  await tandaiTerlambat();

  const [totalBarang, pengajuanMenunggu, peminjamanAktif, barangTerlambat, totalPeminjam, grupStatus, terbaru] =
    await Promise.all([
      prisma.barang.count(),
      prisma.peminjaman.count({ where: { status: 'MENUNGGU' } }),
      prisma.peminjaman.count({ where: { status: { in: STATUS_AKTIF } } }),
      prisma.peminjaman.count({ where: { status: 'TERLAMBAT' } }),
      prisma.user.count({ where: { role: 'PEMINJAM' } }),
      prisma.peminjaman.groupBy({ by: ['status'], _count: { status: true } }),
      prisma.peminjaman.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          peminjam: { select: { nama: true, nip: true } },
          detail: { include: { barang: { select: { nama: true } } } },
        },
      }),
    ]);

  // Susun data grafik ringkasan per status
  const semuaStatus = ['MENUNGGU', 'DISETUJUI', 'DIPINJAM', 'DIKEMBALIKAN', 'TERLAMBAT', 'DITOLAK'];
  const petaStatus = Object.fromEntries(grupStatus.map((g) => [g.status, g._count.status]));
  const grafikStatus = semuaStatus.map((s) => ({ status: s, jumlah: petaStatus[s] || 0 }));

  return responsSukses(res, {
    pesan: 'Ringkasan dashboard admin.',
    data: {
      statistik: { totalBarang, pengajuanMenunggu, peminjamanAktif, barangTerlambat, totalPeminjam },
      grafikStatus,
      peminjamanTerbaru: terbaru.map(peminjamanService.serialisasi),
    },
  });
});

// --- Dashboard Peminjam ---
const dashboardPeminjam = asyncHandler(async (req, res) => {
  await tandaiTerlambat();
  const userId = req.user.id;

  const [peminjamanAktif, menunggu, dikembalikan, totalRiwayat, daftarAktif, statusTerkini] = await Promise.all([
    prisma.peminjaman.count({ where: { userId, status: { in: STATUS_AKTIF } } }),
    prisma.peminjaman.count({ where: { userId, status: 'MENUNGGU' } }),
    prisma.peminjaman.count({ where: { userId, status: 'DIKEMBALIKAN' } }),
    prisma.peminjaman.count({ where: { userId } }),
    prisma.peminjaman.findMany({
      where: { userId, status: { in: STATUS_AKTIF } },
      orderBy: { tanggalKembaliRencana: 'asc' },
      take: 5,
      include: {
        peminjam: { select: { nama: true } },
        detail: { include: { barang: { select: { nama: true, fotoUrl: true } } } },
      },
    }),
    prisma.peminjaman.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        peminjam: { select: { nama: true } },
        detail: { include: { barang: { select: { nama: true } } } },
      },
    }),
  ]);

  return responsSukses(res, {
    pesan: 'Ringkasan dashboard peminjam.',
    data: {
      statistik: { peminjamanAktif, menunggu, dikembalikan, totalRiwayat },
      daftarAktif: daftarAktif.map(peminjamanService.serialisasi),
      statusTerkini: statusTerkini ? peminjamanService.serialisasi(statusTerkini) : null,
    },
  });
});

module.exports = { dashboardAdmin, dashboardPeminjam };
