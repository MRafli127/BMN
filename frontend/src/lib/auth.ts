// ============================================================
//  Pengelolaan sesi di sisi klien.
//  Token disimpan di localStorage (untuk Axios) dan dicerminkan
//  ke cookie (agar dapat dibaca oleh middleware.ts Next.js).
// ============================================================

import type { User } from '@/types/user.type';

const KUNCI_TOKEN = 'sipp_access_token';
const KUNCI_USER = 'sipp_user';

// --- Cookie sederhana (untuk middleware) ---
function setCookie(nama: string, nilai: string, hari = 7) {
  if (typeof document === 'undefined') return;
  const kedaluwarsa = new Date(Date.now() + hari * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${nama}=${encodeURIComponent(nilai)}; expires=${kedaluwarsa}; path=/; SameSite=Lax`;
}

function hapusCookie(nama: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${nama}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

// --- Token ---
export function simpanToken(token: string) {
  if (typeof window !== 'undefined') localStorage.setItem(KUNCI_TOKEN, token);
  setCookie('sipp_token', token);
}

export function ambilToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(KUNCI_TOKEN);
}

// --- User ---
export function simpanUser(user: User) {
  if (typeof window !== 'undefined') localStorage.setItem(KUNCI_USER, JSON.stringify(user));
  // Cookie berisi ACTIVE role (dasar gating middleware Next.js).
  setCookie('sipp_role', user.activeRole);
}

export function ambilUser(): User | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem(KUNCI_USER);
  try {
    return data ? (JSON.parse(data) as User) : null;
  } catch {
    return null;
  }
}

// --- Simpan & bersihkan sesi sekaligus ---
export function simpanSesi(token: string, user: User) {
  simpanToken(token);
  simpanUser(user);
}

export function bersihkanSesi() {
  if (typeof window !== 'undefined') {
    const dataUser = localStorage.getItem(KUNCI_USER);
    let userId: string | undefined;
    try { userId = dataUser ? JSON.parse(dataUser).id : undefined; } catch {}

    localStorage.removeItem(KUNCI_TOKEN);
    localStorage.removeItem(KUNCI_USER);

    if (userId) {
      localStorage.removeItem(`keranjang-peminjam:${userId}`);
    }
  }
  hapusCookie('sipp_token');
  hapusCookie('sipp_role');
}
