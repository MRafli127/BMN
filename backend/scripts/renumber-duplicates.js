// ============================================================
//  Script Renumber Duplikat nomorSurat+tahunSurat
//
//  Latar belakang: 12 pasangan peminjaman bentrok nomorSurat
//  karena script migrasi Neon->Supabase tidak menyinkronkan
//  counter nomorSurat dengan sistem baru.
//
//  Approach: untuk tiap pasangan, record dengan createdAt lebih
//  awal MEMPERTAHANKAN nomor aslinya. Record dengan createdAt
//  lebih akhir DIBERI NOMOR BARU.
//
//  Counter PEMINJAMAN/2026 saat ini: urutan=41
//  12 record direnumber ke: 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53
//
//  JENIS: PEMINJAMAN (satu-satunya jenis yang ada di data)
//  KEPUTUSAN: lihat daftar RENCANA di bawah.
//
//  Usage: node scripts/renumber-duplicates.js [--dry-run]
//         --dry-run  hanya tampilkan rencana, jangan ubah data
// ============================================================

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ----------------------------------------------------------
//  RENCANA PERUBAHAN (berdasarkan createdAt)
// ----------------------------------------------------------
// Patokan: createdAt lebih awal = pertahankan nomor,
//          createdAt lebih akhir  = direnumber
//
// Counter PEMINJAMAN/2026 SAAT INI: urutan = 41
// Nomor baru diambil berurutan mulai dari 42
//
// Format: { id, nomorLama, nomorBaru, tahunSurat, createdAt, alasan }
// ----------------------------------------------------------
const RENCANA = [
  // --- nomorSurat=2 ---
  {
    id: '0c4e48ad-cb42-47e3-bfdb-289a4a2bec69',   // Ayu Kusuma Negara — DIPINJAM, 2026-07-17 03:13 (LEBIH AKHIR → direnumber)
    nomorLama: 2,
    nomorBaru: 42,
    tahunSurat: 2026,
    createdAt: '2026-07-17T03:13:36.524Z',
    alasan: 'DIPINJAM, recordCreated lebih akhir (2026-07-17 vs 2026-07-07)',
  },
  // --- nomorSurat=4 ---
  {
    id: 'fd6d5df7-cdaa-468c-9ed0-da3a9ff03612',   // Muhammad Zakhy Fitra — DIPINJAM, 2026-07-07 02:01 (LEBIH AKHIR → direnumber)
    nomorLama: 4,
    nomorBaru: 43,
    tahunSurat: 2026,
    createdAt: '2026-07-07T02:01:37.065Z',
    alasan: 'DIPINJAM, recordCreated lebih akhir (02:01 vs 01:07)',
  },
  // --- nomorSurat=5 ---
  {
    id: '8c798694-f574-4ea6-be49-0adc7911075b',   // Alis Idekusuma — DIPINJAM, 2026-07-07 02:06 (LEBIH AKHIR → direnumber)
    nomorLama: 5,
    nomorBaru: 44,
    tahunSurat: 2026,
    createdAt: '2026-07-07T02:06:14.880Z',
    alasan: 'DIPINJAM, recordCreated lebih akhir (02:06 vs 01:06)',
  },
  // --- nomorSurat=6 ---
  {
    id: '1dbd0706-e9bb-40e0-ade4-b789eb4ec752',   // Frengky Manurung — DIPINJAM, 2026-07-07 02:07 (LEBIH AKHIR → direnumber)
    nomorLama: 6,
    nomorBaru: 45,
    tahunSurat: 2026,
    createdAt: '2026-07-07T02:07:24.689Z',
    alasan: 'DIPINJAM, recordCreated lebih akhir (02:07 vs 01:06)',
  },
  // --- nomorSurat=7 ---
  {
    id: '2797eaa8-74cf-4d9a-a56d-0eaf4c30a3e4',   // Wily Pradana — DIPINJAM, 2026-07-07 02:08 (LEBIH AKHIR → direnumber)
    nomorLama: 7,
    nomorBaru: 46,
    tahunSurat: 2026,
    createdAt: '2026-07-07T02:08:31.578Z',
    alasan: 'DIPINJAM, recordCreated lebih akhir (02:08 vs 01:07)',
  },
  // --- nomorSurat=8 ---
  {
    id: '7056c441-415c-4807-b243-58277d998a53',   // Ibnu Syahlan — DIPINJAM, 2026-07-07 02:13 (LEBIH AKHIR → direnumber)
    nomorLama: 8,
    nomorBaru: 47,
    tahunSurat: 2026,
    createdAt: '2026-07-07T02:13:12.669Z',
    alasan: 'DIPINJAM, recordCreated lebih akhir (02:13 vs 01:06)',
  },
  // --- nomorSurat=9 ---
  {
    id: '75844ca9-db0e-4719-ad85-ce97f9859dbb',   // Muhammad Khoirul — DIKEMBALIKAN, 2026-07-17 03:13 (LEBIH AKHIR → direnumber)
    nomorLama: 9,
    nomorBaru: 48,
    tahunSurat: 2026,
    createdAt: '2026-07-17T03:13:32.011Z',
    alasan: 'DIKEMBALIKAN, recordCreated lebih akhir (2026-07-17 vs 2026-07-07)',
  },
  // --- nomorSurat=10 ---
  {
    id: '70e9f39a-560e-498f-ad1d-31580eee5b8c',   // Wening Tunjung Iswari — DIKEMBALIKAN, 2026-07-07 01:07 (LEBIH AKHIR → direnumber)
    nomorLama: 10,
    nomorBaru: 49,
    tahunSurat: 2026,
    createdAt: '2026-07-07T01:07:25.929Z',
    alasan: 'DIKEMBALIKAN, KEDUA dari migrasi, recordCreated lebih akhir (01:07:25 vs 01:06:53)',
  },
  // --- nomorSurat=11 ---
  {
    id: '9d858bbb-ca84-4c68-be89-e82e408d839a',   // Unang — DIKEMBALIKAN, 2026-07-07 01:06 (LEBIH AKHIR → direnumber)
    nomorLama: 11,
    nomorBaru: 50,
    tahunSurat: 2026,
    createdAt: '2026-07-07T01:06:54.103Z',
    alasan: 'DIKEMBALIKAN, KEDUA dari migrasi, recordCreated lebih akhir (01:06:54 vs 01:06:34)',
  },
  // --- nomorSurat=20 ---
  {
    id: '7c75398f-c837-4715-a39a-fbefdf846920',   // Irwan Harisman — DIPINJAM, 2026-07-27 02:15 (LEBIH AKHIR → direnumber)
    nomorLama: 20,
    nomorBaru: 51,
    tahunSurat: 2026,
    createdAt: '2026-07-27T02:15:32.340Z',
    alasan: 'DIPINJAM, recordCreated lebih akhir (2026-07-27 vs 2026-07-07)',
  },
  // --- nomorSurat=38 ---
  {
    id: '0655b68b-85ab-4618-bcce-c49b76326234',   // Ria Shaintisia — DIPINJAM, 2026-07-07 01:07 (LEBIH AKHIR → direnumber)
    nomorLama: 38,
    nomorBaru: 52,
    tahunSurat: 2026,
    createdAt: '2026-07-07T01:07:05.443Z',
    alasan: 'DIPINJAM, recordCreated lebih akhir (01:07:05 vs 01:06:58)',
  },
  // --- nomorSurat=39 ---
  {
    id: '80c14caa-d944-45e0-9c82-a4e676307dba',   // Frisda Agriani Ambarita — DIPINJAM, 2026-07-29 08:01 (LEBIH AKHIR → direnumber)
    nomorLama: 39,
    nomorBaru: 53,
    tahunSurat: 2026,
    createdAt: '2026-07-29T08:01:25.814Z',
    alasan: 'DIPINJAM, recordCreated lebih akhir (2026-07-29 vs 2026-07-07)',
  },
];

