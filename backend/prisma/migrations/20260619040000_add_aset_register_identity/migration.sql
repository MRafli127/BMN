-- AlterTable: tambah identitas aset register BMN pada tabel barang
ALTER TABLE "barang" ADD COLUMN     "kodeSatker" TEXT,
ADD COLUMN     "namaSatker" TEXT,
ADD COLUMN     "kodeBarangBmn" TEXT,
ADD COLUMN     "nup" TEXT;

-- CreateIndex: kunci natural untuk mencocokkan baris saat re-import.
-- Baris manual (semua kolom NULL) tidak saling bentrok karena NULL distinct.
CREATE UNIQUE INDEX "barang_kodeSatker_kodeBarangBmn_nup_key" ON "barang"("kodeSatker", "kodeBarangBmn", "nup");
