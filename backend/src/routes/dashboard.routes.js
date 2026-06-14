// ============================================================
//  Rute Dashboard — /api/dashboard
// ============================================================

const express = require('express');
const dashboardController = require('../controllers/dashboard.controller');
const authMiddleware = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get('/admin', roleMiddleware('ADMIN'), dashboardController.dashboardAdmin);
router.get('/peminjam', dashboardController.dashboardPeminjam);

module.exports = router;
