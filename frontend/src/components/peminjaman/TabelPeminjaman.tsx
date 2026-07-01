// ============================================================
//  Tabel daftar peminjaman (dipakai admin & peminjam).
//  Mendukung pilihan baris (checkbox) untuk hapus massal — aktif
//  hanya bila prop onUbahTerpilih diberikan (khusus admin).
// ============================================================

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Eye, Trash2 } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KonfirmasiDialog } from '@/components/shared/KonfirmasiDialog';
import { formatTanggal } from '@/lib/utils';
import { STATUS_PEMINJAMAN } from '@/constants/status';
import type { Peminjaman } from '@/types/peminjaman.type';

interface Props {
  data: Peminjaman[];
  hrefDetail: (id: string) => string;
  tampilkanPeminjam?: boolean;
  // Bila true, kolom "Merk" barang yang dipinjam ditampilkan (khusus admin).
  tampilkanMerk?: boolean;
  // Bila diberikan, tombol hapus per baris ditampilkan (khusus admin).
  onHapus?: (id: string) => Promise<void>;
  // Bila diberikan, kolom checkbox pilihan ditampilkan (untuk hapus massal).
  terpilih?: string[];
  onUbahTerpilih?: (ids: string[]) => void;
}

// Checkbox native bergaya, mendukung kondisi indeterminate (sebagian terpilih).
function Kotak({
  checked,
  indeterminate,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate && !checked;
  }, [indeterminate, checked]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={label}
      className="h-4 w-4 cursor-pointer rounded border-outline-variant accent-primary"
    />
  );
}

export function TabelPeminjaman({
  data,
  hrefDetail,
  tampilkanPeminjam,
  tampilkanMerk,
  onHapus,
  terpilih,
  onUbahTerpilih,
}: Props) {
  const [target, setTarget] = useState<Peminjaman | null>(null);
  const [sedangHapus, setSedangHapus] = useState(false);

  const konfirmasiHapus = async () => {
    if (!target || !onHapus) return;
    setSedangHapus(true);
    try {
      await onHapus(target.id);
      setTarget(null);
    } catch {
      // Error sudah ditampilkan via toast oleh parent; dialog dibiarkan terbuka.
    } finally {
      setSedangHapus(false);
    }
  };

  // --- Logika pilihan (checkbox) ---
  const pilihAktif = !!onUbahTerpilih;
  const set = new Set(terpilih ?? []);
  const idsHalaman = data.map((p) => p.id);
  const semuaTerpilih = data.length > 0 && idsHalaman.every((id) => set.has(id));
  const sebagianTerpilih = idsHalaman.some((id) => set.has(id));

  const toggleSatu = (id: string) => {
    if (!onUbahTerpilih) return;
    const baru = new Set(set);
    if (baru.has(id)) baru.delete(id);
    else baru.add(id);
    onUbahTerpilih([...baru]);
  };

  const toggleSemua = () => {
    if (!onUbahTerpilih) return;
    if (semuaTerpilih) {
      onUbahTerpilih((terpilih ?? []).filter((id) => !idsHalaman.includes(id)));
    } else {
      const baru = new Set(terpilih ?? []);
      idsHalaman.forEach((id) => baru.add(id));
      onUbahTerpilih([...baru]);
    }
  };

  const jumlahKolom =
    (pilihAktif ? 1 : 0) + (tampilkanPeminjam ? 1 : 0) + (tampilkanMerk ? 1 : 0) + 6; // kode, barang, 2 tanggal, status, aksi

  return (
    <>
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {pilihAktif && (
                <TableHead className="w-10">
                  <Kotak
                    checked={semuaTerpilih}
                    indeterminate={sebagianTerpilih}
                    onChange={toggleSemua}
                    label="Pilih semua di halaman ini"
                  />
                </TableHead>
              )}
              <TableHead>Kode</TableHead>
              {tampilkanPeminjam && <TableHead>Peminjam</TableHead>}
              <TableHead>Barang</TableHead>
              {tampilkanMerk && <TableHead>Merk</TableHead>}
              <TableHead>Rencana Pinjam</TableHead>
              <TableHead>Rencana Kembali</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((p) => {
              const status = STATUS_PEMINJAMAN[p.status];
              const dipilih = set.has(p.id);
              const ringkasBarang =
                p.detail && p.detail.length > 0
                  ? `${p.detail[0].barang?.nama ?? 'Barang'}${p.detail.length > 1 ? ` +${p.detail.length - 1} lainnya` : ''}`
                  : '-';
              const merkBarang = p.detail?.[0]?.barang?.merk || '-';
              return (
                <TableRow key={p.id} className={dipilih ? 'bg-primary/5' : undefined}>
                  {pilihAktif && (
                    <TableCell>
                      <Kotak checked={dipilih} onChange={() => toggleSatu(p.id)} label={`Pilih ${p.kodePeminjaman}`} />
                    </TableCell>
                  )}
                  <TableCell className="font-mono text-sm font-medium text-primary">{p.kodePeminjaman}</TableCell>
                  {tampilkanPeminjam && (
                    <TableCell>
                      <p className="font-medium text-foreground">{p.peminjam?.nama ?? '-'}</p>
                      <p className="text-xs text-muted-foreground">{p.peminjam?.eselon3 ?? ''}</p>
                    </TableCell>
                  )}
                  <TableCell className="max-w-[200px] truncate text-sm">{ringkasBarang}</TableCell>
                  {tampilkanMerk && (
                    <TableCell className="text-sm text-muted-foreground">{merkBarang}</TableCell>
                  )}
                  <TableCell className="text-sm">{formatTanggal(p.tanggalPinjamRencana)}</TableCell>
                  <TableCell className="text-sm">{formatTanggal(p.tanggalKembaliRencana)}</TableCell>
                  <TableCell>
                    <Badge className={status.kelas}>{status.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <Button asChild variant="outline" size="sm">
                        <Link href={hrefDetail(p.id)}>
                          <Eye className="h-4 w-4" /> Detail
                        </Link>
                      </Button>
                      {onHapus && (
                        <Button variant="destructive" size="icon" onClick={() => setTarget(p)} aria-label="Hapus">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={jumlahKolom} className="py-6 text-center text-sm text-muted-foreground">
                  Tidak ada data.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {onHapus && (
        <KonfirmasiDialog
          terbuka={!!target}
          onUbahTerbuka={(o) => !o && setTarget(null)}
          judul="Hapus Peminjaman"
          deskripsi={`Hapus data peminjaman "${target ? kodePeminjamanRingkas(target) : ''}"? Jika barang masih dipinjam, stok akan dikembalikan otomatis. Tindakan ini tidak dapat dibatalkan.`}
          teksKonfirmasi="Ya, Hapus"
          variantKonfirmasi="destructive"
          sedangProses={sedangHapus}
          onKonfirmasi={konfirmasiHapus}
        />
      )}
    </>
  );
}

// Label ringkas untuk dialog konfirmasi: kode + nama peminjam (bila ada).
function kodePeminjamanRingkas(p: Peminjaman): string {
  return p.peminjam?.nama ? `${p.kodePeminjaman} — ${p.peminjam.nama}` : p.kodePeminjaman;
}
