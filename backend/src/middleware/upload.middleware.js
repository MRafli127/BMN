// ============================================================
//  Middleware upload file — membungkus Multer agar error
//  (ukuran/ tipe file) ditangani dengan pesan bahasa Indonesia.
// ============================================================

const multer = require('multer');
const { uploadDokumen, uploadFotoBarang } = require('../config/multer');
const { responsGagal } = require('../utils/apiResponse');
const env = require('../config/env');

// Pembungkus penangan error Multer
function bungkus(uploader) {
  return (req, res, next) => {
    uploader(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          const maxMb = Math.round(env.maxFileSize / (1024 * 1024));
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

module.exports = { uploadDokumenPeminjaman, uploadFotoBarangSingle };
