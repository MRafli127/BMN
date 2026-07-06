// ============================================================
//  Test Script: Notifikasi Pensiun
//  Jalankan: node test-pensiun.js
// ============================================================

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const notificationService = require('./src/services/notification.service');
const nipHelper = require('./src/utils/nipHelper');

const prisma = new PrismaClient();

async function test() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     TEST FITUR NOTIFIKASI PENSIUN - SIPP BMN              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // ============================================================
  // CLEANUP: Hapus data test lama
  // ============================================================
  console.log('🧹 CLEANUP: Menghapus data test lama...\n');

  const testEmails = [
    'test.25hari@bmn.go.id',
    'test.60hari@bmn.go.id',
    'test.100hari@bmn.go.id',
    'test.25harinopinjam@bmn.go.id'
  ];

  for (const email of testEmails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.notifikasi.deleteMany({ where: { userId: user.id } });
      await prisma.peminjaman.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
      console.log(`   ✅ Deleted: ${email}`);
    }
  }
  console.log('');

  // ============================================================
  // SETUP: Buat user test
  // ============================================================
  console.log('📦 SETUP: Membuat data test baru...\n');

  const passwordHash = await bcrypt.hash('Test123!', 10);
  const timestamp = Date.now(); // Untuk bikin NIP unik

  // Helper: buat NIP unik dari tanggal pensiun
  function buatNipDariPensiun(tanggalPensiun, suffix) {
    const lahir = new Date(tanggalPensiun);
    lahir.setFullYear(lahir.getFullYear() - 58);
    return lahir.getFullYear() +
      String(lahir.getMonth() + 1).padStart(2, '0') +
      String(lahir.getDate()).padStart(2, '0') +
      suffix;
  }

  // Helper: buat user test
  async function buatUserTest(email, nama, hariPensiun, unitKerja, suffix) {
    const pensiun = new Date();
    pensiun.setDate(pensiun.getDate() + hariPensiun);
    const nip = buatNipDariPensiun(pensiun, suffix);

    const user = await prisma.user.create({
      data: {
        nama,
        nip,
        email,
        password: passwordHash,
        role: 'PEMINJAM',
        retirementDate: pensiun,
        unitKerja
      }
    });
    return user;
  }

  // Buat 4 user test dengan NIP unik
  const user25 = await buatUserTest('test.25hari@bmn.go.id', 'Dr. Ahmad Wijaya', 25, 'Bagian Umum', '0001');
  const user60 = await buatUserTest('test.60hari@bmn.go.id', 'Ir. Budi Santoso', 60, 'Bagian Keuangan', '0002');
  const user100 = await buatUserTest('test.100hari@bmn.go.id', 'Drs. Chandra Dewi', 100, 'Bagian Perencanaan', '0003');
  const user25np = await buatUserTest('test.25harinopinjam@bmn.go.id', 'Ir. Eko Prasetyo', 25, 'Bagian SDM', '0004');

  console.log('✅ User test dibuat:');
  console.log('   1. Dr. Ahmad Wijaya     - Pensiun 25 hari  - Ada peminjaman aktif');
  console.log('   2. Ir. Budi Santoso     - Pensiun 60 hari  - Ada peminjaman aktif');
  console.log('   3. Drs. Chandra Dewi    - Pensiun 100 hari - Ada peminjaman aktif');
  console.log('   4. Ir. Eko Prasetyo     - Pensiun 25 hari  - TIDAK ada peminjaman\n');

  // Buat peminjaman aktif untuk user 1, 2, 3
  const barang = await prisma.barang.findFirst({ where: { jumlahTersedia: { gt: 0 } } });
  const usersDenganPinjam = [user25, user60, user100];

  for (const u of usersDenganPinjam) {
    const existing = await prisma.peminjaman.findFirst({
      where: { userId: u.id, status: { in: ['DIPINJAM', 'TERLAMBAT'] } }
    });
    if (!existing) {
      await prisma.peminjaman.create({
        data: {
          userId: u.id,
          kodePeminjaman: barang.kodeBarang,
          status: 'DIPINJAM',
          tanggalKembaliRencana: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          detail: {
            create: {
              barangId: barang.id,
              jumlahPinjam: 1,
              statusItem: 'DIPINJAM'
            }
          }
        }
      });
    }
  }
  console.log('✅ Peminjaman aktif dibuat untuk 3 user\n');

  // ============================================================
  // TEST 1: Verifikasi kondisi
  // ============================================================
  console.log('════════════════════════════════════════════════════════════');
  console.log('🧪 TEST 1: Verifikasi Kondisi Awal');
  console.log('════════════════════════════════════════════════════════════\n');

  const semuaUser = [user25, user60, user100, user25np];
  const semuaIds = semuaUser.map(u => u.id);

  // Hapus notifikasi test sebelumnya
  await prisma.notifikasi.deleteMany({ where: { userId: { in: semuaIds } } });

  for (const u of semuaUser) {
    const sisaHari = nipHelper.hitungSisaHari(u.retirementDate);
    const pinjam = await prisma.peminjaman.count({
      where: { userId: u.id, status: { in: ['DIPINJAM', 'TERLAMBAT'] } }
    });
    const dalamRange = sisaHari > 0 && sisaHari <= 90;
    const perluNotif = dalamRange && pinjam > 0;

    console.log(`   ${u.nama}`);
    console.log(`      Sisa hari: ${sisaHari} hari`);
    console.log(`      Peminjaman aktif: ${pinjam}`);
    console.log(`      Dalam range 90 hari: ${dalamRange ? '✅ Ya' : '❌ Tidak'}`);
    console.log(`      Perlu notifikasi: ${perluNotif ? '✅ Ya' : '❌ Tidak'}`);
    console.log('');
  }

  // ============================================================
  // TEST 2: Jalankan Logic Cron Job
  // ============================================================
  console.log('════════════════════════════════════════════════════════════');
  console.log('🧪 TEST 2: Jalankan Logic Cron Job');
  console.log('════════════════════════════════════════════════════════════\n');

  console.log('[CRON] Job dimulai...\n');

  const waktuMulai = Date.now();

  // Langkah 1: Ambil user
  const userList = await prisma.user.findMany({
    where: { retirementDate: { not: null }, role: 'PEMINJAM' },
    select: { id: true, nama: true, nip: true, retirementDate: true }
  });
  console.log(`[CRON] Total user dengan retirementDate: ${userList.length}`);

  // Langkah 2: Filter <= 90 hari
  const userMendekati = userList.filter(u => {
    const sisa = nipHelper.hitungSisaHari(u.retirementDate);
    return sisa > 0 && sisa <= 90;
  });
  console.log(`[CRON] User mendekati pensiun (<=90 hari): ${userMendekati.length}\n`);

  // Langkah 3: Ambil peminjaman aktif
  const userIds = userMendekati.map(u => u.id);
  const peminjamanAktif = await prisma.peminjaman.findMany({
    where: { userId: { in: userIds }, status: { in: ['DIPINJAM', 'TERLAMBAT'] } },
    include: { detail: { include: { barang: true } } }
  });

  const pinjamPerUser = new Map();
  for (const p of peminjamanAktif) {
    if (!pinjamPerUser.has(p.userId)) pinjamPerUser.set(p.userId, []);
    pinjamPerUser.get(p.userId).push(p);
  }

  // Langkah 4: Cek duplikat & buat notifikasi
  const hariIni = new Date();
  hariIni.setHours(0, 0, 0, 0);
  const besok = new Date(hariIni);
  besok.setDate(besok.getDate() + 1);

  let notifikasiDibuat = 0;
  const hasil = [];

  for (const user of userMendekati) {
    const daftarPinjam = pinjamPerUser.get(user.id) || [];

    // Skip jika tidak ada peminjaman aktif
    if (daftarPinjam.length === 0) {
      console.log(`[CRON] ⏭️  Skip ${user.nama} - tidak ada peminjaman aktif`);
      continue;
    }

    // Cek duplikat
    const sudahAda = await prisma.notifikasi.findFirst({
      where: {
        userId: user.id,
        tipe: notificationService.TIPE_NOTIFIKASI.PENSIUN_MENDEKATI,
        createdAt: { gte: hariIni, lt: besok }
      }
    });

    if (sudahAda) {
      console.log(`[CRON] ⏭️  Skip ${user.nama} - notifikasi sudah ada`);
      continue;
    }

    // Bangun pesan
    const sisaHari = nipHelper.hitungSisaHari(user.retirementDate);
    const barangList = [];
    for (const p of daftarPinjam) {
      for (const d of p.detail) {
        if (d.statusItem === 'DIPINJAM') {
          barangList.push(`${d.barang.nama} (${d.barang.kodeBarang})`);
        }
      }
    }

    const judul = `Pensiun dalam ${sisaHari} hari`;
    const pesan = `${user.nama} (NIP: ${user.nip}) akan pensiun dalam ${sisaHari} hari.

Barang belum dikembalikan (${barangList.length} item):
${barangList.map((b, i) => `  ${i + 1}. ${b}`).join('\n')}

Mohon segera lakukan proses pengembalian BMN.`;

    // Kirim notifikasi
    const notif = await notificationService.kirimKeUser(user.id, {
      tipe: notificationService.TIPE_NOTIFIKASI.PENSIUN_MENDEKATI,
      judul,
      pesan,
      prioritas: 'TINGGI',
      referenceId: user.id,
      referenceType: 'PENSIUN'
    });

    notifikasiDibuat++;
    hasil.push({ nama: user.nama, sisaHari, judul });
    console.log(`[CRON] ✅ Notifikasi dibuat untuk ${user.nama} (${sisaHari} hari)`);
  }

  const durasi = Date.now() - waktuMulai;
  console.log(`\n[CRON] ═══════════════════════════════════════════════════`);
  console.log(`[CRON] Job selesai dalam ${durasi}ms`);
  console.log(`[CRON] Notifikasi dibuat: ${notifikasiDibuat}`);
  console.log(`[CRON] ═══════════════════════════════════════════════════\n`);

  // ============================================================
  // TEST 3: Verifikasi Hasil
  // ============================================================
  console.log('════════════════════════════════════════════════════════════');
  console.log('🧪 TEST 3: Verifikasi Hasil');
  console.log('════════════════════════════════════════════════════════════\n');

  const notifikasiDB = await prisma.notifikasi.findMany({
    where: { userId: { in: semuaIds } },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Total notifikasi dibuat: ${notifikasiDB.length}\n`);

  for (const n of notifikasiDB) {
    console.log('┌─────────────────────────────────────────────────────────');
    console.log(`│ Judul: ${n.judul}`);
    console.log(`│ Prioritas: ${n.prioritas}`);
    console.log(`│ Tipe: ${n.tipe}`);
    console.log('│ Pesan:');
    n.pesan.split('\n').forEach(line => console.log(`│   ${line}`));
    console.log('└─────────────────────────────────────────────────────────\n');
  }

  // ============================================================
  // TEST 4: Verifikasi Expected Results
  // ============================================================
  console.log('════════════════════════════════════════════════════════════');
  console.log('🧪 TEST 4: Verifikasi Expected Results');
  console.log('════════════════════════════════════════════════════════════\n');

  const expectedResults = [
    { user: user25, shouldHave: true, reason: '25 hari, ada peminjaman' },
    { user: user60, shouldHave: true, reason: '60 hari, ada peminjaman' },
    { user: user100, shouldHave: false, reason: '100 hari (> 90)' },
    { user: user25np, shouldHave: false, reason: '25 hari, tapi tidak ada peminjaman' }
  ];

  let passed = 0;
  let failed = 0;

  for (const { user, shouldHave, reason } of expectedResults) {
    const adaNotif = notifikasiDB.some(n => n.userId === user.id);
    const status = shouldHave === adaNotif;

    if (status) {
      passed++;
      console.log(`✅ ${user.nama}: PASS`);
    } else {
      failed++;
      console.log(`❌ ${user.nama}: FAIL`);
    }
    console.log(`   Reason: ${reason}`);
    console.log(`   Should have: ${shouldHave ? 'Ya' : 'Tidak'}`);
    console.log(`   Actually has: ${adaNotif ? 'Ya' : 'Tidak'}`);
    console.log('');
  }

  console.log('════════════════════════════════════════════════════════════');
  console.log(`📊 SUMMARY: ${passed} passed, ${failed} failed`);
  console.log('════════════════════════════════════════════════════════════\n');

  // ============================================================
  // CLEANUP
  // ============================================================
  console.log('🧹 CLEANUP: Menghapus data test...\n');

  for (const u of semuaUser) {
    await prisma.notifikasi.deleteMany({ where: { userId: u.id } });
    await prisma.peminjaman.deleteMany({ where: { userId: u.id } });
    await prisma.user.delete({ where: { id: u.id } });
  }

  console.log('✅ Semua data test berhasil dihapus\n');

  // ============================================================
  // FINAL RESULT
  // ============================================================
  if (failed === 0) {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║          🎉 SEMUA TEST BERHASIL! 🎉                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  } else {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║          ❌ ADA TEST YANG GAGAL ❌                        ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  }

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

test().catch(e => {
  console.error('\n❌ Error:', e.message);
  console.error(e.stack);
  process.exit(1);
});
