// ============================================================
//  Tabel "Daftar Peminjam" (khusus admin).
//  Mengikuti pola TabelPeminjaman: pilihan baris (checkbox) untuk
//  hapus massal + tombol hapus per baris dengan dialog konfirmasi.
// ============================================================

'use client';

import { useEffect, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { KonfirmasiDialog } from '@/components/shared/KonfirmasiDialog';

export interface PeminjamRow {
  id: string;
  nama: string;
  nip: string;
  email: string;
  jabatan: string | null; //   Jabatan
  unitKerja: string | null; // Unit Kerja
  eselon2: string | null; //   Eselon II
  eselon3: string | null; //   Eselon III
  eselon4: string | null; //   Eselon IV
}

// Sel teks yang panjang (nama unit/eselon) dipangkas dengan elipsis; teks
// lengkap tampil saat kursor diarahkan (title).
function SelTeks({ nilai, className }: { nilai: string | null; className?: string }) {
  return (
    <TableCell className={className}>
      <span className="block max-w-[16rem] truncate" title={nilai || undefined}>
        {nilai || '-'}
      </span>
    </TableCell>
  );
}

interface Props {
  data: PeminjamRow[];
  // Nomor urut awal untuk kolom "#" — biasanya (halaman - 1) * limit.
  nomorAwal?: number;
  // Bila diberikan, tombol hapus per baris ditampilkan.
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

export function TabelDaftarPeminjam({ data, nomorAwal = 0, onHapus, terpilih, onUbahTerpilih }: Props) {
  const [target, setTarget] = useState<PeminjamRow | null>(null);
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
  const idsHalaman = data.map((u) => u.id);
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

  // checkbox + (#, nama, nip, jabatan, email, unit kerja, eselon II/III/IV) + aksi
  const jumlahKolom = (pilihAktif ? 1 : 0) + 9 + (onHapus ? 1 : 0);

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
              <TableHead className="w-16">#</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>NIP</TableHead>
              <TableHead>Jabatan</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Unit Kerja</TableHead>
              <TableHead>Eselon II</TableHead>
              <TableHead>Eselon III</TableHead>
              <TableHead>Eselon IV</TableHead>
              {onHapus && <TableHead className="w-16 text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((user, index) => {
              const dipilih = set.has(user.id);
              return (
                <TableRow key={user.id} className={dipilih ? 'bg-primary/5' : undefined}>
                  {pilihAktif && (
                    <TableCell>
                      <Kotak checked={dipilih} onChange={() => toggleSatu(user.id)} label={`Pilih ${user.nama}`} />
                    </TableCell>
                  )}
                  <TableCell className="text-muted-foreground">{nomorAwal + index + 1}</TableCell>
                  <TableCell className="font-medium text-on-surface">{user.nama}</TableCell>
                  <TableCell className="font-mono text-sm text-primary">{user.nip}</TableCell>
                  <SelTeks nilai={user.jabatan} className="text-sm text-on-surface-variant" />
                  <TableCell className="text-sm text-on-surface-variant">{user.email}</TableCell>
                  <SelTeks nilai={user.unitKerja} className="text-sm text-on-surface-variant" />
                  <SelTeks nilai={user.eselon2} className="text-sm text-on-surface-variant" />
                  <SelTeks nilai={user.eselon3} className="text-sm text-on-surface-variant" />
                  <SelTeks nilai={user.eselon4} className="text-sm text-on-surface-variant" />
                  {onHapus && (
                    <TableCell className="text-right">
                      <Button variant="destructive" size="icon" onClick={() => setTarget(user)} aria-label={`Hapus ${user.nama}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
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
          judul="Hapus Peminjam"
          deskripsi={`Hapus peminjam "${target?.nama ?? ''}" (NIP ${target?.nip ?? '-'})? Seluruh riwayat peminjamannya ikut terhapus. Peminjam yang masih memiliki peminjaman aktif tidak dapat dihapus. Tindakan ini tidak dapat dibatalkan.`}
          teksKonfirmasi="Ya, Hapus"
          variantKonfirmasi="destructive"
          sedangProses={sedangHapus}
          onKonfirmasi={konfirmasiHapus}
        />
      )}
    </>
  );
}
