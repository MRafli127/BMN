// ============================================================
//  Pengguna Terdaftar — halaman Super Admin untuk lihat semua user.
//  Optimized: useDeferredValue, memo, skeleton loading, card/table toggle
// ============================================================

'use client';

import { useEffect, useState, useCallback, useRef, memo, useDeferredValue } from 'react';
import { Icon } from '@/components/ui/icon';
import { EmptyState } from '@/components/shared/EmptyState';
import { KonfirmasiDialog } from '@/components/shared/KonfirmasiDialog';
import { ResetPasswordDialog } from '@/components/pengguna/ResetPasswordDialog';
import { ResetPasswordAdminDialog } from '@/components/pengguna/ResetPasswordAdminDialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { notify } from '@/components/ui/toast';
import { cn, ambilPesanError, inisial } from '@/lib/utils';
import {
  userManagementService,
  type DataEditPeminjam,
  type UserItem,
} from '@/services/userManagement.service';
import {
  TableSkeleton,
  CardGridSkeleton,
  FilterSkeleton,
} from '@/components/shared/SuperAdminSkeleton';
import { useRouter } from 'next/navigation';
import { RUTE } from '@/constants/routes';

// Gradient avatar ungu konsisten
const GRADIENT_AVATAR = 'from-blue-500 to-indigo-600';

// ============================================================
//  Mini kartu statistik
// ============================================================
interface MiniStatProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  gradient: string;
  ring: string;
  delay?: number;
}
function MiniStat({
  label,
  value,
  icon,
  gradient,
  ring,
  delay = 0,
}: MiniStatProps) {
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border border-white/60 bg-white p-4 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevated animate-page-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-md ring-2',
            gradient,
            ring
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            {label}
          </p>
          <p className="truncate font-jakarta text-2xl font-bold leading-tight text-gray-900">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  Badge Role dengan style gradient
// ============================================================
const BadgeRole = memo(function BadgeRole({ role }: { role: string }) {
  if (role === 'SUPER_ADMIN')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
        Super Admin
      </span>
    );
  if (role === 'ADMIN')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-500 to-blue-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
        Admin
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-600">
      Peminjam
    </span>
  );
});

// ============================================================
//  Field row kecil untuk kartu
// ============================================================
function CardField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-dashed border-gray-100 py-1.5 last:border-b-0">
      <span className="shrink-0 text-xs font-medium text-gray-500">{label}</span>
      <span className="break-words text-right text-xs text-gray-800">
        {value && value.trim() !== '' ? (
          value
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </span>
    </div>
  );
}

