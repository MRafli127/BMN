// ============================================================
//  Service Export Data
// ============================================================

import api from '@/lib/api';

export interface FilterExport {
  dari?: string;
  sampai?: string;
  status?: string;
  jenis?: string;
  kondisi?: string;
  role?: string;
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
    if (filter.jenis) params.append('jenis', filter.jenis);
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

// Download blob as file
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Generate filename dengan timestamp
export function generateExportFilename(prefix: string): string {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${prefix}_${timestamp}.xlsx`;
}
