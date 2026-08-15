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
  Role,
  User,
} from '@/types/user.type';
import { authService } from '@/services/auth.service';
import { simpanSesi, bersihkanSesi, ambilUser, simpanUser } from '@/lib/auth';
import { useKeranjangStore } from '@/store/keranjangStore';

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
  gantiRole: (role: Role) => Promise<User>;
  setUser: (user: User) => void;
  // Helper role
  isSuperAdmin: () => boolean;
  isAdmin: () => boolean;
  isPeminjam: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  sedangMemuat: true,

  // Login & simpan sesi
  login: async (data) => {
    const hasil = await authService.login(data);
    set({ user: hasil.user, sedangMemuat: false });
    simpanSesi(hasil.accessToken, hasil.user);
    useKeranjangStore.getState().kosongkan();
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

  // Ganti active role (akun multi-role) & sinkronkan token + sesi
  gantiRole: async (role) => {
    const hasil = await authService.switchRole(role);
    const userLama = get().user;
    if (userLama?.id) {
      localStorage.removeItem(`keranjang-peminjam:${userLama.id}`);
    }
    useKeranjangStore.getState().kosongkan();
    simpanSesi(hasil.accessToken, hasil.user);
    set({ user: hasil.user });
    return hasil.user;
  },

  setUser: (user) => set({ user }),

  // Helper: cek apakah SUPER_ADMIN
  isSuperAdmin: () => get().user?.activeRole === 'SUPER_ADMIN',

  // Helper: cek apakah ADMIN atau SUPER_ADMIN
  isAdmin: () => {
    const role = get().user?.activeRole;
    return role === 'ADMIN' || role === 'SUPER_ADMIN';
  },

  // Helper: cek apakah PEMINJAM
  isPeminjam: () => get().user?.activeRole === 'PEMINJAM',
}));
