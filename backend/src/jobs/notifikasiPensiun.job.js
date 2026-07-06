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
//  5. Buat notifikasi jika belum pernah dibuat (previne duplikat)
//  6. Log proses
// ============================================================

const cron = require('node-cron');
const { prisma } = require('../config/database');
const notificationService = require('../services/notification.service');
const { hitungSisaHari } = require('../utils/nipHelper');

// ============================================================
//  Konstanta
// ============================================================

// Batas hari sebelum pensiun untuk触发 notifikasi
const BATAS_HARI_PENSIUN = 90;

// Jadwal cron: setiap hari pukul 00:00 WIB
const JADWAL_CRON = '0 0 * * *';

// Zona waktu Indonesia
const ZONA_WAKTU = 'Asia/Jakarta';

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
  let jumlahNotifikasiDibuat = 0;
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
        role: 'PEMINJAM', // Hanya pegawai, bukan admin
      },
      select: {
        id: true,
        nama: true,
        nip: true,
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
    //  Langkah 4 & 5: Cek peminjaman aktif & buat notifikasi
    // ============================================================
    // Ambil semua user ID yang mendekati pensiun
    const userIds = userMendekatiPensiun.map((u) => u.id);

    // Query efisien: ambil peminjaman aktif untuk semua user sekaligus
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
    //  Buat notifikasi untuk setiap user yang memenuhi kriteria
    // ============================================================
    for (const user of userMendekatiPensiun) {
      const daftarPeminjaman = peminjamanPerUser.get(user.id) || [];

      // Jika tidak ada peminjaman aktif, skip
      if (daftarPeminjaman.length === 0) {
        continue;
      }

      // ============================================================
      //  Cek apakah notifikasi sudah pernah dibuat hari ini
      //  previne duplikat dengan mengecek:
      //  - tipe = PENSIUN_MENDEKATI
      //  - userId = user.id
      //  - createdAt = hari ini
      // ============================================================
      const hariIni = new Date();
      hariIni.setHours(0, 0, 0, 0);
      const besok = new Date(hariIni);
      besok.setDate(besok.getDate() + 1);

      const notifikasiExists = await prisma.notifikasi.findFirst({
        where: {
          userId: user.id,
          tipe: notificationService.TIPE_NOTIFIKASI.PENSIUN_MENDEKATI,
          createdAt: {
            gte: hariIni,
            lt: besok,
          },
        },
      });

      if (notifikasiExists) {
        console.log(`[CRON:PENSIUN] User ${user.nama} sudah mendapat notifikasi hari ini. Skip.`);
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
              tanggalPinjam: p.tanggalPinjamRencana
                ? formatTanggal(d.peminjam?.createdAt || new Date())
                : '-',
            });
          }
        }
      }

      if (daftarBarang.length === 0) {
        continue;
      }

      // ============================================================
      //  Buat notifikasi
      // ============================================================
      const formatTanggal = (date) => {
        if (!date) return '-';
        const d = new Date(date);
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
      };

      const daftarBarangText = daftarBarang
        .map((b, i) => `${i + 1}. ${b.nama} (${b.kodeBarang})`)
        .join('\n');

      const judul = `Pensiun dalam ${user.sisaHari} hari`;
      const pesan = `${user.nama} (NIP: ${user.nip}) akan pensiun dalam ${user.sisaHari} hari.\n\nMasih memiliki ${daftarBarang.length} barang belum dikembalikan:\n${daftarBarangText}\n\nMohon segera lakukan proses pengembalian BMN.`;

      try {
        await notificationService.kirimKeUser(user.id, {
          tipe: notificationService.TIPE_NOTIFIKASI.PENSIUN_MENDEKATI,
          judul,
          pesan,
          prioritas: 'TINGGI',
          referenceId: user.id,
          referenceType: 'PENSIUN',
        });

        jumlahNotifikasiDibuat++;
        console.log(`[CRON:PENSIUN] Notifikasi dibuat untuk ${user.nama} (${user.sisaHari} hari)`);
      } catch (error) {
        jumlahError++;
        console.error(`[CRON:PENSIUN] Gagal buat notifikasi untuk ${user.nama}:`, error.message);
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
    console.log(`[CRON:PENSIUN] Notifikasi dibuat: ${jumlahNotifikasiDibuat}`);
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
