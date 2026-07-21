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
  // Menggunakan pagehide (lebih reliable daripada beforeunload).
  //
  // BUG LAMA: pagehide fire saat BOTH close DAN refresh. Tanpa filter,
  // session akan ke-invalidate setiap user refresh halaman — user jadi logout
  // tiap reload. Solusi: bedakan 3 kasus:
  //   1. pagehide.persisted = true   → BFCache restore (back/forward) → SKIP
  //   2. pagehide.persisted = false + PerformanceNavigation.type = 'reload'
  //                                    → user sedang refresh → SKIP
  //   3. pagehide.persisted = false + bukan reload
  //                                    → tab benar-benar ditutup atau
  //                                      navigasi keluar → invalidate session
  //
  // Catatan: tidak memanggil bersihkanSesi() di sini. Server-side yang
  // invalidate session via sendBeacon. Cookies dari backend (Set-Cookie) akan
  // di-set saat user login ulang.
  const handlePageHide = useCallback(
    (event: PageTransitionEvent) => {
      if (!user || pendingLogoutRef.current) return;

      // Kasus 1: halaman disimpan ke BFCache (back/forward navigation).
      // Browser akan restore halaman ini dari cache; TIDAK invalidate session.
      if (event.persisted) return;

      // Kasus 2: user me-reload halaman. Jangan invalidate — user masih aktif.
      // PerformanceNavigationTiming.type = 'reload' → reload (F5/Ctrl+R).
      // 'navigate' / 'back_forward' / 'prerender' → bukan reload.
      try {
        const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
        const navType = navEntries[0]?.type;
        if (navType === 'reload') return;
      } catch {
        // performance API tidak tersedia (browser lama) → fallback ke default:
        // tetap invalidate, karena kasus close lebih kritis daripada skip.
      }

      // Kasus 3: tab ditutup / navigasi keluar (link eksternal, tutup tab, dll).
      // Kirim invalidate session via sendBeacon (reliable even saat unload).
      // FIX: pakai absolute URL ke backend, BUKAN relative path
      // (relative path resolve ke frontend origin, bukan backend).
      const token = localStorage.getItem('sipp_access_token');
      if (token && navigator.sendBeacon) {
        const data = JSON.stringify({ action: 'invalidate_session', token });
        navigator.sendBeacon(
          `${API_BASE}/auth/invalidate-session`,
          new Blob([data], { type: 'application/json' })
        );
      }
      // NOTE: Tidak memanggil bersihkanSesi() di sini!
      // Cookies dari backend (Set-Cookie header) akan di-set saat reload
      // dan session akan tetap valid.
    },
    [user]
  );

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

    // Activity events - reset timer saat ada aktivitas.
    // CATATAN: JANGAN masukkan 'mousemove' di sini. Mouse lewat tanpa klik
    // bukan indikator aktivitas yang sebenarnya — user bisa AFK (tidak di
    // depan komputer) tapi mouse kebetulan bergerak karena getaran meja,
    // hewan peliharaan, atau gerakan tak sengaja. 'mousemove' akan reset
    // timer terus-menerus sehingga user tidak pernah logout meski benar-benar
    // AFK. Cukup event yang menandakan interaksi aktif (klik, ketik, scroll,
    // sentuh, tekan tombol mouse).
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
    // Berjalan terus不管 tab visible atau tidak
    heartbeatTimerRef.current = setInterval(() => {
      sendHeartbeat();
    }, HEARTBEAT_INTERVAL_MS);

    // Pagehide - reliable tab close detection
    // fired saat tab/browser ditutup ATAU refresh. Pembedaan close vs
    // refresh/bfcache dilakukan di dalam handlePageHide via event.persisted
    // dan PerformanceNavigationTiming.type.
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
