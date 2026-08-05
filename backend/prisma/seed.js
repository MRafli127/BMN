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

// Kode barang = kunci natural aset (Kode Satker - Kode Barang - NUP).
function kodeNatural({ kodeSatker, kodeBarangBmn, nup }) {
  return [kodeSatker, kodeBarangBmn, nup].filter(Boolean).join('-');
}

async function main() {
  console.log('🌱 Menjalankan seeder SIPP-BMN...');

  // --- 1) Admin default ---
  const passwordAdmin = await bcrypt.hash(adminConfig.password, 10);
  const admin = await prisma.user.upsert({
    where: { email: adminConfig.email },
    // Akun demo multi-role: ADMIN + PEMINJAM, agar fitur switch role bisa langsung dicoba.
    update: { roles: ['ADMIN', 'PEMINJAM'] },
    create: {
      nama: adminConfig.nama,
      nip: adminConfig.nip,
      email: adminConfig.email,
      password: passwordAdmin,
      jabatan: 'Kepala Sub Bagian Pengelolaan BMN',
      unitKerja: 'Bagian Umum',
      roles: ['ADMIN', 'PEMINJAM'],
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
  ];

  for (const p of peminjamContoh) {
    const password = await bcrypt.hash('Peminjam123!', 10);
    await prisma.user.upsert({
      where: { email: p.email },
      update: {},
      create: { ...p, password, roles: ['PEMINJAM'] },
    });
  }
  console.log(`✅ ${peminjamContoh.length} peminjam contoh siap (password: Peminjam123!)`);

  // --- 3) Barang contoh ---
  // Identitas aset memakai kunci natural (Kode Satker - Kode Barang - NUP);
  // kodeBarang dibentuk otomatis dari ketiga komponen tersebut.
  const SATKER = '015110199411868000KP';
  const barangContoh = [
    {
      kodeSatker: SATKER,
      kodeBarangBmn: '3100102002',
      nup: '0001',
      nama: 'Laptop Dinas Lenovo ThinkPad',
      jenis: 'ELEKTRONIK',
      jumlahTotal: 10,
      jumlahTersedia: 10,
      kondisi: 'BAIK',
      lokasiPenyimpanan: 'Gudang Lt. 2 — Rak A1',
      deskripsi: 'Laptop untuk keperluan dinas, RAM 16GB, SSD 512GB.',
    },
  ];

  for (const b of barangContoh) {
    const kodeBarang = kodeNatural(b);
    await prisma.barang.upsert({
      where: { kodeBarang },
      update: {},
      create: { ...b, kodeBarang },
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
