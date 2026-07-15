// ============================================================
//  Service Satker untuk frontend
// ============================================================

import api from '@/lib/api';
import type { AxiosError } from 'axios';

export interface Satker {
  id: string;
  kode: string;
  nama: string;
  singkat?: string | null;
  aktif: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SatkerListResponse {
  data: Satker[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalHalaman: number;
  };
}

export const satkerService = {
  async getSemua(params?: {
    page?: number;
    limit?: number;
    q?: string;
    aktif?: boolean;
  }): Promise<SatkerListResponse> {
    const res = await api.get('/satker', { params });
    return res.data.data;
  },

  async getById(id: string): Promise<Satker> {
    const { data } = await api.get<{ data: Satker }>(`/satker/${id}`);
    return data.data;
  },

  async create(payload: {
    kode: string;
    nama: string;
    singkat?: string;
    aktif?: boolean;
  }): Promise<Satker> {
    const { data } = await api.post<{ data: Satker }>('/satker', payload);
    return data.data;
  },

  async update(id: string, payload: Partial<Satker>): Promise<Satker> {
    const { data } = await api.patch<{ data: Satker }>(`/satker/${id}`, payload);
    return data.data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/satker/${id}`);
  },

  async sync(): Promise<{ dibuat: number; dilewati: number }> {
    const { data } = await api.post<{ data: { dibuat: number; dilewati: number } }>('/satker/sync');
    return data.data;
  },
};

export function isAxiosError(error: unknown): error is AxiosError {
  return typeof error === 'object' && error !== null && 'isAxiosError' in error;
}
