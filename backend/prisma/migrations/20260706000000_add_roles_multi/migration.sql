-- Multi-role: kolom tunggal "role" (enum) menjadi array "roles".
-- Idempoten & aman untuk dua kondisi DB yang berbeda:
--   (a) setup fresh (dari migrasi init): "role" masih enum tunggal
--        -> tambah "roles", backfill (roles = [role]) SEBELUM drop, lalu drop "role".
--   (b) DB yang sempat kena `prisma db push`: "role" sudah bertipe Role[]
--        -> cukup RENAME "role" -> "roles" (tanpa kehilangan data, tanpa membungkus array).
-- Boleh dijalankan berulang: bila "roles" sudah ada, tidak melakukan apa-apa.

DO $$
BEGIN
  -- Sudah ada kolom "roles" -> tidak ada yang perlu dikerjakan.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'roles'
  ) THEN
    RETURN;
  END IF;

  -- Kondisi (b): "role" sudah array (udt_name '_Role') -> rename saja + rapikan default.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role' AND udt_name = '_Role'
  ) THEN
    ALTER TABLE "users" RENAME COLUMN "role" TO "roles";
    ALTER TABLE "users" ALTER COLUMN "roles" SET DEFAULT ARRAY['PEMINJAM']::"Role"[];

  -- Kondisi (a): "role" masih enum tunggal -> add array, backfill, drop.
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'role'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "roles" "Role"[] NOT NULL DEFAULT ARRAY['PEMINJAM']::"Role"[];
    UPDATE "users" SET "roles" = ARRAY["role"]::"Role"[];
    ALTER TABLE "users" DROP COLUMN "role";
  END IF;
END $$;
