-- Rename kolom data pegawai/eselon ke skema yang jelas.
-- Data dipindahkan (bukan drop+add) agar tidak hilang:
--   jabatan (lama = Eselon IV)          -> eselon4
--   unitKerja (lama = Eselon III)        -> eselon3
--   jabatanPegawai (Jabatan)             -> jabatan
--   unitKerjaPegawai (Unit Kerja)        -> unitKerja
-- Urutan penting: kosongkan dulu nama "jabatan"/"unitKerja" sebelum dipakai ulang.
ALTER TABLE "users" RENAME COLUMN "jabatan" TO "eselon4";
ALTER TABLE "users" RENAME COLUMN "unitKerja" TO "eselon3";
ALTER TABLE "users" RENAME COLUMN "jabatanPegawai" TO "jabatan";
ALTER TABLE "users" RENAME COLUMN "unitKerjaPegawai" TO "unitKerja";
