// ============================================================
//  Instance Axios terpusat.
//   - Menyisipkan access token pada setiap request.
//   - Menangani auto-refresh token saat menerima 401.
// ============================================================

import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { ambilToken, simpanToken, simpanUser, bersihkanSesi } from './auth';
import toast from 'react-hot-toast';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Pesan error yang menunjukkan sesi invalid
const PESAN_SESI_INVALID = [
  'Sesi Anda telah berakhir',
  'sesi tidak valid',
  'sudah tidak aktif',
  'tab lain telah login',
];

function adalahPesanSesiInvalid(pesan: string): boolean {
  return PESAN_SESI_INVALID.some(p => pesan.toLowerCase().includes(p.toLowerCase()));
}

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
// Promise-based lock: semua request 401 tunggu promise yang sama,
// hindari race condition saat multiple 401 responses datang bersamaan.
let refreshPromise: Promise<string | null> | null = null;
let antrian: Array<(token: string | null) => void> = [];

function prosesAntrian(token: string | null) {
  antrian.forEach((cb) => cb(token));
  antrian = [];
}

function redirectKeLogin(pesan?: string) {
  bersihkanSesi();
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    if (pesan) {
      toast.error(pesan);
    }
    // Delay sedikit agar toast terlihat
    setTimeout(() => {
      window.location.href = '/login';
    }, 500);
  }
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
      const pesanError = (error.response?.data as { pesan?: string } | undefined)?.pesan || '';

      // Jika sesi invalid karena inactivity atau tab close, langsung redirect
      if (adalahPesanSesiInvalid(pesanError)) {
        redirectKeLogin(pesanError);
        return Promise.reject(error);
      }

      if (refreshPromise) {
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

      const doRefresh = async (): Promise<string | null> => {
        try {
          const res = await axios.post(
            `${BASE_URL}/auth/refresh`,
            {},
            { withCredentials: true }
          );
          const { accessToken, user } = res.data.data;
          simpanToken(accessToken);
          if (user) simpanUser(user);
          return accessToken;
        } catch {
          bersihkanSesi();
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
          }
          return null;
        }
      };

      refreshPromise = doRefresh();

      try {
        const token = await refreshPromise;
        prosesAntrian(token);
        refreshPromise = null;
        if (token) {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        }
      } catch {
        // refreshPromise already resolved to null, cleanup done
      }
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default api;
