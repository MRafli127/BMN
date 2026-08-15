// ============================================================
//  Kartu "Daftar Pegawai" (khusus admin) — tampilan kartu.
//  Setiap kartu menampilkan field lengkap (Nama, NIP, Jabatan,
//  Email, Unit Kerja, Eselon II/III/IV, Peran) sesuai kolom
//  tabel TabelDaftarPeminjam. Aksi tersedia sesuai konteks:
//  - Checkbox pilihan (untuk hapus massal)
//  - Switch Admin/Peminjam (jika `onUbahRole` diberikan)
//  - Edit, Reset Password, Hapus (sesuai handler parent)
// ============================================================

'use client';

import { useEffect, useRef } from 'react';
import { Trash2, Key, ShieldCheck, User, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn, inisial } from '@/lib/utils';
import { EditPeminjamDialog } from './EditPeminjamDialog';
import type { PeminjamRow } from './TabelDaftarPeminjam';

interface Props {
  data: PeminjamRow[];
  // Checkbox pilihan (untuk hapus massal)
  terpilih?: string[];
  onUbahTerpilih?: (ids: string[]) => void;
  // Aksi per baris — bila tidak diberikan, tombol/switch disembunyikan.
  onHapus?: (id: string) => Promise<void>;
  onUbahRole?: (id: string, aksi: 'promote' | 'demote') => Promise<void>;
  onEdit?: () => void;
  onResetPassword?: (id: string) => Promise<void>;
}

// Checkbox sederhana dengan dukungan indeterminate
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

// Baris field kecil di dalam kartu
function CardField({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-dashed border-gray-100 py-1.5 last:border-b-0">
      <span className="shrink-0 text-xs font-medium text-gray-500">{label}</span>
      <span className="break-words text-right text-xs text-gray-800">
        {value && value.trim() !== '' ? value : <span className="text-gray-400">—</span>}
      </span>
    </div>
  );
}

// Gradient avatar — satu warna biru konsisten untuk semua kartu
const GRADIENT_AVATAR = 'from-blue-500 to-indigo-600';

function pilihGradient(_nama: string): string {
  return GRADIENT_AVATAR;
}

export function KartuDaftarPeminjam({
  data,
  terpilih = [],
  onUbahTerpilih,
  onHapus,
  onUbahRole,
  onEdit,
  onResetPassword,
}: Props) {
  const pilihAktif = !!onUbahTerpilih;
  const set = new Set(terpilih);

  const toggleSatu = (id: string) => {
    if (!onUbahTerpilih) return;
    const baru = new Set(set);
    if (baru.has(id)) baru.delete(id);
    else baru.add(id);
    onUbahTerpilih([...baru]);
  };

  const tampilPeran = !!onUbahRole;

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {data.map((user) => {
        const dipilih = set.has(user.id);
        const isAdmin = (user.roles || []).includes('ADMIN');
        const isPeminjam = (user.roles || []).includes('PEMINJAM');
        const gradient = pilihGradient(user.nama);

        return (
          <div
            key={user.id}
            className={cn(
              'group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevated animate-page-in',
              dipilih && 'ring-2 ring-primary/40'
            )}
            style={{ animationDelay: '40ms' }}
          >
            {/* Aksen gradient tipis di atas kartu */}
            <div className={cn('h-1 w-full bg-gradient-to-r', gradient)} aria-hidden />

            {/* Checkbox pojok kiri atas — bila pilihan massal aktif */}
            {pilihAktif && (
              <div className="absolute right-3 top-3 z-10">
                <Kotak
                  checked={dipilih}
                  onChange={() => toggleSatu(user.id)}
                  label={`Pilih ${user.nama}`}
                />
              </div>
            )}

            {/* Header: Avatar + Nama + NIP + Badge Role */}
            <div className="flex items-start gap-3 p-5 pb-3">
              <div
                className={cn(
                  'grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-sm font-bold text-white shadow-md ring-2 ring-white',
                  gradient
                )}
                aria-hidden
              >
                {inisial(user.nama)}
              </div>
              <div className="min-w-0 flex-1">
                <h3
                  className="truncate font-jakarta text-base font-bold text-gray-900"
                  title={user.nama}
                >
                  {user.nama}
                </h3>
                <p
                  className="mt-0.5 truncate font-mono text-xs text-gray-500"
                  title={user.nip}
                >
                  {user.nip}
                </p>
                {/* Badge role */}
                <div className="mt-2 flex flex-wrap gap-1">
                  {isAdmin ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                      <ShieldCheck className="h-3 w-3" />
                      Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-600">
                      <User className="h-3 w-3" />
                      Peminjam
                    </span>
                  )}
                  {isAdmin && isPeminjam && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                      +Peminjam
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Email — highlight dengan ikon amplop */}
            {user.email && (
              <a
                href={`mailto:${user.email}`}
                className="mx-5 mb-2 flex items-center gap-2 truncate rounded-lg bg-blue-50/60 px-2.5 py-1.5 text-xs text-blue-700 transition-colors hover:bg-blue-100"
                title={user.email}
              >
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{user.email}</span>
              </a>
            )}

            {/* Detail lengkap sesuai kolom tabel */}
            <div className="flex-1 space-y-0.5 px-5 py-2">
              <CardField label="Jabatan" value={user.jabatan} />
              <CardField label="Unit Kerja" value={user.unitKerja} />
              <CardField label="Eselon II" value={user.eselon2} />
              <CardField label="Eselon III" value={user.eselon3} />
              <CardField label="Eselon IV" value={user.eselon4} />
            </div>

            {/* Switch peran (Admin/Peminjam) — bila onUbahRole ada */}
            {tampilPeran && (
              <div className="mx-5 mb-2 space-y-2 rounded-xl bg-surface-container-low p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    Admin
                  </span>
                  <Switch
                    checked={isAdmin}
                    onCheckedChange={() =>
                      onUbahRole?.(user.id, isAdmin ? 'demote' : 'promote')
                    }
                    label={`${isAdmin ? 'Cabut' : 'Jadikan'} admin untuk ${user.nama}`}
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                    <User className="h-3.5 w-3.5" />
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
            )}

            {/* Aksi per baris */}
            <div className="flex items-center justify-end gap-1 border-t border-gray-100 bg-surface-container-low/40 px-4 py-2.5">
              {onEdit && (
                <EditPeminjamDialog peminjam={user} onSelesai={onEdit} variantTampilan="icon" />
              )}
              {onResetPassword && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onResetPassword(user.id)}
                  title={`Reset password ${user.nama}`}
                  aria-label={`Reset password ${user.nama}`}
                  className="hover:bg-blue-100"
                >
                  <Key className="h-4 w-4 text-blue-600" />
                </Button>
              )}
              {onHapus && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onHapus(user.id)}
                  aria-label={`Hapus ${user.nama}`}
                  title={`Hapus ${user.nama}`}
                  className="hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              )}
            </div>
          </div>
        );
      })}

      {data.length === 0 && (
        <div className="col-span-full rounded-xl border bg-white py-8 text-center text-sm text-gray-500">
          Tidak ada data.
        </div>
      )}
    </div>
  );
}