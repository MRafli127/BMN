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

  // Peminjaman - Aksi spesifik per status
  PEMINJAMAN_MENUNGGU: 'PEMINJAMAN_MENUNGGU',
  PEMINJAMAN_DISETUJUI: 'PEMINJAMAN_DISETUJUI',
  PEMINJAMAN_DITOLAK: 'PEMINJAMAN_DITOLAK',
  PEMINJAMAN_DISERAHKAN: 'PEMINJAMAN_DISERAHKAN',
  PEMINJAMAN_MEMINTA_PENGEMBALIAN: 'PEMINJAMAN_MEMINTA_PENGEMBALIAN',
  PEMINJAMAN_DIKEMBALIKAN: 'PEMINJAMAN_DIKEMBALIKAN',
  PEMINJAMAN_DIBATALKAN: 'PEMINJAMAN_DIBATALKAN',

  // Barang
  BARANG_CREATE: 'BARANG_CREATE',
  BARANG_UPDATE: 'BARANG_UPDATE',
  BARANG_DELETE: 'BARANG_DELETE',
  BARANG_STOK_CHANGE: 'BARANG_STOK_CHANGE',
  BARANG_IMPORT: 'BARANG_IMPORT',

  // User
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',
  USER_DELETE: 'USER_DELETE',
  USER_PASSWORD_RESET: 'USER_PASSWORD_RESET',
  USER_ROLE_PROMOTE: 'USER_ROLE_PROMOTE',
  USER_ROLE_DEMOTE: 'USER_ROLE_DEMOTE',

  // Satker (khusus SUPER_ADMIN)
  SATKER_CREATE: 'SATKER_CREATE',
  SATKER_UPDATE: 'SATKER_UPDATE',
  SATKER_DELETE: 'SATKER_DELETE',

  // Auth
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  LOGIN_FAILED: 'LOGIN_FAILED',
  REGISTER: 'REGISTER',
  ROLE_SWITCH: 'ROLE_SWITCH',
};

// --- Entitas yang didukung ---
const ENTITAS = {
  PEMINJAMAN: 'peminjaman',
  BARANG: 'barang',
  USER: 'user',
  AUTH: 'auth',
  SATKER: 'satker',
};

