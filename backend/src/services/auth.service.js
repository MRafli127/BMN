// ============================================================
//  Service Autentikasi
//  Menangani registrasi, login, ambil profil, dan refresh token.
// ============================================================

const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const env = require('../config/env');
const { hashPassword, bandingkanPassword } = require('../utils/hashPassword');
const { tanpaPassword } = require('../utils/userHelper');
const { hitungRetirementDateDariNip, validasiNip } = require('../utils/nipHelper');
const { AppError } = require('../middleware/error.middleware');
const logger = require('../utils/logger');

// Helper: cek apakah token ada di blacklist
async function isTokenBlacklisted(token) {
  const found = await prisma.blacklistedToken.findUnique({
    where: { token },
  });
  return !!found;
}

// Helper: tambah token ke blacklist (untuk invalidate saat logout/password change)
async function blacklistToken(token, userId = null) {
  if (!token) return;

  // Decode untuk dapat expiry time
  let expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // fallback 7 hari
  try {
    const decoded = jwt.decode(token);
    if (decoded?.exp) {
      expiresAt = new Date(decoded.exp * 1000);
    }
  } catch {
    // Use fallback
  }

  // Simpan ke blacklist dengan try-catch karena token mungkin sudah ada
  try {
    await prisma.blacklistedToken.create({
      data: {
        token,
        expiresAt,
        userId,
      },
    });
  } catch {
    // Token sudah di-blacklist, skip
  }
}

// Helper: blacklist semua token user berdasarkan tokenVersion lama
// Dipanggil saat password berubah untuk invalidate semua sesi sebelumnya
async function invalidateAllUserTokens(userId, oldTokenVersion) {
  // Catat versi lama untuk tracking
  const oldVersion = oldTokenVersion || 1;

  // Cleanup expired tokens + tokens versi lama
  // Catatan: kita tidak bisa invalidate access token yang sudah expire
  // tapi refresh token akan gagal karena tokenVersion tidak cocok
  // Access token dengan masa 15 menit akan expire sendiri

  // Tandai di DB bahwa versi token berubah (untuk validasi)
  // Ini ditangani dengan increment tokenVersion di user record
  logger.info(`[AUTH] Invalidated all tokens for user ${userId}`);
}

// Helper: cleanup expired tokens secara periodik (async, tidak blocking)
async function cleanupExpiredTokens() {
  try {
    const result = await prisma.blacklistedToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (result.count > 0) {
      logger.info(`[AUTH] Cleaned up ${result.count} expired blacklisted tokens`);
    }
  } catch {
    // Silent fail
  }
}

// Daftar role valid dalam sistem
const ROLE_VALID = ['ADMIN', 'PEMINJAM'];

// Peran EFEKTIF: setiap ADMIN otomatis juga berkapasitas sebagai PEMINJAM
// (admin pun bisa meminjam & WAJIB dapat beralih ke mode Peminjam). Aturan ini
// hanya dipakai untuk sesi/token & validasi peralihan peran — kolom `roles` di
// DB tidak diubah. Tidak pernah menambahkan ADMIN, jadi tanpa eskalasi hak.
function rolesEfektif(roles = []) {
  const dimiliki = new Set(Array.isArray(roles) ? roles : []);
  if (dimiliki.has('ADMIN')) dimiliki.add('PEMINJAM');
  // Urutan stabil mengikuti ROLE_VALID.
  return ROLE_VALID.filter((r) => dimiliki.has(r));
}

// Tentukan active role untuk sesi:
// - `diminta` dihormati bila valid secara EFEKTIF (mis. admin boleh memilih PEMINJAM)
// - default berdasarkan role NYATA di DB: admin murni tetap masuk sebagai ADMIN,
//   akun yang benar-benar multi-role default ke PEMINJAM (least-privilege).
function pilihActiveRole(roles = [], diminta = null) {
  const dimiliki = Array.isArray(roles) ? roles : [];
  const efektif = rolesEfektif(dimiliki);
  if (diminta && efektif.includes(diminta)) return diminta;
  if (dimiliki.length === 1) return dimiliki[0];
  if (dimiliki.includes('PEMINJAM')) return 'PEMINJAM';
  return dimiliki[0] || 'PEMINJAM';
}

