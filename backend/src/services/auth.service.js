// ============================================================
//  Service Autentikasi
//  Menangani registrasi, login, ambil profil, dan refresh token.
// ============================================================

const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const env = require('../config/env');
const { hashPassword, bandingkanPassword } = require('../utils/hashPassword');
const { AppError } = require('../middleware/error.middleware');

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
  console.log(`[AUTH] Invalidated all tokens for user ${userId} (version ${oldVersion} -> ${oldVersion + 1})`);
}

// Helper: cleanup expired tokens secara periodik (async, tidak blocking)
async function cleanupExpiredTokens() {
  try {
    const result = await prisma.blacklistedToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    if (result.count > 0) {
      console.log(`[AUTH] Cleaned up ${result.count} expired blacklisted tokens`);
    }
  } catch {
    // Silent fail
  }
}

// Buat access token (masa berlaku pendek) dengan jti dan tokenVersion
function buatAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      nama: user.nama,
      email: user.email,
      jti: generateJti(),
      v: user.tokenVersion // tokenVersion untuk invalidasi
    },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiresIn }
  );
}

// Buat refresh token (masa berlaku lebih panjang) dengan jti dan tokenVersion
function buatRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, jti: generateJti(), v: user.tokenVersion },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshExpiresIn }
  );
}

// Generate unique ID untuk JWT (untuk blacklist tracking)
function generateJti() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// Hilangkan field password sebelum dikirim ke client
function tanpaPassword(user) {
  if (!user) return user;
  const { password, ...sisanya } = user;
  return sisanya;
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

  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      nama: data.nama,
      nip: data.nip,
      email: data.email,
      password: passwordHash,
      jabatan: data.jabatan || null,
      unitKerja: data.unitKerja || null,
      role: 'PEMINJAM', // registrasi publik selalu peminjam
      tokenVersion: 1,
    },
  });

  const accessToken = buatAccessToken(user);
  const refreshToken = buatRefreshToken(user);
  return { user: tanpaPassword(user), accessToken, refreshToken };
}

// --- Login ---
async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError('Email atau kata sandi salah.', 401);
  }

  const cocok = await bandingkanPassword(password, user.password);
  if (!cocok) {
    throw new AppError('Email atau kata sandi salah.', 401);
  }

  const accessToken = buatAccessToken(user);
  const refreshToken = buatRefreshToken(user);
  return { user: tanpaPassword(user), accessToken, refreshToken };
}

// --- Ambil profil pengguna saat ini ---
async function getMe(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('Pengguna tidak ditemukan.', 404);
  }
  return tanpaPassword(user);
}

// --- Perbarui profil pengguna saat ini ---
async function perbaruiProfil(userId, data) {
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

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      nama: data.nama,
      nip: data.nip,
      email: data.email,
      jabatan: data.jabatan ? data.jabatan : null,
      unitKerja: data.unitKerja ? data.unitKerja : null,
      eselon2: data.eselon2 ? data.eselon2 : null,
      jabatanPegawai: data.jabatanPegawai ? data.jabatanPegawai : null,
      unitKerjaPegawai: data.unitKerjaPegawai ? data.unitKerjaPegawai : null,
    },
  });

  // Terbitkan ulang access token agar nama/email pada token tetap sinkron
  const accessToken = buatAccessToken(user);
  return { user: tanpaPassword(user), accessToken };
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

  console.log(`[AUTH] Password changed for user ${userId}. All old tokens invalidated.`);
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

  const accessToken = buatAccessToken(user);
  const refreshTokenBaru = buatRefreshToken(user);
  return { user: tanpaPassword(user), accessToken, refreshToken: refreshTokenBaru };
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

module.exports = {
  register,
  login,
  getMe,
  perbaruiProfil,
  gantiPassword,
  refresh,
  blacklistToken,
  isTokenBlacklisted,
  validateAccessTokenWithVersion,
  buatAccessToken,
  buatRefreshToken,
};
