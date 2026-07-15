# SuperAdmin Architecture Refactoring - Implementation Report

**Date:** 2026-07-14  
**Branch:** raka  
**Status:** ✅ Complete

---

## Summary

This refactoring improves the SuperAdmin architecture with centralized role definitions, enhanced security, performance optimization, and a permission-based UI system.

---

## Changes by Step

### STEP 1: Bug Fix ✅

**Issue:** Runtime error when SuperAdmin user logs in - `TypeError: Cannot read properties of undefined (reading 'ikon')`

**Root Cause:** Missing `SUPER_ADMIN` entry in role lookup tables.

**Files Fixed:**
| File | Change |
|------|--------|
| `frontend/src/app/(auth)/login/page.tsx` | Added `SUPER_ADMIN` to `INFO_PERAN` |
| `frontend/src/components/layout/Header.tsx` | Added `SUPER_ADMIN` to `LABEL_PERAN`, replaced hardcoded ternary with dynamic lookup |
| `frontend/src/components/layout/Header.tsx` | Fixed 2 hardcoded role labels → `LABEL_PERAN[user.activeRole]` |

---

### STEP 2: Centralized Constants ✅

**Goal:** Single source of truth for role definitions.

**Files Created:**
| File | Purpose |
|------|---------|
| `frontend/src/constants/roles.ts` | Single source of truth for role labels, icons, and default routes |

**Files Updated:**
| File | Change |
|------|--------|
| `frontend/src/app/(auth)/login/page.tsx` | Import from `constants/roles.ts` |
| `frontend/src/components/layout/Header.tsx` | Import from `constants/roles.ts` |
| `frontend/src/components/layout/Sidebar.tsx` | Import from `constants/roles.ts` |
| `frontend/src/constants/routes.ts` | Export `RUTE_DEFAULT` from `constants/roles.ts` |
| `frontend/src/app/(dashboard)/bantuan/page.tsx` | Import & use `LABEL_ROLE` |
| `frontend/src/app/(dashboard)/pengaturan/page.tsx` | Import & use `LABEL_ROLE` |
| `frontend/src/app/(dashboard)/super-admin/admin/page.tsx` | Import & use `LABEL_ROLE` |

**Result:** All 7 files now use centralized constants. No more hardcoded role strings scattered.

---

### STEP 3: Security Hardening ✅

**Goal:** Prevent deletion of last SuperAdmin.

**Files Updated:**
| File | Guard Added |
|------|------------|
| `backend/src/services/userManagement.service.js` (hapusRole) | SuperAdmin last guard + tokenVersion increment |
| `backend/src/services/userManagement.service.js` (remove) | SuperAdmin last guard |

**Logic:**
```javascript
// Guard: jangan cabut super admin terakhir.
if (role === 'SUPER_ADMIN') {
  const jumlahSuperAdmin = await prisma.user.count({
    where: { roles: { has: 'SUPER_ADMIN' } },
  });
  if (jumlahSuperAdmin <= 1) {
    throw new AppError('Tidak dapat mencabut super admin terakhir.', 400);
  }
}
```

---

### STEP 4: Permission System ✅

**Goal:** Declarative UI rendering based on capabilities.

**Files Created:**
| File | Purpose |
|------|---------|
| `frontend/src/lib/permissions.ts` | Permission types, matrix, and helper functions |
| `frontend/src/lib/usePermission.ts` | Hook for permission checks in components |
| `frontend/src/lib/PermissionGate.tsx` | Component for conditional rendering |

**Permission Matrix:**

| Permission | SUPER_ADMIN | ADMIN | PEMINJAM |
|------------|:-----------:|:-----:|:--------:|
| `barang:lihat` | ✅ | ✅ | ✅ |
| `barang:tambah` | ✅ | ✅ | ❌ |
| `barang:edit` | ✅ | ✅ | ❌ |
| `barang:hapus` | ✅ | ✅ | ❌ |
| `barang:import` | ✅ | ✅ | ❌ |
| `barang:export` | ✅ | ✅ | ❌ |
| `peminjaman:lihat` | ✅ | ✅ | ✅ |
| `peminjaman:proses` | ✅ | ✅ | ❌ |
| `peminjaman:scan` | ✅ | ✅ | ❌ |
| `peminjaman:export` | ✅ | ✅ | ❌ |
| `user:lihat` | ✅ | ✅ | ❌ |
| `user:tambah` | ✅ | ❌ | ❌ |
| `user:edit` | ✅ | ❌ | ❌ |
| `user:reset-password` | ✅ | ✅ | ❌ |
| `user:hapus` | ✅ | ❌ | ❌ |
| `admin:kelola` | ✅ | ❌ | ❌ |
| `satker:kelola` | ✅ | ❌ | ❌ |
| `logs:lihat` | ✅ | ✅ | ❌ |
| `settings:kelola` | ✅ | ✅ | ✅ |

