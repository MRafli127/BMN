-- Tambah status DRAFT: pengajuan tersimpan ke Riwayat namun Surat Pernyataan
-- belum diunggah (belum terlihat admin). Barang tetap dikunci.
ALTER TYPE "StatusPeminjaman" ADD VALUE IF NOT EXISTS 'DRAFT';
