// ============================================================
//  Peminjam — Keranjang & Checkout Peminjaman.
//   - Tinjau barang yang dipilih dari katalog (atur jumlah).
//   - Tentukan tanggal pinjam (wajib) & rencana kembali (opsional).
//   - Ajukan seluruh barang dalam satu pengajuan.
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShoppingCart, Trash2, Plus, Minus, Package, Loader2, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/EmptyState';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { notify } from '@/components/ui/toast';
import { useKeranjangStore } from '@/store/keranjangStore';
import { peminjamanService } from '@/services/peminjaman.service';
import { ambilPesanError, urlFile } from '@/lib/utils';
import { RUTE } from '@/constants/routes';

export default function KeranjangPage() {
  const router = useRouter();
  const items = useKeranjangStore((s) => s.items);
  const ubahJumlah = useKeranjangStore((s) => s.ubahJumlah);
  const hapus = useKeranjangStore((s) => s.hapus);
  const kosongkan = useKeranjangStore((s) => s.kosongkan);

  const [tglPinjam, setTglPinjam] = useState('');
  const [tglKembali, setTglKembali] = useState('');
  const [sedangKirim, setSedangKirim] = useState(false);

  // Hindari hydration mismatch: isi keranjang (persisted) baru dibaca setelah mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const daftar = Object.values(items);

  const ajukan = async () => {
    if (daftar.length === 0) return notify.gagal('Keranjang masih kosong.');
    if (!tglPinjam) return notify.gagal('Tanggal pinjam wajib diisi.');
    if (tglKembali && new Date(tglKembali) <= new Date(tglPinjam))
      return notify.gagal('Tanggal kembali harus setelah tanggal pinjam.');

    setSedangKirim(true);
    try {
      const p = await peminjamanService.create({
        tanggalPinjamRencana: tglPinjam,
        tanggalKembaliRencana: tglKembali || undefined,
        items: daftar.map((it) => ({ barangId: it.barangId, jumlahPinjam: it.jumlah })),
      });
      notify.sukses('Pengajuan peminjaman berhasil dikirim!');
      kosongkan();
      router.push(RUTE.peminjamRiwayatDetail(p.id));
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal mengirim pengajuan.'));
    } finally {
      setSedangKirim(false);
    }
  };

  if (!mounted) return <LoadingSpinner layarPenuh />;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Button asChild variant="ghost" size="sm">
        <Link href={RUTE.peminjamKatalog}>
          <ArrowLeft className="h-4 w-4" /> Kembali ke Katalog
        </Link>
      </Button>

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <ShoppingCart className="h-6 w-6" /> Keranjang Peminjaman
        </h1>
        <p className="text-muted-foreground">Tinjau barang yang dipilih, lalu ajukan dalam satu pengajuan.</p>
      </div>

      {daftar.length === 0 ? (
        <EmptyState
          judul="Keranjang masih kosong"
          deskripsi="Tambahkan barang dari katalog untuk mulai mengajukan peminjaman."
          aksi={
            <Button asChild>
              <Link href={RUTE.peminjamKatalog}>Telusuri Katalog</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Daftar barang */}
          <div className="space-y-3 lg:col-span-2">
            <div className="flex items-center justify-between">
              <Label>Barang Dipilih ({daftar.length})</Label>
              <Button variant="ghost" size="sm" className="text-red-600" onClick={kosongkan}>
                <Trash2 className="h-4 w-4" /> Kosongkan
              </Button>
            </div>

            {daftar.map((it) => (
              <Card key={it.barangId}>
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                    {it.fotoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={urlFile(it.fotoUrl)} alt={it.nama} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                        <Package className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{it.nama}</p>
                    {it.merk && <p className="truncate text-xs text-muted-foreground">Merk: {it.merk}</p>}
                    <p className="truncate font-mono text-xs text-muted-foreground">{it.kodeBarang}</p>
                    <p className="text-xs text-muted-foreground">Tersedia: {it.jumlahTersedia}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button type="button" size="icon" variant="outline" className="h-7 w-7" onClick={() => ubahJumlah(it.barangId, it.jumlah - 1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-semibold">{it.jumlah}</span>
                    <Button type="button" size="icon" variant="outline" className="h-7 w-7" onClick={() => ubahJumlah(it.barangId, it.jumlah + 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => hapus(it.barangId)} aria-label="Hapus">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Ringkasan & checkout */}
          <div>
            <Card className="lg:sticky lg:top-4">
              <CardHeader>
                <CardTitle className="text-base">Detail Pengajuan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="tglPinjam">Tanggal Pinjam</Label>
                  <Input id="tglPinjam" type="date" value={tglPinjam} onChange={(e) => setTglPinjam(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="tglKembali">Rencana Kembali (opsional)</Label>
                  <Input id="tglKembali" type="date" value={tglKembali} onChange={(e) => setTglKembali(e.target.value)} className="mt-1" />
                  <p className="mt-1 text-xs text-muted-foreground">Kosongkan bila peminjaman tanpa batas waktu.</p>
                </div>

                <div className="flex items-center justify-between border-t pt-3 text-sm">
                  <span className="text-muted-foreground">Total jenis barang</span>
                  <span className="font-semibold text-foreground">{daftar.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total unit</span>
                  <span className="font-semibold text-foreground">{daftar.reduce((t, it) => t + it.jumlah, 0)}</span>
                </div>

                <Button className="w-full" disabled={sedangKirim} onClick={ajukan}>
                  {sedangKirim && <Loader2 className="h-4 w-4 animate-spin" />}
                  Ajukan Peminjaman
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
