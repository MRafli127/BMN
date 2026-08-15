-- Add unique constraint on (nomorSurat, tahunSurat) in peminjaman table
-- Defense-in-depth: ensures database rejects duplicate nomorSurat+tahunSurat
-- even if a non-nomorSuratService path creates/updates peminjaman records.
--
-- PostgreSQL behavior: UNIQUE constraint allows multiple NULL values by default
-- (SQL standard), so records with nomorSurat=NULL are unaffected. This is the
-- correct behavior since not all peminjaman records have a surat number
-- (e.g., DRAFT status, or records created via import without surat data).
-- Only records where BOTH columns are NOT NULL are subject to uniqueness.

CREATE UNIQUE INDEX "peminjaman_nomor_surat_tahun_surat_unique"
    ON "peminjaman" ("nomorSurat", "tahunSurat")
    WHERE "nomorSurat" IS NOT NULL AND "tahunSurat" IS NOT NULL;
