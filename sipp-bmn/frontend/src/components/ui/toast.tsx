// ============================================================
//  Pembungkus notifikasi react-hot-toast agar konsisten.
//  Gunakan: notify.sukses('...'), notify.gagal('...'), dll.
// ============================================================

'use client';

import toast from 'react-hot-toast';

export const notify = {
  sukses: (pesan: string) => toast.success(pesan),
  gagal: (pesan: string) => toast.error(pesan),
  info: (pesan: string) => toast(pesan, { icon: 'ℹ️' }),
  memuat: (pesan: string) => toast.loading(pesan),
  tutup: (id: string) => toast.dismiss(id),
};

export { toast };
export { Toaster } from 'react-hot-toast';
