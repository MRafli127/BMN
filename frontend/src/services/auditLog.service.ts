// ============================================================
//  Service Audit Log untuk frontend
// ============================================================

import api from '@/lib/api';

export interface AuditLogEntry {
  id: string;
  userId?: string;
  userEmail?: string;
  userNama?: string;
  aksi: string;
  entitas: string;
  entitasId?: string;
  dataLama?: any;
  dataBaru?: any;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  labelAksi?: string;
  labelEntitas?: string;
}

export interface AuditLogResponse {
  data: AuditLogEntry[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalHalaman: number;
  };
}

export const auditLogService = {
  async getSemua(params?: {
    page?: number;
    limit?: number;
    entitas?: string;
    aksi?: string;
    userId?: string;
    dari?: string;
    sampai?: string;
  }): Promise<AuditLogResponse> {
    const res = await api.get('/audit-logs', { params });
    return res.data.data;
  },

  async getById(id: string): Promise<AuditLogEntry> {
    const res = await api.get(`/audit-logs/${id}`);
    return res.data.data;
  },

  async getStatistik(params?: {
    dari?: string;
    sampai?: string;
  }): Promise<any> {
    const res = await api.get('/audit-logs/statistik', { params });
    return res.data.data;
  },
};
