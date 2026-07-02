// ============================================================
//  Rute Peminjaman — /api/peminjaman
// ============================================================

const express = require('express');
const peminjamanController = require('../controllers/peminjaman.controller');
const stempelController = require('../controllers/stempel.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const { validateCsrfTokenMiddleware } = require('../middleware/csrf.middleware');
const { uploadDokumenPeminjaman } = require('../middleware/upload.middleware');
const { createPeminjamanSchema, tolakSchema, setujuiSchema, previewSuratSchema } = require('../validators/peminjaman.validator');

const router = express.Router();

// Semua rute peminjaman memerlukan login
router.use(authMiddleware);

// Daftar & pengajuan
router.get('/', peminjamanController.getSemua);
// Pratinjau Surat Pernyataan Peminjaman (PDF) sebelum pengajuan dibuat.
router.post('/preview-surat', validateCsrfTokenMiddleware, validate(previewSuratSchema), peminjamanController.previewSurat);
router.post('/', validateCsrfTokenMiddleware, uploadDokumenPeminjaman, validate(createPeminjamanSchema), peminjamanController.create);

// Aksi massal (khusus admin) — didefinisikan sebelum '/:id' agar tidak
// tertangkap sebagai parameter id.
router.post('/hapus-massal', validateCsrfTokenMiddleware, roleMiddleware('ADMIN'), peminjamanController.hapusMassal);
router.post('/setujui-massal', validateCsrfTokenMiddleware, roleMiddleware('ADMIN'), peminjamanController.setujuiMassal);
router.post('/serahkan-massal', validateCsrfTokenMiddleware, roleMiddleware('ADMIN'), peminjamanController.serahkanMassal);
router.post('/kembalikan-massal', validateCsrfTokenMiddleware, roleMiddleware('ADMIN'), peminjamanController.kembalikanMassal);

// Detail
router.get('/:id', peminjamanController.getById);

// Aksi admin
router.patch('/:id/setujui', validateCsrfTokenMiddleware, roleMiddleware('ADMIN'), validate(setujuiSchema), peminjamanController.setujui);
router.patch('/:id/tolak', validateCsrfTokenMiddleware, roleMiddleware('ADMIN'), validate(tolakSchema), peminjamanController.tolak);
router.patch('/:id/serahkan', validateCsrfTokenMiddleware, roleMiddleware('ADMIN'), peminjamanController.serahkan);
// Surat Pernyataan Pengembalian (PDF) untuk diunduh peminjam (kepemilikan dicek di service)
router.get('/:id/surat-pengembalian', peminjamanController.suratPengembalian);
// Permintaan pengembalian oleh peminjam — wajib unggah surat yang sudah
// ditandatangani fisik (field "dokumen"). Kepemilikan dicek di service.
router.patch('/:id/minta-pengembalian', validateCsrfTokenMiddleware, uploadDokumenPeminjaman, peminjamanController.mintaPengembalian);
router.patch('/:id/kembalikan', validateCsrfTokenMiddleware, roleMiddleware('ADMIN'), peminjamanController.kembalikan);
router.delete('/:id', validateCsrfTokenMiddleware, roleMiddleware('ADMIN'), peminjamanController.hapus);
router.post('/:id/stempel', validateCsrfTokenMiddleware, roleMiddleware('ADMIN'), stempelController.stempel);

module.exports = router;
