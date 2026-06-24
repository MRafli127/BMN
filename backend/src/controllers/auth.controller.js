// ============================================================
//  Controller Autentikasi
//  Menghubungkan request HTTP dengan auth.service.
//  Refresh token disimpan di cookie httpOnly + dikirim di body.
// ============================================================

const authService = require('../services/auth.service');
const { responsSukses } = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/error.middleware');
const { getCsrfToken, generateCsrfTokenMiddleware } = require('../middleware/csrf.middleware');
const env = require('../config/env');

// Opsi cookie untuk refresh token - gunakan konfigurasi terpusat dari env.js
const opsiCookie = { ...env.cookie };

const register = asyncHandler(async (req, res) => {
  const hasil = await authService.register(req.body);
  res.cookie('refreshToken', hasil.refreshToken, opsiCookie);

  // Generate CSRF token untuk sesi baru
  const csrfToken = getCsrfToken(req, res);

  return responsSukses(res, {
    pesan: 'Registrasi berhasil. Selamat datang!',
    data: { ...hasil, csrfToken },
    status: 201,
  });
});

const login = asyncHandler(async (req, res) => {
  const hasil = await authService.login(req.body);
  res.cookie('refreshToken', hasil.refreshToken, opsiCookie);

  // Generate CSRF token untuk sesi baru
  const csrfToken = getCsrfToken(req, res);

  return responsSukses(res, {
    pesan: 'Login berhasil.',
    data: { ...hasil, csrfToken },
  });
});

const me = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.id);
  return responsSukses(res, { pesan: 'Profil pengguna.', data: user });
});

const updateMe = asyncHandler(async (req, res) => {
  const hasil = await authService.perbaruiProfil(req.user.id, req.body);
  return responsSukses(res, { pesan: 'Profil berhasil diperbarui.', data: hasil });
});

const gantiPassword = asyncHandler(async (req, res) => {
  // Ambil access token untuk di-blacklist
  const authHeader = req.headers.authorization || '';
  const [tipe, accessToken] = authHeader.split(' ');

  // Blacklist access token lama
  if (tipe === 'Bearer' && accessToken) {
    authService.blacklistToken(accessToken).catch(() => {});
  }

  await authService.gantiPassword(req.user.id, req.body);

  // Hapus cookie refresh token dan CSRF
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
  });
  res.clearCookie('csrf_token', {
    httpOnly: false,
    secure: env.cookie.secure,
    sameSite: 'strict',
  });

  return responsSukses(res, {
    pesan: 'Kata sandi berhasil diperbarui. Anda telah keluar dari semua sesi.',
  });
});

const refresh = asyncHandler(async (req, res) => {
  // Ambil refresh token dari cookie atau body
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  const hasil = await authService.refresh(token);
  res.cookie('refreshToken', hasil.refreshToken, opsiCookie);
  return responsSukses(res, { pesan: 'Token diperbarui.', data: hasil });
});

const logout = asyncHandler(async (req, res) => {
  // Blacklist token sebelum hapus cookie
  const token = req.cookies?.refreshToken || req.body?.refreshToken;
  if (token) {
    await authService.blacklistToken(token);
  }
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
  });
  res.clearCookie('csrf_token', {
    httpOnly: false,
    secure: env.cookie.secure,
    sameSite: 'strict',
  });
  return responsSukses(res, { pesan: 'Anda telah keluar.' });
});

// Endpoint untuk dapat CSRF token baru
const getCsrf = asyncHandler(async (req, res) => {
  const csrfToken = getCsrfToken(req, res);
  return responsSukses(res, {
    pesan: 'CSRF token.',
    data: { csrfToken },
  });
});

module.exports = { register, login, me, updateMe, gantiPassword, refresh, logout, getCsrf };
