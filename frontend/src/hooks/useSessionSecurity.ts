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
import { INACTIVITY_TIMEOUT_MS, HEARTBEAT_INTERVAL_MS, INACTIVITY_CHECK_INTERVAL_MS } from '@/constants/session';
import toast from 'react-hot-toast';
import api from '@/lib/api';

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
      sessionStorage.setItem('sipp_tab_hidden', '1');
      updateActivity();
    }
  }, [user, updateActivity]);

  // Handle tab/browser close
  const handleBeforeUnload = useCallback(() => {
    if (!user) return;

    const wasHidden = sessionStorage.getItem('sipp_tab_hidden');

    // Hanya logout jika tab pernah tersembunyi (close tab/minimize lama)
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

  // Cleanup sesi saat benar-benar menutup tab/browser
  const handleTabClose = useCallback(() => {
    if (!user) return;

    // Kirim sinyal invalidate session ke server via sendBeacon
    const token = localStorage.getItem('sipp_access_token');
    if (token && navigator.sendBeacon) {
      const data = JSON.stringify({ token });
      navigator.sendBeacon(
        '/api/auth/invalidate-session',
        new Blob([data], { type: 'application/json' })
      );
    }

    bersihkanSesi();
  }, [user]);

  // Sinkronisasi lastActivityRef dengan serverTime dari heartbeat
  const syncActivityFromHeartbeat = useCallback((serverTime: number) => {
    lastActivityRef.current = serverTime;
  }, []);

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
    lastActivityRef.current = Date.now();

    // Hapus flag saat mount (fresh load, bukan reopen tab)
    sessionStorage.removeItem('sipp_tab_hidden');

    // Activity events
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    const handleUserActivity = () => {
      if (isActiveRef.current) {
        lastActivityRef.current = Date.now();
      }
    };

    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Visibility change — update activity saat tab visible kembali
    const handleVisChange = () => {
      if (document.visibilityState === 'visible' && isActiveRef.current) {
        lastActivityRef.current = Date.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisChange);

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
    }, INACTIVITY_CHECK_INTERVAL_MS);

    // Cleanup
    return () => {
      isActiveRef.current = false;
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
      document.removeEventListener('visibilitychange', handleVisChange);
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
  }, [user, handleBeforeUnload, handleInactivityLogout, updateActivity]);
}
