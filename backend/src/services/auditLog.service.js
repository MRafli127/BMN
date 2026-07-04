// ============================================================
//  Service Audit Log
//  Mencatat semua aktivitas penting di sistem untuk tracking,
//  keamanan, dan troubleshooting.
// ============================================================

const { prisma } = require('../config/database');
const { parsePagination } = require('../utils/pagination');
const logger = require('../utils/logger');

// --- Aksi yang didukung ---
const AKSI = {
  // Peminjaman
  PEMINJAMAN_CREATE: 'PEMINJAMAN_CREATE',
  PEMINJAMAN_STATUS_CHANGE: 'PEMINJAMAN_STATUS_CHANGE',
  PEMINJAMAN_DELETE: 'PEMINJAMAN_DELETE',

  // Barang
  BARANG_CREATE: 'BARANG_CREATE',
  BARANG_UPDATE: 'BARANG_UPDATE',
  BARANG_DELETE: 'BARANG_DELETE',
  BARANG_STOK_CHANGE: 'BARANG_STOK_CHANGE',

  // User
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',
  USER_DELETE: 'USER_DELETE',
  USER_PASSWORD_RESET: 'USER_PASSWORD_RESET',

  // Auth
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  REGISTER: 'REGISTER',
};

// --- Entitas yang didukung ---
const ENTITAS = {
  PEMINJAMAN: 'peminjaman',
  BARANG: 'barang',
  USER: 'user',
  AUTH: 'auth',
};

// --- Mapping aksi ke label manusia ---
const LABEL_AKSI = {
  [AKSI.PEMINJAMAN_CREATE]: 'Mengajukan Peminjaman',
  [AKSI.PEMINJAMAN_STATUS_CHANGE]: 'Mengubah Status Peminjaman',
  [AKSI.PEMINJAMAN_DELETE]: 'Menghapus Peminjaman',
  [AKSI.BARANG_CREATE]: 'Menambah Barang',
  [AKSI.BARANG_UPDATE]: 'Memperbarui Barang',
  [AKSI.BARANG_DELETE]: 'Menghapus Barang',
  [AKSI.BARANG_STOK_CHANGE]: 'Mengubah Stok Barang',
  [AKSI.USER_CREATE]: 'Membuat User Baru',
  [AKSI.USER_UPDATE]: 'Memperbarui User',
  [AKSI.USER_DELETE]: 'Menghapus User',
  [AKSI.USER_PASSWORD_RESET]: 'Mereset Password User',
  [AKSI.LOGIN]: 'Login',
  [AKSI.LOGOUT]: 'Logout',
  [AKSI.LOGIN_FAILED]: 'Login Gagal',
  [AKSI.REGISTER]: 'Registrasi',
};

// --- Label manusia untuk entitas ---
const LABEL_ENTITAS = {
  [ENTITAS.PEMINJAMAN]: 'Peminjaman',
  [ENTITAS.BARANG]: 'Barang',
  [ENTITAS.USER]: 'User',
  [ENTITAS.AUTH]: 'Autentikasi',
};

// --- Label status peminjaman ---
const LABEL_STATUS = {
  MENUNGGU: 'Menunggu Persetujuan',
  DISETUJUI: 'Disetujui',
  DITOLAK: 'Ditolak',
  DIPINJAM: 'Sedang Dipinjam',
  DIKEMBALIKAN: 'Dikembalikan',
  TERLAMBAT: 'Terlambat',
};

/**
 * Buat audit log entry.
 * Dipanggil dari service lain setelah aksi berhasil dilakukan.
 *
 * @param {Object} params
 * @param {string} params.userId - ID user yang melakukan aksi (null jika sistem)
 * @param {string} params.userEmail - Email user (snapshot)
 * @param {string} params.userNama - Nama user (snapshot)
 * @param {string} params.aksi - Jenis aksi (dari AKSI)
 * @param {string} params.entitas - Nama entitas (dari ENTITAS)
 * @param {string} [params.entitasId] - ID record yang berubah
 * @param {Object} [params.dataLama] - Data sebelum perubahan
 * @param {Object} [params.dataBaru] - Data setelah perubahan
 * @param {Object} [params.requestInfo] - Info request (ipAddress, userAgent)
 */
async function log({
  userId,
  userEmail,
  userNama,
  aksi,
  entitas,
  entitasId,
  dataLama,
  dataBaru,
  requestInfo = {},
} = {}) {
  try {
    // Validasi parameter wajib
    if (!aksi || !entitas) {
      logger.warn('[AUDIT] Missing required fields: aksi or entitas');
      return null;
    }

    const entry = await prisma.auditLog.create({
      data: {
        userId: userId || null,
        userEmail: userEmail || null,
        userNama: userNama || null,
        aksi,
        entitas,
        entitasId: entitasId || null,
        dataLama: dataLama ? JSON.parse(JSON.stringify(dataLama)) : null,
        dataBaru: dataBaru ? JSON.parse(JSON.stringify(dataBaru)) : null,
        ipAddress: requestInfo.ipAddress || null,
        userAgent: requestInfo.userAgent || null,
      },
    });

    logger.info(`[AUDIT] ${userEmail || 'SYSTEM'}: ${LABEL_AKSI[aksi] || aksi} pada ${LABEL_ENTITAS[entitas] || entitas}`);
    return entry;
  } catch (error) {
    // Audit log gagal tidak boleh menggagalkan operasi utama
    logger.error('[AUDIT] Gagal menyimpan audit log:', error.message);
    return null;
  }
}

