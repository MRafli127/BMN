// ============================================================
//  Super Admin — Detail Peminjaman (view-only).
//  Desain sesuai format contoh dengan header name, tanggal,
//  dan timeline status.
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, User as UserIcon, Package, Clock, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { notify } from '@/components/ui/toast';
import { peminjamanService } from '@/services/peminjaman.service';
import { ambilPesanError, formatTanggalLengkap, cn, urlFile } from '@/lib/utils';
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

  // Format tanggal Indonesia
  const formatTanggalIndonesia = (tanggal?: string | null) => {
    if (!tanggal) return '-';
    return new Date(tanggal).toLocaleDateString('id-ID', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  };

  // Timeline status
  const timelineStatus = [
    { key: 'DRAFT', label: 'Draft Pengajuan', icon: 'edit_note' },
    { key: 'MENUNGGU', label: 'Menunggu Persetujuan', icon: 'hourglass_empty' },
    { key: 'DISETUJUI', label: 'Disetujui', icon: 'check_circle' },
    { key: 'DIPINJAM', label: 'Barang Dipinjam', icon: 'inventory_2' },
    { key: 'DIKEMBALIKAN', label: 'Dikembalikan', icon: 'assignment_return' },
  ];

  // Cek apakah status tertentu sudah dilalui
  const isStatusLampau = (statusKey: string) => {
    const order = ['DRAFT', 'MENUNGGU', 'DISETUJUI', 'DIPINJAM', 'DIKEMBALIKAN'];
    const currentIndex = order.indexOf(data.status);
    const targetIndex = order.indexOf(statusKey);

    // Status DITOLAK dan TERLAMBAT special case
    if (data.status === 'DITOLAK') {
      return targetIndex <= Math.min(order.indexOf('MENUNGGU'), currentIndex);
    }
    if (data.status === 'TERLAMBAT') {
      return targetIndex <= Math.min(order.indexOf('DIPINJAM'), currentIndex);
    }

    return targetIndex <= currentIndex;
  };

  return (
    <div className="mx-auto max-w-4xl pb-5">
      {/* Header */}
      <div className="mb-6">
        <Link
          href={RUTE.superAdminPeminjaman}
          className="mb-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Daftar
        </Link>

        <div className="mt-4 flex items-start justify-between">
          <div>
            {/* Nama Peminjam */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100">
                <UserIcon className="h-4 w-4 text-blue-600" />
              </div>
              <span className="font-semibold text-gray-900">{data.peminjam?.nama || '-'}</span>
            </div>

            <h1 className="text-2xl font-bold text-gray-900">Detail Peminjaman</h1>

            {/* Kode Referensi */}
            <p className="mt-2 font-mono text-sm text-gray-500">
              {data.kodeTransaksi || data.kodePeminjaman}
            </p>

            {/* Tanggal Ajuan */}
            <p className="text-sm text-gray-500">
              Diajukan {formatTanggalIndonesia(data.tanggalPengajuan)}
            </p>
          </div>

          {/* Status Badge */}
          <Badge className={cn(status.kelas, 'px-4 py-2 text-sm font-medium')}>
            {status.label}
          </Badge>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Main Content - Left Side */}
        <div className="space-y-5 lg:col-span-2">
          {/* Data Peminjam */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-blue-900">
                <UserIcon className="h-4 w-4" />
                Data Peminjam
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <InfoItem label="Nama" nilai={data.peminjam?.nama || '-'} />
                <InfoItem label="NIP" nilai={data.peminjam?.nip || '-'} />
                <InfoItem label="Eselon IV" nilai={data.peminjam?.eselon4 || '-'} />
                <InfoItem label="Eselon III" nilai={data.peminjam?.eselon3 || '-'} />
              </div>
            </CardContent>
          </Card>

          {/* Rincian Peminjaman */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-blue-900">
                <Clock className="h-4 w-4" />
                Rincian Peminjaman
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <InfoItem
                  label="RENCANA PINJAM"
                  nilai={data.tanggalPinjamRencana ? formatTanggalIndonesia(data.tanggalPinjamRencana) : '-'}
                />
                <InfoItem
                  label="RENCANA KEMBALI"
                  nilai={data.tanggalKembaliRencana
                    ? formatTanggalIndonesia(data.tanggalKembaliRencana)
                    : 'Tanpa batas waktu'}
                />
              </div>

              {data.alasanPeminjaman && (
                <div className="rounded-lg bg-gray-50 p-3">
                  <p className="text-xs text-gray-500 mb-1">Alasan Peminjaman</p>
                  <p className="text-sm text-gray-900">{data.alasanPeminjaman}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Barang Dipinjam */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 pb-3">
              <CardTitle className="flex items-center gap-2 text-base text-blue-900">
                <Package className="h-4 w-4" />
                Barang Dipinjam
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <p className="text-xs text-gray-500 mb-3">
                Klik tiap barang untuk melihat Label & QR Identitas Barang.
              </p>

              {data.detail?.map((item, index) => (
                <div
                  key={index}
                  className="rounded-lg border border-gray-200 bg-white p-4"
                >
                  <h4 className="font-semibold text-gray-900 mb-3">
                    {item.barang?.nama || item.namaBarang}
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Merk</p>
                      <p className="font-medium text-gray-900">{item.barang?.merk || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Identifier</p>
                      <p className="font-mono font-medium text-gray-900">
                        {item.barang?.kodeBarang || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Kategori</p>
                      <p className="font-medium text-gray-900">
                        {item.barang?.jenis || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Jumlah</p>
                      <p className="font-medium text-gray-900">
                        {item.jumlah} unit
                      </p>
                    </div>
                  </div>

                  {/* Tampilkan foto jika ada */}
                  {item.barang?.fotoUrl && (
                    <div className="mt-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={urlFile(item.barang.fotoUrl)}
                        alt={item.barang.nama}
                        className="h-32 w-auto rounded-lg border object-cover"
                      />
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Right Side */}
        <div className="space-y-5">
          {/* Timeline Status */}
          <Card>
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 pb-3">
              <CardTitle className="text-base text-blue-900">
                Status Peminjaman
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="relative">
                {/* Garis vertikal */}
                <div className="absolute left-4 top-0 h-full w-0.5 bg-gray-200" />

                <div className="space-y-4">
                  {timelineStatus.map((step, index) => {
                    const lampau = isStatusLampau(step.key);
                    const aktif = data.status === step.key;

                    return (
                      <div key={step.key} className="relative flex items-start gap-3">
                        {/* Icon circle */}
                        <div
                          className={cn(
                            'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2',
                            lampau
                              ? 'border-green-500 bg-green-500 text-white'
                              : aktif
                              ? 'border-blue-500 bg-blue-500 text-white'
                              : 'border-gray-300 bg-white text-gray-400'
                          )}
                        >
                          {lampau && !aktif ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : (
                            <Icon name={step.icon} style={{ fontSize: 16 }} />
                          )}
                        </div>

                        {/* Label */}
                        <div className="pt-1 flex-1">
                          <p
                            className={cn(
                              'text-sm font-medium',
                              lampau ? 'text-green-700' : aktif ? 'text-blue-700' : 'text-gray-400'
                            )}
                          >
                            {step.label}
                          </p>
                          {/* Tanggal untuk status yang sudah dilalui */}
                          {step.key === 'DRAFT' && (
                            <p className="text-xs text-gray-500">
                              {formatTanggalIndonesia(data.tanggalPengajuan)}
                            </p>
                          )}
                          {step.key === 'MENUNGGU' && data.tanggalKirim && (
                            <p className="text-xs text-gray-500">
                              {formatTanggalIndonesia(data.tanggalKirim)}
                            </p>
                          )}
                          {step.key === 'DISETUJUI' && data.admin && (
                            <p className="text-xs text-green-600">{data.admin.nama}</p>
                          )}
                          {step.key === 'DIKEMBALIKAN' && data.tanggalKembaliAktual && (
                            <p className="text-xs text-gray-500">
                              {formatTanggalIndonesia(data.tanggalKembaliAktual)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Status Ditolak */}
                  {data.status === 'DITOLAK' && (
                    <div className="relative flex items-start gap-3">
                      <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-red-500 bg-red-500 text-white">
                        <Icon name="cancel" style={{ fontSize: 16 }} />
                      </div>
                      <div className="pt-1 flex-1">
                        <p className="text-sm font-medium text-red-700">Ditolak</p>
                        {data.catatanAdmin && (
                          <p className="text-xs text-gray-500">{data.catatanAdmin}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Status Terlambat */}
                  {data.status === 'TERLAMBAT' && (
                    <div className="relative flex items-start gap-3">
                      <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-orange-500 bg-orange-500 text-white">
                        <Icon name="warning" style={{ fontSize: 16 }} />
                      </div>
                      <div className="pt-1 flex-1">
                        <p className="text-sm font-medium text-orange-700">Terlambat</p>
                        <p className="text-xs text-gray-500">
                          Melebihi batas waktu pengembalian
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dokumen */}
          {data.dokumenUrl && (
            <Card>
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 pb-3">
                <CardTitle className="text-base text-blue-900">
                  Dokumen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-4">
                <a
                  href={data.dokumenUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Icon name="description" style={{ fontSize: 20 }} />
                  <span>Surat Pernyataan</span>
                </a>
                {data.dokumenStempelUrl && (
                  <a
                    href={data.dokumenStempelUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 rounded-lg border border-gray-200 p-3 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Icon name="verified" fill style={{ fontSize: 20 }} />
                    <span>Surat Berstempel</span>
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* QR Code */}
          {data.qrCodeUrl && (
            <Card>
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 pb-3">
                <CardTitle className="text-base text-blue-900">
                  QR Code
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center pt-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={data.qrCodeUrl}
                  alt="QR Code"
                  className="h-48 w-48 rounded-lg border object-contain"
                />
                <p className="mt-3 font-mono text-xs text-gray-500">
                  {data.kodeTransaksi || data.kodePeminjaman}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// Komponen Info Item
function InfoItem({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="font-medium text-gray-900">{nilai}</p>
    </div>
  );
}
