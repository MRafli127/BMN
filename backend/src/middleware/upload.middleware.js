// ============================================================
//  Middleware upload file — membungkus Multer agar error
//  (ukuran/ tipe file) ditangani dengan pesan bahasa Indonesia.
// ============================================================

const multer = require('multer');
const { uploadDokumen, uploadFotoBarang, uploadExcel } = require('../config/multer');
const { responsGagal } = require('../utils/apiResponse');
const env = require('../config/env');

// Pembungkus penangan error Multer.
// maxBytes opsional untuk menyesuaikan pesan batas ukuran tiap uploader.
function bungkus(uploader, maxBytes = env.maxFileSize) {
  return (req, res, next) => {
    uploader(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const maxMb = Math.round(maxBytes / (1024 * 1024));
          return responsGagal(res, {
            pesan: `Ukuran file terlalu besar. Maksimum ${maxMb} MB.`,
            status: 413,
          });
        }
        return responsGagal(res, { pesan: `Gagal mengunggah file: ${err.message}`, status: 400 });
      }
      if (err) {
        // Error dari fileFilter (tipe tidak diizinkan)
        return responsGagal(res, { pesan: err.message, status: 400 });
      }
      next();
    });
  };
}

// Upload satu dokumen dengan field name "dokumen"
const uploadDokumenPeminjaman = bungkus(uploadDokumen.single('dokumen'));

// Upload satu foto barang dengan field name "foto"
const uploadFotoBarangSingle = bungkus(uploadFotoBarang.single('foto'));

// Upload satu file Excel/CSV dengan field name "file" (batas 20 MB)
const uploadExcelSingle = bungkus(uploadExcel.single('file'), 20 * 1024 * 1024);

module.exports = { uploadDokumenPeminjaman, uploadFotoBarangSingle, uploadExcelSingle };
