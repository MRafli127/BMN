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

function filterExcel(req, file, cb) {
  // Beberapa browser mengirim mimetype berbeda untuk .xlsx/.xls/.csv,
  // jadi kita longgar pada mimetype dan andalkan validasi ekstensi.
  const tipeDiizinkan = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv',
    'application/csv',
    'application/octet-stream', // fallback umum
  ];
  const ekstensiValid = /\.(xlsx|xls|csv)$/i.test(file.originalname || '');
  if (ekstensiValid || tipeDiizinkan.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipe file tidak diizinkan. Gunakan file Excel (.xlsx, .xls) atau CSV.'));
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

// File Excel bisa memuat ribuan baris; beri batas lebih longgar (20 MB).
const uploadExcel = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: filterExcel,
});

module.exports = { uploadDokumen, uploadFotoBarang, uploadExcel };
