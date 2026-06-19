// ============================================================
//  Hook useAuth — akses ringkas ke store autentikasi.
// ============================================================

'use client';

import { useAuthStore } from '@/store/authStore';

export function useAuth() {
  const store = useAuthStore();
  return {
    user: store.user,
    sedangMemuat: store.sedangMemuat,
    login: store.login,
    register: store.register,
    logout: store.logout,
    segarkanProfil: store.segarkanProfil,
    perbaruiProfil: store.perbaruiProfil,
    gantiPassword: store.gantiPassword,
    setUser: store.setUser,
    muatDariSesi: store.muatDariSesi,
    sudahLogin: !!store.user,
    isAdmin: store.user?.role === 'ADMIN',
    isPeminjam: store.user?.role === 'PEMINJAM',
  };
}
