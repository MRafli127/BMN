// ============================================================
//  Hook useSessionSecurity — keamanan sesi berbasis aktivitas.
//   - Mendeteksi tab close / browser close → invalidate session
//   - Auto logout setelah 1 jam tidak aktif
//   - Kirim heartbeat aktivitas ke server secara periodik
// ============================================================

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { bersihkanSesi } from '@/lib/auth';
import toast from 'react-hot-toast';

// Interval heartbeat aktivitas (1 menit)
const HEARTBEAT_INTERVAL_MS = 60 * 1000;

// Inactivity timeout (1 jam) — harus sama dengan backend
const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;

export function useSessionSecurity() {
  const { user, logout } = useAuth();
  const lastActivityRef = useRef<number>(Date.now());
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityCheckRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef<boolean>(false);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update timestamp aktivitas terakhir
  const updateActivity = useCallback(() => {
    if (typeof window !== 'undefined') {
      lastActivityRef.current = Date.now();
      // Simpan aktivitas ke sessionStorage untuk komunikasi antar tab
      try {
        sessionStorage.setItem('lastActivity', String(Date.now()));
      } catch {
        // sessionStorage mungkin tidak tersedia
      }
    }
  }, []);

  // Cleanup sesi saat benar-benar menutup tab/browser
  const handleTabClose = useCallback(() => {
    if (!user) return;

    // Kirim sinyal invalidate session ke server
    const token = localStorage.getItem('sipp_access_token');
    if (token && navigator.sendBeacon) {
      const data = JSON.stringify({ action: 'invalidate_session' });
      navigator.sendBeacon(
        '/api/auth/invalidate-session',
        new Blob([data], { type: 'application/json' })
      );
    }

    bersihkanSesi();
  }, [user]);

  // Handle visibility change (tab tersembunyi / muncul)
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible') {
      // Tab menjadi visible lagi — cek apakah sudah inactive
      const lastActivity = lastActivityRef.current;
      const now = Date.now();
      const inactiveTime = now - lastActivity;

      if (inactiveTime > INACTIVITY_TIMEOUT_MS && user) {
        // Sudah inactive lebih dari 1 jam — logout
        toast.error('Sesi Anda telah berakhir karena tidak aktif. Silakan login kembali.');
        bersihkanSesi();
        window.location.href = '/login';
        return;
      }

      // Tab muncul — update activity
      updateActivity();

      // Batalkan timeout close jika tab muncul kembali
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    } else {
      // Tab tersembunyi — update activity juga
      updateActivity();

      // Set flag bahwa tab tersembunyi
      try {
        sessionStorage.setItem('sipp_tabHidden', 'true');
      } catch {
        // ignore
      }
    }
  }, [user, updateActivity]);

  // Handle user activity (mouse, keyboard, scroll, dll)
  const handleUserActivity = useCallback(() => {
    if (isActiveRef.current) {
      updateActivity();
    }
  }, [updateActivity]);

  // Logout karena inactivity
  const handleInactivityLogout = useCallback(() => {
    if (!user) return;

    const lastActivity = lastActivityRef.current;
    const now = Date.now();
    const inactiveTime = now - lastActivity;

    if (inactiveTime >= INACTIVITY_TIMEOUT_MS) {
      toast.error('Sesi Anda telah berakhir karena tidak aktif selama 1 jam. Silakan login kembali.');
      bersihkanSesi();
      window.location.href = '/login';
    }
  }, [user]);

  // Setup event listeners
  useEffect(() => {
    if (!user) {
      isActiveRef.current = false;
      return;
    }

    isActiveRef.current = true;
    updateActivity();

    // Tandai halaman ini sudah dimuat
    try {
      // Cek apakah tab sebelumnya ditutup atau ini fresh load
      const wasHidden = sessionStorage.getItem('sipp_tabHidden');
      if (wasHidden === null) {
        // Flag tidak ada = ini fresh load (buka tab baru), tidak perlu logout
      }
      // Set/reset flag
      sessionStorage.setItem('sipp_tabHidden', 'false');
    } catch {
      // ignore
    }

    // Activity events
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle beforeunload (refresh/close/navigate)
    // NOTE: beforeunload tidak bisa membedakan refresh dari close secara reliable.
    // Kami menggunakan heuristic: jika tab pernah tersembunyi sebelum unload,
    // kemungkinan besar ini adalah close tab, bukan refresh.
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!user) return;

      const wasHidden = sessionStorage.getItem('sipp_tabHidden');

      // Hanya logout jika tab pernah tersembunyi sebelumnya
      // Ini mengasumsikan: refresh cepat biasanya tidak menyebabkan tab tersembunyi
      // sedangkan close tab pasti menyebabkan tab tersembunyi
      if (wasHidden === 'true') {
        // Tab pernah tersembunyi = kemungkinan besar close tab
        const token = localStorage.getItem('sipp_access_token');
        if (token && navigator.sendBeacon) {
          const data = JSON.stringify({ action: 'invalidate_session' });
          navigator.sendBeacon(
            '/api/auth/invalidate-session',
            new Blob([data], { type: 'application/json' })
          );
        }
        bersihkanSesi();
      }
      // Jika tab tidak pernah tersembunyi = kemungkinan besar refresh = tidak logout
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Heartbeat interval — kirim aktivitas ke server secara periodik
    heartbeatIntervalRef.current = setInterval(() => {
      if (user && document.visibilityState === 'visible') {
        // Ping server untuk update lastActivity di backend
        fetch('/api/auth/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        }).catch(() => {
          // Silent fail — tidak perlu mengganggu user
        });
      }
    }, HEARTBEAT_INTERVAL_MS);

    // Inactivity check interval — cek setiap 30 detik
    inactivityCheckRef.current = setInterval(() => {
      handleInactivityLogout();
    }, 30 * 1000);

    // Cleanup
    return () => {
      isActiveRef.current = false;
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);

      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      if (inactivityCheckRef.current) {
        clearInterval(inactivityCheckRef.current);
        inactivityCheckRef.current = null;
      }
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
        closeTimeoutRef.current = null;
      }
    };
  }, [user, handleUserActivity, handleVisibilityChange, handleTabClose, updateActivity, handleInactivityLogout]);
}
