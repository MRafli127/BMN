// ============================================================
//  Rute Satker — /api/satker
//  Semua rute ini khusus ADMIN dan SUPER_ADMIN
// ============================================================

const express = require('express');
const satkerController = require('../controllers/satker.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const { validateCsrfTokenMiddleware } = require('../middleware/csrf.middleware');
const { createSatkerSchema, updateSatkerSchema } = require('../validators/satker.validator');

const router = express.Router();

// Semua rute memerlukan login + role ADMIN atau SUPER_ADMIN
router.use(authMiddleware);
router.use(roleMiddleware('ADMIN', 'SUPER_ADMIN'));

// List satker
router.get('/', satkerController.getSemua);

// Sync satker dari data barang (khusus SUPER_ADMIN)
router.post('/sync', validateCsrfTokenMiddleware, roleMiddleware('SUPER_ADMIN'), satkerController.sync);

// Ambil satu satker
router.get('/:id', satkerController.getById);

// Buat satker baru
router.post('/', validateCsrfTokenMiddleware, validate(createSatkerSchema), satkerController.create);

// Update satker
router.patch('/:id', validateCsrfTokenMiddleware, validate(updateSatkerSchema), satkerController.update);

// Hapus satker (khusus SUPER_ADMIN)
router.delete('/:id', validateCsrfTokenMiddleware, roleMiddleware('SUPER_ADMIN'), satkerController.remove);

module.exports = router;
