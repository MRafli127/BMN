// ============================================================
//  Rute Import Peminjam — /api/import-peminjam
//  Khusus ADMIN: migrasi data pegawai yang sedang meminjam
//  barang (buat akun + peminjaman aktif) dari Excel/CSV.
// ============================================================

const express = require('express');
const peminjamImportController = require('../controllers/peminjamImport.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');
const { uploadExcelSingle } = require('../middleware/upload.middleware');

const router = express.Router();

router.use(authMiddleware, roleMiddleware('ADMIN'));

router.get('/template', peminjamImportController.unduhTemplate);
router.post('/', uploadExcelSingle, peminjamImportController.importExcel);

module.exports = router;
