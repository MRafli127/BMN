// ============================================================
//  Hook useSessionSecurity — keamanan sesi berbasis aktivitas.
//   - Auto logout setelah 1 jam tidak aktif
//   - Kirim heartbeat aktivitas ke server secara periodik
//   - Auto logout saat tab/browser ditutup (bukan saat switch tab/refresh)
// ============================================================

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { bersihkanSesi } from '@/lib/auth';
import toast from 'react-hot-toast';
import api from '@/lib/api';

// Interval heartbeat aktivitas (1 menit)
const HEARTBEAT_INTERVAL_MS = 60 * 1000;

// Inactivity timeout (1 jam) — harus sama dengan backend
const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000;

// Key untuk menandai tab tersembunyi (switch tab/minimize)
const KEY_TAB_HIDDEN = 'sipp_tab_hidden';

export function useSessionSecurity() {
  const { user } = useAuth();
  const lastActivityRef = useRef<number>(Date.now());
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityCheckRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef<boolean>(false);

  // Update timestamp aktivitas terakhir
  const updateActivity = useCallback(() => {
    if (typeof window !== 'undefined') {
      lastActivityRef.current = Date.now();
    }
  }, []);

  // Handle visibility change (tab tersembunyi / muncul)
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'visible') {
      // Tab muncul kembali — cek inactivity
      if (user) {
        const lastActivity = lastActivityRef.current;
        const now = Date.now();
        const inactiveTime = now - lastActivity;

        if (inactiveTime > INACTIVITY_TIMEOUT_MS) {
          toast.error('Sesi Anda telah berakhir karena tidak aktif. Silakan login kembali.');
          bersihkanSesi();
          window.location.href = '/login';
          return;
        }
      }
      updateActivity();
    } else {
      // Tab tersembunyi (switch tab/minimize) — simpan flag
      sessionStorage.setItem(KEY_TAB_HIDDEN, '1');
      updateActivity();
    }
  }, [user, updateActivity]);

  // Handle tab/browser close
  // NOTE: beforeunload fires saat refresh DAN close, jadi kita cek flag
  // Jika tab pernah tersembunyi sebelumunload → kemungkinan close tab
  // Jika tab tidak pernah tersembunyi → kemungkinan refresh, tidak logout
  const handleBeforeUnload = useCallback(() => {
    if (!user) return;

    const wasHidden = sessionStorage.getItem(KEY_TAB_HIDDEN);

    // Hanya logout jika tab pernah tersembunyi (close tab/minimize lama)
    // Refresh cepat biasanya tab tidak tersembunyi
    if (wasHidden === '1') {
      // Kirim invalidate session ke server
      const token = localStorage.getItem('sipp_access_token');
      if (token && navigator.sendBeacon) {
        const data = JSON.stringify({ action: 'invalidate_session' });
        navigator.sendBeacon(
          'http://localhost:5000/api/auth/invalidate-session',
          new Blob([data], { type: 'application/json' })
        );
      }
      bersihkanSesi();
    }
  }, [user]);

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

    // Hapus flag saat mount (fresh load, bukan reopen tab)
    sessionStorage.removeItem(KEY_TAB_HIDDEN);

    // Activity events
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Visibility change
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Beforeunload — logout hanya jika tab pernah tersembunyi
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Heartbeat interval
    heartbeatIntervalRef.current = setInterval(() => {
      if (user && document.visibilityState === 'visible') {
        api.post('/auth/heartbeat').catch(() => {
          // Silent fail
        });
      }
    }, HEARTBEAT_INTERVAL_MS);

    // Inactivity check interval
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
    };
  }, [user, handleUserActivity, handleVisibilityChange, handleBeforeUnload, updateActivity, handleInactivityLogout]);
}
