// ============================================================
//  Halaman Buat Peminjaman via Admin.
//  Diakses via navigasi dari halaman Manajemen Peminjaman.
// ============================================================

'use client';

import { useRouter } from 'next/navigation';
import { invalidasiCache } from '@/lib/cache';
import { RUTE } from '@/constants/routes';
import { LangkahPeminjamanAdmin } from '@/components/peminjaman/LangkahPeminjamanAdmin';
import type { Peminjaman } from '@/types/peminjaman.type';

export default function BuatPeminjamanAdminPage() {
  const router = useRouter();

  const handleSelesai = (peminjaman: Peminjaman) => {
    invalidasiCache('peminjaman');
    invalidasiCache('folder-peminjaman');
    invalidasiCache('dashboard-admin');
    invalidasiCache('barang');
    invalidasiCache('dashboard-peminjam');
    router.push(RUTE.adminPeminjamanDetail(peminjaman.id));
  };

  const handleTutup = () => {
    router.back();
  };

  return <LangkahPeminjamanAdmin onTutup={handleTutup} onSelesai={handleSelesai} />;
}
