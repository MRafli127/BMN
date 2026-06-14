const multer = require('multer');
const env = require('./env');

function filterDokumen(req, file, cb) {
  const tipeDiizinkan = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
  if (tipeDiizinkan.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipe file dokumen tidak diizinkan. Gunakan PDF, JPG, atau PNG.'));
  }
}

function filterGambar(req, file, cb) {
  const tipeDiizinkan = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (tipeDiizinkan.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipe file gambar tidak diizinkan. Gunakan JPG, PNG, atau WEBP.'));
  }
}

const uploadDokumen = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxFileSize },
  fileFilter: filterDokumen,
});

const uploadFotoBarang = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxFileSize },
  fileFilter: filterGambar,
});

module.exports = { uploadDokumen, uploadFotoBarang };
