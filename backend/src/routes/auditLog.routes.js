// ============================================================
//  Rute Audit Log — /api/audit-logs
//  Semua rute ini khusus ADMIN dan SUPER_ADMIN
// ============================================================

const express = require('express');
const auditLogController = require('../controllers/auditLog.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');

const router = express.Router();

// Semua rute memerlukan login + role ADMIN atau SUPER_ADMIN
router.use(authMiddleware);
router.use(roleMiddleware('ADMIN', 'SUPER_ADMIN'));

// List audit log (dengan filter & pagination)
router.get('/', auditLogController.getSemua);

// Statistik audit log
router.get('/statistik', auditLogController.getStatistik);

// Ambil satu audit log
router.get('/:id', auditLogController.getById);

module.exports = router;
