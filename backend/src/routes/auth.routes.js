// ============================================================
//  Rute Autentikasi — /api/auth
// ============================================================

const express = require('express');
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate.middleware');
const authMiddleware = require('../middleware/auth.middleware');
const {
  loginLimiter,
  registerLimiter,
  refreshLimiter,
  passwordLimiter,
} = require('../middleware/rateLimit.middleware');
const {
  validateCsrfTokenMiddleware,
  generateCsrfTokenMiddleware,
} = require('../middleware/csrf.middleware');
const {
  registerSchema,
  loginSchema,
  switchRoleSchema,
  updateProfilSchema,
  gantiPasswordSchema,
} = require('../validators/auth.validator');

const router = express.Router();

// Endpoint publik
router.post('/register', registerLimiter, validate(registerSchema), authController.register);
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/refresh', refreshLimiter, authController.refresh);

// Endpoint untuk dapat CSRF token (tanpa auth)
router.get('/csrf-token', authController.getCsrf);

// Endpoint yang butuh auth + CSRF
router.post('/logout', authMiddleware, validateCsrfTokenMiddleware, authController.logout);
router.post('/switch-role', authMiddleware, validateCsrfTokenMiddleware, validate(switchRoleSchema), authController.switchRole);
router.get('/me', authMiddleware, authController.me);
router.patch('/me', authMiddleware, validateCsrfTokenMiddleware, validate(updateProfilSchema), authController.updateMe);
router.patch('/me/password', passwordLimiter, authMiddleware, validateCsrfTokenMiddleware, validate(gantiPasswordSchema), authController.gantiPassword);

module.exports = router;
