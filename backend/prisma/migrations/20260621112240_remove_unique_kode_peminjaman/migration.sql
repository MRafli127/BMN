-- DropIndex
DROP INDEX "peminjaman_kodePeminjaman_key";

-- CreateIndex
CREATE INDEX "peminjaman_kodePeminjaman_idx" ON "peminjaman"("kodePeminjaman");
