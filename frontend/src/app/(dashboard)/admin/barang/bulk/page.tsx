// ============================================================
//  Admin — Bulk Insert Barang.
// ============================================================

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormBarangBulk } from '@/components/barang/FormBarangBulk';
import { notify } from '@/components/ui/toast';
import { barangService, type DataBarangBulkForm } from '@/services/barang.service';
import { ambilPesanError } from '@/lib/utils';
import { RUTE } from '@/constants/routes';

export default function BulkBarangPage() {
  const router = useRouter();

  const simpan = async (data: DataBarangBulkForm) => {
    try {
      const hasil = await barangService.bulkCreate(data);
      notify.suksess(
        `${hasil.berhasil} barang berhasil ditambahkan (NUP ${hasil.nupAwal} - ${hasil.nupAkhir}).`
      );
      router.push(RUTE.adminBarang);
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal menambahkan barang.'));
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Button asChild variant="ghost" size="sm">
        <Link href={RUTE.adminBarang}>
          <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Barang
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Tambah Barang Massal</CardTitle>
          <p className="text-sm text-muted-foreground">
            Tambahkan banyak barang sekaligus dengan <strong>NUP auto-generate</strong>.
            Isi data barang sekali, tentukan jumlah, dan NUP akan diisi otomatis.
          </p>
        </CardHeader>
        <CardContent>
          <FormBarangBulk onSimpan={simpan} teksTombol="Simpan Semua Barang" />
        </CardContent>
      </Card>
    </div>
  );
}
