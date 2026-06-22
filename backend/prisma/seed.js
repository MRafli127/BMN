// ============================================================
//  Seeder — mengisi data awal:
//   - 1 akun admin default (dari .env)
//   - 2 akun peminjam contoh
//   - beberapa data barang contoh
//  Dijalankan dengan: npm run seed  (atau npx prisma db seed)
// ============================================================

require('dotenv').config(); // muat .env saat dijalankan langsung via "npm run seed"
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Ambil konfigurasi admin dari environment (dengan default aman)
const adminConfig = {
  nama: process.env.ADMIN_NAMA || 'Administrator BMN',
  nip: process.env.ADMIN_NIP || '198001012010011001',
  email: process.env.ADMIN_EMAIL || 'admin@bmn.go.id',
  password: process.env.ADMIN_PASSWORD || 'Admin123!',
};

const tahun = new Date().getFullYear();

async function main() {
  console.log('🌱 Menjalankan seeder SIPP-BMN...');

  // --- 1) Admin default ---
  const passwordAdmin = await bcrypt.hash(adminConfig.password, 10);
  const admin = await prisma.user.upsert({
    where: { email: adminConfig.email },
    update: {},
    create: {
      nama: adminConfig.nama,
      nip: adminConfig.nip,
      email: adminConfig.email,
      password: passwordAdmin,
      jabatan: 'Kepala Sub Bagian Pengelolaan BMN',
      unitKerja: 'Bagian Umum',
      role: 'ADMIN',
    },
  });
  console.log(`✅ Admin siap: ${admin.email}`);

  // --- 2) Peminjam contoh ---
  const peminjamContoh = [
    {
      nama: 'Budi Santoso',
      nip: '199203152015031002',
      email: 'budi@bmn.go.id',
      jabatan: 'Staf Analis',
      unitKerja: 'Bagian Perencanaan',
    },
    {
      nama: 'Siti Aminah',
      nip: '199507202018042003',
      email: 'siti@bmn.go.id',
      jabatan: 'Bendahara',
      unitKerja: 'Bagian Keuangan',
    },
    {
      nama: 'Rafli Pratama',
      nip: '199801102021011004',
      email: 'rafli@kemenkeu.go.id',
      jabatan: 'Staf Pengelola BMN',
      unitKerja: 'Bagian Umum',
    },
  ];

  for (const p of peminjamContoh) {
    const password = await bcrypt.hash('Peminjam123!', 10);
    await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: { ...p, password, role: 'PEMINJAM' },
    });
  }
  console.log(`✅ ${peminjamContoh.length} peminjam contoh siap (password: Peminjam123!)`);

  // --- 3) Barang contoh ---
  const barangContoh = [
    {
      kodeBarang: `BMN-${tahun}-0001`,
      nama: 'Laptop Dinas Lenovo ThinkPad',
      jenis: 'ELEKTRONIK',
      jumlahTotal: 10,
      jumlahTersedia: 10,
      kondisi: 'BAIK',
      lokasiPenyimpanan: 'Gudang Lt. 2 — Rak A1',
      deskripsi: 'Laptop untuk keperluan dinas, RAM 16GB, SSD 512GB.',
    },
    {
      kodeBarang: `BMN-${tahun}-0002`,
      nama: 'Proyektor Epson EB-X51',
      jenis: 'ELEKTRONIK',
      jumlahTotal: 5,
      jumlahTersedia: 5,
      kondisi: 'BAIK',
      lokasiPenyimpanan: 'Ruang Multimedia',
      deskripsi: 'Proyektor untuk rapat dan presentasi.',
    },
    {
      kodeBarang: `BMN-${tahun}-0003`,
      nama: 'Kursi Lipat Chitose',
      jenis: 'FURNITUR',
      jumlahTotal: 50,
      jumlahTersedia: 50,
      kondisi: 'BAIK',
      lokasiPenyimpanan: 'Gudang Lt. 1',
      deskripsi: 'Kursi lipat untuk kegiatan acara dan rapat besar.',
    },
    {
      kodeBarang: `BMN-${tahun}-0004`,
      nama: 'Kamera DSLR Canon EOS 800D',
      jenis: 'ELEKTRONIK',
      jumlahTotal: 3,
      jumlahTersedia: 3,
      kondisi: 'BAIK',
      lokasiPenyimpanan: 'Ruang Humas',
      deskripsi: 'Kamera untuk dokumentasi kegiatan kantor.',
    },
    {
      kodeBarang: `BMN-${tahun}-0005`,
      nama: 'Mobil Dinas Toyota Avanza',
      jenis: 'KENDARAAN',
      jumlahTotal: 2,
      jumlahTersedia: 2,
      kondisi: 'BAIK',
      lokasiPenyimpanan: 'Garasi Kantor',
      deskripsi: 'Kendaraan operasional untuk perjalanan dinas dalam kota.',
    },
    {
      kodeBarang: `BMN-${tahun}-0006`,
      nama: 'Pengeras Suara (Sound System) Portable',
      jenis: 'ELEKTRONIK',
      jumlahTotal: 4,
      jumlahTersedia: 4,
      kondisi: 'RUSAK_RINGAN',
      lokasiPenyimpanan: 'Gudang Lt. 2 — Rak B3',
      deskripsi: 'Sound system portable, salah satu speaker perlu perbaikan kecil.',
    },
  ];

  for (const b of barangContoh) {
    await prisma.barang.upsert({
      where: { kodeBarang: b.kodeBarang },
      update: {},
      create: b,
    });
  }
  console.log(`✅ ${barangContoh.length} barang contoh siap`);

  console.log('\n🎉 Seeder selesai!');
  console.log('--------------------------------------------------');
  console.log(`  Login Admin    : ${adminConfig.email} / ${adminConfig.password}`);
  console.log('  Login Peminjam : budi@bmn.go.id / Peminjam123!');
  console.log('--------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeder gagal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
