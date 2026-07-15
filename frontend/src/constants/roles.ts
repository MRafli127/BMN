// ============================================================
//  Konstanta peran (role) dan label tampilan.
//  SATU-SATUNYA sumber kebenaran untuk definisi role di frontend.
//  Semua file lain HARUS import dari sini, tidak boleh hardcode.
// ============================================================

import type { Role } from '@/types/user.type';

// --- Daftar role valid (sesuai enum Prisma) ---
export const ROLE_VALID: Role[] = ['ADMIN', 'PEMINJAM', 'SUPER_ADMIN'];

// --- Label tampilan untuk setiap role ---
export const LABEL_ROLE: Record<Role, string> = {
  ADMIN: 'Administrator',
  PEMINJAM: 'Peminjam',
  SUPER_ADMIN: 'Super Admin',
};

// --- Ikon untuk setiap role (Material Icons) ---
export const IKON_ROLE: Record<Role, string> = {
  ADMIN: 'admin_panel_settings',
  PEMINJAM: 'person',
  SUPER_ADMIN: 'security',
};

// --- Rute default per role ---
export const RUTE_DEFAULT_PER_ROLE: Record<Role, string> = {
  ADMIN: '/admin/dashboard',
  PEMINJAM: '/peminjam/dashboard',
  SUPER_ADMIN: '/super-admin/dashboard',
};

// --- Helper: cek apakah role memiliki akses ke rute tertentu ---
export function bisaAksesRute(role: Role, rute: string): boolean {
  if (rute.startsWith('/super-admin')) {
    return role === 'SUPER_ADMIN';
  }
  if (rute.startsWith('/admin')) {
    return role === 'ADMIN' || role === 'SUPER_ADMIN';
  }
  if (rute.startsWith('/peminjam')) {
    return role === 'PEMINJAM' || role === 'ADMIN' || role === 'SUPER_ADMIN';
  }
  return false;
}
