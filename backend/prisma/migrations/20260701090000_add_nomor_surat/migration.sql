-- Penomoran surat pernyataan otomatis, berurut per tahun (reset tiap ganti tahun).

-- AlterTable: kolom nomor & tahun surat pada peminjaman
ALTER TABLE "peminjaman" ADD COLUMN     "nomorSurat" INTEGER;
ALTER TABLE "peminjaman" ADD COLUMN     "tahunSurat" INTEGER;

-- CreateTable: pencacah nomor surat per (jenis, tahun)
CREATE TABLE "nomor_surat_counter" (
    "id" TEXT NOT NULL,
    "jenis" TEXT NOT NULL,
    "tahun" INTEGER NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "nomor_surat_counter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: satu pencacah per (jenis, tahun)
CREATE UNIQUE INDEX "nomor_surat_counter_jenis_tahun_key" ON "nomor_surat_counter"("jenis", "tahun");

-- Backfill: beri nomor urut ke peminjaman lama, per tahun pengajuan, urut kronologis.
WITH numbered AS (
    SELECT
        "id",
        EXTRACT(YEAR FROM "tanggalPengajuan")::int AS thn,
        ROW_NUMBER() OVER (
            PARTITION BY EXTRACT(YEAR FROM "tanggalPengajuan")
            ORDER BY "tanggalPengajuan" ASC, "createdAt" ASC, "id" ASC
        ) AS rn
    FROM "peminjaman"
)
UPDATE "peminjaman" p
SET "nomorSurat" = n.rn, "tahunSurat" = n.thn
FROM numbered n
WHERE p."id" = n."id";

-- Seed pencacah dari data yang sudah di-backfill agar nomor berikutnya lanjut, bukan mengulang.
INSERT INTO "nomor_surat_counter" ("id", "jenis", "tahun", "urutan")
SELECT gen_random_uuid(), 'PEMINJAMAN', "tahunSurat", MAX("nomorSurat")
FROM "peminjaman"
WHERE "tahunSurat" IS NOT NULL
GROUP BY "tahunSurat";
