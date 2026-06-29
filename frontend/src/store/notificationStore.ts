// ============================================================
//  Store Notifikasi (Zustand).
//  Menyimpan daftar notifikasi, jumlah belum dibaca, dan menyediakan aksi.
// ============================================================

import { create } from 'zustand';
import type { Notifikasi } from '@/types/notification.type';
import { notificationService } from '@/services/notification.service';

interface NotificationState {
  notifikasi: Notifikasi[];
  jumlahBelumBaca: number;
  sedangMemuat: boolean;
  error: string | null;

  // Aksi
  muatNotifikasi: () => Promise<void>;
  muatJumlahBelumBaca: () => Promise<void>;
  tandaiSudahBaca: (id: string) => Promise<void>;
  tandaiSemuaSudahBaca: () => Promise<void>;
  hapusNotifikasi: (id: string) => Promise<void>;
  hapusSemua: () => Promise<void>;
  init: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifikasi: [],
  jumlahBelumBaca: 0,
  sedangMemuat: false,
  error: null,

  // Inisialisasi: muat jumlah belum baca
  init: async () => {
    await get().muatJumlahBelumBaca();
  },

  // Muat daftar notifikasi
  muatNotifikasi: async () => {
    set({ sedangMemuat: true, error: null });
    try {
      const hasil = await notificationService.ambilSemua(1, 10);
      set({ notifikasi: hasil.notifikasi, sedangMemuat: false });
    } catch (err) {
      set({ error: 'Gagal memuat notifikasi.', sedangMemuat: false });
    }
  },

  // Muat jumlah belum baca
  muatJumlahBelumBaca: async () => {
    try {
      const hasil = await notificationService.ambilJumlahBelumBaca();
      set({ jumlahBelumBaca: hasil.jumlah });
    } catch {
      // Tidak perlu tampilkan error untuk hitungan
    }
  },

  // Tandai satu notifikasi sudah dibaca
  tandaiSudahBaca: async (id) => {
    try {
      await notificationService.tandaiSudahBaca(id);
      // Update local state
      set((state) => ({
        notifikasi: state.notifikasi.map((n) =>
          n.id === id ? { ...n, isBaca: true } : n
        ),
        jumlahBelumBaca: Math.max(0, state.jumlahBelumBaca - 1),
      }));
    } catch {
      // Biarkan user retry jika gagal
    }
  },

  // Tandai semua notifikasi sudah dibaca
  tandaiSemuaSudahBaca: async () => {
    try {
      await notificationService.tandaiSemuaSudahBaca();
      set((state) => ({
        notifikasi: state.notifikasi.map((n) => ({ ...n, isBaca: true })),
        jumlahBelumBaca: 0,
      }));
    } catch {
      // Biarkan user retry jika gagal
    }
  },

  // Hapus satu notifikasi
  hapusNotifikasi: async (id) => {
    const state = get();
    const notif = state.notifikasi.find((n) => n.id === id);
    try {
      await notificationService.hapus(id);
      set((s) => ({
        notifikasi: s.notifikasi.filter((n) => n.id !== id),
        jumlahBelumBaca: notif && !notif.isBaca
          ? Math.max(0, s.jumlahBelumBaca - 1)
          : s.jumlahBelumBaca,
      }));
    } catch {
      // Biarkan user retry jika gagal
    }
  },

  // Hapus semua notifikasi
  hapusSemua: async () => {
    try {
      await notificationService.hapusSemua();
      set({ notifikasi: [], jumlahBelumBaca: 0 });
    } catch {
      // Biarkan user retry jika gagal
    }
  },
}));