// ============================================================
//  Tabel "Daftar Peminjam" (khusus admin).
//  Mengikuti pola TabelPeminjaman: pilihan baris (checkbox) untuk
//  hapus massal + tombol hapus per baris dengan dialog konfirmasi.
// ============================================================

'use client';

import { useEffect, useRef, useState } from 'react';
import { Trash2, ShieldCheck, ShieldMinus } from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KonfirmasiDialog } from '@/components/shared/KonfirmasiDialog';
import type { Role } from '@/types/user.type';

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
  roles: Role[]; //            Peran yang dimiliki akun
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
  // Bila diberikan, aksi promote/demote admin ditampilkan pada kolom Peran.
  onUbahRole?: (id: string, aksi: 'promote' | 'demote') => Promise<void>;
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

export function TabelDaftarPeminjam({ data, nomorAwal = 0, onHapus, terpilih, onUbahTerpilih, onUbahRole }: Props) {
  const [target, setTarget] = useState<PeminjamRow | null>(null);
  const [sedangHapus, setSedangHapus] = useState(false);
  // Target konfirmasi promote/demote admin.
  const [targetRole, setTargetRole] = useState<{ row: PeminjamRow; aksi: 'promote' | 'demote' } | null>(null);
  const [sedangRole, setSedangRole] = useState(false);

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

  const konfirmasiRole = async () => {
    if (!targetRole || !onUbahRole) return;
    setSedangRole(true);
    try {
      await onUbahRole(targetRole.row.id, targetRole.aksi);
      setTargetRole(null);
    } catch {
      // Error ditampilkan via toast oleh parent; dialog dibiarkan terbuka.
    } finally {
      setSedangRole(false);
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

  const tampilPeran = !!onUbahRole;
  // checkbox + (#, nama, nip, jabatan, email, unit kerja, eselon II/III/IV) + peran + aksi
  const jumlahKolom = (pilihAktif ? 1 : 0) + 9 + (tampilPeran ? 1 : 0) + (onHapus ? 1 : 0);

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
              {tampilPeran && <TableHead>Peran</TableHead>}
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
                  {tampilPeran && (
                    <TableCell>
                      <div className="flex flex-col items-start gap-1.5">
                        <div className="flex flex-wrap gap-1">
                          {(user.roles || []).includes('ADMIN') && (
                            <Badge className="border-primary/20 bg-primary/10 text-primary">Admin</Badge>
                          )}
                          {(user.roles || []).includes('PEMINJAM') && (
                            <Badge className="border-outline-variant bg-surface-container-low text-on-surface-variant">
                              Peminjam
                            </Badge>
                          )}
                        </div>
                        {(user.roles || []).includes('ADMIN') ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 text-xs text-error"
                            onClick={() => setTargetRole({ row: user, aksi: 'demote' })}
                          >
                            <ShieldMinus className="h-3.5 w-3.5" /> Cabut Admin
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 text-xs text-primary"
                            onClick={() => setTargetRole({ row: user, aksi: 'promote' })}
                          >
                            <ShieldCheck className="h-3.5 w-3.5" /> Jadikan Admin
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
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

      {tampilPeran && (
        <KonfirmasiDialog
          terbuka={!!targetRole}
          onUbahTerbuka={(o) => !o && setTargetRole(null)}
          judul={targetRole?.aksi === 'demote' ? 'Cabut Peran Admin' : 'Jadikan Admin'}
          deskripsi={
            targetRole?.aksi === 'demote'
              ? `Cabut peran admin dari "${targetRole?.row.nama ?? ''}"? Ia akan kembali menjadi peminjam dan sesi admin-nya diakhiri. Peran peminjam tetap dipertahankan.`
              : `Jadikan "${targetRole?.row.nama ?? ''}" sebagai admin? Ia akan bisa mengakses fitur admin dan mengelola pengguna lain.`
          }
          teksKonfirmasi={targetRole?.aksi === 'demote' ? 'Ya, Cabut Admin' : 'Ya, Jadikan Admin'}
          variantKonfirmasi={targetRole?.aksi === 'demote' ? 'destructive' : 'default'}
          sedangProses={sedangRole}
          onKonfirmasi={konfirmasiRole}
        />
      )}
    </>
  );
}
