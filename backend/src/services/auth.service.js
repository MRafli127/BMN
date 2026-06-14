// ============================================================
//  Service Autentikasi
//  Menangani registrasi, login, ambil profil, dan refresh token.
// ============================================================

const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');
const env = require('../config/env');
const { hashPassword, bandingkanPassword } = require('../utils/hashPassword');
const { AppError } = require('../middleware/error.middleware');

// Buat access token (masa berlaku pendek)
function buatAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, nama: user.nama, email: user.email },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiresIn }
  );
}

// Buat refresh token (masa berlaku lebih panjang)
function buatRefreshToken(user) {
  return jwt.sign({ sub: user.id }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiresIn,
  });
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

// --- Perbarui access token menggunakan refresh token ---
async function refresh(refreshToken) {
  if (!refreshToken) {
    throw new AppError('Refresh token tidak ditemukan.', 401);
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

  const accessToken = buatAccessToken(user);
  const refreshTokenBaru = buatRefreshToken(user);
  return { user: tanpaPassword(user), accessToken, refreshToken: refreshTokenBaru };
}

module.exports = { register, login, getMe, refresh, buatAccessToken, buatRefreshToken };
