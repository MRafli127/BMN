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

// Throttle: status keterlambatan cukup disinkronkan berkala, bukan pada
// SETIAP request. Tanpa ini, tiap load dashboard menambah 2 query tulis
// (round-trip ekstra ke DB remote/Neon yang berlatensi tinggi). Granularitas
// menit sudah memadai untuk deteksi TERLAMBAT.
let terakhirTandai = 0;
const JEDA_TANDAI_MS = 60_000;

// Sinkronkan status keterlambatan berdasarkan tanggal.
async function tandaiTerlambat(paksa = false) {
  if (!paksa && Date.now() - terakhirTandai < JEDA_TANDAI_MS) return;
  terakhirTandai = Date.now(); // set optimistis agar request paralel tidak menjalankan ganda

  // Kedua update menyasar baris yang saling lepas (tenggat terisi vs NULL),
  // jadi aman dijalankan paralel → 1 round-trip alih-alih 2.
  await Promise.all([
    // Lewat tenggat -> TERLAMBAT. Peminjaman tanpa tanggal kembali tidak ikut
    // karena nilai NULL tidak terjaring perbandingan 'lt'.
    prisma.peminjaman.updateMany({
      where: {
        status: { in: ['DISETUJUI', 'DIPINJAM'] },
        tanggalKembaliAktual: null,
        tanggalKembaliRencana: { lt: new Date() },
      },
      data: { status: 'TERLAMBAT' },
    }),
    // Pulihkan: peminjaman tanpa tanggal kembali (tanpa batas waktu) yang
    // terlanjur TERLAMBAT dikembalikan ke DIPINJAM.
    prisma.peminjaman.updateMany({
      where: {
        status: 'TERLAMBAT',
        tanggalKembaliAktual: null,
        tanggalKembaliRencana: null,
      },
      data: { status: 'DIPINJAM' },
    }),
  ]);
}

// --- Dashboard Admin ---
const dashboardAdmin = asyncHandler(async (req, res) => {
  await tandaiTerlambat();

  // Filter rentang waktu opsional (berdasarkan tanggal pengajuan)
  const dari = req.query.dari ? new Date(req.query.dari) : null;
  const sampai = req.query.sampai ? new Date(req.query.sampai + 'T23:59:59.999Z') : null;

  const filterTanggal = {};
  if (dari) filterTanggal.gte = dari;
  if (sampai) filterTanggal.lte = sampai;

  const whereTanggal = Object.keys(filterTanggal).length > 0 ? { createdAt: filterTanggal } : {};

  const [totalBarang, stokTersedia, stokHabis, pengajuanMenunggu, peminjamanAktif, barangTerlambat, totalPeminjam, grupStatus, terbaru] =
    await Promise.all([
      prisma.barang.count(),
      // Stok tersedia: barang yang masih punya unit (>0); habis: nol/terpinjam penuh.
      // Sejajar dengan filter ketersediaan di Manajemen Barang.
      prisma.barang.count({ where: { jumlahTersedia: { gt: 0 } } }),
      prisma.barang.count({ where: { jumlahTersedia: { lte: 0 } } }),
      prisma.peminjaman.count({ where: { ...whereTanggal, status: 'MENUNGGU' } }),
      prisma.peminjaman.count({ where: { ...whereTanggal, status: { in: STATUS_AKTIF } } }),
      prisma.peminjaman.count({ where: { ...whereTanggal, status: 'TERLAMBAT' } }),
      prisma.user.count({ where: { role: 'PEMINJAM' } }),
      prisma.peminjaman.groupBy({ by: ['status'], _count: { status: true }, where: whereTanggal }),
      prisma.peminjaman.findMany({
        where: whereTanggal,
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
      statistik: { totalBarang, stokTersedia, stokHabis, pengajuanMenunggu, peminjamanAktif, barangTerlambat, totalPeminjam },
      grafikStatus,
      peminjamanTerbaru: terbaru.map(peminjamanService.serialisasiRingkas),
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
      daftarAktif: daftarAktif.map(peminjamanService.serialisasiRingkas),
      statusTerkini: statusTerkini ? peminjamanService.serialisasiRingkas(statusTerkini) : null,
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
      items: data.map(peminjamanService.serialisasiRingkas),
      meta: { total, page, limit, totalHalaman: Math.ceil(total / limit) || 1 },
    },
  });
});

module.exports = { dashboardAdmin, dashboardPeminjam, ambilDataKategori };
