// ============================================================
//  Dialog Edit Peminjam (Pegawai) — khusus admin.
//  Mengedit profil peminjam: Nama, NIP, Jabatan, Email,
//  Unit Kerja, Eselon II/III/IV. Password tidak diedit di sini
//  (dikelola terpisah via reset password).
// ============================================================

'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
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
import { userManagementService, type DataEditPeminjam } from '@/services/userManagement.service';
import { ambilPesanError } from '@/lib/utils';
import type { PeminjamRow } from './TabelDaftarPeminjam';

interface Props {
  peminjam: PeminjamRow;
  onSelesai?: () => void; // dipanggil setelah berhasil menyimpan (untuk refetch)
}

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EditPeminjamDialog({ peminjam, onSelesai }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    nama: peminjam.nama,
    nip: peminjam.nip,
    jabatan: peminjam.jabatan ?? '',
    email: peminjam.email,
    unitKerja: peminjam.unitKerja ?? '',
    eselon2: peminjam.eselon2 ?? '',
    eselon3: peminjam.eselon3 ?? '',
    eselon4: peminjam.eselon4 ?? '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [menyimpan, setMenyimpan] = useState(false);

  const reset = () => {
    // Kembalikan nilai ke data awal saat membuka dialog.
    setForm({
      nama: peminjam.nama,
      nip: peminjam.nip,
      jabatan: peminjam.jabatan ?? '',
      email: peminjam.email,
      unitKerja: peminjam.unitKerja ?? '',
      eselon2: peminjam.eselon2 ?? '',
      eselon3: peminjam.eselon3 ?? '',
      eselon4: peminjam.eselon4 ?? '',
    });
    setErrors({});
    setMenyimpan(false);
  };

  const ubah = (key: keyof typeof form, nilai: string) => {
    setForm((f) => ({ ...f, [key]: nilai }));
    // Hapus pesan error field begitu pengguna mulai memperbaikinya.
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  // Validasi field wajib (Nama, NIP, Email) + format email.
  const validasi = (): boolean => {
    const err: Partial<Record<keyof typeof form, string>> = {};
    if (form.nama.trim().length < 3) err.nama = 'Nama minimal 3 karakter.';
    if (form.nip.trim().length < 5) err.nip = 'NIP minimal 5 karakter.';
    if (!form.email.trim()) err.email = 'Email wajib diisi.';
    else if (!REGEX_EMAIL.test(form.email.trim())) err.email = 'Format email tidak valid.';
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
      await userManagementService.update(peminjam.id, payload);
      notify.suksess(`Profil "${form.nama}" (NIP ${form.nip}) berhasil diperbarui.`);
      setOpen(false);
      onSelesai?.();
    } catch (error) {
      notify.gagal(ambilPesanError(error, 'Gagal memperbarui profil peminjam.'));
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
        <Button variant="outline" size="sm" onClick={(e) => e.stopPropagation()}>
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Peminjam</DialogTitle>
          <DialogDescription>
            Perbarui profil peminjam &ldquo;{peminjam.nama}&rdquo; (NIP {peminjam.nip}). Kolom bertanda{' '}
            <span className="text-error">*</span> wajib diisi.
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
            <Label htmlFor="ep-nama">
              Nama <span className="text-error">*</span>
            </Label>
            <Input
              id="ep-nama"
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
            <Label htmlFor="ep-nip">
              NIP <span className="text-error">*</span>
            </Label>
            <Input
              id="ep-nip"
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
            <Label htmlFor="ep-jabatan">Jabatan</Label>
            <Input
              id="ep-jabatan"
              value={form.jabatan}
              onChange={(e) => ubah('jabatan', e.target.value)}
              placeholder="mis. Widyaiswara Ahli Muda"
              className="mt-1.5"
              autoComplete="off"
            />
          </div>

          {/* Email (wajib) */}
          <div className="sm:col-span-2">
            <Label htmlFor="ep-email">
              Email <span className="text-error">*</span>
            </Label>
            <Input
              id="ep-email"
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
            <Label htmlFor="ep-unit">Unit Kerja</Label>
            <Input
              id="ep-unit"
              value={form.unitKerja}
              onChange={(e) => ubah('unitKerja', e.target.value)}
              placeholder="Unit kerja pegawai"
              className="mt-1.5"
              autoComplete="off"
            />
          </div>

          {/* Eselon II (opsional) */}
          <div className="sm:col-span-2">
            <Label htmlFor="ep-eselon2">Eselon II</Label>
            <Input
              id="ep-eselon2"
              value={form.eselon2}
              onChange={(e) => ubah('eselon2', e.target.value)}
              placeholder="Unit Eselon II"
              className="mt-1.5"
              autoComplete="off"
            />
          </div>

          {/* Eselon III (opsional) */}
          <div>
            <Label htmlFor="ep-eselon3">Eselon III</Label>
            <Input
              id="ep-eselon3"
              value={form.eselon3}
              onChange={(e) => ubah('eselon3', e.target.value)}
              placeholder="Unit Eselon III"
              className="mt-1.5"
              autoComplete="off"
            />
          </div>

          {/* Eselon IV (opsional) */}
          <div>
            <Label htmlFor="ep-eselon4">Eselon IV</Label>
            <Input
              id="ep-eselon4"
              value={form.eselon4}
              onChange={(e) => ubah('eselon4', e.target.value)}
              placeholder="Unit Eselon IV"
              className="mt-1.5"
              autoComplete="off"
            />
          </div>

          {/* Submit tersembunyi agar Enter di dalam form ikut mengirim */}
          <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
        </form>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={menyimpan}>
            Batal
          </Button>
          <Button type="button" onClick={simpan} disabled={menyimpan}>
            <Pencil className="h-4 w-4" /> {menyimpan ? 'Menyimpan…' : 'Simpan Perubahan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
