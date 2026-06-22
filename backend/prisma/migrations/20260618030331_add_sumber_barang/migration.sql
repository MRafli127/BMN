-- CreateEnum
CREATE TYPE "SumberBarang" AS ENUM ('MANUAL', 'IMPORT');

-- AlterTable
ALTER TABLE "barang" ADD COLUMN     "sumber" "SumberBarang" NOT NULL DEFAULT 'MANUAL';
