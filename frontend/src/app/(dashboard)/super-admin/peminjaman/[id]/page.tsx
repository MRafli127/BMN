// ============================================================
//  Super Admin — Detail Peminjaman (view-only).
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  User as UserIcon,
  MapPin,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { notify } from '@/components/ui/toast';
import { peminjamanService } from '@/services/peminjaman.service';
import { ambilPesanError, formatTanggalLengkap, cn } from '@/lib/utils';
import { STATUS_PEMINJAMAN } from '@/constants/status';
import { RUTE } from '@/constants/routes';
import type { Peminjaman } from '@/types/peminjaman.type';

export default function SuperAdminDetailPeminjamanPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Peminjaman | null>(null);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    if (!id) return;
    setMemuat(true);
    peminjamanService
      .getById(id)
      .then(setData)
      .catch((e) => notify.gagal(ambilPesanError(e, 'Gagal memuat detail.')))
      .finally(() => setMemuat(false));
  }, [id]);

  if (memuat) return <LoadingSpinner layarPenuh />;

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <Icon name="error" style={{ fontSize: 48 }} className="text-gray-400" />
        <p className="text-gray-500">Peminjaman tidak ditemukan.</p>
        <Link href={RUTE.superAdminPeminjaman}>
          <Button variant="outline">Kembali ke Daftar</Button>
        </Link>
      </div>
    );
  }

  const status = STATUS_PEMINJAMAN[data.status];

  const badgeStatus = (statusKey: string) => {
    const config: Record<string, { label: string; className: string }> = {
      MENUNGGU: { label: 'Menunggu', className: 'bg-yellow-100 text-yellow-700' },
      DISETUJUI: { label: 'Disetujui', className: 'bg-blue-100 text-blue-700' },
      DITOLAK: { label: 'Ditolak', className: 'bg-red-100 text-red-700' },
      DIPINJAM: { label: 'Dipinjam', className: 'bg-orange-100 text-orange-700' },
      DIKEMBALIKAN: { label: 'Dikembalikan', className: 'bg-green-100 text-green-700' },
      TERLAMBAT: { label: 'Terlambat', className: 'bg-red-100 text-red-700' },
    };
    const cfg = config[statusKey] || { label: statusKey, className: 'bg-gray-100 text-gray-700' };
    return <Badge className={cfg.className}>{cfg.label}</Badge>;
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href={RUTE.superAdminPeminjaman}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <p className="font-mono text-sm text-gray-500">{data.kodePeminjaman}</p>
            <h1 className="text-xl font-bold">Detail Peminjaman</h1>
          </div>
        </div>
        {badgeStatus(data.status)}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Kolom utama */}
        <div className="space-y-5 lg:col-span-2">
          {/* Info Peminjam */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserIcon className="h-4 w-4" /> Data Peminjam
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Nama" nilai={data.peminjam?.nama} />
              <Info label="NIP" nilai={data.peminjam?.nip} />
              <Info label="Unit/Eselon IV" nilai={data.peminjam?.eselon4} />
              <Info label="Direktorat/Eselon III" nilai={data.peminjam?.eselon3} />
              <Info label="Satker" nilai={data.peminjam?.satker?.nama || data.namaSatker} />
            </CardContent>
          </Card>

          {/* Detail Peminjaman */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" /> Rincian Peminjaman
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Info label="Tanggal Ajuan" nilai={formatTanggalLengkap(data.tanggalPengajuan)} />
                <Info label="Rencana Pinjam" nilai={data.tanggalPinjamRencana ? formatTanggalLengkap(data.tanggalPinjamRencana) : '-'} />
                <Info label="Rencana Kembali" nilai={data.tanggalKembaliRencana ? formatTanggalLengkap(data.tanggalKembaliRencana) : 'Tanpa batas'} />
                {data.tanggalKembaliAktual && (
                  <Info label="Dikembalikan Pada" nilai={formatTanggalLengkap(data.tanggalKembaliAktual)} />
                )}
              </div>

              {data.alasanPeminjaman && (
                <Info label="Alasan Peminjaman" nilai={data.alasanPeminjaman} />
              )}

              {/* Daftar Barang */}
              <div>
                <p className="mb-2 text-sm font-semibold">Barang Dipinjam ({data.detail?.length || 0} item)</p>
                <div className="space-y-2">
                  {data.detail?.map((item, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                      <div>
                        <p className="font-medium">{item.barang?.nama || item.namaBarang}</p>
                        <p className="text-xs text-gray-500">{item.barang?.kodeBarang}</p>
                      </div>
                      <Badge variant="outline">x{item.jumlah}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {data.catatanAdmin && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <Icon name="sticky_note_2" fill className="shrink-0 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Catatan Admin</p>
                    <p className="text-sm text-amber-800">{data.catatanAdmin}</p>
                  </div>
                </div>
              )}

              {data.catatanPengembalian && (
                <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
                  <Icon name="visibility_off" fill className="shrink-0 text-blue-600" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Catatan Pengembalian</p>
                    <p className="text-sm text-blue-800">{data.catatanPengembalian}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar info */}
        <div className="space-y-5">
          {/* Status Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-center">
                <Badge className={cn(status.kelas, 'px-4 py-2 text-sm')}>{status.label}</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <Info label="Diajukan" nilai={formatTanggalLengkap(data.tanggalPengajuan)} />
                {data.admin && <Info label="Diprotes Oleh" nilai={data.admin.nama} />}
              </div>
            </CardContent>
          </Card>

          {/* QR Code */}
          {data.qrCodeUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">QR Code</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={data.qrCodeUrl} alt="QR Code" className="h-40 w-40 rounded-lg border" />
                <p className="mt-2 font-mono text-xs text-gray-500">{data.kodePeminjaman}</p>
              </CardContent>
            </Card>
          )}

          {/* Dokumen */}
          {data.dokumenUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Surat Pernyataan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <a href={data.dokumenUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Icon name="description" style={{ fontSize: 16 }} /> Lihat Dokumen
                </a>
                {data.dokumenStempelUrl && (
                  <a href={data.dokumenStempelUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <Icon name="verified" fill style={{ fontSize: 16 }} /> Surat Berstempel
                  </a>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, nilai }: { label: string; nilai?: string | null }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium">{nilai || '-'}</p>
    </div>
  );
}
