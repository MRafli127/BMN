-- Waktu pengajuan resmi dikirim ke admin (status mencapai MENUNGGU). Dipakai
-- pada timeline "Lacak Status" untuk membedakan waktu "Draft Pengajuan"
-- (tanggalPengajuan) dari waktu "Menunggu Persetujuan" (tanggalKirim).
ALTER TABLE "peminjaman" ADD COLUMN "tanggalKirim" TIMESTAMP(3);
