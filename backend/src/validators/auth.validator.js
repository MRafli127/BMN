// ============================================================
//  Skema validasi Zod untuk autentikasi.
// ============================================================

const { z } = require('zod');

// Validasi registrasi peminjam baru
const registerSchema = z.object({
  nama: z.string({ required_error: 'Nama wajib diisi.' }).min(3, 'Nama minimal 3 karakter.'),
  nip: z
    .string({ required_error: 'NIP wajib diisi.' })
    .min(5, 'NIP minimal 5 karakter.')
    .max(30, 'NIP maksimal 30 karakter.'),
  email: z.string({ required_error: 'Email wajib diisi.' }).email('Format email tidak valid.'),
  password: z
    .string({ required_error: 'Kata sandi wajib diisi.' })
    .min(6, 'Kata sandi minimal 6 karakter.'),
  jabatan: z.string().optional().or(z.literal('')),
  unitKerja: z.string().optional().or(z.literal('')),
});

// Validasi login
const loginSchema = z.object({
  email: z.string({ required_error: 'Email wajib diisi.' }).email('Format email tidak valid.'),
  password: z.string({ required_error: 'Kata sandi wajib diisi.' }).min(1, 'Kata sandi wajib diisi.'),
});

// Validasi pembaruan profil (data diri, tanpa password)
const updateProfilSchema = z.object({
  nama: z.string({ required_error: 'Nama wajib diisi.' }).min(3, 'Nama minimal 3 karakter.'),
  nip: z
    .string({ required_error: 'NIP wajib diisi.' })
    .min(5, 'NIP minimal 5 karakter.')
    .max(30, 'NIP maksimal 30 karakter.'),
  email: z.string({ required_error: 'Email wajib diisi.' }).email('Format email tidak valid.'),
  jabatan: z.string().optional().or(z.literal('')),
  unitKerja: z.string().optional().or(z.literal('')),
});

// Validasi penggantian kata sandi
const gantiPasswordSchema = z.object({
  passwordLama: z.string({ required_error: 'Kata sandi lama wajib diisi.' }).min(1, 'Kata sandi lama wajib diisi.'),
  passwordBaru: z
    .string({ required_error: 'Kata sandi baru wajib diisi.' })
    .min(6, 'Kata sandi baru minimal 6 karakter.'),
});

module.exports = { registerSchema, loginSchema, updateProfilSchema, gantiPasswordSchema };
