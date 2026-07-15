// ============================================================
//  PermissionGate — komponen untuk conditional rendering.
//  Menyembunyikan UI berdasarkan permission user.
// ============================================================

'use client';

import type { ReactNode } from 'react';
import { usePermission } from './usePermission';
import type { Permission } from './permissions';

// --- Props ---

interface PermissionGateProps {
  /** Permission yang harus dimiliki */
  permission: Permission;
  /** Children dirender jika punya permission */
  children: ReactNode;
  /** Komponen alternatif jika TIDAK punya permission (default: null) */
  fallback?: ReactNode | null;
}

/**
 * Component untuk conditional rendering berdasarkan permission.
 * HANYA merender children jika user memiliki permission yang dibutuhkan.
 *
 * @example
 * // Simple usage
 * <PermissionGate permission="barang:edit">
 *   <EditButton />
 * </PermissionGate>
 *
 * // Dengan fallback
 * <PermissionGate permission="admin:kelola" fallback={<div>No access</div>}>
 *   <AdminPanel />
 * </PermissionGate>
 */
export function PermissionGate({ permission, children, fallback = null }: PermissionGateProps) {
  const { can, isReady } = usePermission();

  // Loading state - jangan render apapun
  if (!isReady) return null;

  // Check permission
  if (!can(permission)) return fallback;

  return <>{children}</>;
}

// --- Variant: PermissionGateMultiple ---

interface PermissionGateMultipleProps {
  /** Array permission (dicek: salah satu punya = boleh) */
  permissions: Permission[];
  /** Children dirender jika punya minimal salah satu */
  children: ReactNode;
  /** Komponen alternatif jika TIDAK punya permission (default: null) */
  fallback?: ReactNode | null;
  /** Mode: 'some' (OR) atau 'every' (AND) */
  mode?: 'some' | 'every';
}

/**
 * Component untuk conditional rendering dengan multiple permissions.
 *
 * @example
 * <PermissionGateMultiple permissions={['barang:edit', 'barang:hapus']}>
 *   <ActionButtons />
 * </PermissionGateMultiple>
 */
export function PermissionGateMultiple({
  permissions,
  children,
  fallback = null,
  mode = 'some',
}: PermissionGateMultipleProps) {
  const { canAny, isReady } = usePermission();

  if (!isReady) return null;
  if (!canAny(permissions, mode)) return fallback;

  return <>{children}</>;
}
