// ============================================================
//  Tipe data Pengguna
// ============================================================

export type Role = 'ADMIN' | 'PEMINJAM' | 'SUPER_ADMIN';

export type SumberUser = 'MANUAL' | 'IMPORT';

/**
 * Sumber asal akun:
 * - MANUAL: akun dibuat oleh admin atau registrasi mandiri
 * - IMPORT: akun dibuat melalui fitur Import Peminjam (migrasi data BMN)
 */
export interface User {
  id: string;
  nama: string;
  nip: string;
  email: string;
  jabatan?: string | null; //   Jabatan
  unitKerja?: string | null; // Unit Kerja
  eselon2?: string | null; //   Eselon II
  eselon3?: string | null; //   Eselon III
  eselon4?: string | null; //   Eselon IV
  roles: Role[]; //      Peran yang dimiliki akun (bisa >1)
  activeRole: Role; //   Peran yang sedang dipakai dalam sesi ini
  satkerAkses?: string[]; // Satker yang boleh dikelola (ADMIN), kosong = semua (SUPER_ADMIN)
  retirementDate?: string | null; // Tanggal pensiun (dihitung otomatis dari NIP)
  sumber?: SumberUser | null; // Asal pembuatan akun (MANUAL/IMPORT)
  createdAt?: string;
  updatedAt?: string;
}

export interface DataLogin {
  email: string;
  password: string;
}

export interface DataRegister {
  nama: string;
  nip: string;
  email: string;
  password: string;
  eselon4?: string; // form registrasi: "Eselon IV"
  eselon3?: string; // form registrasi: "Eselon III"
}

export interface HasilAuth {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface DataUpdateProfil {
  nama: string;
  nip: string;
  email: string;
  jabatan?: string; //   Jabatan
  unitKerja?: string; // Unit Kerja
  eselon2?: string; //   Eselon II
  eselon3?: string; //   Eselon III
  eselon4?: string; //   Eselon IV
}

export interface DataGantiPassword {
  passwordLama: string;
  passwordBaru: string;
}
