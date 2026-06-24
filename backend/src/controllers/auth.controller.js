// ============================================================
//  Controller Autentikasi
//  Menghubungkan request HTTP dengan auth.service.
//  Refresh token disimpan di cookie httpOnly + dikirim di body.
// ============================================================

const authService = require('../services/auth.service');
const { responsSukses } = require('../utils/apiResponse');
const { asyncHandler } = require('../middleware/error.middleware');
const env = require('../config/env');

// Opsi cookie untuk refresh token - gunakan konfigurasi terpusat dari env.js
const opsiCookie = { ...env.cookie };

const register = asyncHandler(async (req, res) => {
  const hasil = await authService.register(req.body);
  res.cookie('refreshToken', hasil.refreshToken, opsiCookie);
  return responsSukses(res, {
    pesan: 'Registrasi berhasil. Selamat datang!',
    data: hasil,
    status: 201,
  });
});

const login = asyncHandler(async (req, res) => {
  const hasil = await authService.login(req.body);
  res.cookie('refreshToken', hasil.refreshToken, opsiCookie);
  return responsSukses(res, { pesan: 'Login berhasil.', data: hasil });
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
  await authService.gantiPassword(req.user.id, req.body);
  return responsSukses(res, { pesan: 'Kata sandi berhasil diperbarui.' });
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
  return responsSukses(res, { pesan: 'Anda telah keluar.' });
});

module.exports = { register, login, me, updateMe, gantiPassword, refresh, logout };
