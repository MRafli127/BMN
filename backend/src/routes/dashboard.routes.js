// ============================================================
//  Rute Dashboard — /api/dashboard
// ============================================================

const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');

const router = express.Router();

// Semua route butuh autentikasi
router.use(authMiddleware);

// Route kategori (HARUS sebelum /admin agar tidak tertangkap oleh pattern lain)
router.get('/kategori/:kategori', roleMiddleware('ADMIN', 'SUPER_ADMIN'), dashboardController.ambilDataKategori);

// Dashboard Admin
router.get('/admin', roleMiddleware('ADMIN', 'SUPER_ADMIN'), dashboardController.dashboardAdmin);

// Dashboard Super Admin (lebih lengkap dari admin biasa)
router.get('/super-admin', roleMiddleware('SUPER_ADMIN'), dashboardController.dashboardSuperAdmin);

// Dashboard Peminjam
router.get('/peminjam', dashboardController.dashboardPeminjam);

module.exports = router;
