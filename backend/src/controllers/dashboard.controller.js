// ============================================================
//  Controller Dashboard
//  Menyediakan ringkasan statistik untuk admin & peminjam.
// ============================================================

const { prisma } = require('../config/database');
const { responsSukses } = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/error.middleware');
const peminjamanService = require('../services/peminjaman.service');

const STATUS_AKTIF = ['DISETUJUI', 'DIPINJAM', 'TERLAMBAT'];
const KATEGORI_PEMINJAMAN = {
  SEMUA: null,
  PENGAJUAN_MENUNGGU: 'MENUNGGU',
  PEMINJAMAN_AKTIF: STATUS_AKTIF,
  BARANG_TERLAMBAT: 'TERLAMBAT',
};

// Sinkronkan status keterlambatan berdasarkan tanggal.
async function tandaiTerlambat() {
  // Lewat tenggat -> TERLAMBAT. Peminjaman tanpa tanggal kembali tidak ikut
  // karena nilai NULL tidak terjaring perbandingan 'lt'.
  await prisma.peminjaman.updateMany({
    where: {
      status: { in: ['DISETUJUI', 'DIPINJAM'] },
      tanggalKembaliAktual: null,
      tanggalKembaliRencana: { lt: new Date() },
    },
    data: { status: 'TERLAMBAT' },
  });

  // Pulihkan: peminjaman tanpa tanggal kembali (tanpa batas waktu) yang
  // terlanjur TERLAMBAT dikembalikan ke DIPINJAM.
  await prisma.peminjaman.updateMany({
    where: {
      status: 'TERLAMBAT',
      tanggalKembaliAktual: null,
      tanggalKembaliRencana: null,
    },
    data: { status: 'DIPINJAM' },
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
          detail: { include: { barang: { select: { nama: true, kodeBarang: true } } } },
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
        detail: { include: { barang: { select: { nama: true, fotoUrl: true, kodeBarang: true } } } },
      },
    }),
    prisma.peminjaman.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        peminjam: { select: { nama: true } },
        detail: { include: { barang: { select: { nama: true, kodeBarang: true } } } },
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

// --- Ambil data berdasarkan kategori ---
const ambilDataKategori = asyncHandler(async (req, res) => {
  await tandaiTerlambat();

  // Ambil kategori dari URL params
  const kategori = req.params.kategori;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 10));

  let where = {};
  let data, total;

  switch (kategori) {
    case 'barang':
      // Semua barang
      [data, total] = await Promise.all([
        prisma.barang.findMany({
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.barang.count(),
      ]);
      return responsSukses(res, {
        pesan: 'Data barang.',
        data: { items: data, meta: { total, page, limit, totalHalaman: Math.ceil(total / limit) || 1 } },
      });

    case 'pengajuan_menunggu':
      where = { status: 'MENUNGGU' };
      break;

    case 'peminjaman_aktif':
      where = { status: { in: STATUS_AKTIF } };
      break;

    case 'barang_terlambat':
      where = { status: 'TERLAMBAT' };
      break;

    case 'peminjam': {
      // Semua peminjam (user dengan role PEMINJAM), dengan pencarian opsional.
      // Eselon III tersimpan di unitKerja, Eselon IV di jabatan (lihat import).
      const q = String(req.query.q || '').trim();
      const wherePeminjam = { role: 'PEMINJAM' };
      if (q) {
        wherePeminjam.OR = [
          { nama: { contains: q, mode: 'insensitive' } },
          { nip: { contains: q, mode: 'insensitive' } },
          { unitKerja: { contains: q, mode: 'insensitive' } }, // Eselon III
          { jabatan: { contains: q, mode: 'insensitive' } }, //   Eselon IV
        ];
      }
      [data, total] = await Promise.all([
        prisma.user.findMany({
          where: wherePeminjam,
          select: { id: true, nama: true, nip: true, email: true, jabatan: true, unitKerja: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.user.count({ where: wherePeminjam }),
      ]);
      return responsSukses(res, {
        pesan: 'Data peminjam.',
        data: { items: data, meta: { total, page, limit, totalHalaman: Math.ceil(total / limit) || 1 } },
      });
    }

    default:
      // Default: semua peminjaman
      break;
  }

  [data, total] = await Promise.all([
    prisma.peminjaman.findMany({
      where,
      include: {
        peminjam: { select: { nama: true, nip: true } },
        detail: { include: { barang: { select: { nama: true, kodeBarang: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.peminjaman.count({ where }),
  ]);

  return responsSukses(res, {
    pesan: 'Data peminjaman.',
    data: {
      items: data.map(peminjamanService.serialisasi),
      meta: { total, page, limit, totalHalaman: Math.ceil(total / limit) || 1 },
    },
  });
});

module.exports = { dashboardAdmin, dashboardPeminjam, ambilDataKategori };
