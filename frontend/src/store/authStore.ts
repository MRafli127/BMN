// ============================================================
//  Store autentikasi (Zustand).
//  Menyimpan data pengguna aktif & menyediakan aksi auth.
// ============================================================

import { create } from 'zustand';
import type {
  DataGantiPassword,
  DataLogin,
  DataRegister,
  DataUpdateProfil,
  User,
} from '@/types/user.type';
import { authService } from '@/services/auth.service';
import { simpanSesi, bersihkanSesi, ambilUser, simpanUser } from '@/lib/auth';

interface AuthState {
  user: User | null;
  sedangMemuat: boolean;
  login: (data: DataLogin) => Promise<User>;
  register: (data: DataRegister) => Promise<User>;
  logout: () => Promise<void>;
  muatDariSesi: () => void;
  segarkanProfil: () => Promise<void>;
  perbaruiProfil: (data: DataUpdateProfil) => Promise<User>;
  gantiPassword: (data: DataGantiPassword) => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  sedangMemuat: true,

  // Login & simpan sesi
  login: async (data) => {
    const hasil = await authService.login(data);
    simpanSesi(hasil.accessToken, hasil.user);
    set({ user: hasil.user, sedangMemuat: false });
    return hasil.user;
  },

  // Registrasi & simpan sesi
  register: async (data) => {
    const hasil = await authService.register(data);
    simpanSesi(hasil.accessToken, hasil.user);
    set({ user: hasil.user, sedangMemuat: false });
    return hasil.user;
  },

  // Keluar
  logout: async () => {
    try {
      await authService.logout();
    } catch {
      // abaikan error logout
    }
    bersihkanSesi();
    set({ user: null });
  },

  // Muat user dari localStorage (sinkron, saat aplikasi pertama dibuka)
  muatDariSesi: () => {
    const user = ambilUser();
    set({ user, sedangMemuat: false });
  },

  // Segarkan profil dari server
  segarkanProfil: async () => {
    try {
      const user = await authService.me();
      simpanUser(user);
      set({ user });
    } catch {
      // dibiarkan; interceptor akan menangani sesi kedaluwarsa
    }
  },

  // Perbarui data profil (nama, NIP, email, dll) lalu sinkronkan sesi
  perbaruiProfil: async (data) => {
    const hasil = await authService.updateProfil(data);
    simpanSesi(hasil.accessToken, hasil.user);
    set({ user: hasil.user });
    return hasil.user;
  },

  // Ganti kata sandi
  gantiPassword: async (data) => {
    await authService.gantiPassword(data);
  },

  setUser: (user) => set({ user }),
}));
