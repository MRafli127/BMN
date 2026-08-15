-- CreateEnum
CREATE TYPE "SumberAkun" AS ENUM ('MANUAL', 'IMPORT');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "sumber" "SumberAkun" NOT NULL DEFAULT 'MANUAL';
