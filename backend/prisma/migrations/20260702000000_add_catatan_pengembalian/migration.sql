-- Catatan admin saat konfirmasi pengembalian. HANYA untuk admin, tidak terlihat oleh peminjam.
ALTER TABLE "peminjaman" ADD COLUMN     "catatanPengembalian" TEXT;
