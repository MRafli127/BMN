-- Simpan Pangkat/Gol. peminjam pada transaksi peminjaman agar Surat Pernyataan
-- untuk pengajuan berstatus DRAFT dapat diunduh menyusul dengan data yang tepat.
ALTER TABLE "peminjaman" ADD COLUMN "pangkatGolongan" TEXT;
