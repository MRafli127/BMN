// ============================================================
//  Sistem Permission untuk Frontend
//  Mendefinisikan kapabilitas per role untuk UI conditional rendering.
// ============================================================

import type { Role } from '@/types/user.type';

// --- Kapabilitas (capabilities) yang bisa dicek ---
export type Permission =
  // Barang
  | 'barang:lihat'
  | 'barang:tambah'
  | 'barang:edit'
  | 'barang:hapus'
  | 'barang:import'
  | 'barang:export'
  // Peminjaman
  | 'peminjaman:lihat'
  | 'peminjaman:proses'
  | 'peminjaman:scan'
  | 'peminjaman:export'
  // User Management
  | 'user:lihat'
  | 'user:tambah'
  | 'user:edit'
  | 'user:reset-password'
  | 'user:hapus'
  // Admin Management (SuperAdmin only)
  | 'admin:kelola'
  // Satker Management
  | 'satker:kelola'
  // Logs & Audit
  | 'logs:lihat'
  // Settings
  | 'settings:kelola';

// --- Matriks role → permission ---
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    // Barang: full access
    'barang:lihat', 'barang:tambah', 'barang:edit', 'barang:hapus', 'barang:import', 'barang:export',
    // Peminjaman: full access
    'peminjaman:lihat', 'peminjaman:proses', 'peminjaman:scan', 'peminjaman:export',
    // User: full access
    'user:lihat', 'user:tambah', 'user:edit', 'user:reset-password', 'user:hapus',
    // Admin: SuperAdmin only
    'admin:kelola',
    // Satker: SuperAdmin only
    'satker:kelola',
    // Logs
    'logs:lihat',
    // Settings
    'settings:kelola',
  ],
  ADMIN: [
    // Barang: full access (untuk satkernya)
    'barang:lihat', 'barang:tambah', 'barang:edit', 'barang:hapus', 'barang:import', 'barang:export',
    // Peminjaman: full access
    'peminjaman:lihat', 'peminjaman:proses', 'peminjaman:scan', 'peminjaman:export',
    // User: hanya lihat & reset password
    'user:lihat', 'user:reset-password',
    // Logs: hanya lihat
    'logs:lihat',
    // Settings
    'settings:kelola',
  ],
  PEMINJAM: [
    // Barang: hanya lihat katalog
    'barang:lihat',
    // Peminjaman: hanya lihat & ajukan
    'peminjaman:lihat',
    // Settings: hanya profil sendiri
    'settings:kelola',
  ],
};

/**
 * Cek apakah role tertentu punya permission tertentu.
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Cek apakah role memiliki salah satu dari permissions yang diberikan.
 * @param role - Role yang sedang aktif
 * @param permissions - Array permission yang dicek
 * @param mode - 'some' (OR) atau 'every' (AND)
 */
export function hasAnyPermission(
  role: Role,
  permissions: Permission[],
  mode: 'some' | 'every' = 'some'
): boolean {
  const rolePerms = ROLE_PERMISSIONS[role] ?? [];
  if (mode === 'every') {
    return permissions.every((p) => rolePerms.includes(p));
  }
  return permissions.some((p) => rolePerms.includes(p));
}

// --- Grouped permissions untuk UI dropdown/filter ---
export const PERMISSION_GROUPS = {
  barang: ['barang:lihat', 'barang:tambah', 'barang:edit', 'barang:hapus', 'barang:import', 'barang:export'] as Permission[],
  peminjaman: ['peminjaman:lihat', 'peminjaman:proses', 'peminjaman:scan', 'peminjaman:export'] as Permission[],
  user: ['user:lihat', 'user:tambah', 'user:edit', 'user:reset-password', 'user:hapus'] as Permission[],
  admin: ['admin:kelola'] as Permission[],
  satker: ['satker:kelola'] as Permission[],
  logs: ['logs:lihat'] as Permission[],
};
