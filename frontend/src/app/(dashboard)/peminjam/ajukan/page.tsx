// ============================================================
//  Peminjam — Ajukan Peminjaman.
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormPeminjaman } from '@/components/peminjaman/FormPeminjaman';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { notify } from '@/components/ui/toast';
import { barangService } from '@/services/barang.service';
import { peminjamanService } from '@/services/peminjaman.service';
import { ambilPesanError } from '@/lib/utils';
import { RUTE } from '@/constants/routes';
import type { Barang } from '@/types/barang.type';
import type { DataPengajuan } from '@/types/peminjaman.type';

export default function AjukanPage() {
  const router = useRouter();
  const [barang, setBarang] = useState<Barang[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [praId, setPraId] = useState<string | undefined>();

  // Ambil barangId pra-pilih dari query string (?barangId=...)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    setPraId(sp.get('barangId') || undefined);
  }, []);

  useEffect(() => {
    barangService
      .getSemua({ limit: 100 })
      .then((r) => setBarang(r.data))
      .catch((e) => notify.gagal(ambilPesanError(e, 'Gagal memuat katalog barang.')))
      .finally(() => setMemuat(false));
  }, []);

  // Kirim pengajuan (error ditangani di FormPeminjaman)
  const ajukan = async (data: DataPengajuan) => {
    const p = await peminjamanService.create(data);
    notify.sukses('Pengajuan peminjaman berhasil dikirim!');
    router.push(RUTE.peminjamRiwayatDetail(p.id));
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Button asChild variant="ghost" size="sm">
        <Link href={RUTE.peminjamKatalog}>
          <ArrowLeft className="h-4 w-4" /> Kembali ke Katalog
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Ajukan Peminjaman Barang</CardTitle>
          <p className="text-sm text-muted-foreground">
            Pilih barang dan tentukan tanggal peminjaman Anda.
          </p>
        </CardHeader>
        <CardContent>
          {memuat ? (
            <LoadingSpinner />
          ) : (
            <FormPeminjaman daftarBarang={barang} onAjukan={ajukan} praPilihId={praId} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
