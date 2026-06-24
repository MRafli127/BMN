// ============================================================
//  Skema validasi Zod untuk autentikasi.
// ============================================================

const { z } = require('zod');

// Pola validasi password: minimal 8 karakter, huruf besar, huruf kecil, angka, spesial
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[a-zA-Z\d!@#$%^&*(),.?":{}|<>]{8,}$/;

const pesanPassword = {
  required: 'Kata sandi wajib diisi.',
  minLength: 'Kata sandi minimal 8 karakter.',
  uppercase: 'Kata sandi harus mengandung minimal 1 huruf besar.',
  lowercase: 'Kata sandi harus mengandung minimal 1 huruf kecil.',
  number: 'Kata sandi harus mengandung minimal 1 angka.',
  special: 'Kata sandi harus mengandung minimal 1 karakter spesial (!@#$%^&* dll).',
};

// Validasi password dengan rules组合
function passwordSchema(messageOverride = null) {
  return z
    .string({ required_error: pesanPassword.required })
    .min(8, messageOverride || pesanPassword.minLength)
    .refine(
      (pwd) => /[A-Z]/.test(pwd),
      { message: pesanPassword.uppercase }
    )
    .refine(
      (pwd) => /[a-z]/.test(pwd),
      { message: pesanPassword.lowercase }
    )
    .refine(
      (pwd) => /\d/.test(pwd),
      { message: pesanPassword.number }
    )
    .refine(
      (pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
      { message: pesanPassword.special }
    );
}

// Validasi registrasi peminjam baru
const registerSchema = z.object({
  nama: z.string({ required_error: 'Nama wajib diisi.' }).min(3, 'Nama minimal 3 karakter.'),
  nip: z
    .string({ required_error: 'NIP wajib diisi.' })
    .min(5, 'NIP minimal 5 karakter.')
    .max(30, 'NIP maksimal 30 karakter.'),
  email: z.string({ required_error: 'Email wajib diisi.' }).email('Format email tidak valid.'),
  password: passwordSchema(),
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
  passwordBaru: passwordSchema('Kata sandi baru tidak memenuhi syarat.'),
});

module.exports = { registerSchema, loginSchema, updateProfilSchema, gantiPasswordSchema };
