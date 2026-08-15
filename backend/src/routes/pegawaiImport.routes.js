// ============================================================
//  Rute Import Data Pegawai — /api/import-pegawai
//  Khusus ADMIN: mengisi & menyinkronkan data diri peminjam
//  (Daftar Pegawai) dari file master pegawai Excel/CSV.
// ============================================================

const express = require('express');
const pegawaiImportController = require('../controllers/pegawaiImport.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');
const { uploadExcelSingle } = require('../middleware/upload.middleware');

const router = express.Router();

router.use(authMiddleware, roleMiddleware('ADMIN'));

router.get('/template', pegawaiImportController.unduhTemplate);
router.post('/', uploadExcelSingle, pegawaiImportController.importExcel);

module.exports = router;
