-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PEMINJAM');

-- CreateEnum
CREATE TYPE "JenisBarang" AS ENUM ('ELEKTRONIK', 'FURNITUR', 'KENDARAAN', 'ATK', 'LAINNYA');

-- CreateEnum
CREATE TYPE "KondisiBarang" AS ENUM ('BAIK', 'RUSAK_RINGAN', 'RUSAK_BERAT');

-- CreateEnum
CREATE TYPE "StatusPeminjaman" AS ENUM ('MENUNGGU', 'DISETUJUI', 'DITOLAK', 'DIPINJAM', 'DIKEMBALIKAN', 'TERLAMBAT');

-- CreateEnum
CREATE TYPE "StatusItem" AS ENUM ('DIPINJAM', 'DIKEMBALIKAN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "nip" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "jabatan" TEXT,
    "unitKerja" TEXT,
    "role" "Role" NOT NULL DEFAULT 'PEMINJAM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barang" (
    "id" TEXT NOT NULL,
    "kodeBarang" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "jenis" "JenisBarang" NOT NULL DEFAULT 'LAINNYA',
    "jumlahTotal" INTEGER NOT NULL DEFAULT 0,
    "jumlahTersedia" INTEGER NOT NULL DEFAULT 0,
    "kondisi" "KondisiBarang" NOT NULL DEFAULT 'BAIK',
    "lokasiPenyimpanan" TEXT,
    "deskripsi" TEXT,
    "fotoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "barang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "peminjaman" (
    "id" TEXT NOT NULL,
    "kodePeminjaman" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tanggalPengajuan" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tanggalPinjamRencana" TIMESTAMP(3) NOT NULL,
    "tanggalKembaliRencana" TIMESTAMP(3) NOT NULL,
    "tanggalKembaliAktual" TIMESTAMP(3),
    "status" "StatusPeminjaman" NOT NULL DEFAULT 'MENUNGGU',
    "alasanPeminjaman" TEXT NOT NULL,
    "dokumenUrl" TEXT,
    "dokumenStempelUrl" TEXT,
    "qrCodeUrl" TEXT,
    "catatanAdmin" TEXT,
    "disetujuiOleh" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "peminjaman_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "detail_peminjaman" (
    "id" TEXT NOT NULL,
    "peminjamanId" TEXT NOT NULL,
    "barangId" TEXT NOT NULL,
    "jumlahPinjam" INTEGER NOT NULL DEFAULT 1,
    "statusItem" "StatusItem" NOT NULL DEFAULT 'DIPINJAM',

    CONSTRAINT "detail_peminjaman_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_nip_key" ON "users"("nip");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "barang_kodeBarang_key" ON "barang"("kodeBarang");

-- CreateIndex
CREATE UNIQUE INDEX "peminjaman_kodePeminjaman_key" ON "peminjaman"("kodePeminjaman");

-- CreateIndex
CREATE INDEX "peminjaman_userId_idx" ON "peminjaman"("userId");

-- CreateIndex
CREATE INDEX "peminjaman_status_idx" ON "peminjaman"("status");

-- CreateIndex
CREATE INDEX "detail_peminjaman_peminjamanId_idx" ON "detail_peminjaman"("peminjamanId");

-- CreateIndex
CREATE INDEX "detail_peminjaman_barangId_idx" ON "detail_peminjaman"("barangId");

-- AddForeignKey
ALTER TABLE "peminjaman" ADD CONSTRAINT "peminjaman_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peminjaman" ADD CONSTRAINT "peminjaman_disetujuiOleh_fkey" FOREIGN KEY ("disetujuiOleh") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detail_peminjaman" ADD CONSTRAINT "detail_peminjaman_peminjamanId_fkey" FOREIGN KEY ("peminjamanId") REFERENCES "peminjaman"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detail_peminjaman" ADD CONSTRAINT "detail_peminjaman_barangId_fkey" FOREIGN KEY ("barangId") REFERENCES "barang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
