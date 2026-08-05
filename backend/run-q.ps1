$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:PGPASSWORD = 'BMN_testing_database'
$conn = "postgresql://postgres.obtwexsnltpwznrighej:BMN_testing_database@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

Write-Host "=== Q1: Duplicate nomor surat ==="
$q1 = psql $conn -t -c "SELECT `""nomorSurat`"", `""tahunSurat`"", COUNT(*) AS jumlah_record, MIN(`"createdAt`") AS pertama, MAX(`"createdAt`") AS terakhir FROM peminjaman WHERE `""nomorSurat`"" IS NOT NULL GROUP BY `""nomorSurat`"", `""tahunSurat`"" HAVING COUNT(*) > 1 ORDER BY `""tahunSurat`"" DESC, `""nomorSurat`"" DESC;" 2>&1
Write-Host $q1

Write-Host "=== Q2: Column structure ==="
$q2 = psql $conn -t -c "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'peminjaman' AND column_name IN ('nomorSurat', 'tahunSurat');" 2>&1
Write-Host $q2

Write-Host "=== Q3: Indexes ==="
$q3 = psql $conn -t -c "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'peminjaman' AND indexdef LIKE '%nomor%';" 2>&1
Write-Host $q3

Write-Host "=== Q4: Counter table ==="
$q4 = psql $conn -t -c "SELECT jenis, tahun, urutan FROM nomor_surat_counter ORDER BY tahun DESC, jenis;" 2>&1
Write-Host $q4

Write-Host "=== Q5: Gap check ==="
$q5 = psql $conn -t -c "SELECT `""tahunSurat`"", MIN(`""nomorSurat`"") AS terkecil, MAX(`""nomorSurat`"") AS terbesar, COUNT(*) AS total, (MAX(`""nomorSurat`"") - MIN(`""nomorSurat`"") + 1 - COUNT(*)) AS gap FROM peminjaman WHERE `""nomorSurat`"" IS NOT NULL GROUP BY `""tahunSurat`"" ORDER BY `""tahunSurat`"" DESC;" 2>&1
Write-Host $q5
