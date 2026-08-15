// ============================================================
//  Tabel "Daftar Pegawai" (khusus admin).
//  Mengikuti pola TabelPeminjaman: pilihan baris (checkbox) untuk
//  hapus massal + tombol hapus per baris dengan dialog konfirmasi.
// ============================================================

'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Trash2, ShieldCheck, User, Key } from 'lucide-react';
import { EditPeminjamDialog } from './EditPeminjamDialog';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { KonfirmasiDialog } from '@/components/shared/KonfirmasiDialog';
import { cn } from '@/lib/utils';
import type { Role } from '@/types/user.type';

// --- Konfigurasi kolom beku (freeze) ---
// Kolom checkbox, "#", Nama, NIP dibekukan di kiri; sisanya (Jabatan, Email,
// Unit Kerja, Eselon II/III/IV, Peran, Aksi) bisa digulir horizontal.
// Lebar dibuat tetap agar offset `left` tiap kolom beku presisi & saling rapat.
const W_CHECK = 44; //   kolom checkbox
const W_NUM = 56; //     kolom nomor "#"
const W_NAMA = 200;
const W_NIP = 160;

// Garis pemisah + bayangan halus di tepi kanan blok beku (kolom NIP)
// sebagai penanda batas area yang dibekukan saat tabel digulir ke kanan.
const SHADOW_BEKU = 'shadow-[1px_0_0_hsl(var(--border)),6px_0_10px_-8px_rgba(2,6,23,0.15)]';

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
function SelTeks({
  nilai,
  className,
  style,
}: {
  nilai: string | null;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <TableCell className={className} style={style}>
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
  // Dipanggil setelah edit berhasil agar parent bisa me-refresh data.
  onEdit?: () => void;
  // Reset password pegawai
  onResetPassword?: (id: string) => Promise<void>;
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

export function TabelDaftarPeminjam({ data, nomorAwal = 0, onHapus, terpilih, onUbahTerpilih, onUbahRole, onEdit, onResetPassword }: Props) {
  const [target, setTarget] = useState<PeminjamRow | null>(null);
  const [sedangHapus, setSedangHapus] = useState(false);
  // Target konfirmasi promote/demote admin.
  const [targetRole, setTargetRole] = useState<{ row: PeminjamRow; aksi: 'promote' | 'demote' } | null>(null);
  const [sedangRole, setSedangRole] = useState(false);
  // Target konfirmasi reset password.
  const [targetReset, setTargetReset] = useState<PeminjamRow | null>(null);
  const [sedangReset, setSedangReset] = useState(false);

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

  const konfirmasiReset = async () => {
    if (!targetReset || !onResetPassword) return;
    setSedangReset(true);
    try {
      await onResetPassword(targetReset.id);
      setTargetReset(null);
    } catch {
      // Error ditampilkan via toast oleh parent; dialog dibiarkan terbuka.
    } finally {
      setSedangReset(false);
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
  const jumlahKolom = (pilihAktif ? 1 : 0) + 9 + (tampilPeran ? 1 : 0) + 1; // +1 = kolom aksi

  // Offset kiri kumulatif tiap kolom beku. Kolom checkbox (bila ada) menempel
  // di 0; kolom "#" mengikuti selebar checkbox, dst. Bila checkbox tidak
  // ditampilkan, "#" ikut mundur ke 0 sehingga blok beku tetap rapat.
  const leftNum = pilihAktif ? W_CHECK : 0;
  const leftNama = leftNum + W_NUM;
  const leftNip = leftNama + W_NAMA;

  return (
    <>
      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {pilihAktif && (
                <TableHead
                  className="sticky z-20 bg-muted"
                  style={{ left: 0, width: W_CHECK, minWidth: W_CHECK, maxWidth: W_CHECK }}
                >
                  <Kotak
                    checked={semuaTerpilih}
                    indeterminate={sebagianTerpilih}
                    onChange={toggleSemua}
                    label="Pilih semua di halaman ini"
                  />
                </TableHead>
              )}
              <TableHead
                className="sticky z-20 bg-muted"
                style={{ left: leftNum, width: W_NUM, minWidth: W_NUM, maxWidth: W_NUM }}
              >
                #
              </TableHead>
              <TableHead
                className="sticky z-20 bg-muted"
                style={{ left: leftNama, width: W_NAMA, minWidth: W_NAMA, maxWidth: W_NAMA }}
              >
                Nama
              </TableHead>
              <TableHead
                className={cn('sticky z-20 bg-muted', SHADOW_BEKU)}
                style={{ left: leftNip, width: W_NIP, minWidth: W_NIP, maxWidth: W_NIP }}
              >
                NIP
              </TableHead>
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
              // Latar OPAQUE untuk sel beku agar sel yang tergulir di baliknya
              // tidak menembus. Selaras dgn status baris (terpilih / hover).
              const bgBeku = dipilih ? 'bg-surface-container-low' : 'bg-card group-hover:bg-muted';
              return (
                <TableRow key={user.id} className={cn('group', dipilih && 'bg-primary/5')}>
                  {pilihAktif && (
                    <TableCell
                      className={cn('sticky z-10', bgBeku)}
                      style={{ left: 0, width: W_CHECK, minWidth: W_CHECK, maxWidth: W_CHECK }}
                    >
                      <Kotak checked={dipilih} onChange={() => toggleSatu(user.id)} label={`Pilih ${user.nama}`} />
                    </TableCell>
                  )}
                  <TableCell
                    className={cn('sticky z-10 text-muted-foreground', bgBeku)}
                    style={{ left: leftNum, width: W_NUM, minWidth: W_NUM, maxWidth: W_NUM }}
                  >
                    {nomorAwal + index + 1}
                  </TableCell>
                  <TableCell
                    className={cn('sticky z-10 font-medium text-on-surface', bgBeku)}
                    style={{ left: leftNama, width: W_NAMA, minWidth: W_NAMA, maxWidth: W_NAMA }}
                  >
                    {user.nama}
                  </TableCell>
                  <TableCell
                    className={cn('sticky z-10 font-mono text-sm text-primary', bgBeku, SHADOW_BEKU)}
                    style={{ left: leftNip, width: W_NIP, minWidth: W_NIP, maxWidth: W_NIP }}
                  >
                    {user.nip}
                  </TableCell>
                  <SelTeks nilai={user.jabatan} className="text-sm text-on-surface-variant" />
                  <TableCell className="text-sm text-on-surface-variant">{user.email}</TableCell>
                  <SelTeks nilai={user.unitKerja} className="text-sm text-on-surface-variant" />
                  <SelTeks nilai={user.eselon2} className="text-sm text-on-surface-variant" />
                  <SelTeks nilai={user.eselon3} className="text-sm text-on-surface-variant" />
                  <SelTeks nilai={user.eselon4} className="text-sm text-on-surface-variant" />
                  {tampilPeran && (
                    <TableCell>
                      {(() => {
                        const isAdmin = (user.roles || []).includes('ADMIN');
                        const isPeminjam = (user.roles || []).includes('PEMINJAM');
                        return (
                          <div className="flex min-w-[150px] flex-col gap-2">
                            {/* Admin — dapat diaktifkan/dinonaktifkan (via konfirmasi) */}
                            <div className="flex items-center justify-between gap-3">
                              <span className="flex items-center gap-1.5 text-sm text-on-surface">
                                <ShieldCheck className="h-4 w-4 text-primary" />
                                Admin
                              </span>
                              <Switch
                                checked={isAdmin}
                                onCheckedChange={() =>
                                  setTargetRole({ row: user, aksi: isAdmin ? 'demote' : 'promote' })
                                }
                                label={`${isAdmin ? 'Cabut' : 'Jadikan'} admin untuk ${user.nama}`}
                              />
                            </div>
                            {/* Peminjam — peran dasar, tidak dapat dilepas */}
                            <div className="flex items-center justify-between gap-3">
                              <span className="flex items-center gap-1.5 text-sm text-on-surface-variant">
                                <User className="h-4 w-4" />
                                Peminjam
                              </span>
                              <Switch
                                checked={isPeminjam}
                                disabled
                                label="Peran dasar peminjam"
                                title="Peran dasar peminjam tidak dapat dilepas."
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </TableCell>
                  )}
                  {/* Tombol Aksi: Edit, Reset Password, Hapus */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {onEdit && <EditPeminjamDialog peminjam={user} onSelesai={onEdit} />}
                      {onResetPassword && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setTargetReset(user)}
                          title={`Reset password ${user.nama}`}
                        >
                          <Key className="h-4 w-4 text-blue-600" />
                        </Button>
                      )}
                      {onHapus && (
                        <Button variant="destructive" size="icon" onClick={() => setTarget(user)} aria-label={`Hapus ${user.nama}`}>
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

      {onResetPassword && (
        <KonfirmasiDialog
          terbuka={!!targetReset}
          onUbahTerbuka={(o) => !o && setTargetReset(null)}
          judul="Reset Password"
          deskripsi={`Reset password untuk "${targetReset?.nama ?? ''}"? Password akan direset ke: BMN@Reset123`}
          teksKonfirmasi="Ya, Reset"
          sedangProses={sedangReset}
          onKonfirmasi={konfirmasiReset}
        />
      )}
    </>
  );
}
