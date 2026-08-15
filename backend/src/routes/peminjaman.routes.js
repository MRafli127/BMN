// ============================================================
//  Rute Peminjaman — /api/peminjaman
// ============================================================

const express = require('express');
const peminjamanController = require('../controllers/peminjaman.controller');
const stempelController = require('../controllers/stempel.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const { validateCsrfTokenMiddleware, generateCsrfTokenMiddleware } = require('../middleware/csrf.middleware');
const { uploadDokumenPeminjaman } = require('../middleware/upload.middleware');
const { createPeminjamanSchema, tolakSchema, setujuiSchema, previewSuratSchema, createByAdminSchema } = require('../validators/peminjaman.validator');

const router = express.Router();

// Semua rute peminjaman memerlukan login
router.use(authMiddleware);

// Generate CSRF token untuk session (bila belum ada)
router.use(generateCsrfTokenMiddleware);

// Pratinjau Surat Pernyataan Peminjaman (PDF) sebelum pengajuan dibuat.
// Menggunakan POST karena memerlukan body dengan data barang.
router.post('/preview-surat', validate(previewSuratSchema), peminjamanController.previewSurat);

// Daftar & pengajuan
router.get('/', peminjamanController.getSemua);
router.post('/', validateCsrfTokenMiddleware, uploadDokumenPeminjaman, validate(createPeminjamanSchema), peminjamanController.create);

// Admin membuatkan peminjaman atas nama peminjam.
// draft=true: simpan DRAFT tanpa surat (tanpa potong stok).
// draft=false/undefined: wajib upload surat, langsung DIPINJAM (potong stok).
router.post('/preview-surat-admin', validateCsrfTokenMiddleware, roleMiddleware('ADMIN', 'SUPER_ADMIN'), peminjamanController.previewSuratAdmin);
router.post('/oleh-admin', validateCsrfTokenMiddleware, roleMiddleware('ADMIN', 'SUPER_ADMIN'), uploadDokumenPeminjaman, validate(createByAdminSchema), peminjamanController.createByAdmin);
router.patch('/:id/serahkan-draft-admin', validateCsrfTokenMiddleware, roleMiddleware('ADMIN', 'SUPER_ADMIN'), uploadDokumenPeminjaman, peminjamanController.serahkanDraftAdmin);

// Aksi massal (khusus admin) — didefinisikan sebelum '/:id' agar tidak
// tertangkap sebagai parameter id.
router.post('/hapus-massal', validateCsrfTokenMiddleware, roleMiddleware('ADMIN', 'SUPER_ADMIN'), peminjamanController.hapusMassal);
router.post('/setujui-massal', validateCsrfTokenMiddleware, roleMiddleware('ADMIN', 'SUPER_ADMIN'), peminjamanController.setujuiMassal);
router.post('/serahkan-massal', validateCsrfTokenMiddleware, roleMiddleware('ADMIN', 'SUPER_ADMIN'), peminjamanController.serahkanMassal);
router.post('/kembalikan-massal', validateCsrfTokenMiddleware, roleMiddleware('ADMIN', 'SUPER_ADMIN'), peminjamanController.kembalikanMassal);

// Detail
router.get('/:id', peminjamanController.getById);

// Surat Pernyataan Peminjaman (PDF) untuk pengajuan tersimpan — dipakai peminjam
// mengunduh surat pengajuan DRAFT miliknya. Kepemilikan dicek di service.
router.get('/:id/surat-pernyataan', peminjamanController.suratPernyataan);
// Peminjam mengunggah Surat Pernyataan yang sudah ditandatangani untuk pengajuan
// DRAFT (field "dokumen"). Status DRAFT -> MENUNGGU. Kepemilikan dicek di service.
router.patch('/:id/unggah-surat', validateCsrfTokenMiddleware, uploadDokumenPeminjaman, peminjamanController.unggahSurat);
// Peminjam membatalkan pengajuan DRAFT miliknya. Kepemilikan dicek di service.
router.delete('/:id/batal-draft', validateCsrfTokenMiddleware, peminjamanController.batalDraft);

// Aksi admin
router.patch('/:id/setujui', validateCsrfTokenMiddleware, roleMiddleware('ADMIN', 'SUPER_ADMIN'), validate(setujuiSchema), peminjamanController.setujui);
router.patch('/:id/tolak', validateCsrfTokenMiddleware, roleMiddleware('ADMIN', 'SUPER_ADMIN'), validate(tolakSchema), peminjamanController.tolak);
router.patch('/:id/serahkan', validateCsrfTokenMiddleware, roleMiddleware('ADMIN', 'SUPER_ADMIN'), peminjamanController.serahkan);
// Surat Pernyataan Pengembalian (PDF) untuk diunduh peminjam (kepemilikan dicek di service)
router.get('/:id/surat-pengembalian', peminjamanController.suratPengembalian);
// Permintaan pengembalian oleh peminjam — wajib unggah surat yang sudah
// ditandatangani fisik (field "dokumen"). Kepemilikan dicek di service.
router.patch('/:id/minta-pengembalian', validateCsrfTokenMiddleware, uploadDokumenPeminjaman, peminjamanController.mintaPengembalian);
router.patch('/:id/kembalikan', validateCsrfTokenMiddleware, roleMiddleware('ADMIN', 'SUPER_ADMIN'), uploadDokumenPeminjaman, peminjamanController.kembalikan);
router.delete('/:id', validateCsrfTokenMiddleware, roleMiddleware('ADMIN', 'SUPER_ADMIN'), peminjamanController.hapus);
router.post('/:id/stempel', validateCsrfTokenMiddleware, roleMiddleware('ADMIN', 'SUPER_ADMIN'), stempelController.stempel);

module.exports = router;
