// ============================================================
//  Rute Export Data — /api/export
//  Semua rute ini khusus ADMIN
// ============================================================

const express = require('express');
const exportController = require('../controllers/export.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');

const router = express.Router();

// Semua rute memerlukan login + role ADMIN
router.use(authMiddleware);
router.use(roleMiddleware('ADMIN'));

// Export peminjaman
router.get('/peminjaman', exportController.exportPeminjaman);

// Export barang
router.get('/barang', exportController.exportBarang);

// Export users
router.get('/users', exportController.exportUsers);

module.exports = router;
