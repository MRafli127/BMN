// ============================================================
//  Hook useSessionSecurity — keamanan sesi berbasis aktivitas.
//   - Auto logout setelah 60 menit tidak aktif (idle)
//   - Logout saat tab/browser ditutup (bukan saat refresh)
//   - Heartbeat periodic untuk sync aktivitas dengan server
// ============================================================

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { bersihkanSesi } from '@/lib/auth';
import { INACTIVITY_TIMEOUT_MS, HEARTBEAT_INTERVAL_MS } from '@/constants/session';
import toast from 'react-hot-toast';
import api from '@/lib/api';

// Base URL backend — pakai env variable yang SAMA dengan api.ts agar konsisten
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export function useSessionSecurity() {
  const { user } = useAuth();
  const isActiveRef = useRef<boolean>(false);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingLogoutRef = useRef<boolean>(false);

  // Update aktivitas dan reset timer logout
  const resetInactivityTimer = useCallback(() => {
    if (!user || pendingLogoutRef.current) return;

    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
    }

    logoutTimerRef.current = setTimeout(() => {
      if (!user || pendingLogoutRef.current) return;

      pendingLogoutRef.current = true;
      toast.error('Sesi Anda telah berakhir karena tidak aktif selama 60 menit. Silakan login kembali.');
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

  // Handle pagehide - reliable untuk tab close detection.
  //
  // pagehide fire saat tab/browser ditutup ATAU refresh/navigate away.
  // bedakan 3 kasus:
  //   1. pagehide.persisted = true   → BFCache restore (back/forward) → SKIP
  //   2. pagehide.persisted = false + type = 'reload'
  //                                    → user refresh halaman → SKIP
  //   3. pagehide.persisted = false + type = bukan reload
  //                                    → tab ditutup / navigasi keluar → invalidate
  const handlePageHide = useCallback(
    (event: PageTransitionEvent) => {
      if (!user || pendingLogoutRef.current) return;

      // Kasus 1: BFCache restore
      if (event.persisted) return;

      // Kasus 2: reload halaman → jangan invalidate
      try {
        const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        if (navEntries[0]?.type === 'reload') return;
      } catch {
        // performance API tidak tersedia
      }

      // Kasus 3: tab ditutup / navigasi keluar → invalidate session
      const token = localStorage.getItem('sipp_access_token');
      if (token && navigator.sendBeacon) {
        const data = JSON.stringify({ action: 'invalidate_session', token });
        navigator.sendBeacon(
          `${API_BASE}/auth/invalidate-session`,
          new Blob([data], { type: 'application/json' })
        );
      }
    },
    [user]
  );

  // Setup event listeners
  useEffect(() => {
    if (!user) {
      isActiveRef.current = false;
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
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    const handleUserActivity = () => {
      if (isActiveRef.current && !pendingLogoutRef.current) {
        resetInactivityTimer();
      }
    };

    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Heartbeat interval - kirim periodic ke server
    heartbeatTimerRef.current = setInterval(() => {
      sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    // Pagehide - reliable tab close detection
    window.addEventListener('pagehide', handlePageHide);

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
