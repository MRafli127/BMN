// ============================================================
//  Route untuk Log Import — /api/import-logs
//  Khusus ADMIN
// ============================================================

const express = require('express');
const importLogController = require('../controllers/importLog.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');

const router = express.Router();

router.use(authMiddleware, roleMiddleware('ADMIN'));

// GET /api/import-logs - Ambil semua log (paginated)
router.get('/', importLogController.ambilSemuaLog);

// GET /api/import-logs/statik - Statistik ringkasan
router.get('/statistik', importLogController.statistikImport);

// GET /api/import-logs/:id - Ambil satu log
router.get('/:id', importLogController.ambilLogById);

// DELETE /api/import-logs/:id - Hapus satu log
router.delete('/:id', importLogController.hapusLog);

module.exports = router;
