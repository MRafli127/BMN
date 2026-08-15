// ============================================================
//  Skeleton loading untuk halaman Super Admin.
//  Menggunakan shimmer effect yang sudah didefinisikan di globals.css
// ============================================================

'use client';

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('shimmer rounded-lg bg-muted/60', className)} />;
}

// ============================================================
//  Skeleton untuk header halaman
// ============================================================
export function HeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-72" />
    </div>
  );
}

// ============================================================
//  Skeleton untuk kartu statistik
// ============================================================
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border bg-white p-5 shadow-md">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-12 w-12 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
//  Skeleton untuk tabel data
// ============================================================
export function TableSkeleton({
  columns = 5,
  rows = 5,
  hasPagination = true,
}: {
  columns?: number;
  rows?: number;
  hasPagination?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-white shadow-md">
      {/* Table Header */}
      <div className="flex gap-4 border-b bg-gray-50 px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>

      {/* Table Body */}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4 px-4 py-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-5 flex-1" />
            ))}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {hasPagination && (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <Skeleton className="h-4 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
//  Skeleton untuk filter bar
// ============================================================
export function FilterSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-md lg:flex-row lg:items-center">
      <Skeleton className="h-11 flex-1" />
      <div className="flex gap-2">
        <Skeleton className="h-11 w-32 rounded-lg" />
        <Skeleton className="h-11 w-32 rounded-lg" />
      </div>
    </div>
  );
}

// ============================================================
//  Skeleton untuk konten utama halaman
// ============================================================
export function PageContentSkeleton({
  showStats = true,
  columns = 5,
  rows = 5,
}: {
  showStats?: boolean;
  columns?: number;
  rows?: number;
}) {
  return (
    <div className="space-y-6">
      <HeaderSkeleton />
      {showStats && <StatCardsSkeleton count={4} />}
      <FilterSkeleton />
      <TableSkeleton columns={columns} rows={rows} />
    </div>
  );
}

// ============================================================
//  Full page skeleton
// ============================================================
export function FullPageSkeleton() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="mt-4 text-sm text-muted-foreground">Memuat...</p>
      </div>
    </div>
  );
}
