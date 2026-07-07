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

// Tanggal required dengan validasi tidak boleh backdate
const tanggalRequired = (pesan) =>
  z.preprocess(
    (v) => {
      if (v === '' || v === null || v === undefined) {
        return undefined;
      }
      const date = new Date(v);
      // Set ke start of day untuk perbandingan
      date.setHours(0, 0, 0, 0);
      return date;
    },
    z.date({ errorMap: () => ({ message: pesan }) })
      .min((() => { const d = new Date(); d.setHours(0,0,0,0); return d; })(), 'Tanggal tidak boleh mundur dari hari ini.')
  );

// Tanggal opsional: string kosong/null dianggap "tidak diisi" (undefined).
// Validasi: HARUS > tanggal pinjam (jika ada), TIDAK ada batasan backdate
// (rencana pinjam di masa lalu dimungkinkan, mis. lupa isi kemarin).
const tanggalOpsional = (pesan, minDate) =>
  z.preprocess(
    (v) => {
      if (v === '' || v === null || v === undefined) {
        return undefined;
      }
      const date = new Date(v);
      // Set ke start of day untuk konsistensi
      date.setHours(0, 0, 0, 0);
      return date;
    },
    z
      .date({ errorMap: () => ({ message: pesan }) })
      .optional()
  );

// Refinement bersama: tanggal kembali harus setelah tanggal pinjam (bila keduanya ada).
const tglKembaliSetelahPinjam = (data) =>
  !data.tanggalKembaliRencana ||
  !data.tanggalPinjamRencana ||
  data.tanggalKembaliRencana > data.tanggalPinjamRencana;
const pesanTglKembali = {
  message: 'Tanggal rencana kembali harus setelah tanggal pinjam.',
  path: ['tanggalKembaliRencana'],
};

// Validasi pengajuan peminjaman.
// - Tanggal pinjam: OPSIONAL, tapi jika diisi tidak boleh backdate
// - Tanggal kembali: OPSIONAL, tapi jika ada harus > tanggal pinjam
// - Alasan: OPSIONAL tapi minimal 5 karakter jika diisi
// - Surat pernyataan yang sudah ditandatangani WAJIB diunggah (field file
//   "dokumen", divalidasi di controller/service — bukan di skema body ini).
const createPeminjamanSchema = z
  .object({
    alasanPeminjaman: z
      .string()
      .min(5, 'Alasan peminjaman minimal 5 karakter.')
      .optional()
      .or(z.literal('')),
    pangkatGolongan: z
      .string()
      .trim()
      .max(100, 'Pangkat/Gol. maksimal 100 karakter.')
      .optional()
      .or(z.literal('')),
    // Dikirim via multipart sebagai string; true = simpan sebagai DRAFT (tanpa surat).
    draft: z.preprocess((v) => v === true || v === 'true' || v === 1 || v === '1', z.boolean()),
    tanggalPinjamRencana: tanggalOpsional('Tanggal pinjam tidak valid.'),
    tanggalKembaliRencana: tanggalOpsional('Tanggal kembali tidak valid.'),
    items: parseItems,
  })
  .refine(tglKembaliSetelahPinjam, pesanTglKembali);

// Validasi pratinjau surat pernyataan (sebelum pengajuan dibuat).
// Sama seperti pengajuan namun tanpa alasan; dikirim sebagai JSON.
const previewSuratSchema = z
  .object({
    pangkatGolongan: z
      .string()
      .trim()
      .max(100, 'Pangkat/Gol. maksimal 100 karakter.')
      .optional()
      .or(z.literal('')),
    tanggalPinjamRencana: tanggalOpsional('Tanggal pinjam tidak valid.'),
    tanggalKembaliRencana: tanggalOpsional('Tanggal kembali tidak valid.'),
    items: parseItems,
  })
  .refine(tglKembaliSetelahPinjam, pesanTglKembali);

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

module.exports = { createPeminjamanSchema, previewSuratSchema, tolakSchema, setujuiSchema, scanSchema };
