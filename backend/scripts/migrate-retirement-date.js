// ============================================================
//  Script Migrasi: Tambahkan retirementDate ke user yang belum punya
//
//  Masalah: User yang dibuat sebelum fitur pensiun ditambahkan
//  tidak memiliki retirementDate, sehingga tidak mendapat notifikasi.
//
//  Solusi: Hitung dan update retirementDate dari NIP untuk semua
//  user yang belum punya.
//
//  Jalankan: node scripts/migrate-retirement-date.js
// ============================================================

const { PrismaClient } = require('@prisma/client');
const { hitungRetirementDateDariNip, validasiNip } = require('../src/utils/nipHelper');

const prisma = new PrismaClient();

async function migrate() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  MIGRASI: Menambahkan retirementDate ke user yang belum punya');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Ambil semua user yang tidak memiliki retirementDate
    const userTanpaPensiun = await prisma.user.findMany({
      where: {
        retirementDate: null,
        roles: { has: 'PEMINJAM' }, // Hanya user peminjam
      },
      select: {
        id: true,
        nama: true,
        nip: true,
        email: true,
      },
    });

    console.log(`Total user tanpa retirementDate: ${userTanpaPensiun.length}\n`);

    if (userTanpaPensiun.length === 0) {
      console.log('✅ Semua user sudah memiliki retirementDate. Tidak ada yang perlu dimigrasikan.\n');
      return;
    }

    let berhasil = 0;
    let gagal = 0;
    const detailBerhasil = [];
    const detailGagal = [];

    for (const user of userTanpaPensiun) {
      // Validasi NIP
      const validasi = validasiNip(user.nip);
      if (!validasi.valid) {
        console.log(`❌ ${user.nama} (${user.email}) - NIP tidak valid: ${validasi.error}`);
        detailGagal.push({ nama: user.nama, nip: user.nip, alasan: validasi.error });
        gagal++;
        continue;
      }

      // Hitung retirement date
      const retirementDate = hitungRetirementDateDariNip(user.nip);
      if (!retirementDate) {
        console.log(`❌ ${user.nama} (${user.email}) - Gagal menghitung tanggal pensiun`);
        detailGagal.push({ nama: user.nama, nip: user.nip, alasan: 'Gagal menghitung tanggal pensiun' });
        gagal++;
        continue;
      }

      // Update user
      await prisma.user.update({
        where: { id: user.id },
        data: { retirementDate },
      });

      const sisaHari = Math.ceil((retirementDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      console.log(`✅ ${user.nama} (${user.email}) - Pensiun: ${retirementDate.toISOString().split('T')[0]} (${sisaHari} hari lagi)`);
      detailBerhasil.push({
        nama: user.nama,
        nip: user.nip,
        email: user.email,
        retirementDate: retirementDate.toISOString(),
        sisaHari,
      });
      berhasil++;
    }

    // Ringkasan
    console.log('\n════════════════════════════════════════════════════════════');
    console.log('📊 HASIL MIGRASI');
    console.log('════════════════════════════════════════════════════════════');
    console.log(`   Berhasil: ${berhasil}`);
    console.log(`   Gagal: ${gagal}`);
    console.log('════════════════════════════════════════════════════════════\n');

    if (detailGagal.length > 0) {
      console.log('⚠️  User yang gagal dimigrasikan:');
      for (const g of detailGagal) {
        console.log(`   - ${g.nama} (${g.nip}): ${g.alasan}`);
      }
      console.log('');
    }

    if (berhasil > 0) {
      console.log('✅ User-user berikut sekarang akan mendapat notifikasi pensiun:');
      for (const b of detailBerhasil) {
        const status = b.sisaHari > 0 && b.sisaHari <= 90
          ? '🔔 Akan segera mendapat notifikasi'
          : b.sisaHari <= 0
            ? '⚠️ Sudah lewat tanggal pensiun'
            : '📅 Belum dalam periode notifikasi (90 hari)';
        console.log(`   - ${b.nama}: ${status}`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('\n❌ Error migrasi:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

migrate()
  .then(() => {
    console.log('════════════════════════════════════════════════════════════\n');
    console.log('✨ Migrasi selesai.\n');
    process.exit(0);
  })
  .catch((e) => {
    console.error('\n❌ Migrasi gagal:', e.message);
    process.exit(1);
  });
