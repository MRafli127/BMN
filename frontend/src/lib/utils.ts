// ============================================================
//  Utilitas umum frontend.
// ============================================================

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { id } from 'date-fns/locale';

// Gabungkan className Tailwind dengan aman (menghindari konflik)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format tanggal lengkap: "Sabtu, 13 Juni 2026, 14:30 WIB"
export function formatTanggalLengkap(tanggal?: string | Date | null): string {
  if (!tanggal) return '-';
  const d = new Date(tanggal);
  if (Number.isNaN(d.getTime())) return '-';
  return `${format(d, 'EEEE, dd MMMM yyyy, HH:mm', { locale: id })} WIB`;
}

// Format tanggal singkat: "13 Juni 2026"
export function formatTanggal(tanggal?: string | Date | null): string {
  if (!tanggal) return '-';
  const d = new Date(tanggal);
  if (Number.isNaN(d.getTime())) return '-';
  return format(d, 'dd MMMM yyyy', { locale: id });
}

// Jarak waktu relatif: "3 hari lagi" / "2 hari yang lalu"
export function jarakWaktu(tanggal?: string | Date | null): string {
  if (!tanggal) return '-';
  const d = new Date(tanggal);
  if (Number.isNaN(d.getTime())) return '-';
  return formatDistanceToNowStrict(d, { locale: id, addSuffix: true });
}

// Ubah path file menjadi URL absolut bila masih relatif
export function urlFile(path?: string | null): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const base = (process.env.NEXT_PUBLIC_BACKEND_URL || '').replace(/\/$/, '');
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}

// Ambil inisial dari nama (untuk avatar)
export function inisial(nama?: string): string {
  if (!nama) return '?';
  return nama
    .split(' ')
    .slice(0, 2)
    .map((kata) => kata.charAt(0).toUpperCase())
    .join('');
}

// Ambil pesan error dari respons axios
export function ambilPesanError(error: unknown, fallback = 'Terjadi kesalahan.'): string {
  const e = error as { response?: { data?: { pesan?: string } }; message?: string };
  return e?.response?.data?.pesan || e?.message || fallback;
}
