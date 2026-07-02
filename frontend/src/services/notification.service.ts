// ============================================================
//  Service Notifikasi (frontend) — pembungkus panggilan API.
// ============================================================

import api from '@/lib/api';
import type { Notifikasi, ResponseNotifikasi, ResponseJumlahBelumBaca } from '@/types/notification.type';

export const notificationService = {
  /**
   * Ambil semua notifikasi untuk user yang login
   */
  async ambilSemua(page = 1, limit = 20, belumBaca = false): Promise<ResponseNotifikasi> {
    const params: Record<string, string | number | boolean> = { page, limit };
    if (belumBaca) params.belumBaca = true;
    const res = await api.get('/notifications', { params });
    return res.data.data;
  },

  /**
   * Ambil jumlah notifikasi belum dibaca
   */
  async ambilJumlahBelumBaca(): Promise<ResponseJumlahBelumBaca> {
    const res = await api.get('/notifications/belum-baca');
    return res.data.data;
  },

  /**
   * Tandai satu notifikasi sebagai sudah dibaca
   */
  async tandaiSudahBaca(id: string): Promise<void> {
    await api.patch(`/notifications/${id}/baca`);
  },

  /**
   * Tandai semua notifikasi sebagai sudah dibaca
   */
  async tandaiSemuaSudahBaca(): Promise<void> {
    await api.patch('/notifications/baca-semua');
  },

  /**
   * Hapus satu notifikasi
   */
  async hapus(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`);
  },

  /**
   * Hapus semua notifikasi
   */
  async hapusSemua(): Promise<void> {
    await api.delete('/notifications');
  },
};