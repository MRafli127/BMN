// ============================================================
//  Admin — Detail Peminjaman.
//  Aksi: Setujui, Tolak, Stempel Dokumen, Serahkan, Pengembalian.
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  X,
  Stamp,
  PackageCheck,
  Undo2,
  FileText,
  Download,
  Loader2,
  User as UserIcon,
  CalendarDays,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea, Label } from '@/components/ui/input';
import { KonfirmasiDialog } from '@/components/shared/KonfirmasiDialog';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { TimelineStatus } from '@/components/peminjaman/TimelineStatus';
import { TampilQR } from '@/components/qrcode/TampilQR';
import { notify } from '@/components/ui/toast';
import { peminjamanService } from '@/services/peminjaman.service';
import { ambilPesanError, formatTanggalLengkap } from '@/lib/utils';
import { STATUS_PEMINJAMAN, JENIS_BARANG } from '@/constants/status';
import { RUTE } from '@/constants/routes';
import type { Peminjaman } from '@/types/peminjaman.type';

type Aksi = 'setujui' | 'tolak' | 'serahkan' | 'kembalikan' | null;

export default function DetailPeminjamanAdminPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<Peminjaman | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [aksi, setAksi] = useState<Aksi>(null);
  const [catatan, setCatatan] = useState('');
  const [proses, setProses] = useState(false);
  const [sedangStempel, setSedangStempel] = useState(false);

  const muat = () => {
    setMemuat(true);
    peminjamanService
      .getById(id)
      .then(setData)
      .catch((e) => notify.gagal(ambilPesanError(e, 'Gagal memuat detail.')))
      .finally(() => setMemuat(false));
  };

  useEffect(() => {
    if (id) muat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Jalankan aksi sesuai pilihan
  const jalankanAksi = async () => {
    if (!data || !aksi) return;
    // Penolakan wajib disertai catatan
    if (aksi === 'tolak' && catatan.trim().length < 3) {
      notify.gagal('Catatan penolakan wajib diisi (minimal 3 karakter).');
      return;
    }
    setProses(true);
    try {
      let hasil: Peminjaman;
      if (aksi === 'setujui') hasil = await peminjamanService.setujui(data.id, catatan);
      else if (aksi === 'tolak') hasil = await peminjamanService.tolak(data.id, catatan);
      else if (aksi === 'serahkan') hasil = await peminjamanService.serahkan(data.id);
      else hasil = await peminjamanService.kembalikan(data.id);

      setData(hasil);
      setAksi(null);
      setCatatan('');
      notify.sukses('Tindakan berhasil dilakukan.');
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal melakukan tindakan.'));
    } finally {
      setProses(false);
    }
  };

  const stempel = async () => {
    if (!data) return;
    setSedangStempel(true);
    try {
      const hasil = await peminjamanService.stempel(data.id);
      setData(hasil);
      notify.sukses('Dokumen berhasil distempel & ditandatangani digital.');
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal menstempel dokumen.'));
    } finally {
      setSedangStempel(false);
    }
  };

  if (memuat) return <LoadingSpinner layarPenuh />;
  if (!data) return null;

  const status = STATUS_PEMINJAMAN[data.status];
  const bisaStempel = !['MENUNGGU', 'DITOLAK'].includes(data.status) && !!data.dokumenUrl;
  const bisaKembalikan = ['DISETUJUI', 'DIPINJAM', 'TERLAMBAT'].includes(data.status);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Button asChild variant="ghost" size="sm">
        <Link href={RUTE.adminPeminjaman}>
          <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar
        </Link>
      </Button>

      {/* Header */}
      <div className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5">
        <div>
          <p className="font-mono text-sm text-primary">{data.kodePeminjaman}</p>
          <h1 className="font-jakarta text-headline-md text-primary">Detail Peminjaman</h1>
          <p className="text-sm text-on-surface-variant">Diajukan {formatTanggalLengkap(data.tanggalPengajuan)}</p>
        </div>
        <Badge className={`${status.kelas} px-3 py-1 text-sm`}>{status.label}</Badge>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Kolom utama */}
        <div className="space-y-5 lg:col-span-2">
          {/* Info peminjam */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserIcon className="h-4 w-4" /> Data Peminjam
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <Info label="Nama" nilai={data.peminjam?.nama} />
              <Info label="NIP" nilai={data.peminjam?.nip} />
              <Info label="Jabatan" nilai={data.peminjam?.jabatan} />
              <Info label="Unit Kerja" nilai={data.peminjam?.unitKerja} />
            </CardContent>
          </Card>

          {/* Detail peminjaman */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4" /> Rincian Peminjaman
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <Info label="Rencana Pinjam" nilai={formatTanggalLengkap(data.tanggalPinjamRencana)} />
                <Info
                  label="Rencana Kembali"
                  nilai={data.tanggalKembaliRencana ? formatTanggalLengkap(data.tanggalKembaliRencana) : 'Tanpa batas waktu'}
                />
                {data.tanggalKembaliAktual && (
                  <Info label="Dikembalikan Pada" nilai={formatTanggalLengkap(data.tanggalKembaliAktual)} />
                )}
              </div>
              {data.alasanPeminjaman && (
                <div>
                  <p className="font-medium text-foreground">Alasan Peminjaman</p>
                  <p className="mt-1 text-muted-foreground">{data.alasanPeminjaman}</p>
                </div>
              )}

              {/* Daftar barang */}
              <div>
                <p className="mb-2 font-medium text-foreground">Barang Dipinjam</p>
                <div className="space-y-2">
                  {data.detail?.map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                      <div>
                        <p className="font-medium text-foreground">{d.barang?.nama}</p>
                        <p className="text-xs text-muted-foreground">
                          Merk: <span className="font-medium text-foreground">{d.barang?.merk || '-'}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {d.barang?.kodeBarang} • {d.barang ? JENIS_BARANG[d.barang.jenis] : ''}
                        </p>
                      </div>
                      <Badge className="border-primary/20 bg-primary/10 text-primary">{d.jumlahPinjam} unit</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {data.catatanAdmin && (
                <div className="rounded-lg bg-amber-50 p-3">
                  <p className="font-medium text-amber-900">Catatan Admin</p>
                  <p className="mt-1 text-amber-800">{data.catatanAdmin}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Surat Pernyataan */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" /> Surat Pernyataan
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {data.dokumenUrl ? (
                <Button asChild variant="outline">
                  <a href={data.dokumenUrl} target="_blank" rel="noreferrer">
                    <FileText className="h-4 w-4" /> Lihat Surat Pernyataan
                  </a>
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">Surat pernyataan belum tersedia.</p>
              )}
              {data.dokumenStempelUrl && (
                <Button asChild variant="sukses">
                  <a href={data.dokumenStempelUrl} target="_blank" rel="noreferrer">
                    <Download className="h-4 w-4" /> Unduh Surat Berstempel
                  </a>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar aksi */}
        <div className="space-y-5">
          {/* Tindakan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tindakan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.status === 'MENUNGGU' && (
                <>
                  <Button variant="sukses" className="w-full" onClick={() => setAksi('setujui')}>
                    <Check className="h-4 w-4" /> Setujui (ACC)
                  </Button>
                  <Button variant="destructive" className="w-full" onClick={() => setAksi('tolak')}>
                    <X className="h-4 w-4" /> Tolak
                  </Button>
                </>
              )}

              {data.status === 'DISETUJUI' && (
                <Button className="w-full" onClick={() => setAksi('serahkan')}>
                  <PackageCheck className="h-4 w-4" /> Tandai Barang Diserahkan
                </Button>
              )}

              {bisaStempel && (
                <Button variant="outline" className="w-full" onClick={stempel} disabled={sedangStempel}>
                  {sedangStempel ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stamp className="h-4 w-4" />}
                  {data.dokumenStempelUrl ? 'Stempel Ulang Dokumen' : 'Stempel Dokumen'}
                </Button>
              )}

              {bisaKembalikan && (
                <Button variant="secondary" className="w-full" onClick={() => setAksi('kembalikan')}>
                  <Undo2 className="h-4 w-4" /> Konfirmasi Pengembalian
                </Button>
              )}

              {(data.status === 'DIKEMBALIKAN' || data.status === 'DITOLAK') && (
                <p className="text-center text-sm text-muted-foreground">Tidak ada tindakan yang tersedia.</p>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status Peminjaman</CardTitle>
            </CardHeader>
            <CardContent>
              <TimelineStatus peminjaman={data} />
            </CardContent>
          </Card>

          {/* QR Code */}
          {data.qrCodeUrl && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">QR Code</CardTitle>
              </CardHeader>
              <CardContent>
                <TampilQR qrCodeUrl={data.qrCodeUrl} kodePeminjaman={data.kodePeminjaman} namaPeminjam={data.peminjam?.nama} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Dialog konfirmasi aksi */}
      <KonfirmasiDialog
        terbuka={aksi !== null}
        onUbahTerbuka={(o) => {
          if (!o) {
            setAksi(null);
            setCatatan('');
          }
        }}
        judul={
          aksi === 'setujui'
            ? 'Setujui Peminjaman'
            : aksi === 'tolak'
            ? 'Tolak Peminjaman'
            : aksi === 'serahkan'
            ? 'Serahkan Barang'
            : 'Konfirmasi Pengembalian'
        }
        deskripsi={
          aksi === 'setujui'
            ? 'Stok barang akan berkurang otomatis dan QR Code akan dibuat.'
            : aksi === 'tolak'
            ? 'Mohon isi alasan penolakan. Peminjam akan melihat catatan ini.'
            : aksi === 'serahkan'
            ? 'Tandai bahwa barang telah diserahkan kepada peminjam.'
            : 'Stok barang akan dikembalikan otomatis ke sistem.'
        }
        teksKonfirmasi={aksi === 'tolak' ? 'Ya, Tolak' : 'Ya, Lanjutkan'}
        variantKonfirmasi={aksi === 'tolak' ? 'destructive' : 'sukses'}
        sedangProses={proses}
        onKonfirmasi={jalankanAksi}
      >
        {(aksi === 'setujui' || aksi === 'tolak') && (
          <div>
            <Label htmlFor="catatan">
              Catatan {aksi === 'tolak' ? '(wajib)' : '(opsional)'}
            </Label>
            <Textarea
              id="catatan"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder={aksi === 'tolak' ? 'Alasan penolakan...' : 'Catatan tambahan...'}
              className="mt-1"
            />
          </div>
        )}
      </KonfirmasiDialog>
    </div>
  );
}

function Info({ label, nilai }: { label: string; nilai?: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium text-foreground">{nilai || '-'}</p>
    </div>
  );
}
