// ============================================================
//  Cron Job — Notifikasi Pensiun
//
//  Berjalan setiap hari pukul 00:00 (0 0 * * *)
//
//  Logic:
//  1. Ambil user dengan retirementDate
//  2. Hitung sisa hari menuju pensiun
//  3. Filter user dengan sisa hari <= 90
//  4. Cek apakah masih memiliki peminjaman aktif (DIPINJAM/TERLAMBAT)
//  5. Kirim notifikasi ke:
//     - User/Peminjam: agar aware harus mengembalikan barang
//     - Semua Admin: agar bisa proaktif mengejar pengembalian
//  6. Cegah duplikat notifikasi
// ============================================================

const cron = require('node-cron');
const { prisma } = require('../config/database');
const notificationService = require('../services/notification.service');
const { hitungSisaHari } = require('../utils/nipHelper');

// ============================================================
//  Konstanta
// ============================================================

// Batas hari sebelum pensiun untuk trigger notifikasi
const BATAS_HARI_PENSIUN = 90;

// Jadwal cron: setiap hari pukul 00:00 WIB
const JADWAL_CRON = '0 0 * * *';

// Zona waktu Indonesia
const ZONA_WAKTU = 'Asia/Jakarta';

// ============================================================
//  Helper: Format tanggal Indonesia
// ============================================================