// Buat access token (masa berlaku pendek) dengan jti dan tokenVersion
function buatAccessToken(user, activeRole) {
  return jwt.sign(
    {
      sub: user.id,
      roles: rolesEfektif(user.roles), // peran efektif (ADMIN ⇒ termasuk PEMINJAM)
      activeRole, // role yang sedang dipakai dalam sesi ini
      nama: user.nama,
      email: user.email,
      jti: generateJti(),
      v: user.tokenVersion // tokenVersion untuk invalidasi
    },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiresIn }
  );
}

// Buat refresh token (masa berlaku lebih panjang) dengan jti dan tokenVersion.
// Membawa activeRole agar mode tetap terjaga setelah refresh.
function buatRefreshToken(user, activeRole) {
  return jwt.sign(
    { sub: user.id, activeRole, jti: generateJti(), v: user.tokenVersion },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshExpiresIn }
  );
}

// Bungkus user tanpa password + sertakan activeRole untuk konsumsi frontend.
// `roles` yang dikirim adalah peran EFEKTIF (rolesEfektif) agar tombol
// "Beralih peran" pada Header muncul untuk admin — admin selalu bisa beralih ke
// mode Peminjam meski di DB hanya tercatat ADMIN.
function serialisasiSesi(user, activeRole) {
  return { ...tanpaPassword(user), roles: rolesEfektif(user.roles), activeRole };
}

// Generate unique ID untuk JWT (untuk blacklist tracking)
function generateJti() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// --- Registrasi peminjam baru ---
async function register(data) {
  // Pastikan email & NIP belum dipakai
  const sudahAda = await prisma.user.findFirst({
    where: { OR: [{ email: data.email }, { nip: data.nip }] },
  });
  if (sudahAda) {
    if (sudahAda.email === data.email) {
      throw new AppError('Email sudah terdaftar. Gunakan email lain.', 409);
    }
    throw new AppError('NIP sudah terdaftar. Periksa kembali NIP Anda.', 409);
  }

  // Validasi NIP dan hitung retirement date
  const validasi = validasiNip(data.nip);
  if (!validasi.valid) {
    throw new AppError(validasi.error, 400);
  }

  const retirementDate = hitungRetirementDateDariNip(data.nip);
  if (!retirementDate) {
    throw new AppError('Format NIP tidak valid. Pastikan tanggal lahir dalam NIP benar.', 400);
  }

  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      nama: data.nama,
      nip: data.nip,
      email: data.email,
      password: passwordHash,
      eselon4: data.eselon4 || null, // form registrasi: label "Eselon IV"
      eselon3: data.eselon3 || null, // form registrasi: label "Eselon III"
      roles: ['PEMINJAM'], // registrasi publik selalu peminjam
      tokenVersion: 1,
      retirementDate,
    },
  });

  const activeRole = pilihActiveRole(user.roles);
  const accessToken = buatAccessToken(user, activeRole);
  const refreshToken = buatRefreshToken(user, activeRole);
  return { user: serialisasiSesi(user, activeRole), accessToken, refreshToken };
}

// --- Login ---
// `activeRole` opsional: dipakai untuk akun multi-role bila user memilih peran saat login.
async function login({ email, password, activeRole }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError('Email atau kata sandi salah.', 401);
  }

  const cocok = await bandingkanPassword(password, user.password);
  if (!cocok) {
    throw new AppError('Email atau kata sandi salah.', 401);
  }

  // Reset sesi user (clear invalidation dari login sebelumnya)
  await resetUserSessions(user.id);

  const roleAktif = pilihActiveRole(user.roles, activeRole);
  const accessToken = buatAccessToken(user, roleAktif);
  const refreshToken = buatRefreshToken(user, roleAktif);
  return { user: serialisasiSesi(user, roleAktif), accessToken, refreshToken };
}

// --- Switch active role (akun multi-role) ---
// Menerbitkan token baru dengan active role yang dipilih, setelah memastikan
// role tsb benar-benar dimiliki user (validasi terhadap DB live).
async function switchRole(userId, targetRole) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('Pengguna tidak ditemukan.', 404);
  }
  if (!rolesEfektif(user.roles).includes(targetRole)) {
    throw new AppError('Anda tidak memiliki peran tersebut.', 403);
  }

  const accessToken = buatAccessToken(user, targetRole);
  const refreshToken = buatRefreshToken(user, targetRole);
  return { user: serialisasiSesi(user, targetRole), accessToken, refreshToken };
}

