// ============================================================
//  Skema validasi Zod untuk Barang.
//  Karena dikirim via multipart/form-data, angka di-coerce
//  dari string secara otomatis.
// ============================================================

const { z } = require('zod');

const JENIS = ['ELEKTRONIK', 'FURNITUR', 'KENDARAAN', 'ATK', 'LAINNYA'];
const KONDISI = ['BAIK', 'RUSAK_RINGAN', 'RUSAK_BERAT'];

// Validasi tambah barang
const createBarangSchema = z.object({
  nama: z.string({ required_error: 'Nama barang wajib diisi.' }).min(2, 'Nama barang minimal 2 karakter.'),
  jenis: z.enum(JENIS, { errorMap: () => ({ message: 'Jenis barang tidak valid.' }) }),
  jumlahTotal: z.coerce
    .number({ invalid_type_error: 'Jumlah total harus berupa angka.' })
    .int('Jumlah total harus bilangan bulat.')
    .min(1, 'Jumlah total minimal 1.'),
  kondisi: z.enum(KONDISI, { errorMap: () => ({ message: 'Kondisi barang tidak valid.' }) }).default('BAIK'),
  lokasiPenyimpanan: z.string().optional().or(z.literal('')),
  deskripsi: z.string().optional().or(z.literal('')),
});

// Validasi edit barang (semua opsional)
const updateBarangSchema = z.object({
  nama: z.string().min(2, 'Nama barang minimal 2 karakter.').optional(),
  jenis: z.enum(JENIS, { errorMap: () => ({ message: 'Jenis barang tidak valid.' }) }).optional(),
  jumlahTotal: z.coerce.number().int().min(1, 'Jumlah total minimal 1.').optional(),
  kondisi: z.enum(KONDISI, { errorMap: () => ({ message: 'Kondisi barang tidak valid.' }) }).optional(),
  lokasiPenyimpanan: z.string().optional().or(z.literal('')),
  deskripsi: z.string().optional().or(z.literal('')),
});

module.exports = { createBarangSchema, updateBarangSchema, JENIS, KONDISI };
