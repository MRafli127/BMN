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
const { invalidateUserSessions, updateLastActivity } = require('../services/auth.service');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

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

// Endpoint heartbeat — update last activity + return serverTime untuk sinkronisasi client
router.post('/heartbeat', authMiddleware, async (req, res) => {
  try {
    await updateLastActivity(req.user.id, req.user.jti);
    res.json({ success: true, serverTime: Date.now() });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// Endpoint invalidate session saat tab ditutup (menggunakan sendBeacon)
// Bisa dipanggil dengan atau tanpa CSRF karena menggunakan Bearer token dari localStorage
router.post('/invalidate-session', async (req, res) => {
  try {
    // Ambil token dari cookie atau dari body
    const cookieToken = req.cookies?.sipp_token || req.body?.token;
    const authHeader = req.headers.authorization || '';
    const [tipe, headerToken] = authHeader.split(' ');

    let token = cookieToken || headerToken;

    // Jika tidak ada cookie, coba dari query param atau body
    if (!token) {
      token = req.query?.token || req.body?.token;
    }

    if (tipe === 'Bearer' && headerToken) {
      token = headerToken;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Token tidak ditemukan' });
    }

    // Decode token untuk dapat userId
    let payload;
    try {
      payload = jwt.verify(token, env.jwt.accessSecret);
    } catch {
      // Token tidak valid, tapi kita tetap return success agar tidak error
      return res.json({ success: true });
    }

    // Invalidate session
    await invalidateUserSessions(payload.sub);

    return res.json({ success: true });
  } catch (error) {
    // Log error tapi tetap return success
    console.error('[AUTH] Error invalidating session:', error);
    return res.json({ success: true });
  }
});

module.exports = router;