// --- Ambil profil pengguna saat ini ---
async function getMe(userId, activeRole) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('Pengguna tidak ditemukan.', 404);
  }
  // activeRole berasal dari sesi (req.user.role); jaga tetap valid terhadap roles terkini.
  return serialisasiSesi(user, pilihActiveRole(user.roles, activeRole));
}

// --- Perbarui profil pengguna saat ini ---
async function perbaruiProfil(userId, data, activeRole) {
  const pengguna = await prisma.user.findUnique({ where: { id: userId } });
  if (!pengguna) {
    throw new AppError('Pengguna tidak ditemukan.', 404);
  }

  // Pastikan email & NIP baru tidak dipakai pengguna lain
  const bentrok = await prisma.user.findFirst({
    where: {
      id: { not: userId },
      OR: [{ email: data.email }, { nip: data.nip }],
    },
  });
  if (bentrok) {
    if (bentrok.email === data.email) {
      throw new AppError('Email sudah digunakan pengguna lain.', 409);
    }
    throw new AppError('NIP sudah digunakan pengguna lain.', 409);
  }

  // Validasi NIP & hitung ulang retirementDate jika NIP diubah
  let retirementDate = pengguna.retirementDate;
  if (data.nip && data.nip !== pengguna.nip) {
    const validasi = validasiNip(data.nip);
    if (!validasi.valid) {
      throw new AppError(validasi.error, 400);
    }
    const tanggalPensiun = hitungRetirementDateDariNip(data.nip);
    if (!tanggalPensiun) {
      throw new AppError('Format NIP tidak valid. Pastikan tanggal lahir dalam NIP benar.', 400);
    }
    retirementDate = tanggalPensiun;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      nama: data.nama,
      nip: data.nip,
      email: data.email,
      jabatan: data.jabatan ? data.jabatan : null,
      unitKerja: data.unitKerja ? data.unitKerja : null,
      eselon2: data.eselon2 ? data.eselon2 : null,
      eselon3: data.eselon3 ? data.eselon3 : null,
      eselon4: data.eselon4 ? data.eselon4 : null,
      retirementDate,
    },
  });

  // Terbitkan ulang access token agar nama/email pada token tetap sinkron
  const roleAktif = pilihActiveRole(user.roles, activeRole);
  const accessToken = buatAccessToken(user, roleAktif);
  return { user: serialisasiSesi(user, roleAktif), accessToken };
}

// --- Ganti kata sandi pengguna saat ini ---
// Saat password berubah, INCREMENT tokenVersion untuk invalidate semua token lama
async function gantiPassword(userId, { passwordLama, passwordBaru }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('Pengguna tidak ditemukan.', 404);
  }

  const cocok = await bandingkanPassword(passwordLama, user.password);
  if (!cocok) {
    throw new AppError('Kata sandi lama tidak sesuai.', 400);
  }

  const passwordHash = await hashPassword(passwordBaru);

  // Increment tokenVersion dan update password dalam 1 transaksi
  // Ini akan invalidate semua token lama (access + refresh)
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        password: passwordHash,
        tokenVersion: { increment: 1 }
      },
    });
  });

  logger.info(`[AUTH] Password changed for user ${userId}`);
}

// --- Perbarui access token menggunakan refresh token ---
async function refresh(refreshToken) {
  if (!refreshToken) {
    throw new AppError('Refresh token tidak ditemukan.', 401);
  }

  // Cek apakah token ada di blacklist
  if (await isTokenBlacklisted(refreshToken)) {
    throw new AppError('Token sudah tidak valid. Silakan login kembali.', 401);
  }

  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwt.refreshSecret);
  } catch {
    throw new AppError('Refresh token tidak valid atau telah kedaluwarsa.', 401);
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    throw new AppError('Pengguna tidak ditemukan.', 404);
  }

  // VALIDASI TOKEN VERSION
  // Jika password berubah setelah token ini dibuat, token ditolak.
  // Normalisasi kedua sisi ke 1 bila kosong (token lama tanpa klaim "v" atau
  // user.tokenVersion null) agar tidak terjadi mismatch palsu (1 !== undefined).
  const tokenVersion = payload.v || 1;
  const userVersion = user.tokenVersion || 1;
  if (tokenVersion !== userVersion) {
    throw new AppError('Sesi Anda telah berakhir. Silakan login kembali.', 401);
  }

  // Cleanup expired tokens secara async
  cleanupExpiredTokens().catch(() => {});

  // Pertahankan active role dari token; heal ke role valid bila sudah dicabut.
  const roleAktif = pilihActiveRole(user.roles, payload.activeRole);
  const accessToken = buatAccessToken(user, roleAktif);
  const refreshTokenBaru = buatRefreshToken(user, roleAktif);
  return { user: serialisasiSesi(user, roleAktif), accessToken, refreshToken: refreshTokenBaru };
}

