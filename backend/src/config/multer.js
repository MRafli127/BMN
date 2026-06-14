// ============================================================
//  Konfigurasi Multer untuk upload file
//  - Dokumen peminjaman (PDF / gambar)
//  - Foto barang (gambar)
//  Membatasi tipe & ukuran file demi keamanan.
// ============================================================

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const env = require('./env');

// Pastikan folder tujuan ada
function pastikanFolder(folder) {
  const fullPath = path.resolve(__dirname, '../../uploads', folder);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
  return fullPath;
}

// Buat penyimpanan untuk subfolder tertentu
function buatStorage(subfolder) {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, pastikanFolder(subfolder));
    },
    filename: (req, file, cb) => {
      // Nama file unik: timestamp + acak + ekstensi asli
      const ext = path.extname(file.originalname).toLowerCase();
      const namaUnik = `${subfolder}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      cb(null, namaUnik);
    },
  });
}

// Filter tipe file dokumen (PDF & gambar)
function filterDokumen(req, file, cb) {
  const tipeDiizinkan = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
  ];
  if (tipeDiizinkan.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipe file dokumen tidak diizinkan. Gunakan PDF, JPG, atau PNG.'));
  }
}

// Filter tipe file gambar saja (foto barang)
function filterGambar(req, file, cb) {
  const tipeDiizinkan = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (tipeDiizinkan.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipe file gambar tidak diizinkan. Gunakan JPG, PNG, atau WEBP.'));
  }
}

// Uploader untuk dokumen peminjaman
const uploadDokumen = multer({
  storage: buatStorage('dokumen'),
  limits: { fileSize: env.maxFileSize },
  fileFilter: filterDokumen,
});

// Uploader untuk foto barang
const uploadFotoBarang = multer({
  storage: buatStorage('foto-barang'),
  limits: { fileSize: env.maxFileSize },
  fileFilter: filterGambar,
});

module.exports = { uploadDokumen, uploadFotoBarang, pastikanFolder };
