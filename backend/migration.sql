-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'PEMINJAM', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "JenisBarang" AS ENUM ('ELEKTRONIK', 'FURNITUR', 'KENDARAAN', 'ATK', 'LAINNYA');

-- CreateEnum
CREATE TYPE "KondisiBarang" AS ENUM ('BAIK', 'RUSAK_RINGAN', 'RUSAK_BERAT');

-- CreateEnum
CREATE TYPE "StatusPeminjaman" AS ENUM ('MENUNGGU', 'DISETUJUI', 'DITOLAK', 'DIPINJAM', 'DIKEMBALIKAN', 'TERLAMBAT', 'DRAFT');

-- CreateEnum
CREATE TYPE "StatusItem" AS ENUM ('DIPINJAM', 'DIKEMBALIKAN');

-- CreateEnum
CREATE TYPE "SumberBarang" AS ENUM ('MANUAL', 'IMPORT');

-- CreateEnum
CREATE TYPE "SumberAkun" AS ENUM ('MANUAL', 'IMPORT');

-- CreateEnum
CREATE TYPE "PrioritasNotifikasi" AS ENUM ('TINGGI', 'SEDANG', 'RENDAH');

-- CreateTable
CREATE TABLE "satker" (
    "id" TEXT NOT NULL,
    "kode" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "singkat" TEXT,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "satker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blacklisted_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blacklisted_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "nip" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "jabatan" TEXT,
    "unitKerja" TEXT,
    "eselon2" TEXT,
    "eselon3" TEXT,
    "eselon4" TEXT,
    "roles" "Role"[] DEFAULT ARRAY['PEMINJAM']::"Role"[],
    "sumber" "SumberAkun" NOT NULL DEFAULT 'MANUAL',
    "satkerAkses" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tokenVersion" INTEGER NOT NULL DEFAULT 1,
    "retirementDate" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3),
    "sessionInvalidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "barang" (
    "id" TEXT NOT NULL,
    "kodeBarang" TEXT NOT NULL,
    "nama" TEXT NOT NULL,
    "merk" TEXT,
    "jenis" "JenisBarang" NOT NULL DEFAULT 'LAINNYA',
    "jumlahTotal" INTEGER NOT NULL DEFAULT 0,
    "jumlahTersedia" INTEGER NOT NULL DEFAULT 0,
    "kondisi" "KondisiBarang" NOT NULL DEFAULT 'BAIK',
    "lokasiPenyimpanan" TEXT,
    "deskripsi" TEXT,
    "fotoUrl" TEXT,
    "sumber" "SumberBarang" NOT NULL DEFAULT 'MANUAL',
    "kodeSatker" TEXT,
    "namaSatker" TEXT,
    "kodeBarangBmn" TEXT,
    "nup" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "barang_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "peminjaman" (
    "id" TEXT NOT NULL,
    "kodeTransaksi" TEXT,
    "kodePeminjaman" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tanggalPengajuan" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tanggalKirim" TIMESTAMP(3),
    "tanggalPinjamRencana" TIMESTAMP(3),
    "tanggalKembaliRencana" TIMESTAMP(3),
    "tanggalKembaliAktual" TIMESTAMP(3),
    "tanggalPermintaanKembali" TIMESTAMP(3),
    "status" "StatusPeminjaman" NOT NULL DEFAULT 'MENUNGGU',
    "alasanPeminjaman" TEXT,
    "pangkatGolongan" TEXT,
    "dokumenUrl" TEXT,
    "dokumenStempelUrl" TEXT,
    "dokumenPengembalianUrl" TEXT,
    "qrCodeUrl" TEXT,
    "catatanAdmin" TEXT,
    "catatanPengembalian" TEXT,
    "disetujuiOleh" TEXT,
    "dikembalikanOleh" TEXT,
    "nomorSurat" INTEGER,
    "tahunSurat" INTEGER,
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

