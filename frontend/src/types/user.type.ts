// ============================================================
//  Tipe data Pengguna
// ============================================================

export type Role = 'ADMIN' | 'PEMINJAM';

export interface User {
  id: string;
  nama: string;
  nip: string;
  email: string;
  jabatan?: string | null;
  unitKerja?: string | null;
  eselon2?: string | null;
  jabatanPegawai?: string | null;
  unitKerjaPegawai?: string | null;
  role: Role;
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
  jabatan?: string;
  unitKerja?: string;
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
  jabatan?: string;
  unitKerja?: string;
  eselon2?: string;
  jabatanPegawai?: string;
  unitKerjaPegawai?: string;
}

export interface DataGantiPassword {
  passwordLama: string;
  passwordBaru: string;
}
