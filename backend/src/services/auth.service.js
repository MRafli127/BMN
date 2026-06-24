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

// Helper: tambah token ke blacklist (untuk invalidate saat logout)
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

// Helper: cleanup expired tokens secara periodik (async, tidak blocking)
async function cleanupExpiredTokens() {
  try {
    await prisma.blacklistedToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  } catch {
    // Silent fail
  }
}

// Buat access token (masa berlaku pendek) dengan jti untuk tracking
function buatAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, nama: user.nama, email: user.email, jti: generateJti() },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiresIn }
  );
}

// Buat refresh token (masa berlaku lebih panjang) dengan jti untuk tracking
function buatRefreshToken(user) {
  return jwt.sign({ sub: user.id, jti: generateJti() }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  });
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
    },
  });

  // Terbitkan ulang access token agar nama/email pada token tetap sinkron
  const accessToken = buatAccessToken(user);
  return { user: tanpaPassword(user), accessToken };
}

// --- Ganti kata sandi pengguna saat ini ---
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
  await prisma.user.update({
    where: { id: userId },
    data: { password: passwordHash },
  });
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

  // Cleanup expired tokens secara async
  cleanupExpiredTokens().catch(() => {});

  const accessToken = buatAccessToken(user);
  const refreshTokenBaru = buatRefreshToken(user);
  return { user: tanpaPassword(user), accessToken, refreshToken: refreshTokenBaru };
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
  buatAccessToken,
  buatRefreshToken,
};
