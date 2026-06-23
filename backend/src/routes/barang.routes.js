// ============================================================
//  Rute Barang — /api/barang
//  Lihat: semua pengguna terautentikasi.
//  Tambah/Edit/Hapus: hanya ADMIN.
// ============================================================

const express = require('express');
const barangController = require('../controllers/barang.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const { uploadFotoBarangSingle, uploadExcelSingle } = require('../middleware/upload.middleware');
const { createBarangSchema, updateBarangSchema } = require('../validators/barang.validator');

const router = express.Router();

// Semua rute barang memerlukan login
router.use(authMiddleware);

// --- Import Excel (khusus admin) ---
// Didefinisikan sebelum '/:id' agar '/template' & '/import' tidak
// tertangkap sebagai parameter id.
router.get('/template', roleMiddleware('ADMIN'), barangController.unduhTemplate);
router.post('/import', roleMiddleware('ADMIN'), uploadExcelSingle, barangController.importExcel);

router.get('/', barangController.getSemua);
router.get('/:id', barangController.getById);

// Khusus admin
router.post('/', roleMiddleware('ADMIN'), uploadFotoBarangSingle, validate(createBarangSchema), barangController.create);
router.put('/:id', roleMiddleware('ADMIN'), uploadFotoBarangSingle, validate(updateBarangSchema), barangController.update);
router.delete('/:id', roleMiddleware('ADMIN'), barangController.remove);

module.exports = router;
