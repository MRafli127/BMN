// ============================================================
//  Penggabung seluruh rute API — di-mount pada /api
// ============================================================

const express = require('express');
const authRoutes = require('./auth.routes');
const barangRoutes = require('./barang.routes');
const peminjamanRoutes = require('./peminjaman.routes');
const qrcodeRoutes = require('./qrcode.routes');
const dashboardRoutes = require('./dashboard.routes');
const peminjamImportRoutes = require('./peminjamImport.routes');
const pegawaiImportRoutes = require('./pegawaiImport.routes');
const userManagementRoutes = require('./userManagement.routes');
const auditLogRoutes = require('./auditLog.routes');
const exportRoutes = require('./export.routes');
const notificationRoutes = require('./notification.routes');
const importLogRoutes = require('./importLog.routes');
const satkerRoutes = require('./satker.routes');

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
router.use('/import-peminjam', peminjamImportRoutes);
router.use('/import-pegawai', pegawaiImportRoutes);
router.use('/users', userManagementRoutes);

// Rute baru: Audit Log, Export, Notifications & Import Logs (khusus ADMIN)
router.use('/audit-logs', auditLogRoutes);
router.use('/export', exportRoutes);
router.use('/notifications', notificationRoutes);
router.use('/import-logs', importLogRoutes);
router.use('/satker', satkerRoutes);

module.exports = router;
