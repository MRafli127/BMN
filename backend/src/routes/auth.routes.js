// ============================================================
//  Rute Autentikasi — /api/auth
// ============================================================

const express = require('express');
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate.middleware');
const authMiddleware = require('../middleware/auth.middleware');
const {
  registerSchema,
  loginSchema,
  updateProfilSchema,
  gantiPasswordSchema,
} = require('../validators/auth.validator');

const router = express.Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authMiddleware, authController.me);
router.patch('/me', authMiddleware, validate(updateProfilSchema), authController.updateMe);
router.patch('/me/password', authMiddleware, validate(gantiPasswordSchema), authController.gantiPassword);

module.exports = router;
