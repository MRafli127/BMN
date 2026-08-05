// ============================================================
//  Rute Pencarian Global — /api/search
// ============================================================

const express = require('express');
const searchController = require('../controllers/search.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Semua rute memerlukan login
router.use(authMiddleware);

router.get('/', searchController.cariGlobal);

module.exports = router;
