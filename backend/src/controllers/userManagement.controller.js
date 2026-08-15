// ============================================================
//  Controller Manajemen User
// ============================================================

const userManagementService = require('../services/userManagement.service');
const auditLogService = require('../services/auditLog.service');
const { responsSukses } = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/error.middleware');

// Snapshot nama & email user yang dibuat/dihapus untuk deskripsi log
// aktivitas. Dipakai karena user bisa dihapus di kemudian hari sehingga
// relasi peminjam/nama di log jadi null tanpa snapshot ini.
function snapshotPengguna(user) {
  if (!user) return null;
  return {
    nama: user.nama || '-',
    email: user.email || '-',
    nip: user.nip || null,
    roles: Array.isArray(user.roles) ? user.roles : [],
  };
}

// Bangun deskripsi human-friendly untuk aksi user (mengandung nama + email).
function deskripsiUser(aksiLabel, snapshot) {
  if (!snapshot) return aksiLabel;
  return `${aksiLabel} ${snapshot.nama} (${snapshot.email})`;
}

// Extract IP & user-agent dari request (untuk jejak audit log).
function getRequestInfo(req) {
  return {
    ipAddress: req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for'] || null,
    userAgent: req.get('User-Agent') || null,
  };
}

// List user dengan filter
const getSemua = asyncHandler(async (req, res) => {
  const { q, role, page, limit } = req.query;
  const hasil = await userManagementService.getSemua({ q, role, page, limit });
  return responsSukses(res, {
    pesan: 'Daftar user.',
    data: hasil.data,
    meta: hasil.meta,
  });
});

// Ambil satu user
const getById = asyncHandler(async (req, res) => {
  const user = await userManagementService.getById(req.params.id);
  return responsSukses(res, { pesan: 'Detail user.', data: user });
});

// Statistik user
const getStatistik = asyncHandler(async (req, res) => {
  const statistik = await userManagementService.getStatistik();
  return responsSukses(res, { pesan: 'Statistik user.', data: statistik });
});

// Buat user baru
const create = asyncHandler(async (req, res) => {
  const hasil = await userManagementService.create(req.body);
  const snapshot = snapshotPengguna(hasil.user);
  auditLogService.log({
    userId: req.user?.id,
    userEmail: req.user?.email,
    userNama: req.user?.nama || 'Admin',
    aksi: auditLogService.AKSI.USER_CREATE,
    entitas: auditLogService.ENTITAS.USER,
    entitasId: hasil.user.id,
    dataBaru: snapshot,
    dataLama: null,
    requestInfo: getRequestInfo(req),
  }).catch(() => {});
  return responsSukses(res, {
    pesan: 'User berhasil dibuat.',
    data: hasil,
    status: 201,
  });
});

// Update user
const update = asyncHandler(async (req, res) => {
  const userLama = await userManagementService.getById(req.params.id);
  const user = await userManagementService.update(req.params.id, req.body);
  const snapshot = snapshotPengguna(user);
  auditLogService.log({
    userId: req.user?.id,
    userEmail: req.user?.email,
    userNama: req.user?.nama || 'Admin',
    aksi: auditLogService.AKSI.USER_UPDATE,
    entitas: auditLogService.ENTITAS.USER,
    entitasId: req.params.id,
    dataLama: snapshotPengguna(userLama),
    dataBaru: snapshot,
    requestInfo: getRequestInfo(req),
  }).catch(() => {});
  return responsSukses(res, { pesan: 'User berhasil diperbarui.', data: user });
});

// Tambah role ke user (promote)
const tambahRole = asyncHandler(async (req, res) => {
  const user = await userManagementService.tambahRole(req.params.id, req.body.role);
  return responsSukses(res, { pesan: `Peran ${req.body.role} ditambahkan.`, data: user });
});

// Hapus role dari user (demote)
const hapusRole = asyncHandler(async (req, res) => {
  const user = await userManagementService.hapusRole(req.params.id, req.params.role);
  return responsSukses(res, { pesan: `Peran ${req.params.role} dicabut.`, data: user });
});

// Reset password user
const resetPassword = asyncHandler(async (req, res) => {
  const hasil = await userManagementService.resetPassword(req.params.id);
  return responsSukses(res, {
    pesan: 'Password berhasil direset.',
    data: { passwordBaru: hasil.passwordBaru },
  });
});

// Hapus user
const remove = asyncHandler(async (req, res) => {
  // Ambil snapshot user SEBELUM dihapus agar log aktivitas tetap
  // menampilkan nama & email meskipun record sudah tidak ada di DB.
  const userSnapshot = await userManagementService.getById(req.params.id);
  await userManagementService.remove(req.params.id);
  if (userSnapshot) {
    const snap = snapshotPengguna(userSnapshot);
    auditLogService.log({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userNama: req.user?.nama || 'Admin',
      aksi: auditLogService.AKSI.USER_DELETE,
      entitas: auditLogService.ENTITAS.USER,
      entitasId: req.params.id,
      dataLama: snap,
      dataBaru: null,
      requestInfo: getRequestInfo(req),
    }).catch(() => {});
  }
  return responsSukses(res, { pesan: 'User berhasil dihapus.' });
});

// Hapus banyak peminjam sekaligus (berdasarkan ID terpilih; lewati yang aktif)
const hapusMassalPeminjam = asyncHandler(async (req, res) => {
  const hasil = await userManagementService.hapusBanyakPeminjam(req.body.ids);
  const pesan =
    hasil.dilewati > 0
      ? `${hasil.dihapus} peminjam dihapus, ${hasil.dilewati} dilewati karena masih punya peminjaman aktif.`
      : `${hasil.dihapus} peminjam berhasil dihapus.`;

  // Catat satu audit log per akun yang dihapus agar bisa ditelusuri
  // satu per satu (siapa yang dihapus, oleh admin siapa).
  const requestInfo = getRequestInfo(req);
  for (const u of hasil.snapshotsHapus || []) {
    const snap = snapshotPengguna(u);
    auditLogService.log({
      userId: req.user?.id,
      userEmail: req.user?.email,
      userNama: req.user?.nama || 'Admin',
      aksi: auditLogService.AKSI.USER_DELETE,
      entitas: auditLogService.ENTITAS.USER,
      entitasId: u.id,
      dataLama: snap,
      dataBaru: null,
      requestInfo,
    }).catch(() => {});
  }

  return responsSukses(res, { pesan, data: { dihapus: hasil.dihapus, dilewati: hasil.dilewati } });
});

// Update satker akses (khusus SUPER_ADMIN)
const updateSatkerAccess = asyncHandler(async (req, res) => {
  const user = await userManagementService.updateSatkerAccess(req.params.id, req.body.satkerAkses || []);
  return responsSukses(res, { pesan: 'Satker akses berhasil diperbarui.', data: user });
});

module.exports = {
  getSemua,
  getById,
  getStatistik,
  create,
  update,
  tambahRole,
  hapusRole,
  resetPassword,
  remove,
  hapusMassalPeminjam,
  updateSatkerAccess,
};
