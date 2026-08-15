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

-- CreateIndex
CREATE UNIQUE INDEX "satker_kode_key" ON "satker"("kode");

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

-- AddForeignKey
ALTER TABLE "notifikasi" ADD CONSTRAINT "notifikasi_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
