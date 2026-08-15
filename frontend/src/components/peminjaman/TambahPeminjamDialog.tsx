// ============================================================
//  Dialog Tambah Peminjam (Pegawai) Manual — khusus admin.
//  Membuat akun peminjam baru satu per satu tanpa import Excel.
//  Field yang diminta sama dengan halaman Pengaturan Akun:
//  Nama, NIP, Jabatan, Email, Unit Kerja, Eselon II/III/IV, dan
//  password. Wajib diisi: Nama, NIP, Email, Password.
// ============================================================

'use client';

import { useState } from 'react';
import { UserPlus, Eye, EyeOff } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { notify } from '@/components/ui/toast';
import { userManagementService, type DataTambahPeminjam } from '@/services/userManagement.service';
import { ambilPesanError } from '@/lib/utils';

interface Props {
  onSelesai?: () => void; // dipanggil setelah berhasil menambah (untuk refetch)
}

// Nilai awal form kosong. Dipakai saat membuka & mereset setelah sukses.
const FORM_KOSONG: DataTambahPeminjam = {
  nama: '',
  nip: '',
  jabatan: '',
  email: '',
  unitKerja: '',
  eselon2: '',
  eselon3: '',
  eselon4: '',
  password: '',
};

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function TambahPeminjamDialog({ onSelesai }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<DataTambahPeminjam>(FORM_KOSONG);
  const [errors, setErrors] = useState<Partial<Record<keyof DataTambahPeminjam, string>>>({});
  const [lihatSandi, setLihatSandi] = useState(false);
  const [menyimpan, setMenyimpan] = useState(false);

  const reset = () => {
    setForm(FORM_KOSONG);
    setErrors({});
    setLihatSandi(false);
    setMenyimpan(false);
  };

  const ubah = (key: keyof DataTambahPeminjam, nilai: string) => {
    setForm((f) => ({ ...f, [key]: nilai }));
    // Hapus pesan error field begitu pengguna mulai memperbaikinya.
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  // Validasi field wajib (Nama, NIP, Email, Password) + format email.
  const validasi = (): boolean => {
    const err: Partial<Record<keyof DataTambahPeminjam, string>> = {};
    if (form.nama.trim().length < 3) err.nama = 'Nama minimal 3 karakter.';
    if (form.nip.trim().length < 5) err.nip = 'NIP minimal 5 karakter.';
    if (!form.email.trim()) err.email = 'Email wajib diisi.';
    else if (!REGEX_EMAIL.test(form.email.trim())) err.email = 'Format email tidak valid.';
    if (form.password.length < 6) err.password = 'Kata sandi minimal 6 karakter.';
    setErrors(err);
    return Object.keys(err).length === 0;
  };

  const simpan = async () => {
    if (!validasi()) return;
    setMenyimpan(true);
    try {
      // Kirim hanya nilai yang terisi; field opsional kosong tidak diikutkan.
      const payload: DataTambahPeminjam = {
        nama: form.nama.trim(),
        nip: form.nip.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        jabatan: form.jabatan?.trim() || undefined,
        unitKerja: form.unitKerja?.trim() || undefined,
        eselon2: form.eselon2?.trim() || undefined,
        eselon3: form.eselon3?.trim() || undefined,
        eselon4: form.eselon4?.trim() || undefined,
      };
      const user = await userManagementService.create(payload);
      notify.suksess(`Peminjam "${user.nama}" (NIP ${user.nip}) berhasil ditambahkan.`);
      reset();
      setOpen(false);
      onSelesai?.();
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal menambah peminjam.'));
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
        <Button>
          <UserPlus className="h-4 w-4" /> Tambah Peminjam
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Peminjam</DialogTitle>
          <DialogDescription>
            Tambahkan akun peminjam (pegawai) secara manual. Kolom bertanda{' '}
            <span className="text-error">*</span> wajib diisi. Peminjam dapat langsung masuk memakai NIP/email dan
            kata sandi yang Anda tetapkan.
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            simpan();
          }}
        >
          {/* Nama (wajib) */}
          <div className="sm:col-span-2">
            <Label htmlFor="tp-nama">
              Nama <span className="text-error">*</span>
            </Label>
            <Input
              id="tp-nama"
              value={form.nama}
              onChange={(e) => ubah('nama', e.target.value)}
              placeholder="Nama lengkap pegawai"
              className="mt-1.5"
              autoComplete="off"
            />
            {errors.nama && <p className="mt-1 text-xs text-error">{errors.nama}</p>}
          </div>

          {/* NIP (wajib) */}
          <div>
            <Label htmlFor="tp-nip">
              NIP <span className="text-error">*</span>
            </Label>
            <Input
              id="tp-nip"
              value={form.nip}
              onChange={(e) => ubah('nip', e.target.value)}
              placeholder="Nomor Induk Pegawai"
              className="mt-1.5"
              inputMode="numeric"
              autoComplete="off"
            />
            {errors.nip && <p className="mt-1 text-xs text-error">{errors.nip}</p>}
          </div>

          {/* Jabatan (opsional) */}
          <div>
            <Label htmlFor="tp-jabatan">Jabatan</Label>
            <Input
              id="tp-jabatan"
              value={form.jabatan}
              onChange={(e) => ubah('jabatan', e.target.value)}
              placeholder="mis. Widyaiswara Ahli Muda"
              className="mt-1.5"
              autoComplete="off"
            />
          </div>

          {/* Email (wajib) */}
          <div className="sm:col-span-2">
            <Label htmlFor="tp-email">
              Email <span className="text-error">*</span>
            </Label>
            <Input
              id="tp-email"
              type="email"
              value={form.email}
              onChange={(e) => ubah('email', e.target.value)}
              placeholder="alamat.email@kemenkeu.go.id"
              className="mt-1.5"
              autoComplete="off"
            />
            {errors.email && <p className="mt-1 text-xs text-error">{errors.email}</p>}
          </div>

          {/* Unit Kerja (opsional) */}
          <div className="sm:col-span-2">
            <Label htmlFor="tp-unit">Unit Kerja</Label>
            <Input
              id="tp-unit"
              value={form.unitKerja}
              onChange={(e) => ubah('unitKerja', e.target.value)}
              placeholder="Unit kerja pegawai"
              className="mt-1.5"
              autoComplete="off"
            />
          </div>

          {/* Eselon II (opsional) */}
          <div className="sm:col-span-2">
            <Label htmlFor="tp-eselon2">Eselon II</Label>
            <Input
              id="tp-eselon2"
              value={form.eselon2}
              onChange={(e) => ubah('eselon2', e.target.value)}
              placeholder="Unit Eselon II"
              className="mt-1.5"
              autoComplete="off"
            />
          </div>

          {/* Eselon III (opsional) */}
          <div>
            <Label htmlFor="tp-eselon3">Eselon III</Label>
            <Input
              id="tp-eselon3"
              value={form.eselon3}
              onChange={(e) => ubah('eselon3', e.target.value)}
              placeholder="Unit Eselon III"
              className="mt-1.5"
              autoComplete="off"
            />
          </div>

          {/* Eselon IV (opsional) */}
          <div>
            <Label htmlFor="tp-eselon4">Eselon IV</Label>
            <Input
              id="tp-eselon4"
              value={form.eselon4}
              onChange={(e) => ubah('eselon4', e.target.value)}
              placeholder="Unit Eselon IV"
              className="mt-1.5"
              autoComplete="off"
            />
          </div>

          {/* Password (wajib) */}
          <div className="sm:col-span-2">
            <Label htmlFor="tp-password">
              Kata Sandi <span className="text-error">*</span>
            </Label>
            <div className="relative mt-1.5">
              <Input
                id="tp-password"
                type={lihatSandi ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => ubah('password', e.target.value)}
                placeholder="Minimal 6 karakter"
                className="pr-10"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setLihatSandi((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label={lihatSandi ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {lihatSandi ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password ? (
              <p className="mt-1 text-xs text-error">{errors.password}</p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">
                Sampaikan kata sandi ini kepada peminjam agar mereka dapat masuk dan menggantinya.
              </p>
            )}
          </div>

          {/* Submit tersembunyi agar Enter di dalam form ikut mengirim */}
          <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
        </form>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={menyimpan}>
            Batal
          </Button>
          <Button type="button" onClick={simpan} disabled={menyimpan}>
            <UserPlus className="h-4 w-4" /> {menyimpan ? 'Menyimpan…' : 'Simpan Peminjam'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
