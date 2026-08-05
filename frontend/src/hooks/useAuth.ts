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
    gantiRole: store.gantiRole,
    setUser: store.setUser,
    muatDariSesi: store.muatDariSesi,
    sudahLogin: !!store.user,
    // Gating berbasis ACTIVE role (bukan seluruh role yang dimiliki).
    isSuperAdmin: store.isSuperAdmin(),
    isAdmin: store.isAdmin(),
    isPeminjam: store.isPeminjam(),
    roles: store.user?.roles ?? [],
    bisaGantiRole: (store.user?.roles?.length ?? 0) > 1,
  };
}
