// ============================================================
//  Skema validasi Zod untuk Manajemen User
// ============================================================

const { z } = require('zod');

// Validasi create user oleh admin
const createUserSchema = z.object({
  nama: z.string({ required_error: 'Nama wajib diisi.' }).min(3, 'Nama minimal 3 karakter.'),
  nip: z
    .string({ required_error: 'NIP wajib diisi.' })
    .min(5, 'NIP minimal 5 karakter.')
    .max(30, 'NIP maksimal 30 karakter.'),
  email: z.string({ required_error: 'Email wajib diisi.' }).email('Format email tidak valid.'),
  password: z.string().optional(), // opsional, kalau kosong pakai default
  jabatan: z.string().optional().or(z.literal('')),
  unitKerja: z.string().optional().or(z.literal('')),
  role: z.enum(['ADMIN', 'PEMINJAM']).optional(),
});

// Validasi update user
const updateUserSchema = z.object({
  nama: z.string().min(3, 'Nama minimal 3 karakter.').optional(),
  nip: z.string().min(5, 'NIP minimal 5 karakter.').max(30, 'NIP maksimal 30 karakter.').optional(),
  email: z.string().email('Format email tidak valid.').optional(),
  jabatan: z.string().optional().or(z.literal('')),
  unitKerja: z.string().optional().or(z.literal('')),
  role: z.enum(['ADMIN', 'PEMINJAM']).optional(),
});

module.exports = { createUserSchema, updateUserSchema };
