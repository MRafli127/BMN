// ============================================================
//  Instance Axios terpusat.
//   - Menyisipkan access token pada setiap request.
//   - Menangani auto-refresh token saat menerima 401.
// ============================================================

import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { ambilToken, simpanToken, simpanUser, bersihkanSesi } from './auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // kirim cookie refresh token
  headers: { Accept: 'application/json' },
});

// --- Interceptor request: sisipkan token ---
api.interceptors.request.use((config) => {
  const token = ambilToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Interceptor response: auto-refresh saat 401 ---
let sedangRefresh = false;
let antrian: Array<(token: string | null) => void> = [];

function prosesAntrian(token: string | null) {
  antrian.forEach((cb) => cb(token));
  antrian = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const url = original?.url || '';

    // Jangan coba refresh untuk endpoint auth itu sendiri
    const endpointAuth = url.includes('/auth/login') || url.includes('/auth/refresh') || url.includes('/auth/register');

    if (error.response?.status === 401 && !original._retry && !endpointAuth) {
      if (sedangRefresh) {
        // Tunggu proses refresh yang sedang berjalan
        return new Promise((resolve, reject) => {
          antrian.push((token) => {
            if (token) {
              original.headers.Authorization = `Bearer ${token}`;
              resolve(api(original));
            } else {
              reject(error);
            }
          });
        });
      }

      original._retry = true;
      sedangRefresh = true;

      try {
        const res = await axios.post(
          `${BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const { accessToken, user } = res.data.data;
        simpanToken(accessToken);
        if (user) simpanUser(user);
        prosesAntrian(accessToken);
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch (refreshError) {
        prosesAntrian(null);
        bersihkanSesi();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        sedangRefresh = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
