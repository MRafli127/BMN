-- Tanggal pensiun pegawai (dihitung otomatis dari NIP: tanggal lahir + 58 tahun).
-- Idempoten: aman dijalankan berulang / pada DB yang sudah punya kolom ini.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "retirementDate" TIMESTAMP(3);
