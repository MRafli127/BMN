-- Reservasi nomor surat per peminjam: memastikan dua akun berbeda tidak pernah
-- memperoleh nomor surat yang sama di "Formulir Pengajuan Peminjaman".

-- CreateTable: reservasi nomor surat per (userId, jenis, tahun)
CREATE TABLE "nomor_surat_reservasi" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "urutan" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nomor_surat_reservasi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: satu reservasi aktif per (userId, jenis, tahun)
CREATE UNIQUE INDEX "nomor_surat_reservasi_userId_jenis_tahun_key" ON "nomor_surat_reservasi"("userId", "jenis", "tahun");
