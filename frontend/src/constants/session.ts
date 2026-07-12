// ============================================================
//  Session constants — centralized configuration untuk session security.
// ============================================================

// Inactivity timeout: 30 menit (user/admin auto logout jika idle)
// INACTIVITY_TIMEOUT_MS harus sama nilainya di:
// - frontend: constants/session.ts
// - backend: auth.service.js, auth.middleware.js
export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;

// Heartbeat interval: 1 menit
export const HEARTBEAT_INTERVAL_MS = 60 * 1000;

// Inactivity check interval: 30 detik
export const INACTIVITY_CHECK_INTERVAL_MS = 30 * 1000;
