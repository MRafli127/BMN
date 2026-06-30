// ============================================================
//  Rute Manajemen User — /api/users
//  Semua rute ini khusus ADMIN
// ============================================================

const express = require('express');
const userManagementController = require('../controllers/userManagement.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const { validateCsrfTokenMiddleware } = require('../middleware/csrf.middleware');
const { createUserSchema, updateUserSchema } = require('../validators/userManagement.validator');

const router = express.Router();

// Semua rute memerlukan login + role ADMIN
router.use(authMiddleware);
router.use(roleMiddleware('ADMIN'));

// List user (dengan filter & pagination)
router.get('/', userManagementController.getSemua);

// Statistik user
router.get('/statistik', userManagementController.getStatistik);

// Hapus banyak peminjam sekaligus (berdasarkan ID terpilih; lewati yang aktif).
// Didaftarkan sebelum rute '/:id' agar tidak tertangkap sebagai parameter id.
router.post('/peminjam/hapus-massal', validateCsrfTokenMiddleware, userManagementController.hapusMassalPeminjam);

// Buat user baru
router.post('/', validateCsrfTokenMiddleware, validate(createUserSchema), userManagementController.create);

// Ambil satu user
router.get('/:id', userManagementController.getById);

// Update user
router.patch('/:id', validateCsrfTokenMiddleware, validate(updateUserSchema), userManagementController.update);

// Reset password user
router.post('/:id/reset-password', validateCsrfTokenMiddleware, userManagementController.resetPassword);

// Hapus user
router.delete('/:id', validateCsrfTokenMiddleware, userManagementController.remove);

module.exports = router;
