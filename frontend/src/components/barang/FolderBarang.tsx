// ============================================================
//  Daftar barang admin dalam bentuk folder per merk.
//  Setiap merk yang sama menjadi satu folder; saat dibuka,
//  menampilkan tiap unit beserta kode barang dan NUP-nya.
// ============================================================

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Folder, FolderOpen, ChevronDown, Eye, Trash2, Package } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { KonfirmasiDialog } from '@/components/shared/KonfirmasiDialog';
import { cn, urlFile } from '@/lib/utils';
import { JENIS_BARANG, KONDISI_BARANG } from '@/constants/status';
import { RUTE } from '@/constants/routes';
import type { Barang } from '@/types/barang.type';

export interface GrupMerk {
  merk: string; // nama folder (merk), atau "Tanpa Merk" bila kosong
  items: Barang[];
  totalUnit: number;
  totalStok: number;
  totalTersedia: number;
}

// Kelompokkan daftar barang menjadi folder berdasarkan merk yang sama.
// Perbedaan huruf besar/kecil dan spasi berlebih diabaikan agar merk yang
// sama (mis. "Hp Probook 430 G7" vs "HP Probook 430 G7") tetap satu folder.
export function kelompokkanPerMerk(data: Barang[]): GrupMerk[] {
  const peta = new Map<string, { items: Barang[]; jumlahLabel: Map<string, number> }>();

  for (const barang of data) {
    const asli = barang.merk?.trim() || 'Tanpa Merk';
    const kunci = asli.toLowerCase().replace(/\s+/g, ' '); // kunci ternormalisasi
    let grup = peta.get(kunci);
    if (!grup) {
      grup = { items: [], jumlahLabel: new Map() };
      peta.set(kunci, grup);
    }
    grup.items.push(barang);
    grup.jumlahLabel.set(asli, (grup.jumlahLabel.get(asli) || 0) + 1);
  }

  return Array.from(peta.values(), ({ items, jumlahLabel }) => {
    // Pakai variasi penulisan merk yang paling sering muncul sebagai nama folder.
    let merk = 'Tanpa Merk';
    let terbanyak = -1;
    for (const [label, jumlah] of jumlahLabel) {
      if (jumlah > terbanyak) {
        terbanyak = jumlah;
        merk = label;
      }
    }
    return {
      merk,
      items,
      totalUnit: items.length,
      totalStok: items.reduce((s, i) => s + i.jumlahTotal, 0),
      totalTersedia: items.reduce((s, i) => s + i.jumlahTersedia, 0),
    };
  }).sort((a, b) => a.merk.localeCompare(b.merk, 'id', { sensitivity: 'base' }));
}

interface Props {
  grup: GrupMerk[];
  onHapus: (id: string) => Promise<void>;
}

export function FolderBarang({ grup, onHapus }: Props) {
  const [terbuka, setTerbuka] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState<Barang | null>(null);
  const [sedangHapus, setSedangHapus] = useState(false);

  const toggle = (merk: string) =>
    setTerbuka((lama) => {
      const baru = new Set(lama);
      if (baru.has(merk)) baru.delete(merk);
      else baru.add(merk);
      return baru;
    });

  // Buka/tutup hanya folder yang sedang tampil; status folder di halaman lain dipertahankan.
  const semuaTerbuka = grup.length > 0 && grup.every((g) => terbuka.has(g.merk));
  const bukaTutupSemua = () =>
    setTerbuka((lama) => {
      const baru = new Set(lama);
      for (const g of grup) {
        if (semuaTerbuka) baru.delete(g.merk);
        else baru.add(g.merk);
      }
      return baru;
    });

  const konfirmasiHapus = async () => {
    if (!target) return;
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

  return (
    <>
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={bukaTutupSemua}>
          {semuaTerbuka ? 'Tutup semua folder' : 'Buka semua folder'}
        </Button>
      </div>

      <div className="space-y-3">
        {grup.map((g) => {
          const aktif = terbuka.has(g.merk);
          return (
            <div
              key={g.merk}
              className={cn(
                'overflow-hidden rounded-xl border bg-card transition-colors',
                aktif && 'border-blue-400 ring-1 ring-blue-400'
              )}
            >
              {/* Header folder */}
              <button
                type="button"
                onClick={() => toggle(g.merk)}
                aria-expanded={aktif}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                  aktif ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-muted/40'
                )}
              >
                <span className={aktif ? 'text-blue-600' : 'text-primary'}>
                  {aktif ? <FolderOpen className="h-5 w-5" /> : <Folder className="h-5 w-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">{g.merk}</p>
                  <p className="text-xs text-muted-foreground">
                    {g.totalUnit} unit • {g.totalTersedia} tersedia / {g.totalStok}
                  </p>
                </div>
                <Badge className="border-primary/20 bg-primary/10 text-primary">{g.totalUnit} unit</Badge>
                <ChevronDown
                  className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', aktif && 'rotate-180')}
                />
              </button>

              {/* Isi folder: daftar unit dengan kode & NUP.
                  Area gulir sendiri agar isi folder bisa di-scroll terpisah dari halaman. */}
              {aktif && (
                <div className="max-h-[420px] overflow-y-auto border-t">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-14">Foto</TableHead>
                        <TableHead>Kode / Nama</TableHead>
                        <TableHead>NUP</TableHead>
                        <TableHead>Jenis</TableHead>
                        <TableHead>Kondisi</TableHead>
                        <TableHead className="text-center">Stok</TableHead>
                        <TableHead>Lokasi</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {g.items.map((barang) => {
                        const kondisi = KONDISI_BARANG[barang.kondisi];
                        return (
                          <TableRow key={barang.id}>
                            <TableCell>
                              <div className="h-10 w-10 overflow-hidden rounded-md bg-muted">
                                {barang.fotoUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={urlFile(barang.fotoUrl)} alt={barang.nama} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                    <Package className="h-5 w-5" />
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium text-foreground">{barang.nama}</p>
                              <p className="font-mono text-xs break-all text-muted-foreground">{barang.kodeBarang}</p>
                            </TableCell>
                            <TableCell className="font-mono text-sm text-muted-foreground">{barang.nup || '-'}</TableCell>
                            <TableCell>
                              <Badge className="border-primary/20 bg-primary/10 text-primary">{JENIS_BARANG[barang.jenis]}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={kondisi.kelas}>{kondisi.label}</Badge>
                            </TableCell>
                            <TableCell className="text-center font-medium">
                              <span className={barang.jumlahTersedia > 0 ? 'text-green-700' : 'text-red-600'}>
                                {barang.jumlahTersedia}
                              </span>
                              <span className="text-muted-foreground"> / {barang.jumlahTotal}</span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{barang.lokasiPenyimpanan || '-'}</TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1.5">
                                <Button asChild variant="outline" size="sm">
                                  <Link href={RUTE.adminBarangDetail(barang.id)}>
                                    <Eye className="h-4 w-4" /> Detail
                                  </Link>
                                </Button>
                                <Button variant="destructive" size="icon" onClick={() => setTarget(barang)} aria-label="Hapus">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <KonfirmasiDialog
        terbuka={!!target}
        onUbahTerbuka={(o) => !o && setTarget(null)}
        judul="Hapus Barang"
        deskripsi={`Apakah Anda yakin ingin menghapus "${target?.nama}"? Tindakan ini tidak dapat dibatalkan.`}
        teksKonfirmasi="Ya, Hapus"
        variantKonfirmasi="destructive"
        sedangProses={sedangHapus}
        onKonfirmasi={konfirmasiHapus}
      />
    </>
  );
}
