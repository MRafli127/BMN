// ============================================================
//  Rute Notifikasi — /api/notifications
// ============================================================

const express = require('express');
const notificationController = require('../controllers/notification.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { validateCsrfTokenMiddleware } = require('../middleware/csrf.middleware');

const router = express.Router();

// Semua rute notifikasi memerlukan login
router.use(authMiddleware);

// Ambil semua notifikasi (dengan pagination)
router.get('/', notificationController.getSemua);

// Ambil jumlah belum dibaca
router.get('/belum-baca', notificationController.getBelumBaca);

// Tandai satu notifikasi sebagai sudah dibaca
router.patch('/:id/baca', validateCsrfTokenMiddleware, notificationController.markSudahBaca);

// Tandai semua notifikasi sebagai sudah dibaca
router.patch('/baca-semua', validateCsrfTokenMiddleware, notificationController.markSemuaSudahBaca);

// Hapus satu notifikasi
router.delete('/:id', validateCsrfTokenMiddleware, notificationController.hapus);

// Hapus semua notifikasi
router.delete('/', validateCsrfTokenMiddleware, notificationController.hapusSemua);

module.exports = router;