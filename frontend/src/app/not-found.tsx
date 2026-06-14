// ============================================================
//  Halaman 404 — tidak ditemukan.
// ============================================================

import Link from 'next/link';
import { FileQuestion, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RUTE } from '@/constants/routes';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-50 px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
        <FileQuestion className="h-10 w-10" />
      </div>
      <h1 className="text-5xl font-bold text-foreground">404</h1>
      <p className="mt-2 text-lg font-medium text-foreground">Halaman tidak ditemukan</p>
      <p className="mt-1 max-w-md text-muted-foreground">
        Maaf, halaman yang Anda cari tidak tersedia atau telah dipindahkan.
      </p>
      <Button asChild className="mt-6">
        <Link href={RUTE.beranda}>
          <Home className="h-4 w-4" /> Kembali ke Beranda
        </Link>
      </Button>
    </div>
  );
}
