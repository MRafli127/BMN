// ============================================================
//  Hook useSessionSecurity — keamanan sesi berbasis aktivitas.
//   - Auto logout setelah 60 menit tidak aktif (idle)
//   - Session tetap hidup saat tab ditutup (bukan logout otomatis)
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

    // Activity events - reset timer saat ada aktivitas.
    // CATATAN: JANGAN masukkan 'mousemove' di sini. Mouse lewat tanpa klik
    // bukan indikator aktivitas yang sebenarnya — user bisa AFK (tidak di
    // depan komputer) tapi mouse kebetulan bergerak karena getaran meja,
    // hewan peliharaan, atau gerakan tak sengaja.
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

    // Cleanup
    return () => {
      isActiveRef.current = false;
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });

      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current);
        logoutTimerRef.current = null;
      }
      if (heartbeatTimerRef.current) {
        clearInterval(heartbeatTimerRef.current);
        heartbeatTimerRef.current = null;
      }
    };
  }, [user, resetInactivityTimer, sendHeartbeat]);
}
