// ============================================================
//  Service Barang
//  CRUD barang + pencarian, filter, dan pagination.
//  Kode barang dibuat otomatis & unik.
// ============================================================

const { prisma } = require('../config/database');
const { kodeNaturalBarang } = require('../utils/generateKode');
const { urlPublik } = require('../utils/apiResponse');
const { parsePagination } = require('../utils/pagination');
const { AppError } = require('../middleware/error.middleware');
const auditLogService = require('./auditLog.service');

// Include untuk detail halaman (relasi peminjam untuk melihat siapa yang pinjam)
// Catatan: filtering status dilakukan di JavaScript oleh ekstrakPeminjam()
const includePeminjam = {
  detailPeminjaman: {
    include: {
      peminjaman: {
        include: {
          peminjam: {
            select: {
              id: true,
              nama: true,
              nip: true,
              jabatan: true,
              unitKerja: true,
            },
          },
        },
      },
    },
  },
};

// Ekstrak data peminjam dari relasi
// Mengambil peminjam aktif: statusItem = 'DIPINJAM' dan status peminjaman aktif
function ekstrakPeminjam(barang) {
  if (!barang?.detailPeminjaman?.length) return null;
  const aktif = barang.detailPeminjaman.find(
    (dp) =>
      dp.statusItem === 'DIPINJAM' &&
      dp.peminjaman?.status &&
      ['DISETUJUI', 'DIPINJAM', 'TERLAMBAT'].includes(dp.peminjaman.status)
  );
  return aktif?.peminjaman?.peminjam || null;
}

// Ubah fotoUrl relatif menjadi absolut untuk client
function serialisasi(barang) {
  if (!barang) return barang;
  return { ...barang, fotoUrl: urlPublik(barang.fotoUrl) };
}

