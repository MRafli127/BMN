const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function safeJson(v) {
  return JSON.stringify(v, (_, val) => typeof val === 'bigint' ? Number(val) : val, 2);
}

async function run() {
  console.log('=== Q1: Duplicate nomor surat ===');
  const dup = await prisma.$queryRaw`
    SELECT "nomorSurat", "tahunSurat", COUNT(*) AS jumlah_record,
           MIN("createdAt") AS pertama, MAX("createdAt") AS terakhir
    FROM "peminjaman"
    WHERE "nomorSurat" IS NOT NULL
    GROUP BY "nomorSurat", "tahunSurat"
    HAVING COUNT(*) > 1
    ORDER BY "tahunSurat" DESC, "nomorSurat" DESC
  `;
  console.log(safeJson(dup));

  console.log('\n=== Q2: Column structure ===');
  const cols = await prisma.$queryRaw`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'peminjaman'
      AND column_name IN ('nomorSurat', 'tahunSurat')
  `;
  console.log(safeJson(cols));

  console.log('\n=== Q3: Indexes ===');
  const idx = await prisma.$queryRaw`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'peminjaman'
      AND indexdef LIKE '%nomor%'
  `;
  console.log(safeJson(idx));

  console.log('\n=== Q4: Counter table ===');
  const counter = await prisma.nomorSuratCounter.findMany({
    orderBy: [{ tahun: 'desc' }, { jenis: 'asc' }]
  });
  console.log(safeJson(counter));

  console.log('\n=== Q5: Gap check ===');
  const gaps = await prisma.$queryRaw`
    SELECT "tahunSurat",
           MIN("nomorSurat") AS terkecil,
           MAX("nomorSurat") AS terbesar,
           COUNT(*) AS total,
           (MAX("nomorSurat") - MIN("nomorSurat") + 1 - COUNT(*)) AS gap
    FROM "peminjaman"
    WHERE "nomorSurat" IS NOT NULL
    GROUP BY "tahunSurat"
    ORDER BY "tahunSurat" DESC
  `;
  console.log(safeJson(gaps));

  await prisma.$disconnect();
}

run().catch(e => { console.error(e); process.exit(1); });
