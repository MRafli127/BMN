$env:PGPASSWORD = 'BMN_testing_database'

$queries = @(
    @{
        name = "Q1: Duplicate nomor surat"
        sql = "SELECT ""nomorSurat"", ""tahunSurat"", COUNT(*) AS jumlah_record, MIN(""createdAt"") AS pertama, MAX(""createdAt"") AS terakhir FROM peminjaman WHERE ""nomorSurat"" IS NOT NULL GROUP BY ""nomorSurat"", ""tahunSurat"" HAVING COUNT(*) > 1 ORDER BY ""tahunSurat"" DESC, ""nomorSurat"" DESC;"
    },
    @{
        name = "Q2: Column structure"
        sql = "SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = 'peminjaman' AND column_name IN ('nomorSurat', 'tahunSurat');"
    },
    @{
        name = "Q3: Indexes"
        sql = "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'peminjaman' AND indexdef LIKE '%nomor%';"
    },
    @{
        name = "Q4: Counter table"
        sql = "SELECT jenis, tahun, urutan FROM nomor_surat_counter ORDER BY tahun DESC, jenis;"
    },
    @{
        name = "Q5: Gap check"
        sql = "SELECT ""tahunSurat"", MIN(""nomorSurat"") AS terkecil, MAX(""nomorSurat"") AS terbesar, COUNT(*) AS total, (MAX(""nomorSurat"") - MIN(""nomorSurat"") + 1 - COUNT(*)) AS gap FROM peminjaman WHERE ""nomorSurat"" IS NOT NULL GROUP BY ""tahunSurat"" ORDER BY ""tahunSurat"" DESC;"
    }
)

$connString = "postgresql://postgres.obtwexsnltpwznrighej:BMN_testing_database@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

foreach ($q in $queries) {
    Write-Host "=== $($q.name) ==="
    try {
        $result = psql $connString -t -c $q.sql 2>&1
        Write-Host $result
    } catch {
        Write-Host "ERROR: $_"
    }
    Write-Host ""
}
