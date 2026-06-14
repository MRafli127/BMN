// ============================================================
//  Service Autentikasi (frontend) — pembungkus panggilan API.
// ============================================================

import api from '@/lib/api';
import type { DataLogin, DataRegister, HasilAuth, User } from '@/types/user.type';

export const authService = {
  async login(data: DataLogin): Promise<HasilAuth> {
    const res = await api.post('/auth/login', data);
    return res.data.data;
  },

  async register(data: DataRegister): Promise<HasilAuth> {
    const res = await api.post('/auth/register', data);
    return res.data.data;
  },

  async me(): Promise<User> {
    const res = await api.get('/auth/me');
    return res.data.data;
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },
};