const JENIS_NOMOR_SURAT = 'PEMINJAMAN';

// ----------------------------------------------------------
//  Fungsi bantu: increment atomik nomor surat
// ----------------------------------------------------------
async function ambilNomorBerikutnya(jenis, tahun) {
  const rows = await prisma.$queryRaw`
    INSERT INTO "nomor_surat_counter" ("id", "jenis", "tahun", "urutan")
    VALUES (gen_random_uuid(), ${jenis}, ${tahun}, 1)
    ON CONFLICT ("jenis", "tahun")
    DO UPDATE SET "urutan" = "nomor_surat_counter"."urutan" + 1
    RETURNING "urutan"
  `;
  return Number(rows[0].urutan);
}

// ----------------------------------------------------------
//  Main: dry-run atau eksekusi
// ----------------------------------------------------------
async function main() {
  const isDryRun = process.argv.includes('--dry-run') || process.argv.includes('-n');

  console.log('========================================================');
  console.log('RENUMBER DUPLIKAT NOMOR SURAT + TAHUN SURAT');
  console.log('========================================================');
  console.log('');
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (tidak mengubah data)' : 'EKSEKUSI (LIVE)'}`);
  console.log(`Total record yang akan direnumber: ${RENCANA.length}`);
  console.log(`Counter saat ini (PEMINJAMAN/2026): urutan=41`);
  console.log('');

  // --- Tampilkan rencana ---
  console.log('--- RENCANA PERUBAHAN ---');
  for (let i = 0; i < RENCANA.length; i++) {
    const r = RENCANA[i];
    console.log(`[${i + 1}] id=${r.id}`);
    console.log(`    nomorSurat: ${r.nomorLama} → ${r.nomorBaru} (tahun=${r.tahunSurat})`);
    console.log(`    createdAt:  ${r.createdAt}`);
    console.log(`    alasan:     ${r.alasan}`);
    console.log('');
  }

  if (isDryRun) {
    console.log('--- DRY RUN: tidak ada perubahan dilakukan ---');
    await prisma.$disconnect();
    process.exit(0);
  }

  // --- Konfirmasi interaktif ---
  console.log('');
  console.log('PERHATIAN: Script ini akan mengubah kolom nomorSurat di database.');
  console.log('Tekan ENTER untuk melanjutkan atau Ctrl+C untuk membatalkan...');

  await new Promise((resolve) => {
    process.stdin.once('data', () => resolve());
  });

  // --- Verifikasi tidak ada bentrok dengan record lain ---
  console.log('');
  console.log('--- Verifikasi: cek bentrok dengan record existing ---');
  for (const r of RENCANA) {
    const existing = await prisma.peminjaman.findFirst({
      where: {
        nomorSurat: r.nomorBaru,
        tahunSurat: r.tahunSurat,
        id: { not: r.id },
      },
    });
    if (existing) {
      console.error(`ERROR: nomorBaru ${r.nomorBaru}/${r.tahunSurat} bentrok dengan record existing id=${existing.id}`);
      await prisma.$disconnect();
      process.exit(1);
    }
  }
  console.log('  OK — tidak ada bentrok dengan record lain');

  // --- Verifikasi record masih punya nomorLama ---
  console.log('');
  console.log('--- Verifikasi: record masih punya nomorLama ---');
  for (const r of RENCANA) {
    const rec = await prisma.peminjaman.findUnique({
      where: { id: r.id },
      select: { nomorSurat: true },
    });
    if (!rec) {
      console.error(`ERROR: record ${r.id} tidak ditemukan!`);
      await prisma.$disconnect();
      process.exit(1);
    }
    if (rec.nomorSurat !== r.nomorLama) {
      console.error(`ERROR: record ${r.id} nomorSurat=${rec.nomorSurat}, diharapkan=${r.nomorLama}`);
      await prisma.$disconnect();
      process.exit(1);
    }
  }
  console.log('  OK — semua record masih memiliki nomorLama yang diharapkan');

  // --- Eksekusi update ---
  console.log('');
  console.log('--- EKSEKUSI UPDATE ---');
  const log = [];

  for (let i = 0; i < RENCANA.length; i++) {
    const r = RENCANA[i];

    await prisma.peminjaman.update({
      where: { id: r.id },
      data: { nomorSurat: r.nomorBaru },
    });

    log.push({
      index: i + 1,
      id: r.id,
      nomorLama: r.nomorLama,
      nomorBaru: r.nomorBaru,
      tahunSurat: r.tahunSurat,
      createdAt: r.createdAt,
    });

    console.log(`  [${i + 1}/${RENCANA.length}] ${r.id} | ${r.nomorLama} → ${r.nomorBaru} | tahun=${r.tahunSurat}`);
  }

  // --- Tampilkan hasil log ---
  console.log('');
  console.log('--- LOG PERUBAHAN ---');
  for (const entry of log) {
    console.log(`  [${entry.index}] id=${entry.id}`);
    console.log(`       nomorSurat: ${entry.nomorLama} → ${entry.nomorBaru} (tahun=${entry.tahunSurat})`);
  }

  // --- Simpan log ke file ---
  const fs = require('fs');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logPath = `scripts/logs/renumber-${timestamp}.json`;
  const dir = require('path').dirname(logPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(logPath, JSON.stringify({ timestamp, records: log }, null, 2));
  console.log(`\nLog saved: ${logPath}`);

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error('ERROR:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});