function formatTanggalIndonesia(date) {
  if (!date) return '-';
  const d = new Date(date);
  return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

// ============================================================
//  Main Job Function
// ============================================================

/**
 * Jalankan proses notifikasi pensiun
 * Dipanggil oleh cron schedule
 */
async function jalankanNotifikasiPensiun() {
  const waktuMulai = Date.now();
  let jumlahUserDicek = 0;
  let jumlahMendekatiPensiun = 0;
  let jumlahNotifikasiUser = 0;
  let jumlahNotifikasiAdmin = 0;
  let jumlahError = 0;

  console.log('[CRON:PENSIUN] ===========================================');
  console.log('[CRON:PENSIUN] Job dimulai');

  try {
    // ============================================================
    //  Langkah 1: Ambil semua user dengan retirementDate
    // ============================================================
    console.log('[CRON:PENSIUN] Mengambil data user dengan retirement date...');

    const semuaUser = await prisma.user.findMany({
      where: {
        retirementDate: { not: null },
        roles: { has: 'PEMINJAM' }, // Filter user dengan role PEMINJAM (array field)
      },
      select: {
        id: true,
        nama: true,
        nip: true,
        email: true,
        retirementDate: true,
      },
    });

    jumlahUserDicek = semuaUser.length;
    console.log(`[CRON:PENSIUN] Jumlah user dengan retirement date: ${jumlahUserDicek}`);

    if (semuaUser.length === 0) {
      console.log('[CRON:PENSIUN] Tidak ada user dengan retirement date. Job selesai.');
      return;
    }

    // ============================================================
    //  Langkah 2 & 3: Filter user yang mendekati pensiun (≤90 hari)
    // ============================================================
    const userMendekatiPensiun = [];

    for (const user of semuaUser) {
      const sisaHari = hitungSisaHari(user.retirementDate);

      // Sisa hari harus > 0 (belum pensiun) dan <= 90
      if (sisaHari > 0 && sisaHari <= BATAS_HARI_PENSIUN) {
        userMendekatiPensiun.push({
          ...user,
          sisaHari,
        });
      }
    }

    jumlahMendekatiPensiun = userMendekatiPensiun.length;
    console.log(`[CRON:PENSIUN] User mendekati pensiun (≤${BATAS_HARI_PENSIUN} hari): ${jumlahMendekatiPensiun}`);

    if (userMendekatiPensiun.length === 0) {
      console.log('[CRON:PENSIUN] Tidak ada user yang mendekati pensiun. Job selesai.');
      return;
    }

    // ============================================================
    //  Langkah 4: Ambil peminjaman aktif untuk semua user sekaligus
    // ============================================================
    const userIds = userMendekatiPensiun.map((u) => u.id);

    const peminjamanAktif = await prisma.peminjaman.findMany({
      where: {
        userId: { in: userIds },
        status: { in: ['DIPINJAM', 'TERLAMBAT'] },
      },
      include: {
        detail: {
          include: {
            barang: {
              select: {
                id: true,
                nama: true,
                kodeBarang: true,
              },
            },
          },
        },
      },
    });

    // Group peminjaman berdasarkan userId
    const peminjamanPerUser = new Map();
    for (const p of peminjamanAktif) {
      if (!peminjamanPerUser.has(p.userId)) {
        peminjamanPerUser.set(p.userId, []);
      }
      peminjamanPerUser.get(p.userId).push(p);
    }

    console.log(`[CRON:PENSIUN] User dengan peminjaman aktif: ${peminjamanPerUser.size}`);

    // ============================================================
    //  Langkah 5: Buat notifikasi untuk user & admin
    // ============================================================
    for (const user of userMendekatiPensiun) {
      const daftarPeminjaman = peminjamanPerUser.get(user.id) || [];

      // Jika tidak ada peminjaman aktif, skip
      if (daftarPeminjaman.length === 0) {
        continue;
      }

      // ============================================================
      //  Bangun daftar barang yang belum dikembalikan
      // ============================================================
      const daftarBarang = [];
      for (const p of daftarPeminjaman) {
        for (const d of p.detail) {
          if (d.statusItem === 'DIPINJAM') {
            daftarBarang.push({
              nama: d.barang.nama,
              kodeBarang: d.barang.kodeBarang,
            });
          }
        }
      }

      if (daftarBarang.length === 0) {
        continue;
      }

      const daftarBarangText = daftarBarang
        .map((b, i) => `  ${i + 1}. ${b.nama} (${b.kodeBarang})`)
        .join('\n');

      // ============================================================
      //  Cek apakah notifikasi sudah pernah dibuat hari ini
      // ============================================================
      const hariIni = new Date();
      hariIni.setHours(0, 0, 0, 0);
      const besok = new Date(hariIni);
      besok.setDate(besok.getDate() + 1);

      // ============================================================
      //  Kirim notifikasi ke USER/PEMINJAM
      // ============================================================
      const notifikasiUserExists = await prisma.notifikasi.findFirst({
        where: {
          userId: user.id,
          tipe: notificationService.TIPE_NOTIFIKASI.PENSIUN_MENDEKATI,
          createdAt: { gte: hariIni, lt: besok },
        },
      });

      if (!notifikasiUserExists) {
        const judulUser = `Pensiun dalam ${user.sisaHari} hari`;
        const pesanUser = `${user.nama}, Anda akan pensiun dalam ${user.sisaHari} hari.\n\nMasih memiliki ${daftarBarang.length} barang belum dikembalikan:\n${daftarBarangText}\n\nMohon segera lakukan proses pengembalian BMN sebelum tanggal pensiun.`;

        try {
          await notificationService.kirimKeUser(user.id, {
            tipe: notificationService.TIPE_NOTIFIKASI.PENSIUN_MENDEKATI,
            judul: judulUser,
            pesan: pesanUser,
            prioritas: 'TINGGI',
            referenceId: user.id,
            referenceType: 'PENSIUN',
          });

          jumlahNotifikasiUser++;
          console.log(`[CRON:PENSIUN] Notifikasi dikirim ke ${user.nama} (user)`);
        } catch (error) {
          jumlahError++;
          console.error(`[CRON:PENSIUN] Gagal kirim notifikasi ke ${user.nama}:`, error.message);
        }
      } else {
        console.log(`[CRON:PENSIUN] User ${user.nama} sudah mendapat notifikasi hari ini. Skip.`);
      }

      // ============================================================
      //  Kirim notifikasi ke SEMUA ADMIN
      //  (Admin perlu tahuagar bisa proaktif mengejar pengembalian)
      // ============================================================
      const judulAdmin = `Pensiun dalam ${user.sisaHari} hari - Ada barang belum dikembalikan`;
      const pesanAdmin = `${user.nama} (NIP: ${user.nip}) akan pensiun dalam ${user.sisaHari} hari.\n\nBarang belum dikembalikan (${daftarBarang.length} item):\n${daftarBarangText}\n\nMohon segera koordinasi untuk proses pengembalian BMN.`;

      try {
        await notificationService.kirimKeSemuaAdmin({
          tipe: notificationService.TIPE_NOTIFIKASI.PENSIUN_MENDEKATI,
          judul: judulAdmin,
          pesan: pesanAdmin,
          prioritas: 'TINGGI',
          referenceId: user.id,
          referenceType: 'PENSIUN',
        });

        jumlahNotifikasiAdmin++;
        console.log(`[CRON:PENSIUN] Notifikasi dikirim ke admin untuk ${user.nama}`);
      } catch (error) {
        jumlahError++;
        console.error(`[CRON:PENSIUN] Gagal kirim notifikasi ke admin untuk ${user.nama}:`, error.message);
      }
    }

    // ============================================================
    //  Selesai
    // ============================================================
    const durasi = Date.now() - waktuMulai;

    console.log('[CRON:PENSIUN] ===========================================');
    console.log(`[CRON:PENSIUN] Job selesai dalam ${durasi}ms`);
    console.log(`[CRON:PENSIUN] User dicek: ${jumlahUserDicek}`);
    console.log(`[CRON:PENSIUN] Mendekati pensiun: ${jumlahMendekatiPensiun}`);
    console.log(`[CRON:PENSIUN] Notifikasi ke user: ${jumlahNotifikasiUser}`);
    console.log(`[CRON:PENSIUN] Notifikasi ke admin: ${jumlahNotifikasiAdmin}`);
    console.log(`[CRON:PENSIUN] Error: ${jumlahError}`);
    console.log('[CRON:PENSIUN] ===========================================');
  } catch (error) {
    // Error handling: jangan hentikan server
    const durasi = Date.now() - waktuMulai;
    console.error('[CRON:PENSIUN] Error fatal:', error.message);
    console.error('[CRON:PENSIUN] Stack:', error.stack);
    console.log(`[CRON:PENSIUN] Job gagal dalam ${durasi}ms`);
    console.log('[CRON:PENSIUN] ===========================================');
  }
}

// ============================================================
//  Export & Schedule
// ============================================================

/**
 * Daftarkan cron job ke node-cron
 * @returns {object} - Task yang sudah dijadwalkan
 */
function register() {
  console.log('[CRON:PENSIUN] Mendaftarkan cron job...');
  console.log(`[CRON:PENSIUN] Jadwal: ${JADWAL_CRON} (${ZONA_WAKTU})`);

  const task = cron.schedule(JADWAL_CRON, jalankanNotifikasiPensiun, {
    scheduled: true,
    timezone: ZONA_WAKTU,
  });

  console.log('[CRON:PENSIUN] Cron job berhasil didaftarkan.');

  return task;
}

module.exports = {
  jalankanNotifikasiPensiun,
  register,
  BATAS_HARI_PENSIUN,
};
