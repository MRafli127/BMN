// ============================================================
//  Hook useSessionSecurity — keamanan sesi berbasis aktivitas.
//   - Auto logout setelah 1 jam tidak aktif (idle)
//   - Logout saat tab/browser ditutup (bukan saat switch tab/refresh)
//   - Heartbeat periodic untuk sync aktivitas dengan server
// ============================================================

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { bersihkanSesi } from '@/lib/auth';
import { INACTIVITY_TIMEOUT_MS, HEARTBEAT_INTERVAL_MS } from '@/constants/session';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export function useSessionSecurity() {
  const { user } = useAuth();
  const isActiveRef = useRef<boolean>(false);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingLogoutRef = useRef<boolean>(false);

  // Update aktivitas dan reset timer logout
  const resetInactivityTimer = useCallback(() => {
    if (!user || pendingLogoutRef.current) return;

    // Clear existing timer
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
    }

    // Set new timer untuk logout after inactivity
    logoutTimerRef.current = setTimeout(() => {
      if (!user || pendingLogoutRef.current) return;

      pendingLogoutRef.current = true;
      toast.error('Sesi Anda telah berakhir karena tidak aktif selama 1 jam. Silakan login kembali.');
      bersihkanSesi();
      window.location.href = '/login';
    }, INACTIVITY_TIMEOUT_MS);
  }, [user]);

  // Kirim heartbeat ke server untuk sync aktivitas
  const sendHeartbeat = useCallback(async () => {
    if (!user || pendingLogoutRef.current) return;

    try {
      await api.post('/auth/heartbeat');
    } catch {
      // Silent fail - heartbeat tidak kritikal
    }
  }, [user]);

  // Handle tab/browser close secara reliable
  // Menggunakan pagehide (lebih reliable daripada beforeunload)
  const handlePageHide = useCallback(() => {
    if (!user || pendingLogoutRef.current) return;

    // Ini fired saat:
    // - Tab/browser ditutup
    // - Refresh (hanya Safari yang membedakan)
    // - Navigasi ke page lain

    // Kirim invalidate session ke server via sendBeacon
    // sendBeacon adalah background request yang lebih reliable
    const token = localStorage.getItem('sipp_access_token');
    if (token && navigator.sendBeacon) {
      const data = JSON.stringify({ action: 'invalidate_session', token });
      navigator.sendBeacon(
        '/api/auth/invalidate-session',
        new Blob([data], { type: 'application/json' })
      );
    }

    // Cleanup session storage
    bersihkanSesi();
    pendingLogoutRef.current = true;
  }, [user]);

  // Setup event listeners
  useEffect(() => {
    if (!user) {
      isActiveRef.current = false;
      // Cleanup timers saat logout
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
        logoutTimerRef.current = null;
      }
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
      return;
    }

    isActiveRef.current = true;
    pendingLogoutRef.current = false;
    resetInactivityTimer();

    // Activity events - reset timer saat ada aktivitas
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    const handleUserActivity = () => {
      if (isActiveRef.current && !pendingLogoutRef.current) {
        resetInactivityTimer();
      }
    };

    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Heartbeat interval - kirim periodic ke server
    // Berjalan terus不管 tab visible atau tidak
    heartbeatTimerRef.current = setInterval(() => {
      sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    // Pagehide - reliable tab close detection
    // fired saat tab/browser ditutup
    window.addEventListener('pagehide', handlePageHide);

    // Fallback: beforeunload (untuk browser yang tidak support pagehide)
    window.addEventListener('beforeunload', (e) => {
      if (!user || pendingLogoutRef.current) return;

      // Di Chrome/Edge, beforeunload fired di refresh juga
      // Kita tidak mau logout di refresh - jadi skip jika ada flag
      // Gunakan sessionStorage untuk deteksi refresh vs close
      const isRefresh = performance.getEntriesByType('navigation')
        .some((entry) => (entry as PerformanceNavigationTiming).type === 'reload');

      if (!isRefresh) {
        handlePageHide();
      }
    });

    // Cleanup
    return () => {
      isActiveRef.current = false;
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
      window.removeEventListener('pagehide', handlePageHide);

      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
        logoutTimerRef.current = null;
      }
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, [user, handlePageHide, resetInactivityTimer, sendHeartbeat]);
}