// --- Ambil daftar barang dengan pencarian/filter/pagination ---
async function getSemua({ q, jenis, kondisi, ketersediaan, kodeSatker, page = 1, limit = 10, includeDetail = false } = {}) {
  const { halaman, perHalaman, skip } = parsePagination({ page, limit });

  const where = {};
  if (q) {
    where.OR = [
      { nama: { contains: q, mode: 'insensitive' } },
      { kodeBarang: { contains: q, mode: 'insensitive' } },
      { merk: { contains: q, mode: 'insensitive' } },
      { lokasiPenyimpanan: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (jenis) where.jenis = jenis;
  if (kondisi) where.kondisi = kondisi;
  if (kodeSatker) where.kodeSatker = kodeSatker;
  // Ketersediaan stok: 'tersedia' = masih ada unit (>0), 'habis' = nol/terpinjam penuh.
  if (ketersediaan === 'tersedia') where.jumlahTersedia = { gt: 0 };
  else if (ketersediaan === 'habis') where.jumlahTersedia = { lte: 0 };

  const [data, total] = await Promise.all([
    prisma.barang.findMany({
      where,
      include: includeDetail ? includePeminjam : undefined,
      orderBy: { createdAt: 'desc' },
      skip: (halaman - 1) * perHalaman,
      take: perHalaman,
    }),
    prisma.barang.count({ where }),
  ]);

  return {
    data: data.map((b) => {
      const serialized = serialisasi(b);
      // Jika tidak include detail, hapus field yang tidak perlu
      if (!includeDetail) {
        serialized.peminjam = null;
        return serialized;
      }
      serialized.peminjam = ekstrakPeminjam(b);
      return serialized;
    }),
    meta: {
      total,
      page: halaman,
      limit: perHalaman,
      totalHalaman: Math.ceil(total / perHalaman) || 1,
    },
  };
}

// --- Ambil satu barang ---
async function getById(id) {
  const barang = await prisma.barang.findUnique({
    where: { id },
    include: includePeminjam,
  });
  if (!barang) throw new AppError('Barang tidak ditemukan.', 404);
  const serialized = serialisasi(barang);
  serialized.peminjam = ekstrakPeminjam(barang);
  return serialized;
}

// --- Tambah barang baru ---
// Kode barang = kunci natural aset (Kode Satker - Kode Barang - NUP),
// sama seperti barang hasil import. Tidak ada lagi kode auto-increment.
async function create(data, fotoPath) {
  const kodeBarang = kodeNaturalBarang(data);
  if (!kodeBarang) {
    throw new AppError('Kode Satker, Kode Barang, dan NUP wajib diisi untuk membentuk kode aset.', 400);
  }

  try {
    const barang = await prisma.barang.create({
      data: {
        kodeBarang,
        nama: data.nama,
        merk: data.merk || null,
        tipe: data.tipe || null,
        jenis: data.jenis,
        jumlahTotal: data.jumlahTotal,
        jumlahTersedia: data.jumlahTotal, // awalnya semua tersedia
        kondisi: data.kondisi || 'BAIK',
        lokasiPenyimpanan: data.lokasiPenyimpanan || null,
        deskripsi: data.deskripsi || null,
        fotoUrl: fotoPath || null,
        sumber: 'MANUAL',
        kodeSatker: data.kodeSatker,
        kodeBarangBmn: data.kodeBarangBmn,
        nup: data.nup,
      },
    });
    return serialisasi(barang);
  } catch (e) {
    if (e.code === 'P2002') {
      throw new AppError('Aset dengan kombinasi Kode Satker + Kode Barang + NUP tersebut sudah terdaftar.', 409);
    }
    throw e;
  }
}

// --- Edit barang ---
async function update(id, data, fotoPath) {
  const barang = await prisma.barang.findUnique({ where: { id } });
  if (!barang) throw new AppError('Barang tidak ditemukan.', 404);

  const dataUpdate = { ...data };

  // Bila komponen identitas aset dikirim, bentuk ulang kodeBarang dari
  // kunci natural (gabungan nilai baru + nilai lama yang tidak diubah).
  if (data.kodeSatker !== undefined || data.kodeBarangBmn !== undefined || data.nup !== undefined) {
    const kodeBarang = kodeNaturalBarang({
      kodeSatker: data.kodeSatker ?? barang.kodeSatker,
      kodeBarangBmn: data.kodeBarangBmn ?? barang.kodeBarangBmn,
      nup: data.nup ?? barang.nup,
    });
    if (!kodeBarang) {
      throw new AppError('Kode Satker, Kode Barang, dan NUP wajib diisi untuk membentuk kode aset.', 400);
    }
    dataUpdate.kodeBarang = kodeBarang;
  }

  // Jika jumlahTotal diubah, sesuaikan jumlahTersedia secara proporsional.
  // Jumlah yang sedang dipinjam = total lama - tersedia lama.
  if (typeof data.jumlahTotal === 'number') {
    const sedangDipinjam = barang.jumlahTotal - barang.jumlahTersedia;
    const tersediaBaru = data.jumlahTotal - sedangDipinjam;
    if (tersediaBaru < 0) {
      throw new AppError(
        `Jumlah total tidak boleh kurang dari jumlah yang sedang dipinjam (${sedangDipinjam}).`,
        400
      );
    }
    dataUpdate.jumlahTersedia = tersediaBaru;
  }
  if (fotoPath) dataUpdate.fotoUrl = fotoPath;

  try {
    const updated = await prisma.barang.update({ where: { id }, data: dataUpdate });
    return serialisasi(updated);
  } catch (e) {
    if (e.code === 'P2002') {
      throw new AppError('Aset dengan kombinasi Kode Satker + Kode Barang + NUP tersebut sudah terdaftar.', 409);
    }
    throw e;
  }
}

// --- Hapus barang ---
async function remove(id, adminId = null, requestInfo = {}) {
  // Cek barang ada atau tidak
  const barang = await prisma.barang.findUnique({
    where: { id },
  });
  if (!barang) throw new AppError('Barang tidak ditemukan.', 404);

  // Cek apakah ada detail peminjaman aktif (DIPINJAM)
  const detailAktif = await prisma.detailPeminjaman.findFirst({
    where: { barangId: id, statusItem: 'DIPINJAM' },
  });
  if (detailAktif) {
    throw new AppError('Barang tidak dapat dihapus karena sedang dipinjam.', 400);
  }

  // Cek apakah ada relasi detail_peminjaman APAPUN (termasuk DIKEMBALIKAN)
  // Jika ada, hapus relasi tersebut lebih dulu agar tidak violation foreign key
  const detailPeminjaman = await prisma.detailPeminjaman.findMany({
    where: { barangId: id },
  });

  if (detailPeminjaman.length > 0) {
    // Hapus detail peminjaman terkait lebih dulu
    await prisma.detailPeminjaman.deleteMany({
      where: { barangId: id },
    });
  }

  await prisma.barang.delete({ where: { id } });

  // Audit log: catat penghapusan barang dengan detail lengkap
  const kodeBarangStr = [barang.kodeSatker || '-', barang.kodeBarangBmn || '-', barang.nup || '-'].join(' - ');
  const admin = adminId
    ? await prisma.user.findUnique({ where: { id: adminId }, select: { id: true, nama: true, email: true } })
    : null;

  auditLogService.log({
    userId: admin?.id || null,
    userEmail: admin?.email || null,
    userNama: admin?.nama || 'Admin',
    aksi: auditLogService.AKSI.BARANG_DELETE,
    entitas: auditLogService.ENTITAS.BARANG,
    entitasId: id,
    dataLama: {
      nama: barang.nama,
      merk: barang.merk,
      kodeBarang: barang.kodeBarang,
      kodeSatker: barang.kodeSatker,
      kodeBarangBmn: barang.kodeBarangBmn,
      nup: barang.nup,
      kodeBarangLengkap: kodeBarangStr,
    },
    requestInfo,
  }).catch(() => {});

  return { id };
}

// --- Cek stok barang untuk polling cart ---
// Input: array of barang IDs
// Output: barang yang tidak tersedia lagi (stok = 0 atau tidak ada)
async function checkStokTersedia(barangIds) {
  if (!barangIds || barangIds.length === 0) return [];

  const barang = await prisma.barang.findMany({
    where: { id: { in: barangIds } },
    select: {
      id: true,
      nama: true,
      merk: true,
      kodeBarang: true,
      jumlahTersedia: true,
      fotoUrl: true,
    },
  });

  // Barang yang sudah tidak tersedia (stok habis atau dihapus)
  const tidakTersedia = barang.filter((b) => b.jumlahTersedia < 1);

  return tidakTersedia.map((b) => ({
    ...b,
    fotoUrl: urlPublik(b.fotoUrl),
  }));
}

// --- Bulk Insert barang ---
// Bulk insert banyak barang sekaligus dengan NUP auto-generate.
// NUP berdasarkan Kode Satker + Kode Barang SAJA (merk TIDAK mempengaruhi sequence).
async function bulkCreate(data, fotoPath) {
  const { nama, merk, jenis, kondisi, lokasiPenyimpanan, deskripsi, kodeSatker, kodeBarangBmn, jumlahBarang } = data;

  // Normalize merk: uppercase, trim
  const merkNormalized = merk.trim().toUpperCase();

  // Parse jumlahBarang ke number
  const jumlah = parseInt(jumlahBarang, 10);
  if (isNaN(jumlah) || jumlah < 1) {
    throw new AppError('Jumlah barang harus angka positif.', 400);
  }

  const kodeSatkerTrim = kodeSatker.trim();
  const kodeBarangBmnTrim = kodeBarangBmn.trim();

  // Bangun payload bulk insert dalam transaksi atomik (all-or-nothing).
  //
  // DESAIN: ALL-OR-NOTHING. Bungkus "cari NUP terakhir + generate NUP urut
  // + createMany" dalam prisma.$transaction. Bila ada P2002 (unique
  // constraint violation pada identitasAset = kodeSatker + kodeBarangBmn +
  // nup), SELURUH batch di-rollback — tidak ada barang yang masuk sebagian.
  //
  // Alasan all-or-nothing:
  // 1. Bulk insert BMN adalah operasi administratif satu-sumber — admin
  //    input satu set barang (mis. hasil pengadaan) sekaligus. Logikanya
  //    "kirim semua atau kirim ulang semua", bukan "kirim sebagian".
  // 2. Bentrok NUP saat bulk-create menandakan ada proses bersamaan
  //    (race) atau admin lain baru saja input. Pesan error mengarahkan
  //    admin untuk refresh dan submit ulang dengan NUP mulai dari urutan
  //    terakhir saat ini.
  // 3. Response sederhana: throw AppError(409) → front-end cukup toast +
  //    biarkan admin submit ulang.
  // 4. Konsisten dengan pola error handling P2002 yang sudah ada di
  //    create() dan update() (baris 148 dan 195).
  //
  // Atomicity: READ COMMITTED (default Postgres) + unique constraint =
  // transaction aman dari race. createMany akan throw P2002 jika ada
  // baris yang konflik, dan transaction otomatis rollback.
  let dataBulk;
  try {
    dataBulk = await prisma.$transaction(async (tx) => {
      // Cari NUP terakhir dalam scope transaksi yang sama.
      const barangList = await tx.barang.findMany({
        where: {
          kodeSatker: kodeSatkerTrim,
          kodeBarangBmn: kodeBarangBmnTrim,
        },
        select: { nup: true },
      });

      // Sorting sebagai number.
      const sortedNup = barangList
        .map((b) => parseInt(b.nup, 10))
        .filter((n) => !isNaN(n))
        .sort((a, b) => b - a);

      let nupSekarang = 1;
      if (sortedNup.length > 0) {
        nupSekarang = sortedNup[0] + 1;
      }

      // Generate NUP berurutan dari nupSekarang (logika INTI — tidak diubah).
      const daftarNup = [];
      for (let i = 0; i < jumlah; i++) {
        daftarNup.push(String(nupSekarang + i));
      }

      // Bangun payload untuk createMany.
      const payload = daftarNup.map((nup) => ({
        kodeBarang: `${kodeSatkerTrim}-${kodeBarangBmnTrim}-${nup}`,
        nama: nama,
        merk: merkNormalized,
        jenis: jenis,
        jumlahTotal: 1,
        jumlahTersedia: 1,
        kondisi: kondisi || 'BAIK',
        lokasiPenyimpanan: lokasiPenyimpanan || null,
        deskripsi: deskripsi || null,
        fotoUrl: fotoPath || null,
        sumber: 'MANUAL',
        kodeSatker: kodeSatkerTrim,
        kodeBarangBmn: kodeBarangBmnTrim,
        nup: nup,
      }));

      // createMany di Prisma tidak mengembalikan dokumen individual —
      // bila ada P2002, SELURUH batch di-rollback dan tidak ada row
      // yang masuk.
      const hasil = await tx.barang.createMany({ data: payload });

      return { hasil, daftarNup };
    });
  } catch (e) {
    // Tangkap P2002 (unique constraint violation pada identitasAset).
    // Konsisten dengan pola di create() (baris 148) dan update() (baris
    // 195). Error lain (network, timeout, dll) naik apa adanya.
    if (e.code === 'P2002') {
      throw new AppError(
        'Sebagian NUP bentrok dengan data yang baru saja masuk oleh proses lain. ' +
          'Silakan coba input ulang — sistem akan otomatis menyesuaikan NUP mulai dari urutan terakhir saat ini.',
        409
      );
    }
    throw e;
  }

  return {
    berhasil: dataBulk.hasil.count,
    nupAwal: dataBulk.daftarNup[0],
    nupAkhir: dataBulk.daftarNup[dataBulk.daftarNup.length - 1],
    merkNormalized,
  };
}

// --- Ambil daftar merk unik untuk autocomplete ---
async function getDaftarMerk(search = '') {
  const where = {};
  if (search) {
    where.merk = { mode: 'insensitive', contains: search };
  }
  const hasil = await prisma.barang.findMany({
    where,
    select: { merk: true },
    distinct: ['merk'],
    orderBy: { merk: 'asc' },
  });
  return hasil
    .map((r) => r.merk)
    .filter((m) => m !== null && m !== '');
}

// --- Ambil NUP terakhir untuk kombinasi kodeSatker + kodeBarang (merk TIDAK diperhitungkan) ---
async function getNupTerakhir(kodeSatker, kodeBarangBmn) {
  // Ambil semua NUP dan sorting sebagai number (karena nup adalah string)
  const barangList = await prisma.barang.findMany({
    where: {
      kodeSatker: kodeSatker.trim(),
      kodeBarangBmn: kodeBarangBmn.trim(),
    },
    select: { nup: true },
  });

  // Sorting sebagai number
  const sortedNup = barangList
    .map((b) => parseInt(b.nup, 10))
    .filter((n) => !isNaN(n))
    .sort((a, b) => b - a);

  const nupTerakhir = sortedNup.length > 0 ? String(sortedNup[0]) : null;

  return {
    nupTerakhir,
    adaBarang: sortedNup.length > 0,
  };
}

// --- Ambil preview NUP yang akan digunakan (berdasarkan Kode Satker + Kode Barang) ---
async function getPreviewNup(kodeSatker, kodeBarangBmn, jumlah) {
  const kodeSatkerTrim = kodeSatker.trim();
  const kodeBarangBmnTrim = kodeBarangBmn.trim();
  const jumlahInt = parseInt(jumlah, 10);

  if (isNaN(jumlahInt) || jumlahInt < 1) {
    return { nupAwal: null, nupAkhir: null, tersedia: 0 };
  }

  // Ambil semua NUP dan cari yang terbesar sebagai number
  const barangList = await prisma.barang.findMany({
    where: {
      kodeSatker: kodeSatkerTrim,
      kodeBarangBmn: kodeBarangBmnTrim,
    },
    select: { nup: true },
  });

  // Sorting sebagai number
  const sortedNup = barangList
    .map((b) => parseInt(b.nup, 10))
    .filter((n) => !isNaN(n))
    .sort((a, b) => b - a);

  let nupSekarang = 1;
  if (sortedNup.length > 0) {
    nupSekarang = sortedNup[0] + 1;
  }

  const nupAwal = String(nupSekarang);
  const nupAkhir = String(nupSekarang + jumlahInt - 1);

  return {
    nupAwal,
    nupAkhir,
    tersedia: jumlahInt,
  };
}

module.exports = { getSemua, getById, create, update, remove, serialisasi, checkStokTersedia, bulkCreate, getDaftarMerk, getNupTerakhir, getPreviewNup };