**Usage Examples:**

```tsx
// Hook usage
import { usePermission } from '@/lib/usePermission';

function EditButton() {
  const { can } = usePermission();
  if (!can('barang:edit')) return null;
  return <button>Edit</button>;
}

// Component usage
import { PermissionGate } from '@/lib/PermissionGate';

<PermissionGate permission="admin:kelola">
  <AdminPanel />
</PermissionGate>

// Multiple permissions (OR)
import { PermissionGateMultiple } from '@/lib/PermissionGate';

<PermissionGateMultiple permissions={['barang:edit', 'barang:hapus']}>
  <ActionButtons />
</PermissionGateMultiple>
```

---

### STEP 5: SuperAdmin Dashboard Enhancement ✅

**Goal:** Richer dashboard with clickable stats and per-satker data.

**Files Updated:**
| File | Enhancement |
|------|-------------|
| `frontend/src/app/(dashboard)/super-admin/dashboard/page.tsx` | Clickable stat cards, per-satker table, more quick actions, purple theme |

**New Features:**
- ✅ Clickable stat cards (link to relevant pages)
- ✅ Per-Satker statistics table
- ✅ 8 stats (added Total Satker, Total Peminjaman)
- ✅ 6 quick action buttons
- ✅ Purple gradient theme (SuperAdmin identity)

---

### STEP 6: Performance Optimization ✅

**Goal:** Eliminate N+1 query in dashboard.

**File Updated:**
| File | Fix |
|------|-----|
| `backend/src/controllers/dashboard.controller.js` | Fixed N+1 query in `dashboardSuperAdmin` |

**Before (41 queries for 20 satkers):**
```javascript
// N+1: 2 queries per satker
const statistikSatker = await Promise.all(
  semuaSatker.map(async (satker) => {
    const jumlahBarang = await prisma.barang.count(...);
    const jumlahPeminjaman = await prisma.peminjaman.count(...);
    return { kodeSatker, jumlahBarang, jumlahPeminjaman };
  })
);
```

**After (3 queries total):**
```javascript
// 1. Get satker counts from groupBy
prisma.barang.groupBy({ by: ['kodeSatker'], _count: { id: true } })

// 2. Single raw query for peminjaman counts
prisma.$queryRaw`
  SELECT b."kodeSatker", COUNT(DISTINCT p.id) as "jumlahPeminjaman"
  FROM "Peminjaman" p
  INNER JOIN "DetailPeminjaman" dp ON dp."peminjamanId" = p.id
  INNER JOIN "Barang" b ON b.id = dp."barangId"
  GROUP BY b."kodeSatker"
`

// 3. Combine in memory
```

**Result:** ~93% reduction in query count (41 → 3)

---

### STEP 7: Testing & Documentation ✅

**Verification:**
- ✅ TypeScript compilation check (0 errors in new files)
- ✅ Syntax check for backend files
- ✅ Documentation created (this file)

**TypeScript Status:**
- New files (permissions, roles): **0 errors**
- Pre-existing errors in other files: 39 (not in scope)

---

## Files Summary

### Created
```
frontend/src/constants/roles.ts
frontend/src/lib/permissions.ts
frontend/src/lib/usePermission.ts
frontend/src/lib/PermissionGate.tsx
docs/SUPERADMIN-REFACTORING.md (this file)
```

### Modified
```
frontend/src/app/(auth)/login/page.tsx
frontend/src/components/layout/Header.tsx
frontend/src/components/layout/Sidebar.tsx
frontend/src/constants/routes.ts
frontend/src/app/(dashboard)/bantuan/page.tsx
frontend/src/app/(dashboard)/pengaturan/page.tsx
frontend/src/app/(dashboard)/super-admin/admin/page.tsx
frontend/src/app/(dashboard)/super-admin/dashboard/page.tsx
backend/src/services/userManagement.service.js
backend/src/controllers/dashboard.controller.js
```

---

## Next Steps (Optional)

1. **Install testing framework** (Vitest/Jest) for unit tests
2. **E2E testing** with Playwright/Cypress
3. **Apply PermissionGate** to more pages (admin barang, peminjaman, etc.)
4. **Add `variant` prop** to Badge component for consistency

---

## Rollback Plan

If issues arise, rollback these commits:

```bash
# Step 1-2: Bug fix + constants
git revert HEAD --no-commit
git checkout -- .

# Step 3: Security
git checkout HEAD~1 -- backend/src/services/userManagement.service.js

# Step 6: Performance
git checkout HEAD~2 -- backend/src/controllers/dashboard.controller.js
```
