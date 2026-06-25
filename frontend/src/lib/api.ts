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

// Baca nilai cookie (untuk CSRF double-submit). Cookie csrf_token di-set
// backend dengan httpOnly:false agar bisa dibaca & dikirim balik di header.
function bacaCookie(nama: string): string | null {
  if (typeof document === 'undefined') return null;
  const cocok = document.cookie.match(new RegExp('(?:^|;\\s*)' + nama + '=([^;]+)'));
  return cocok ? decodeURIComponent(cocok[1]) : null;
}

const METODE_AMAN = ['get', 'head', 'options'];

// --- Interceptor request: sisipkan access token + CSRF token ---
api.interceptors.request.use((config) => {
  const token = ambilToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Double-submit CSRF: request yang mengubah state wajib mengirim token
  // yang sama dengan cookie. Tanpa ini backend menolak dengan 403.
  const metode = (config.method || 'get').toLowerCase();
  if (!METODE_AMAN.includes(metode) && config.headers) {
    const csrf = bacaCookie('csrf_token');
    if (csrf) config.headers['x-csrf-token'] = csrf;
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
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _csrfRetry?: boolean };
    const url = original?.url || '';

    // --- Auto-recovery CSRF: cookie token hilang/kedaluwarsa ---
    // Ambil token baru dari /auth/csrf-token (set cookie + balikan token),
    // sisipkan ke header, lalu ulangi request asli satu kali.
    const pesanCsrf = (error.response?.data as { pesan?: string } | undefined)?.pesan || '';
    if (
      error.response?.status === 403 &&
      pesanCsrf.toLowerCase().includes('csrf') &&
      original &&
      !original._csrfRetry
    ) {
      original._csrfRetry = true;
      try {
        const res = await axios.get(`${BASE_URL}/auth/csrf-token`, { withCredentials: true });
        const csrf = res.data?.data?.csrfToken;
        if (csrf && original.headers) original.headers['x-csrf-token'] = csrf;
        return api(original);
      } catch {
        return Promise.reject(error);
      }
    }

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