// --- Validasi access token dengan tokenVersion check ---
// Dipanggil oleh auth middleware
async function validateAccessTokenWithVersion(payload) {
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    return { valid: false, reason: 'USER_NOT_FOUND' };
  }

  // Cek tokenVersion (normalisasi kedua sisi ke 1 bila kosong, lihat refresh()).
  const tokenVersion = payload.v || 1;
  const userVersion = user.tokenVersion || 1;
  if (tokenVersion !== userVersion) {
    return { valid: false, reason: 'TOKEN_VERSION_MISMATCH' };
  }

  return { valid: true, user };
}

// Inactivity timeout dalam milidetik (15 menit)
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;

// --- Validasi sesi: cek apakah sesi valid (belum di-invalidate & masih aktif) ---
// Dipanggil oleh auth middleware pada setiap request terproteksi
async function validateSession(userId, jti) {
  // Cek apakah user ada dan apakah sesi sudah di-invalidate
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      sessionInvalidatedAt: true,
      lastActivityAt: true,
    },
  });

  if (!user) {
    return { valid: false, reason: 'USER_NOT_FOUND' };
  }

  // Jika sesi di-invalidate (tab ditutup / logout paksa), tolak
  // Bandingkan dengan timestamp token jika ada (jti timestamp)
  if (user.sessionInvalidatedAt) {
    return { valid: false, reason: 'SESSION_INVALIDATED' };
  }

  // Cek apakah user sudah tidak aktif lebih dari 15 menit
  // Jika lastActivityAt null, berarti user login baru dan belum ada aktivitas tercatat
  if (user.lastActivityAt) {
    const lastActivityMs = new Date(user.lastActivityAt).getTime();
    const nowMs = Date.now();
    if (nowMs - lastActivityMs > INACTIVITY_TIMEOUT_MS) {
      return { valid: false, reason: 'INACTIVITY_TIMEOUT' };
    }
  }

  return { valid: true };
}

// --- Update last activity timestamp ---
// Dipanggil oleh auth middleware pada setiap request terproteksi
// Menggunakan jti sebagai identifier tambahan untuk konsistensi
async function updateLastActivity(userId, jti) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      lastActivityAt: new Date(),
    },
  });
  logger.info(`[AUTH] Updated last activity for user ${userId}, jti: ${jti}`);
}

// --- Invalidate semua sesi user (dipanggil saat logout atau tab close) ---
// Ini akan menolak semua request baru dari user ini
async function invalidateUserSessions(userId) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      sessionInvalidatedAt: new Date(),
      lastActivityAt: null, // Reset aktivitas
    },
  });
  logger.info(`[AUTH] Invalidated all sessions for user ${userId}`);
}

// --- Reset sesi user (dipanggil saat login baru) ---
// Ini mengaktifkan ulang sesi user setelah invalidasi sebelumnya
async function resetUserSessions(userId) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      sessionInvalidatedAt: null,
      lastActivityAt: new Date(),
    },
  });
  logger.info(`[AUTH] Reset sessions for user ${userId}`);
}

module.exports = {
  register,
  login,
  switchRole,
  getMe,
  perbaruiProfil,
  gantiPassword,
  refresh,
  blacklistToken,
  isTokenBlacklisted,
  validateAccessTokenWithVersion,
  validateSession,
  updateLastActivity,
  invalidateUserSessions,
  resetUserSessions,
  buatAccessToken,
  buatRefreshToken,
  pilihActiveRole,
};