-- CreateTable
CREATE TABLE "nomor_surat_counter" (
    "id" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "nomor_surat_counter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "userNama" TEXT,
    "aksi" TEXT NOT NULL,
    "entitas" TEXT NOT NULL,
    "entitasId" TEXT,
    "dataLama" JSONB,
    "dataBaru" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifikasi" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipe" TEXT NOT NULL,
    "judul" TEXT NOT NULL,
    "pesan" TEXT NOT NULL,
    "prioritas" "PrioritasNotifikasi" NOT NULL DEFAULT 'SEDANG',
    "isBaca" BOOLEAN NOT NULL DEFAULT false,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifikasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userEmail" TEXT NOT NULL,
    "userNama" TEXT NOT NULL,
    "jenisImport" TEXT NOT NULL,
    "namaFile" TEXT NOT NULL,
    "jumlahBaris" INTEGER NOT NULL,
    "akunDitambahkan" INTEGER NOT NULL DEFAULT 0,
    "akunDiperbarui" INTEGER NOT NULL DEFAULT 0,
    "peminjamanDibuat" INTEGER NOT NULL DEFAULT 0,
    "peminjamanDipertahankan" INTEGER NOT NULL DEFAULT 0,
    "dilewatiTanpaNup" INTEGER NOT NULL DEFAULT 0,
    "gagal" INTEGER NOT NULL DEFAULT 0,
    "barangTidakDitemukan" INTEGER NOT NULL DEFAULT 0,
    "detailDitambahkan" JSONB,
    "detailDiperbarui" JSONB,
    "detailPeminjaman" JSONB,
    "detailGagal" JSONB,
    "detailBarangTidakDitemukan" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "satker_kode_key" ON "satker"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "blacklisted_tokens_token_key" ON "blacklisted_tokens"("token");

-- CreateIndex
CREATE INDEX "blacklisted_tokens_token_idx" ON "blacklisted_tokens"("token");

-- CreateIndex
CREATE INDEX "blacklisted_tokens_expiresAt_idx" ON "blacklisted_tokens"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "users_nip_key" ON "users"("nip");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "barang_kodeBarang_key" ON "barang"("kodeBarang");

-- CreateIndex
CREATE UNIQUE INDEX "barang_kodeSatker_kodeBarangBmn_nup_key" ON "barang"("kodeSatker", "kodeBarangBmn", "nup");

-- CreateIndex
CREATE UNIQUE INDEX "peminjaman_kodeTransaksi_key" ON "peminjaman"("kodeTransaksi");

-- CreateIndex
CREATE INDEX "peminjaman_userId_idx" ON "peminjaman"("userId");

-- CreateIndex
CREATE INDEX "peminjaman_status_idx" ON "peminjaman"("status");

-- CreateIndex
CREATE INDEX "peminjaman_kodePeminjaman_idx" ON "peminjaman"("kodePeminjaman");

-- CreateIndex
CREATE INDEX "detail_peminjaman_peminjamanId_idx" ON "detail_peminjaman"("peminjamanId");

-- CreateIndex
CREATE INDEX "detail_peminjaman_barangId_idx" ON "detail_peminjaman"("barangId");

-- CreateIndex
CREATE UNIQUE INDEX "nomor_surat_counter_jenis_tahun_key" ON "nomor_surat_counter"("jenis", "tahun");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_entitas_idx" ON "audit_logs"("entitas");

-- CreateIndex
CREATE INDEX "audit_logs_entitasId_idx" ON "audit_logs"("entitasId");

-- CreateIndex
CREATE INDEX "audit_logs_aksi_idx" ON "audit_logs"("aksi");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "notifikasi_userId_idx" ON "notifikasi"("userId");

-- CreateIndex
CREATE INDEX "notifikasi_isBaca_idx" ON "notifikasi"("isBaca");

-- CreateIndex
CREATE INDEX "notifikasi_createdAt_idx" ON "notifikasi"("createdAt");

-- CreateIndex
CREATE INDEX "import_logs_userId_idx" ON "import_logs"("userId");

-- CreateIndex
CREATE INDEX "import_logs_jenisImport_idx" ON "import_logs"("jenisImport");

-- CreateIndex
CREATE INDEX "import_logs_createdAt_idx" ON "import_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "peminjaman" ADD CONSTRAINT "peminjaman_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peminjaman" ADD CONSTRAINT "peminjaman_disetujuiOleh_fkey" FOREIGN KEY ("disetujuiOleh") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "peminjaman" ADD CONSTRAINT "peminjaman_dikembalikanOleh_fkey" FOREIGN KEY ("dikembalikanOleh") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detail_peminjaman" ADD CONSTRAINT "detail_peminjaman_peminjamanId_fkey" FOREIGN KEY ("peminjamanId") REFERENCES "peminjaman"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "detail_peminjaman" ADD CONSTRAINT "detail_peminjaman_barangId_fkey" FOREIGN KEY ("barangId") REFERENCES "barang"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifikasi" ADD CONSTRAINT "notifikasi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

