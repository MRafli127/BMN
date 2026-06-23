// ============================================================
//  Rute Peminjaman — /api/peminjaman
// ============================================================

const express = require('express');
const peminjamanController = require('../controllers/peminjaman.controller');
const stempelController = require('../controllers/stempel.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');
const validate = require('../middleware/validate.middleware');
const { uploadDokumenPeminjaman } = require('../middleware/upload.middleware');
const { createPeminjamanSchema, tolakSchema, setujuiSchema } = require('../validators/peminjaman.validator');

const router = express.Router();

// Semua rute peminjaman memerlukan login
router.use(authMiddleware);

// Daftar & pengajuan
router.get('/', peminjamanController.getSemua);
router.post('/', uploadDokumenPeminjaman, validate(createPeminjamanSchema), peminjamanController.create);

// Aksi massal (khusus admin) — didefinisikan sebelum '/:id' agar tidak
// tertangkap sebagai parameter id.
router.post('/hapus-massal', roleMiddleware('ADMIN'), peminjamanController.hapusMassal);
router.post('/setujui-massal', roleMiddleware('ADMIN'), peminjamanController.setujuiMassal);

// Detail
router.get('/:id', peminjamanController.getById);

// Aksi admin
router.patch('/:id/setujui', roleMiddleware('ADMIN'), validate(setujuiSchema), peminjamanController.setujui);
router.patch('/:id/tolak', roleMiddleware('ADMIN'), validate(tolakSchema), peminjamanController.tolak);
router.patch('/:id/serahkan', roleMiddleware('ADMIN'), peminjamanController.serahkan);
router.patch('/:id/kembalikan', roleMiddleware('ADMIN'), peminjamanController.kembalikan);
router.delete('/:id', roleMiddleware('ADMIN'), peminjamanController.hapus);
router.post('/:id/stempel', roleMiddleware('ADMIN'), stempelController.stempel);

module.exports = router;