// --- Mapping aksi ke label manusia ---
const LABEL_AKSI = {
  [AKSI.PEMINJAMAN_CREATE]: 'Mengajukan Peminjaman',
  [AKSI.PEMINJAMAN_STATUS_CHANGE]: 'Mengubah Status Peminjaman',
  [AKSI.PEMINJAMAN_DELETE]: 'Menghapus Peminjaman',
  // Peminjaman - Aksi spesifik per status
  [AKSI.PEMINJAMAN_MENUNGGU]: 'Pengajuan Masuk',
  [AKSI.PEMINJAMAN_DISETUJUI]: 'Menyetujui',
  [AKSI.PEMINJAMAN_DITOLAK]: 'Menolak',
  [AKSI.PEMINJAMAN_DISERAHKAN]: 'Menyerahkan Barang',
  [AKSI.PEMINJAMAN_MEMINTA_PENGEMBALIAN]: 'Meminta Pengembalian',
  [AKSI.PEMINJAMAN_DIKEMBALIKAN]: 'Mengembalikan',
  [AKSI.PEMINJAMAN_DIBATALKAN]: 'Membatalkan',
  [AKSI.BARANG_CREATE]: 'Menambah Barang',
  [AKSI.BARANG_UPDATE]: 'Memperbarui Barang',
  [AKSI.BARANG_DELETE]: 'Menghapus Barang',
  [AKSI.BARANG_STOK_CHANGE]: 'Mengubah Stok Barang',
  [AKSI.BARANG_IMPORT]: 'Import Barang',
  [AKSI.USER_CREATE]: 'Membuat User Baru',
  [AKSI.USER_UPDATE]: 'Memperbarui User',
  [AKSI.USER_DELETE]: 'Menghapus User',
  [AKSI.USER_PASSWORD_RESET]: 'Mereset Password User',
  [AKSI.USER_ROLE_PROMOTE]: 'Mempromosi User',
  [AKSI.USER_ROLE_DEMOTE]: 'Mendemosi User',
  [AKSI.SATKER_CREATE]: 'Membuat Satker Baru',
  [AKSI.SATKER_UPDATE]: 'Memperbarui Satker',
  [AKSI.SATKER_DELETE]: 'Menghapus Satker',
  [AKSI.LOGIN]: 'Login',
  [AKSI.LOGOUT]: 'Logout',
  [AKSI.LOGIN_FAILED]: 'Login Gagal',
  [AKSI.REGISTER]: 'Registrasi',
  [AKSI.ROLE_SWITCH]: 'Berganti Role',
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
 * Untuk entitas peminjaman, ikut ambil data peminjaman untuk deskripsi lengkap.
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
  try {
    const { halaman, perHalaman } = parsePagination({ page, limit, defaultLimit: 50 });

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

  // Ambil data peminjaman untuk entitas peminjaman (agar bisa tampilkan nama peminjam & kode barang)
  const peminjamanIds = data
    .filter((d) => d.entitas === ENTITAS.PEMINJAMAN && d.entitasId)
    .map((d) => d.entitasId);

  const peminjamanMap = new Map();
  if (peminjamanIds.length > 0) {
    const peminjamans = await prisma.peminjaman.findMany({
      where: { id: { in: [...new Set(peminjamanIds)] } },
      include: {
        peminjam: { select: { id: true, nama: true } },
        detail: {
          include: {
            barang: { select: { nama: true, kodeSatker: true, kodeBarangBmn: true, nup: true } },
          },
        },
      },
    });
    peminjamans.forEach((p) => peminjamanMap.set(p.id, p));
  }

  // Tambahkan label manusia + deskripsi lengkap
  const dataDenganLabel = data.map((item) => {
    const labelAksi = LABEL_AKSI[item.aksi] || item.aksi;
    const labelEntitas = LABEL_ENTITAS[item.entitas] || item.entitas;
    const peminjaman = item.entitas === ENTITAS.PEMINJAMAN && item.entitasId
      ? peminjamanMap.get(item.entitasId)
      : null;
    const namaPeminjam = peminjaman?.peminjam?.nama || 'Tidak dikenal';
    const barang = peminjaman?.detail?.[0]?.barang;
    const namaBarang = barang?.nama || 'barang';
    const statusBaru = item.dataBaru?.status;
    const statusLama = item.dataLama?.status;

    // Generate deskripsi berdasarkan aksi
    let deskripsi = '';
    if (item.entitas === ENTITAS.PEMINJAMAN && item.entitasId) {
      // Bangun deskripsi berdasarkan aksi spesifik
      switch (item.aksi) {
        case AKSI.PEMINJAMAN_MENUNGGU:
          deskripsi = `${namaPeminjam} mengajukan pinjaman ${namaBarang}`;
          break;
        case AKSI.PEMINJAMAN_DISETUJUI:
          deskripsi = `Admin menyetujui pengajuan ${namaPeminjam}`;
          break;
        case AKSI.PEMINJAMAN_DITOLAK:
          const alasanTolak = item.dataBaru?.alasan ? ` (${item.dataBaru.alasan})` : '';
          deskripsi = `Admin menolak pengajuan ${namaPeminjam}${alasanTolak}`;
          break;
        case AKSI.PEMINJAMAN_DISERAHKAN:
          deskripsi = `Admin menyerahkan ${namaBarang} ke ${namaPeminjam}`;
          break;
        case AKSI.PEMINJAMAN_MEMINTA_PENGEMBALIAN:
          deskripsi = `${namaPeminjam} meminta pengembalian ${namaBarang}`;
          break;
        case AKSI.PEMINJAMAN_DIKEMBALIKAN:
          if (item.userNama && item.userNama !== 'Sistem') {
            // Dilakukan oleh admin
            deskripsi = `Admin menerima pengembalian dari ${namaPeminjam}`;
          } else {
            deskripsi = `${namaPeminjam} mengembalikan ${namaBarang}`;
          }
          break;
        case AKSI.PEMINJAMAN_DIBATALKAN:
          deskripsi = `${namaPeminjam} membatalkan pengajuan`;
          break;
        case AKSI.PEMINJAMAN_DELETE:
          const namaPeminjamHapus = item.dataLama?.namaPeminjam || namaPeminjam;
          deskripsi = `Admin menghapus peminjaman ${namaPeminjamHapus}`;
          break;
        default:
          // Generic fallback
          if (statusBaru) {
            deskripsi = `${labelAksi}: ${statusBaru}`;
          } else {
            deskripsi = labelAksi;
          }
      }
    } else if (item.entitas === ENTITAS.BARANG && item.aksi === AKSI.BARANG_DELETE) {
      // BARANG_DELETE: tampilkan nama barang yang dihapus
      const namaBarangHapus = item.dataLama?.nama || 'barang';
      const merkHapus = item.dataLama?.merk || '';
      deskripsi = `Admin menghapus barang ${namaBarangHapus}${merkHapus ? ` (${merkHapus})` : ''}`;
    } else {
      deskripsi = labelAksi;
    }

    // Bangun kode barang: kodeSatker - kodeBarangBmn - NUP
    // Untuk PEMINJAMAN/BARANG_DELETE, data mungkin sudah dihapus, jadi coba dari dataLama
    let kodeBarang = '-';
    if (item.aksi === AKSI.BARANG_DELETE && item.dataLama?.kodeBarangLengkap) {
      kodeBarang = item.dataLama.kodeBarangLengkap;
    } else if (barang) {
      kodeBarang = [barang.kodeSatker || '-', barang.kodeBarangBmn || '-', barang.nup || '-'].join(' - ');
    } else if (item.dataLama?.kodeBarang) {
      // Fallback untuk PEMINJAMAN_DELETE
      kodeBarang = item.dataLama.kodeBarang;
    }

    return {
      ...item,
      labelAksi,
      labelEntitas,
      deskripsi,
      kodeBarang,
    };
  });

  return {
    data: dataDenganLabel,
    meta: {
      total,
      page: halaman,
      limit: perHalaman,
      totalHalaman: Math.ceil(total / perHalaman) || 1,
    },
  };
  } catch (error) {
    logger.error('[AUDIT] getSemua error:', error.message, error.stack);
    throw error;
  }
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
