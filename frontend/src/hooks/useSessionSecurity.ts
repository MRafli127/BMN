// ============================================================
//  Hook useSessionSecurity — keamanan sesi berbasis aktivitas.
//   - Mendeteksi tab close / browser close → invalidate session
//   - Auto logout setelah 30 menit tidak aktif
//   - Kirim heartbeat aktivitas ke server secara periodik
// ============================================================

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { bersihkanSesi } from '@/lib/auth';
import { INACTIVITY_TIMEOUT_MS, HEARTBEAT_INTERVAL_MS, INACTIVITY_CHECK_INTERVAL_MS } from '@/constants/session';
import toast from 'react-hot-toast';

export function useSessionSecurity() {
  const { user } = useAuth();
  const lastActivityRef = useRef<number>(Date.now());
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inactivityCheckRef = useRef<NodeJS.Timeout | null>(null);
  const isActiveRef = useRef<boolean>(false);

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
      toast.error('Sesi Anda telah berakhir karena tidak aktif selama 30 menit. Silakan login kembali.');
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

    // Activity events — update lastActivityRef langsung
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
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActiveRef.current) {
        lastActivityRef.current = Date.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Handle beforeunload — langsung invalidate session
    const handleBeforeUnload = () => {
      if (!user) return;

      const token = localStorage.getItem('sipp_access_token');
      if (token && navigator.sendBeacon) {
        const data = JSON.stringify({ token });
        navigator.sendBeacon(
          '/api/auth/invalidate-session',
          new Blob([data], { type: 'application/json' })
        );
      }
      bersihkanSesi();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Heartbeat interval — kirim aktivitas ke server + sinkronisasi serverTime
    heartbeatIntervalRef.current = setInterval(() => {
      if (user && document.visibilityState === 'visible') {
        fetch('/api/auth/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        })
          .then(res => res.json())
          .then(data => {
            if (data.success && data.serverTime) {
              syncActivityFromHeartbeat(data.serverTime);
            }
          })
          .catch(() => {
            // Silent fail — jangan update ref jika heartbeat gagal
          });
      }
    }, HEARTBEAT_INTERVAL_MS);

    // Inactivity check interval — cek setiap 30 detik
    inactivityCheckRef.current = setInterval(() => {
      handleInactivityLogout();
    }, INACTIVITY_CHECK_INTERVAL_MS);

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
  }, [user, handleInactivityLogout, syncActivityFromHeartbeat]);
}
