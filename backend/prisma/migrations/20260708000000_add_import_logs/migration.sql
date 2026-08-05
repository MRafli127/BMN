-- Migration: Add ImportLogs table
-- Created: 2026-07-08

-- Create import_logs table
CREATE TABLE IF NOT EXISTS "import_logs" (
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

-- Create indexes
CREATE INDEX IF NOT EXISTS "import_logs_userId_idx" ON "import_logs"("userId");
CREATE INDEX IF NOT EXISTS "import_logs_jenisImport_idx" ON "import_logs"("jenisImport");
CREATE INDEX IF NOT EXISTS "import_logs_createdAt_idx" ON "import_logs"("createdAt");
