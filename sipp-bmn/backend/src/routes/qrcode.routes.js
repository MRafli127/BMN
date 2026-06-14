// ============================================================
//  Rute QR Code & Scan — di-mount pada /api/peminjaman
//   - GET  /api/peminjaman/:id/qrcode  (lihat QR)
//   - POST /api/peminjaman/scan        (scan QR untuk pengembalian, admin)
//  Path berbeda dengan rute peminjaman lain sehingga tidak bentrok.
// ============================================================

const express = require('express');
const qrcodeController = require('../controllers/qrcode.controller');
const peminjamanController = require('../controllers/peminjaman.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const { scanSchema } = require('../validators/peminjaman.validator');

const router = express.Router();

router.use(authMiddleware);

// Scan QR (admin) — cari peminjaman berdasarkan kode
router.post('/scan', roleMiddleware('ADMIN'), validate(scanSchema), peminjamanController.scan);

// Ambil QR Code peminjaman
router.get('/:id/qrcode', qrcodeController.getQrcode);

module.exports = router;
