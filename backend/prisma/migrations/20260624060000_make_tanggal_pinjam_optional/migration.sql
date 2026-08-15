-- Jadikan tanggal pinjam rencana opsional (boleh NULL)
ALTER TABLE "peminjaman" ALTER COLUMN "tanggalPinjamRencana" DROP NOT NULL;
