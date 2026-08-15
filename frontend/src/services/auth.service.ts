// ============================================================
//  Service Autentikasi (frontend) — pembungkus panggilan API.
// ============================================================

import api from '@/lib/api';
import type {
  DataGantiPassword,
  DataLogin,
  DataRegister,
  DataUpdateProfil,
  HasilAuth,
  Role,
  User,
} from '@/types/user.type';

export const authService = {
  async login(data: DataLogin): Promise<HasilAuth> {
    const res = await api.post('/auth/login', data);
    return res.data.data;
  },

  // Ganti active role (akun multi-role) — backend menerbitkan token baru.
  async switchRole(role: Role): Promise<{ user: User; accessToken: string }> {
    const res = await api.post('/auth/switch-role', { role });
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

  async updateProfil(data: DataUpdateProfil): Promise<{ user: User; accessToken: string }> {
    const res = await api.patch('/auth/me', data);
    return res.data.data;
  },

  async gantiPassword(data: DataGantiPassword): Promise<void> {
    await api.patch('/auth/me/password', data);
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },
};
