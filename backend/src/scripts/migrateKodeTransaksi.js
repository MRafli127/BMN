// ============================================================
//  Script Migrasi: Update kodeTransaksi ke format natural
//
//  Format lama (sudah dihapus dari generateKode): BMN-YYYYMMDD-XXXXX
//  Format baru (wajib): kodeSatker-kodeBarangBmn-NUP
//
//  Usage: node src/scripts/migrateKodeTransaksi.js
// ============================================================

const { prisma } = require('../config/database');

async function migrate() {
  console.log('🚀 Memulai migrasi kodeTransaksi...\n');

  // Cari semua peminjaman dengan kodeTransaksi format lama (BMN-)
  const peminjamanLama = await prisma.peminjaman.findMany({
    where: {
      kodeTransaksi: {
        startsWith: 'BMN-',
      },
    },
    include: {
      detail: {
        include: {
          barang: {
            select: {
              kodeSatker: true,
              kodeBarangBmn: true,
              nup: true,
              kodeBarang: true,
            },
          },
        },
      },
    },
  });

  console.log(`📋 Ditemukan ${peminjamanLama.length} peminjaman dengan format lama.\n`);

  if (peminjamanLama.length === 0) {
    console.log('✅ Tidak ada data yang perlu dimigrasikan.');
    return;
  }

  let berhasil = 0;
  let dilewati = 0;
  const errors = [];

  for (const p of peminjamanLama) {
    try {
      // Ambil barang pertama dari detail
      const barang = p.detail?.[0]?.barang;

      if (!barang || !barang.kodeSatker || !barang.kodeBarangBmn || !barang.nup) {
        console.log(`⚠️  Skip: ${p.kodeTransaksi} (barang tidak lengkap)`);
        dilewati++;
        continue;
      }

      // Bentuk kode baru
      const kodeBaru = `${barang.kodeSatker}-${barang.kodeBarangBmn}-${barang.nup}`;

      // Cek apakah kode baru sudah ada
      const existing = await prisma.peminjaman.findFirst({
        where: {
          kodeTransaksi: kodeBaru,
          id: { not: p.id },
        },
      });

      if (existing) {
        // Jika sudah ada, tambahkan suffix
        let suffix = 1;
        let kodeDenganSuffix = `${kodeBaru}-${suffix}`;
        while (true) {
          const ada = await prisma.peminjaman.findFirst({
            where: {
              kodeTransaksi: kodeDenganSuffix,
              id: { not: p.id },
            },
          });
          if (!ada) break;
          suffix++;
          kodeDenganSuffix = `${kodeBaru}-${suffix}`;
          if (suffix > 100) {
            errors.push(`Gagal update ${p.kodeTransaksi}: tidak bisa menemukan suffix unik`);
            break;
          }
        }
        if (suffix <= 100) {
          await prisma.peminjaman.update({
            where: { id: p.id },
            data: { kodeTransaksi: kodeDenganSuffix },
          });
          console.log(`  ✅ ${p.kodeTransaksi} → ${kodeDenganSuffix}`);
          berhasil++;
        }
      } else {
        // Update langsung dengan kode baru
        await prisma.peminjaman.update({
          where: { id: p.id },
          data: { kodeTransaksi: kodeBaru },
        });
        console.log(`  ✅ ${p.kodeTransaksi} → ${kodeBaru}`);
        berhasil++;
      }
    } catch (err) {
      errors.push(`Error update ${p.kodeTransaksi}: ${err.message}`);
      console.log(`  ❌ ${p.kodeTransaksi}: ${err.message}`);
    }
  }

  console.log('\n📊 Hasil Migrasi:');
  console.log(`   ✅ Berhasil: ${berhasil}`);
  console.log(`   ⚠️  Dilewati: ${dilewati}`);
  console.log(`   ❌ Error: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\n📝 Detail Error:');
    errors.forEach((e) => console.log(`   - ${e}`));
  }

  console.log('\n🎉 Migrasi selesai!');
}

migrate()
  .catch((err) => {
    console.error('❌ Migrasi gagal:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
