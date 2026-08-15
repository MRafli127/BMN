// ============================================================
//  Skema validasi Zod untuk Barang.
//  Karena dikirim via multipart/form-data, angka di-coerce
//  dari string secara otomatis.
// ============================================================

const { z } = require('zod');

const JENIS = ['ELEKTRONIK', 'FURNITUR', 'KENDARAAN', 'ATK', 'LAINNYA'];
const KONDISI = ['BAIK', 'RUSAK_RINGAN', 'RUSAK_BERAT'];

// Validasi tambah barang.
// Kode barang dibentuk dari kunci natural (Kode Satker - Kode Barang - NUP),
// jadi ketiga komponen tersebut wajib diisi.
const createBarangSchema = z.object({
  nama: z.string({ required_error: 'Nama barang wajib diisi.' }).min(2, 'Nama barang minimal 2 karakter.'),
  merk: z.string().optional().or(z.literal('')),
  jenis: z.enum(JENIS, { errorMap: () => ({ message: 'Jenis barang tidak valid.' }) }),
  jumlahTotal: z.coerce
    .number({ invalid_type_error: 'Jumlah total harus berupa angka.' })
    .int('Jumlah total harus bilangan bulat.')
    .min(1, 'Jumlah total minimal 1.'),
  kondisi: z.enum(KONDISI, { errorMap: () => ({ message: 'Kondisi barang tidak valid.' }) }).default('BAIK'),
  lokasiPenyimpanan: z.string().optional().or(z.literal('')),
  deskripsi: z.string().optional().or(z.literal('')),
  kodeSatker: z.string({ required_error: 'Kode Satker wajib diisi.' }).trim().min(1, 'Kode Satker wajib diisi.'),
  kodeBarangBmn: z.string({ required_error: 'Kode Barang wajib diisi.' }).trim().min(1, 'Kode Barang wajib diisi.'),
  nup: z.string({ required_error: 'NUP wajib diisi.' }).trim().min(1, 'NUP wajib diisi.'),
});

// Validasi bulk insert barang.
const bulkBarangSchema = z.object({
  nama: z.string({ required_error: 'Nama barang wajib diisi.' }).min(2, 'Nama barang minimal 2 karakter.'),
  merk: z.string({ required_error: 'Merk wajib diisi.' }).trim().min(1, 'Merk wajib diisi.'),
  jenis: z.enum(JENIS, { errorMap: () => ({ message: 'Jenis barang tidak valid.' }) }),
  kondisi: z.enum(KONDISI, { errorMap: () => ({ message: 'Kondisi barang tidak valid.' }) }).default('BAIK'),
  lokasiPenyimpanan: z.string().optional().or(z.literal('')),
  deskripsi: z.string().optional().or(z.literal('')),
  kodeSatker: z.string({ required_error: 'Kode Satker wajib diisi.' }).trim().min(1, 'Kode Satker wajib diisi.'),
  kodeBarangBmn: z.string({ required_error: 'Kode Barang wajib diisi.' }).trim().min(1, 'Kode Barang wajib diisi.'),
  jumlahBarang: z.coerce
    .number({ invalid_type_error: 'Jumlah barang harus berupa angka.' })
    .int('Jumlah barang harus bilangan bulat.')
    .min(1, 'Jumlah barang minimal 1.')
    .max(1000, 'Jumlah barang maksimal 1000 per sekali input.'),
});

// Validasi edit barang (semua opsional)
const updateBarangSchema = z.object({
  nama: z.string().min(2, 'Nama barang minimal 2 karakter.').optional(),
  merk: z.string().optional().or(z.literal('')),
  jenis: z.enum(JENIS, { errorMap: () => ({ message: 'Jenis barang tidak valid.' }) }).optional(),
  jumlahTotal: z.coerce.number().int().min(1, 'Jumlah total minimal 1.').optional(),
  kondisi: z.enum(KONDISI, { errorMap: () => ({ message: 'Kondisi barang tidak valid.' }) }).optional(),
  lokasiPenyimpanan: z.string().optional().or(z.literal('')),
  deskripsi: z.string().optional().or(z.literal('')),
  kodeSatker: z.string().trim().min(1, 'Kode Satker tidak boleh kosong.').optional(),
  kodeBarangBmn: z.string().trim().min(1, 'Kode Barang tidak boleh kosong.').optional(),
  nup: z.string().trim().min(1, 'NUP tidak boleh kosong.').optional(),
});

module.exports = { createBarangSchema, updateBarangSchema, bulkBarangSchema, JENIS, KONDISI };
