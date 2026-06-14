// ============================================================
//  Skema validasi Zod untuk Peminjaman.
//  Dikirim via multipart/form-data; field "items" berupa
//  string JSON sehingga di-preprocess menjadi array objek.
// ============================================================

const { z } = require('zod');

// Preprocess: parse string JSON menjadi array bila perlu
const parseItems = z.preprocess((val) => {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return val; // biarkan gagal di validasi array
    }
  }
  return val;
}, z
  .array(
    z.object({
      barangId: z.string({ required_error: 'barangId wajib diisi.' }).uuid('barangId tidak valid.'),
      jumlahPinjam: z.coerce
        .number({ invalid_type_error: 'Jumlah pinjam harus angka.' })
        .int('Jumlah pinjam harus bilangan bulat.')
        .min(1, 'Jumlah pinjam minimal 1.'),
    })
  )
  .min(1, 'Minimal pilih 1 barang untuk dipinjam.'));

// Validasi pengajuan peminjaman
const createPeminjamanSchema = z
  .object({
    alasanPeminjaman: z
      .string({ required_error: 'Alasan peminjaman wajib diisi.' })
      .min(5, 'Alasan peminjaman minimal 5 karakter.'),
    tanggalPinjamRencana: z.coerce.date({
      errorMap: () => ({ message: 'Tanggal pinjam tidak valid.' }),
    }),
    tanggalKembaliRencana: z.coerce.date({
      errorMap: () => ({ message: 'Tanggal kembali tidak valid.' }),
    }),
    items: parseItems,
  })
  .refine((data) => data.tanggalKembaliRencana > data.tanggalPinjamRencana, {
    message: 'Tanggal rencana kembali harus setelah tanggal pinjam.',
    path: ['tanggalKembaliRencana'],
  });

// Validasi penolakan (wajib isi catatan)
const tolakSchema = z.object({
  catatanAdmin: z
    .string({ required_error: 'Catatan penolakan wajib diisi.' })
    .min(3, 'Catatan penolakan minimal 3 karakter.'),
});

// Validasi persetujuan (catatan opsional)
const setujuiSchema = z.object({
  catatanAdmin: z.string().optional().or(z.literal('')),
});

// Validasi scan QR untuk pengembalian
const scanSchema = z.object({
  kodePeminjaman: z
    .string({ required_error: 'Kode peminjaman wajib diisi.' })
    .min(3, 'Kode peminjaman tidak valid.'),
});

module.exports = { createPeminjamanSchema, tolakSchema, setujuiSchema, scanSchema };