/**
 * Log perubahan status peminjaman dengan label yang user-friendly.
 */
async function logStatusPeminjaman({
  userId,
  userEmail,
  userNama,
  peminjamanId,
  statusLama,
  statusBaru,
  requestInfo = {},
} = {}) {
  return log({
    userId,
    userEmail,
    userNama,
    aksi: AKSI.PEMINJAMAN_STATUS_CHANGE,
    entitas: ENTITAS.PEMINJAMAN,
    entitasId: peminjamanId,
    dataLama: { status: statusLama, label: LABEL_STATUS[statusLama] },
    dataBaru: { status: statusBaru, label: LABEL_STATUS[statusBaru] },
    requestInfo,
  });
}

/**
 * Log perubahan stok barang.
 */
async function logStokBarang({
  userId,
  userEmail,
  userNama,
  barangId,
  barangNama,
  stokLama,
  stokBaru,
  perubahan,
  alasan,
  requestInfo = {},
} = {}) {
  return log({
    userId,
    userEmail,
    userNama,
    aksi: AKSI.BARANG_STOK_CHANGE,
    entitas: ENTITAS.BARANG,
    entitasId: barangId,
    dataLama: { stok: stokLama },
    dataBaru: { stok: stokBaru, perubahan, alasan },
    requestInfo,
  });
}

/**
 * Ambil daftar audit log dengan filter & pagination.
 */
async function getSemua({
  entitas,
  aksi,
  userId,
  dari,
  sampai,
  page = 1,
  limit = 50,
} = {}) {
  const { halaman, perHalaman, skip } = parsePagination({ page, limit, defaultLimit: 50 });

  const where = {};

  if (entitas) where.entitas = entitas;
  if (aksi) where.aksi = aksi;
  if (userId) where.userId = userId;

  if (dari || sampai) {
    where.timestamp = {};
    if (dari) where.timestamp.gte = new Date(dari);
    if (sampai) where.timestamp.lte = new Date(sampai + 'T23:59:59.999Z');
  }

  const [data, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (halaman - 1) * perHalaman,
      take: perHalaman,
    }),
    prisma.auditLog.count({ where }),
  ]);

  // Tambahkan label manusia
  const dataDenganLabel = data.map((item) => ({
    ...item,
    labelAksi: LABEL_AKSI[item.aksi] || item.aksi,
    labelEntitas: LABEL_ENTITAS[item.entitas] || item.entitas,
  }));

  return {
    data: dataDenganLabel,
    meta: {
      total,
      page: halaman,
      limit: perHalaman,
      totalHalaman: Math.ceil(total / perHalaman) || 1,
    },
  };
}

/**
 * Ambil satu audit log berdasarkan ID.
 */
async function getById(id) {
  const entry = await prisma.auditLog.findUnique({ where: { id } });
  if (!entry) return null;

  return {
    ...entry,
    labelAksi: LABEL_AKSI[entry.aksi] || entry.aksi,
    labelEntitas: LABEL_ENTITAS[entry.entitas] || entry.entitas,
  };
}

/**
 * Statistik audit log (ringkasan aktivitas).
 */
async function getStatistik({ dari, sampai } = {}) {
  const where = {};
  if (dari || sampai) {
    where.timestamp = {};
    if (dari) where.timestamp.gte = new Date(dari);
    if (sampai) where.timestamp.lte = new Date(sampai + 'T23:59:59.999Z');
  }

  const [total, byEntitas, byAksi, byUser, recentEntries] = await Promise.all([
    prisma.auditLog.count({ where }),
    // Count by entitas
    prisma.auditLog.groupBy({
      by: ['entitas'],
      where,
      _count: { entitas: true },
    }),
    // Count by aksi
    prisma.auditLog.groupBy({
      by: ['aksi'],
      where,
      _count: { aksi: true },
      orderBy: { _count: { aksi: 'desc' } },
      take: 10,
    }),
    // User paling aktif
    prisma.auditLog.groupBy({
      by: ['userId', 'userNama'],
      where: { ...where, userId: { not: null } },
      _count: { userId: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 10,
    }),
    // Recent entries (5 terbaru)
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 5,
    }),
  ]);

  return {
    total,
    byEntitas: byEntitas.map((e) => ({
      entitas: e.entitas,
      label: LABEL_ENTITAS[e.entitas] || e.entitas,
      jumlah: e._count.entitas,
    })),
    byAksi: byAksi.map((a) => ({
      aksi: a.aksi,
      label: LABEL_AKSI[a.aksi] || a.aksi,
      jumlah: a._count.aksi,
    })),
    userPalingAktif: byUser.map((u) => ({
      userId: u.userId,
      userNama: u.userNama,
      jumlah: u._count.userId,
    })),
    recentEntries: recentEntries.map((e) => ({
      ...e,
      labelAksi: LABEL_AKSI[e.aksi] || e.aksi,
      labelEntitas: LABEL_ENTITAS[e.entitas] || e.entitas,
    })),
  };
}

// Helper untuk ekstrak request info dari Express request object
function extractRequestInfo(req) {
  return {
    ipAddress: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || null,
    userAgent: req.get('User-Agent') || null,
  };
}

module.exports = {
  log,
  logStatusPeminjaman,
  logStokBarang,
  getSemua,
  getById,
  getStatistik,
  extractRequestInfo,
  AKSI,
  ENTITAS,
  LABEL_AKSI,
  LABEL_ENTITAS,
  LABEL_STATUS,
};
