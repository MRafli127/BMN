// ============================================================
//  Service Export Data
// ============================================================

import api from '@/lib/api';
import { downloadBlob } from '@/lib/download';

export interface FilterExport {
  dari?: string;
  sampai?: string;
  status?: string;
  jenis?: string;
  kondisi?: string;
  role?: string;
  kodeSatker?: string;
}

export const exportService = {
  async exportPeminjaman(filter: FilterExport = {}): Promise<Blob> {
    const params = new URLSearchParams();
    if (filter.dari) params.append('dari', filter.dari);
    if (filter.sampai) params.append('sampai', filter.sampai);
    if (filter.status) params.append('status', filter.status);

    const res = await api.get(`/export/peminjaman?${params.toString()}`, {
      responseType: 'blob',
    });
    return res.data;
  },

  async exportBarang(filter: FilterExport = {}): Promise<Blob> {
    const params = new URLSearchParams();
    if (filter.kodeSatker) params.append('kodeSatker', filter.kodeSatker);
    if (filter.kondisi) params.append('kondisi', filter.kondisi);

    const res = await api.get(`/export/barang?${params.toString()}`, {
      responseType: 'blob',
    });
    return res.data;
  },

  async exportUsers(filter: FilterExport = {}): Promise<Blob> {
    const params = new URLSearchParams();
    if (filter.role) params.append('role', filter.role);

    const res = await api.get(`/export/users?${params.toString()}`, {
      responseType: 'blob',
    });
    return res.data;
  },
};

// Generate filename dengan timestamp
export function generateExportFilename(prefix: string): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${prefix}_${timestamp}.xlsx`;
}
