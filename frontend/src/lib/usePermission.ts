// ============================================================
//  Hook untuk cek permission di dalam komponen.
//  Wajib dipakai di dalam AuthProvider context.
// ============================================================

'use client';

import { useAuth } from '@/hooks/useAuth';
import type { Permission } from './permissions';
import { hasPermission, hasAnyPermission } from './permissions';

/**
 * Hook untuk cek permission di dalam komponen.
 *
 * @example
 * function EditButton() {
 *   const { can, role } = usePermission();
 *   if (!can('barang:edit')) return null;
 *   return <button>Edit</button>;
 * }
 */
export function usePermission() {
  const { user } = useAuth();
  const role = user?.activeRole;

  return {
    /** Cek single permission */
    can: (permission: Permission): boolean => {
      if (!role) return false;
      return hasPermission(role, permission);
    },
    /** Cek multiple permissions (default: OR, salah satu punya = boleh) */
    canAny: (permissions: Permission[], mode: 'some' | 'every' = 'some'): boolean => {
      if (!role) return false;
      return hasAnyPermission(role, permissions, mode);
    },
    /** Role yang sedang aktif */
    role,
    /** Apakah user sudah dimuat */
    isReady: user !== undefined,
    /** Helper: apakah SuperAdmin */
    isSuperAdmin: role === 'SUPER_ADMIN',
    /** Helper: apakah Admin atau SuperAdmin */
    isAdmin: role === 'ADMIN' || role === 'SUPER_ADMIN',
    /** Helper: apakah Peminjam */
    isPeminjam: role === 'PEMINJAM',
  };
}
