// ============================================================
//  Form pengajuan peminjaman.
//   - Pilih satu atau beberapa barang + jumlah.
//   - Isi tanggal pinjam (wajib) & rencana kembali (opsional).
// ============================================================

'use client';

import { useMemo, useState } from 'react';
import { Search, Plus, Minus, Trash2, Loader2, Package } from 'lucide-react';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { notify } from '@/components/ui/toast';
import { TandaTanganInput } from '@/components/peminjaman/TandaTanganInput';
import { urlFile, ambilPesanError } from '@/lib/utils';
import type { Barang } from '@/types/barang.type';
import type { DataPengajuan } from '@/types/peminjaman.type';

interface Props {
  daftarBarang: Barang[];
  onAjukan: (data: DataPengajuan) => Promise<void>;
  praPilihId?: string;
}

export function FormPeminjaman({ daftarBarang, onAjukan, praPilihId }: Props) {
  // Map barangId -> jumlah dipilih
  const [terpilih, setTerpilih] = useState<Record<string, number>>(
    praPilihId ? { [praPilihId]: 1 } : {}
  );
  const [cari, setCari] = useState('');
  const [tglPinjam, setTglPinjam] = useState('');
  const [tglKembali, setTglKembali] = useState('');
  const [tandaTangan, setTandaTangan] = useState<string | null>(null);
  const [sedangKirim, setSedangKirim] = useState(false);

  const petaBarang = useMemo(() => {
    const m: Record<string, Barang> = {};
    daftarBarang.forEach((b) => (m[b.id] = b));
    return m;
  }, [daftarBarang]);

  const hasilCari = useMemo(() => {
    const kata = cari.toLowerCase();
    return daftarBarang.filter(
      (b) => b.nama.toLowerCase().includes(kata) || b.kodeBarang.toLowerCase().includes(kata)
    );
  }, [daftarBarang, cari]);

  const idTerpilih = Object.keys(terpilih);

  // Hanya boleh 1 barang per pengajuan — memilih barang baru
  // menggantikan pilihan sebelumnya.
  const tambah = (barang: Barang) => {
    if (barang.jumlahTersedia < 1) {
      notify.gagal('Stok barang ini sedang habis.');
      return;
    }
    setTerpilih({ [barang.id]: 1 });
  };

  const ubahJumlah = (barangId: string, delta: number) => {
    setTerpilih((p) => {
      const maks = petaBarang[barangId]?.jumlahTersedia ?? 1;
      const baru = Math.min(maks, Math.max(1, (p[barangId] || 1) + delta));
      return { ...p, [barangId]: baru };
    });
  };

  const hapus = (barangId: string) => {
    setTerpilih((p) => {
      const salin = { ...p };
      delete salin[barangId];
      return salin;
    });
  };

  const kirim = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validasi sisi klien
    if (idTerpilih.length === 0) return notify.gagal('Pilih minimal satu barang untuk dipinjam.');
    if (!tglPinjam) return notify.gagal('Tanggal pinjam wajib diisi.');
    if (tglKembali && new Date(tglKembali) <= new Date(tglPinjam))
      return notify.gagal('Tanggal kembali harus setelah tanggal pinjam.');
    if (!tandaTangan) return notify.gagal('Tanda tangan wajib diisi.');

    const data: DataPengajuan = {
      tanggalPinjamRencana: tglPinjam,
      tanggalKembaliRencana: tglKembali || undefined,
      items: idTerpilih.map((barangId) => ({ barangId, jumlahPinjam: terpilih[barangId] })),
      tandaTangan,
    };

    setSedangKirim(true);
    try {
      await onAjukan(data);
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal mengirim pengajuan.'));
    } finally {
      setSedangKirim(false);
    }
  };

  return (
    <form onSubmit={kirim} className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Kolom kiri: pilih barang */}
      <div className="space-y-3">
        <Label>1. Pilih Barang (maksimal 1 barang per pengajuan)</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari barang berdasarkan nama atau kode..."
            className="pl-9"
          />
        </div>

        <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border p-2">
          {hasilCari.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">Barang tidak ditemukan.</p>
          )}
          {hasilCari.map((barang) => {
            const dipilih = barang.id in terpilih;
            const habis = barang.jumlahTersedia < 1;
            return (
              <div
                key={barang.id}
                className="flex items-center gap-3 rounded-md border bg-card p-2"
              >
                <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                  {barang.fotoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={urlFile(barang.fotoUrl)} alt={barang.nama} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Package className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{barang.nama}</p>
                  {barang.merk && <p className="truncate text-xs text-muted-foreground">Merk: {barang.merk}</p>}
                  <p className="text-xs text-muted-foreground">Tersedia: {barang.jumlahTersedia}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={dipilih ? 'secondary' : 'outline'}
                  disabled={habis || dipilih}
                  onClick={() => tambah(barang)}
                >
                  {dipilih ? 'Dipilih' : habis ? 'Habis' : 'Tambah'}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Kolom kanan: detail pengajuan */}
      <div className="space-y-4">
        {/* Barang terpilih */}
        <div>
          <Label>Barang Dipilih ({idTerpilih.length})</Label>
          <Card className="mt-1">
            <CardContent className="space-y-2 p-3">
              {idTerpilih.length === 0 && (
                <p className="py-3 text-center text-sm text-muted-foreground">Belum ada barang dipilih.</p>
              )}
              {idTerpilih.map((id) => {
                const barang = petaBarang[id];
                if (!barang) return null;
                return (
                  <div key={id} className="flex items-center gap-2 rounded-md bg-muted/50 p-2">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{barang.nama}</span>
                    <div className="flex items-center gap-1">
                      <Button type="button" size="icon" variant="outline" className="h-7 w-7" onClick={() => ubahJumlah(id, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-semibold">{terpilih[id]}</span>
                      <Button type="button" size="icon" variant="outline" className="h-7 w-7" onClick={() => ubahJumlah(id, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-red-600" onClick={() => hapus(id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Tanggal */}
        <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
          <div>
            <Label htmlFor="tglPinjam">2. Tanggal Pinjam</Label>
            <Input id="tglPinjam" type="date" value={tglPinjam} onChange={(e) => setTglPinjam(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="tglKembali">Rencana Kembali (opsional)</Label>
            <Input id="tglKembali" type="date" value={tglKembali} onChange={(e) => setTglKembali(e.target.value)} className="mt-1" />
            <p className="mt-1 text-xs text-muted-foreground">Kosongkan bila peminjaman tanpa batas waktu.</p>
          </div>
        </div>

        {/* Tanda tangan untuk surat pernyataan */}
        <div className="rounded-lg border p-3">
          <TandaTanganInput value={tandaTangan} onChange={setTandaTangan} />
          <p className="mt-2 text-xs text-muted-foreground">
            Tanda tangan akan otomatis dimasukkan ke Surat Pernyataan Peminjaman (PDF).
          </p>
        </div>

        <Button type="submit" disabled={sedangKirim} className="w-full">
          {sedangKirim && <Loader2 className="h-4 w-4 animate-spin" />}
          Kirim Pengajuan
        </Button>
      </div>
    </form>
  );
}
