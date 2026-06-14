// ============================================================
//  Penggabung seluruh rute API — di-mount pada /api
// ============================================================

const express = require('express');
const authRoutes = require('./auth.routes');
const barangRoutes = require('./barang.routes');
const peminjamanRoutes = require('./peminjaman.routes');
const qrcodeRoutes = require('./qrcode.routes');
const dashboardRoutes = require('./dashboard.routes');

const router = express.Router();

// Cek kesehatan API
router.get('/', (req, res) => {
  res.json({
    sukses: true,
    pesan: 'API SIPP-BMN aktif.',
    versi: '1.0.0',
    waktu: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/barang', barangRoutes);

// QR & scan di-mount lebih dahulu (path /scan & /:id/qrcode) agar tidak tertimpa
router.use('/peminjaman', qrcodeRoutes);
router.use('/peminjaman', peminjamanRoutes);

router.use('/dashboard', dashboardRoutes);

module.exports = router;