// ============================================================
//  Dialog Edit Pengguna (inline, di dalam page)
// ============================================================
function EditUserDialog({
  user,
  onSelesai,
}: {
  user: UserItem;
  onSelesai?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nama: user.nama,
    nip: user.nip,
    jabatan: user.jabatan ?? '',
    email: user.email ?? '',
    unitKerja: user.unitKerja ?? '',
    eselon2: user.eselon2 ?? '',
    eselon3: user.eselon3 ?? '',
    eselon4: user.eselon4 ?? '',
  });
  const [errors, setErrors] = useState<
    Partial<Record<keyof typeof form, string>>
  >({});
  const [menyimpan, setMenyimpan] = useState(false);

  const reset = () => {
    setForm({
      nama: user.nama,
      nip: user.nip,
      jabatan: user.jabatan ?? '',
      email: user.email ?? '',
      unitKerja: user.unitKerja ?? '',
      eselon2: user.eselon2 ?? '',
      eselon3: user.eselon3 ?? '',
      eselon4: user.eselon4 ?? '',
    });
    setErrors({});
    setMenyimpan(false);
  };

  const ubah = (key: keyof typeof form, nilai: string) => {
    setForm((f) => ({ ...f, [key]: nilai }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validasi = (): boolean => {
    const err: Partial<Record<keyof typeof form, string>> = {};
    if (form.nama.trim().length < 3) err.nama = 'Nama minimal 3 karakter.';
    if (form.nip.trim().length < 5) err.nip = 'NIP minimal 5 karakter.';
    if (!form.email.trim()) err.email = 'Email wajib diisi.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()))
      err.email = 'Format email tidak valid.';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const simpan = async () => {
    if (!validasi()) return;
    setMenyimpan(true);
    try {
      const payload: DataEditPeminjam = {
        nama: form.nama.trim(),
        nip: form.nip.trim(),
        email: form.email.trim().toLowerCase(),
        jabatan: form.jabatan?.trim() || undefined,
        unitKerja: form.unitKerja?.trim() || undefined,
        eselon2: form.eselon2?.trim() || undefined,
        eselon3: form.eselon3?.trim() || undefined,
        eselon4: form.eselon4?.trim() || undefined,
      };
      await userManagementService.update(user.id, payload);
      notify.suksess(
        `Profil "${form.nama}" (NIP ${form.nip}) berhasil diperbarui.`
      );
      setOpen(false);
      onSelesai?.();
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal memperbarui profil pengguna.'));
    } finally {
      setMenyimpan(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => e.stopPropagation()}
          title={`Edit ${user.nama}`}
          aria-label={`Edit ${user.nama}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Pengguna</DialogTitle>
          <DialogDescription>
            Perbarui profil &ldquo;{user.nama}&rdquo; (NIP {user.nip}). Kolom
            bertanda <span className="text-error">*</span> wajib diisi.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            simpan();
          }}
        >
          <div className="sm:col-span-2">
            <label htmlFor="eu-nama" className="text-sm font-medium">
              Nama <span className="text-error">*</span>
            </label>
            <Input
              id="eu-nama"
              value={form.nama}
              onChange={(e) => ubah('nama', e.target.value)}
              placeholder="Nama lengkap"
              className="mt-1.5"
              autoComplete="off"
            />
            {errors.nama && (
              <p className="mt-1 text-xs text-error">{errors.nama}</p>
            )}
          </div>
          <div>
            <label htmlFor="eu-nip" className="text-sm font-medium">
              NIP <span className="text-error">*</span>
            </label>
            <Input
              id="eu-nip"
              value={form.nip}
              onChange={(e) => ubah('nip', e.target.value)}
              placeholder="Nomor Induk Pegawai"
              className="mt-1.5"
              inputMode="numeric"
              autoComplete="off"
            />
            {errors.nip && (
              <p className="mt-1 text-xs text-error">{errors.nip}</p>
            )}
          </div>
          <div>
            <label htmlFor="eu-jabatan" className="text-sm font-medium">
              Jabatan
            </label>
            <Input
              id="eu-jabatan"
              value={form.jabatan}
              onChange={(e) => ubah('jabatan', e.target.value)}
              placeholder="Jabatan"
              className="mt-1.5"
              autoComplete="off"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="eu-email" className="text-sm font-medium">
              Email <span className="text-error">*</span>
            </label>
            <Input
              id="eu-email"
              type="email"
              value={form.email}
              onChange={(e) => ubah('email', e.target.value)}
              placeholder="alamat.email@kemenkeu.go.id"
              className="mt-1.5"
              autoComplete="off"
            />
            {errors.email && (
              <p className="mt-1 text-xs text-error">{errors.email}</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="eu-unit" className="text-sm font-medium">
              Unit Kerja
            </label>
            <Input
              id="eu-unit"
              value={form.unitKerja}
              onChange={(e) => ubah('unitKerja', e.target.value)}
              placeholder="Unit kerja"
              className="mt-1.5"
              autoComplete="off"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="eu-eselon2" className="text-sm font-medium">
              Eselon II
            </label>
            <Input
              id="eu-eselon2"
              value={form.eselon2}
              onChange={(e) => ubah('eselon2', e.target.value)}
              placeholder="Unit Eselon II"
              className="mt-1.5"
              autoComplete="off"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="eu-eselon3" className="text-sm font-medium">
              Eselon III
            </label>
            <Input
              id="eu-eselon3"
              value={form.eselon3}
              onChange={(e) => ubah('eselon3', e.target.value)}
              placeholder="Unit Eselon III"
              className="mt-1.5"
              autoComplete="off"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="eu-eselon4" className="text-sm font-medium">
              Eselon IV
            </label>
            <Input
              id="eu-eselon4"
              value={form.eselon4}
              onChange={(e) => ubah('eselon4', e.target.value)}
              placeholder="Unit Eselon IV"
              className="mt-1.5"
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            className="hidden"
            aria-hidden
            tabIndex={-1}
          />
        </form>
        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => setOpen(false)}
            disabled={menyimpan}
          >
            Batal
          </Button>
          <Button type="button" onClick={simpan} disabled={menyimpan}>
            {menyimpan ? 'Menyimpan…' : 'Simpan Perubahan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
//  User Card — persis sama dengan KartuDaftarPeminjam
// ============================================================
function UserCard({
  user,
  onPromote,
  onRevoke,
  onReset,
  onDelete,
  onEdit,
}: {
  user: UserItem;
  onPromote: () => void;
  onRevoke: () => void;
  onReset: () => void;
  onDelete: () => void;
  onEdit?: () => void;
}) {
  const isSuperAdmin = user.roles?.includes('SUPER_ADMIN');
  const isAdmin = user.roles?.includes('ADMIN');
  const isPeminjam = user.roles?.includes('PEMINJAM');

  return (
    <div
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevated animate-page-in"
      style={{ animationDelay: '40ms' }}
    >
      {/* Aksen gradient di atas */}
      <div
        className={cn('h-1 w-full bg-gradient-to-r', GRADIENT_AVATAR)}
        aria-hidden
      />

      {/* Header: Avatar + Nama + NIP + Badge */}
      <div className="flex items-start gap-3 p-5 pb-3">
        <div
          className={cn(
            'grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-sm font-bold text-white shadow-md ring-2 ring-white',
            GRADIENT_AVATAR
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
          {/* Badge roles */}
          <div className="mt-2 flex flex-wrap gap-1">
            {(user.roles || []).map((role) => (
              <BadgeRole key={role} role={role} />
            ))}
            {isAdmin && isPeminjam && !isSuperAdmin && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                +Peminjam
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Email */}
      {user.email && (
        <a
          href={`mailto:${user.email}`}
          className="mx-5 mb-2 flex items-center gap-2 truncate rounded-lg bg-blue-50/60 px-2.5 py-1.5 text-xs text-blue-700 transition-colors hover:bg-blue-100"
          title={user.email}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
          <span className="truncate">{user.email}</span>
        </a>
      )}

      {/* Detail lengkap */}
      <div className="flex-1 space-y-0.5 px-5 py-2">
        <CardField label="Jabatan" value={user.jabatan} />
        <CardField label="Unit Kerja" value={user.unitKerja} />
        <CardField label="Eselon II" value={user.eselon2} />
        <CardField label="Eselon III" value={user.eselon3} />
        <CardField label="Eselon IV" value={user.eselon4} />
      </div>

      {/* Switch peran */}
      {!isSuperAdmin && (
        <div className="mx-5 mb-2 space-y-2 rounded-xl bg-surface-container-low p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
              Admin
            </span>
            <Switch
              checked={isAdmin}
              onCheckedChange={() => (isAdmin ? onRevoke() : onPromote())}
              label={`${isAdmin ? 'Cabut' : 'Jadikan'} admin untuk ${user.nama}`}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
              Peminjam
            </span>
            <Switch checked={isPeminjam} disabled label="Peran dasar peminjam" title="Peran dasar peminjam tidak dapat dilepas." />
          </div>
        </div>
      )}

      {/* Aksi */}
      {isSuperAdmin ? (
        <div className="border-t border-gray-100 pt-3 text-center text-xs text-gray-500">
          Super Admin
        </div>
      ) : (
        <div className="flex items-center justify-end gap-1 border-t border-gray-100 bg-surface-container-low/40 px-4 py-2.5">
          {onEdit && <EditUserDialog user={user} onSelesai={onEdit} />}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onReset();
            }}
            className="hover:bg-blue-100"
            aria-label={`Reset password ${user.nama}`}
            title={`Reset password ${user.nama}`}
          >
            <Icon name="key" style={{ fontSize: 16 }} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="hover:bg-red-100"
            aria-label={`Hapus ${user.nama}`}
            title={`Hapus ${user.nama}`}
          >
            <Icon name="delete" style={{ fontSize: 16 }} />
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================
//  Table Row
// ============================================================
function UserTableRow({
  user,
  onPromote,
  onRevoke,
  onReset,
  onDelete,
}: {
  user: UserItem;
  onPromote: () => void;
  onRevoke: () => void;
  onReset: () => void;
  onDelete: () => void;
}) {
  const isSuperAdmin = user.roles?.includes('SUPER_ADMIN');
  const isAdmin = user.roles?.includes('ADMIN');

  return (
    <TableRow className="transition-colors hover:bg-gray-50">
      <TableCell className="font-medium">{user.nama}</TableCell>
      <TableCell className="font-mono text-sm">{user.nip}</TableCell>
      <TableCell className="text-sm">{user.email}</TableCell>
      <TableCell className="text-sm text-gray-500">{user.jabatan || '-'}</TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {(user.roles || []).map((role) => (
            <BadgeRole key={role} role={role} />
          ))}
        </div>
      </TableCell>
      <TableCell>
        {isSuperAdmin ? (
          <span className="text-xs text-gray-500">Super Admin</span>
        ) : (
          <div className="flex items-center gap-2">
            {!isAdmin ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onPromote}
                className="text-xs transition-transform active:scale-95"
              >
                <Icon name="arrow_upward" style={{ fontSize: 14 }} />
                Promosi
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={onRevoke}
                className="text-xs text-orange-600 transition-transform hover:bg-orange-50 active:scale-95"
              >
                <Icon name="arrow_downward" style={{ fontSize: 14 }} />
                Cabut
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="text-xs text-blue-600 transition-transform hover:bg-blue-100 active:scale-95"
            >
              <Icon name="key" style={{ fontSize: 14 }} />
              Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDelete}
              className="text-xs text-red-600 transition-transform hover:bg-red-50 active:scale-95"
            >
              <Icon name="delete" style={{ fontSize: 14 }} />
            </Button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

export default function PenggunaPage() {
  const router = useRouter();
  const [halaman, setHalaman] = useState(1);
  const [limit, setLimit] = useState(12);
  const [cari, setCari] = useState('');
  const cariDeferred = useDeferredValue(cari);
  const [filterRole, setFilterRole] = useState('');
  const [tampilanCard, setTampilanCard] = useState(true);
  const [pengguna, setPengguna] = useState<UserItem[]>([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalHalaman: 1,
  });
  const [memuat, setMemuat] = useState(true);
  const isMounted = useRef(true);

  // Dialog konfirmasi
  const [dialogKonfirmasi, setDialogKonfirmasi] = useState({
    terbuka: false,
    judul: '',
    pesan: '',
    aksi: async () => {},
  });
  const [sedangAksi, setSedangAksi] = useState(false);
  const [resetTarget, setResetTarget] = useState<UserItem | null>(null);
  const [resetTargetAdmin, setResetTargetAdmin] = useState<UserItem | null>(null);
  const resetTargetRef = useRef<UserItem | null>(null);
  const resetTargetAdminRef = useRef<UserItem | null>(null);

  // Hitung statistik dari data yang dimuat
  const jumlahAdmin = pengguna.filter(
    (u) => (u.roles || []).includes('ADMIN')
  ).length;
  const jumlahPeminjam = pengguna.filter(
    (u) =>
      !(u.roles || []).includes('ADMIN') &&
      !(u.roles || []).includes('SUPER_ADMIN')
  ).length;

  // Reset halaman saat filter berubah
  useEffect(() => {
    setHalaman(1);
  }, [cariDeferred, filterRole, limit]);

  // Ambil data pengguna
  const muatPengguna = useCallback(async () => {
    setMemuat(true);
    try {
      const params: Record<string, unknown> = { page: halaman, limit };
      if (cariDeferred) params.q = cariDeferred;
      if (filterRole) params.role = filterRole;

      const data = await userManagementService.getSemua(params);
      if (isMounted.current) {
        setPengguna(data.data || []);
        setMeta(data.meta);
      }
    } catch (err) {
      console.error('Gagal memuat pengguna:', err);
      if (isMounted.current) {
        notify.gagal(ambilPesanError(err, 'Gagal memuat data.'));
      }
    } finally {
      if (isMounted.current) {
        setMemuat(false);
      }
    }
  }, [cariDeferred, filterRole, halaman, limit]);

  useEffect(() => {
    isMounted.current = true;
    muatPengguna();
    return () => {
      isMounted.current = false;
    };
  }, [muatPengguna]);

  // Refresh data after action
  const refreshData = useCallback(async () => {
    try {
      const params: Record<string, unknown> = { page: halaman, limit };
      if (cariDeferred) params.q = cariDeferred;
      if (filterRole) params.role = filterRole;

      const data = await userManagementService.getSemua(params);
      if (isMounted.current) {
        setPengguna(data.data || []);
        setMeta(data.meta);
      }
    } catch (err) {
      console.error('Gagal refresh data:', err);
    }
  }, [cariDeferred, filterRole, halaman, limit]);

  // Promosikan ke Admin
  const promosikan = async (user: UserItem) => {
    setDialogKonfirmasi({
      terbuka: true,
      judul: 'Promosikan ke Admin',
      pesan: `Yakin ingin menjadikan ${user.nama} sebagai Admin?`,
      aksi: async () => {
        setSedangAksi(true);
        try {
          await userManagementService.tambahRole(user.id, 'ADMIN');
          notify.suksess(`${user.nama} berhasil dipromosikan.`);
          await refreshData();
        } catch (err) {
          notify.gagal(ambilPesanError(err, 'Gagal promosi.'));
        } finally {
          setSedangAksi(false);
          setDialogKonfirmasi((d) => ({ ...d, terbuka: false }));
        }
      },
    });
  };

  // Cabut Admin
  const cabutAdmin = async (user: UserItem) => {
    setDialogKonfirmasi({
      terbuka: true,
      judul: 'Cabut Akses Admin',
      pesan: `Yakin ingin mencabut akses Admin dari ${user.nama}?`,
      aksi: async () => {
        setSedangAksi(true);
        try {
          await userManagementService.hapusRole(user.id, 'ADMIN');
          notify.suksess(`Akses Admin ${user.nama} dicabut.`);
          await refreshData();
        } catch (err) {
          notify.gagal(ambilPesanError(err, 'Gagal mencabut.'));
        } finally {
          setSedangAksi(false);
          setDialogKonfirmasi((d) => ({ ...d, terbuka: false }));
        }
      },
    });
  };

  // Hapus pengguna
  const hapusPengguna = async (user: UserItem) => {
    setDialogKonfirmasi({
      terbuka: true,
      judul: 'Hapus Pengguna',
      pesan: `Yakin ingin menghapus ${user.nama}? Tindakan ini tidak dapat dibatalkan.`,
      aksi: async () => {
        setSedangAksi(true);
        try {
          await userManagementService.remove(user.id);
          notify.suksess(`${user.nama} berhasil dihapus.`);
          await refreshData();
        } catch (err) {
          notify.gagal(ambilPesanError(err, 'Gagal menghapus.'));
        } finally {
          setSedangAksi(false);
          setDialogKonfirmasi((d) => ({ ...d, terbuka: false }));
        }
      },
    });
  };

  // Reset password pengguna
  const resetPasswordPengguna = async (user: UserItem) => {
    resetTargetRef.current = user;
    resetTargetAdminRef.current = user;
    if ((user.roles || []).includes('ADMIN')) {
      setResetTargetAdmin(user);
    } else {
      setResetTarget(user);
    }
  };

  const handleResetPassword = async () => {
    const user = resetTargetRef.current;
    if (!user) return { passwordBaru: '' };
    const hasil = await userManagementService.resetPassword(user.id);
    await refreshData();
    return hasil;
  };

  const handleResetPasswordAdmin = async () => {
    const user = resetTargetAdminRef.current;
    if (!user) return { passwordBaru: '' };
    const hasil = await userManagementService.resetPassword(user.id);
    await refreshData();
    return hasil;
  };

  return (
    <div className="space-y-6">
      {/* Header Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-700 via-violet-600 to-fuchsia-500 p-6 text-white shadow-lg shadow-violet-700/20 animate-page-in sm:p-8">
        {/* Blob decorations */}
        <div
          className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-fuchsia-300/30 blur-3xl"
          aria-hidden
        />
        <div
          className="absolute -bottom-6 -left-6 h-32 w-32 rounded-full bg-violet-400/25 blur-3xl"
          aria-hidden
        />
        <div className="relative z-10">
          <h1 className="text-2xl font-bold sm:text-3xl">Pengguna Terdaftar</h1>
          <p className="mt-1 text-purple-100">Kelola seluruh pengguna dalam sistem.</p>
        </div>

        {/* Mini Stat Cards */}
        {meta.total > 0 && (
          <div className="relative z-10 mt-6 grid grid-cols-1 gap-3 sm:grid-cols-4">
            <MiniStat
              label="Total Pengguna"
              value={meta.total}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
              gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
              ring="ring-blue-300/40"
              delay={80}
            />
            <MiniStat
              label="Ditampilkan"
              value={`${pengguna.length} / ${meta.total}`}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <line x1="19" x2="19" y1="8" y2="14" />
                  <line x1="22" x2="16" y1="11" y2="11" />
                </svg>
              }
              gradient="bg-gradient-to-br from-cyan-500 to-blue-600"
              ring="ring-cyan-300/40"
              delay={140}
            />
            <MiniStat
              label="Admin di Halaman"
              value={jumlahAdmin}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
                  <path d="m9 12 2 2 4-4" />
                </svg>
              }
              gradient="bg-gradient-to-br from-indigo-500 to-blue-600"
              ring="ring-indigo-300/40"
              delay={200}
            />
            <MiniStat
              label="Peminjam di Halaman"
              value={jumlahPeminjam}
              icon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              }
              gradient="bg-gradient-to-br from-blue-600 to-indigo-700"
              ring="ring-blue-300/40"
              delay={260}
            />
          </div>
        )}
      </section>

      {/* Toolbar */}
      <section
        className="rounded-2xl border border-outline-variant bg-white p-3 shadow-card animate-page-in sm:p-4"
        style={{ animationDelay: '60ms' }}
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search */}
          <div className="relative w-full lg:max-w-md">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant"
            />
            <Input
              placeholder="Cari nama, NIP, atau email..."
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter peran — segmented chips */}
            <div className="flex items-center gap-1 rounded-xl border border-outline-variant bg-surface-container-low p-1">
              {[
                { value: '', label: 'Semua' },
                { value: 'SUPER_ADMIN', label: 'Super Admin' },
                { value: 'ADMIN', label: 'Admin' },
                { value: 'PEMINJAM', label: 'Peminjam' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterRole(opt.value)}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                    filterRole === opt.value
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Page size */}
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm transition-all focus:border-primary focus:outline-none"
            >
              <option value={12}>12 / halaman</option>
              <option value={32}>32 / halaman</option>
              <option value={64}>64 / halaman</option>
              <option value={128}>128 / halaman</option>
              <option value={256}>256 / halaman</option>
              <option value={512}>512 / halaman</option>
            </select>

            {/* Toggle Card / Tabel */}
            <div className="flex items-center gap-1 rounded-xl border border-outline-variant bg-surface-container-low p-1">
              <button
                onClick={() => setTampilanCard(true)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                  tampilanCard
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
                title="Tampilan Kartu"
              >
                <Icon name="grid_view" style={{ fontSize: 16 }} />
              </button>
              <button
                onClick={() => setTampilanCard(false)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                  !tampilanCard
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
                title="Tampilan Tabel"
              >
                <Icon name="table" style={{ fontSize: 16 }} />
              </button>
            </div>
          </div>
        </div>

        {/* Indikator filter aktif */}
        {(cariDeferred || filterRole) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-outline-variant pt-3 text-xs">
            <span className="text-on-surface-variant">Filter aktif:</span>
            {cariDeferred && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                Pencarian: &ldquo;{cariDeferred}&rdquo;
                <button
                  onClick={() => setCari('')}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20"
                  aria-label="Hapus pencarian"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </span>
            )}
            {filterRole && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 font-medium text-blue-700">
                {filterRole === 'SUPER_ADMIN'
                  ? 'Super Admin'
                  : filterRole === 'ADMIN'
                    ? 'Admin'
                    : 'Peminjam'}
                <button
                  onClick={() => setFilterRole('')}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-blue-200"
                  aria-label="Hapus filter"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 6 6 18" />
                    <path d="m6 6 12 12" />
                  </svg>
                </button>
              </span>
            )}
          </div>
        )}
      </section>

      {/* Tabel / Card */}
      <div
        className="rounded-2xl bg-white shadow-md animate-page-in"
        style={{ animationDelay: '100ms' }}
      >
        {memuat ? (
          <div className="p-6">
            {tampilanCard ? (
              <CardGridSkeleton count={limit > 8 ? 8 : limit} />
            ) : (
              <TableSkeleton columns={6} rows={limit > 8 ? 8 : limit} />
            )}
          </div>
        ) : pengguna.length === 0 ? (
          <div className="p-6">
            <EmptyState
              ikon="group"
              judul="Tidak Ada Pengguna"
              deskripsi="Belum ada pengguna yang terdaftar."
            />
          </div>
        ) : tampilanCard ? (
          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
            {pengguna.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                onPromote={() => promosikan(user)}
                onRevoke={() => cabutAdmin(user)}
                onReset={() => resetPasswordPengguna(user)}
                onDelete={() => hapusPengguna(user)}
                onEdit={() => muatPengguna()}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Nama</TableHead>
                  <TableHead>NIP</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Jabatan</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pengguna.map((user) => (
                  <UserTableRow
                    key={user.id}
                    user={user}
                    onPromote={() => promosikan(user)}
                    onRevoke={() => cabutAdmin(user)}
                    onReset={() => resetPasswordPengguna(user)}
                    onDelete={() => hapusPengguna(user)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {!memuat && pengguna.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t px-6 py-4 bg-white rounded-b-2xl shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
            <p className="text-sm text-gray-500 order-2 sm:order-1">
              Menampilkan{' '}
              <span className="font-semibold text-gray-700">{pengguna.length}</span>{' '}
              dari{' '}
              <span className="font-semibold text-[#1e3a5f]">{meta.total}</span>{' '}
              pengguna
            </p>
            <div className="flex items-center gap-0 bg-gradient-to-r from-[#e8f0f7] via-white to-[#e8f0f7] rounded-2xl border border-gray-200 p-1.5 order-1 sm:order-2 shadow-sm">
              <button
                onClick={() => setHalaman((p) => Math.max(1, p - 1))}
                disabled={halaman === 1}
                className={`
                  flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer
                  ${halaman === 1
                    ? 'text-gray-300 cursor-not-allowed select-none'
                    : 'text-[#1e3a5f] bg-white hover:bg-[#f0f6fc] border border-gray-200 hover:border-[#1e3a5f] hover:shadow-sm active:scale-95'
                  }
                `}
              >
                <Icon name="chevron_left" style={{ fontSize: 16 }} />
                <span className="hidden sm:inline">Previous</span>
              </button>
              <div className="flex items-center gap-2 px-3 py-2 min-w-[110px] justify-center">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1e3a5f] text-white text-sm font-bold shadow-sm">
                  {halaman}
                </div>
                <span className="text-gray-400 text-xs">/</span>
                <span className="text-gray-500 text-sm font-medium">
                  {meta.totalHalaman}
                </span>
              </div>
              <button
                onClick={() => setHalaman((p) => Math.min(meta.totalHalaman, p + 1))}
                disabled={halaman >= meta.totalHalaman}
                className={`
                  flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer
                  ${halaman >= meta.totalHalaman
                    ? 'text-gray-300 cursor-not-allowed select-none'
                    : 'text-white bg-[#1e3a5f] hover:bg-[#2a4a73] border border-[#1e3a5f] hover:shadow-md active:scale-95'
                  }
                `}
              >
                <span className="hidden sm:inline">Next</span>
                <Icon name="chevron_right" style={{ fontSize: 16 }} />
              </button>
            </div>
          </div>
        )}
      </div>

      <KonfirmasiDialog
        terbuka={dialogKonfirmasi.terbuka}
        judul={dialogKonfirmasi.judul}
        deskripsi={dialogKonfirmasi.pesan}
        onUbahTerbuka={(terbuka) =>
          setDialogKonfirmasi((d) => ({ ...d, terbuka }))
        }
        onKonfirmasi={dialogKonfirmasi.aksi}
        sedangProses={sedangAksi}
        teksKonfirmasi="Ya, Lanjutkan"
      />

      <ResetPasswordDialog
        terbuka={!!resetTarget && !(resetTarget.roles || []).includes('ADMIN')}
        onUbahTerbuka={(o) => !o && setResetTarget(null)}
        user={resetTarget}
        onKonfirmasi={handleResetPassword}
      />

      <ResetPasswordAdminDialog
        terbuka={!!resetTargetAdmin}
        onUbahTerbuka={(o) => !o && setResetTargetAdmin(null)}
        user={resetTargetAdmin}
        onKonfirmasi={handleResetPasswordAdmin}
      />
    </div>
  );
}
