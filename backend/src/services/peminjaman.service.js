// ============================================================
//  Service Peminjaman
//  Mengelola seluruh alur peminjaman:
//   - Pengajuan (MENUNGGU)
//   - Persetujuan/Penolakan (DISETUJUI/DITOLAK) + perubahan stok
//   - Penyerahan barang (DIPINJAM)
//   - Pengembalian (DIKEMBALIKAN) + stok dikembalikan
//   - Deteksi keterlambatan otomatis (TERLAMBAT)
//  Operasi yang mengubah stok dibungkus $transaction.
// ============================================================

const { prisma } = require('../config/database');
const { urlPublik } = require('../utils/apiResponse');
const { AppError } = require('../middleware/error.middleware');
const qrcodeService = require('./qrcode.service');
const suratPernyataanService = require('./suratPernyataan.service');
const suratPengembalianService = require('./suratPengembalian.service');
const nomorSuratService = require('./nomorSurat.service');
const { kodeTransaksiUnik } = require('../utils/generateKode');
const auditLogService = require('./auditLog.service');
const emailService = require('./email.service');
const notificationService = require('./notification.service');
const env = require('../config/env');

// Bentuk include lengkap untuk relasi
const includeLengkap = {
  peminjam: {
    select: {
      id: true,
      nama: true,
      nip: true,
      email: true,
      jabatan: true, //   "Jabatan"
      unitKerja: true, // "Unit Kerja"
      eselon2: true, //   "Eselon II"
      eselon3: true, //   "Eselon III"
      eselon4: true, //   "Eselon IV"
    },
  },
  admin: { select: { id: true, nama: true } },
  detail: { include: { barang: true } },
};

// Kode peminjaman = kode barang yang sedang dipinjam (Manajemen Barang).
// Diturunkan dari barang agar selalu sinkron dengan kodeBarang terkini
// (kunci natural Kode Satker-Kode Barang-NUP), bukan dari snapshot lama.
function kodeDariBarang(p) {
  const barang = p.detail?.find((d) => d.barang)?.barang;
  return barang?.kodeBarang || p.kodePeminjaman;
}

// Ubah path file relatif menjadi URL absolut
function serialisasi(p) {
  if (!p) return p;
  return {
    ...p,
    kodeTransaksi: p.kodeTransaksi,
    kodePeminjaman: kodeDariBarang(p),
    dokumenUrl: urlPublik(p.dokumenUrl),
    dokumenStempelUrl: urlPublik(p.dokumenStempelUrl),
    dokumenPengembalianUrl: urlPublik(p.dokumenPengembalianUrl),
    qrCodeUrl: urlPublik(p.qrCodeUrl),
    detail: p.detail?.map((d) => ({
      ...d,
      barang: d.barang ? { ...d.barang, fotoUrl: urlPublik(d.barang.fotoUrl) } : d.barang,
    })),
  };
}

// Versi RINGAN untuk respons DAFTAR (list).
// Dokumen surat pernyataan / stempel / QR dapat tersimpan sebagai data URL
// base64 (PDF/gambar) yang berukuran besar. Pada daftar, body tersebut tidak
// pernah dipakai (hanya halaman detail yang menampilkannya), sehingga dibuang
// agar payload kecil dan transfer cepat. File upload biasa (URL pendek) tetap
// dikirim. Keberadaan dokumen ditandai lewat flag boolean.
function serialisasiRingkas(p) {
  const s = serialisasi(p);
  if (!s) return s;
  const buangDataUrl = (v) => (typeof v === 'string' && v.startsWith('data:') ? null : v);
  return {
    ...s,
    adaDokumen: Boolean(s.dokumenUrl),
    adaDokumenStempel: Boolean(s.dokumenStempelUrl),
    adaDokumenPengembalian: Boolean(s.dokumenPengembalianUrl),
    dokumenUrl: buangDataUrl(s.dokumenUrl),
    dokumenStempelUrl: buangDataUrl(s.dokumenStempelUrl),
    dokumenPengembalianUrl: buangDataUrl(s.dokumenPengembalianUrl),
    qrCodeUrl: buangDataUrl(s.qrCodeUrl),
  };
}

// Hitung status terkini berdasarkan tanggal.
//  - Peminjaman TANPA tanggal kembali = tanpa batas waktu -> TIDAK pernah
//    TERLAMBAT; bila terlanjur TERLAMBAT, dipulihkan ke DIPINJAM.
//  - Peminjaman dengan tenggat yang sudah lewat -> TERLAMBAT.
// Mengembalikan status yang seharusnya (sama dengan p.status bila tak berubah).
function statusBerdasarTanggal(p) {
  if (p.tanggalKembaliAktual) return p.status; // sudah dikembalikan
  if (!['DISETUJUI', 'DIPINJAM', 'TERLAMBAT'].includes(p.status)) return p.status;

  // Tanpa tenggat: tidak boleh TERLAMBAT.
  if (!p.tanggalKembaliRencana) return p.status === 'TERLAMBAT' ? 'DIPINJAM' : p.status;

  const lewatTenggat = new Date(p.tanggalKembaliRencana).getTime() < Date.now();
  if (lewatTenggat && (p.status === 'DISETUJUI' || p.status === 'DIPINJAM')) return 'TERLAMBAT';
  return p.status;
}

// --- Pratinjau Surat Pernyataan Peminjaman (PDF) sebelum pengajuan dibuat ---
// Dipakai peminjam untuk mengunduh & mencetak surat, menandatanganinya secara
// FISIK, lalu mengunggahnya kembali saat mengajukan. Tidak menyimpan apa pun:
// hanya membangun objek peminjaman semu (dari barang & identitas peminjam
// terkini) untuk dirender menjadi PDF. Hasil = data URL (application/pdf).
async function previewSurat(userId, data) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('Data peminjam tidak ditemukan.', 404);

  // Proses semua items
  const detailItems = [];
  for (const item of data.items) {
    const barang = await prisma.barang.findUnique({ where: { id: item.barangId } });
    if (!barang) throw new AppError('Barang yang dipilih tidak ditemukan.', 404);
    detailItems.push({ barang, jumlahPinjam: item.jumlahPinjam });
  }

  // Intip nomor surat berikutnya untuk tahun ini agar pratinjau menampilkan
  // nomor yang (kemungkinan besar) akan diperoleh saat pengajuan disimpan.
  // Nomor definitif baru ditetapkan atomik di create().
  const tahunSurat = new Date().getFullYear();
  const nomorSurat = await nomorSuratService.intip(nomorSuratService.JENIS.PEMINJAMAN, tahunSurat);

  const peminjamanSemu = {
    peminjam: user,
    detail: detailItems,
    kodePeminjaman: detailItems.length === 1 ? detailItems[0].barang.kodeBarang : null,
    tanggalPengajuan: new Date(),
    tanggalPinjamRencana: data.tanggalPinjamRencana || null,
    tanggalKembaliRencana: data.tanggalKembaliRencana || null,
    nomorSurat,
    tahunSurat,
  };

  return suratPernyataanService.generate(peminjamanSemu);
}

// --- Buat pengajuan peminjaman baru ---
// Peminjam mengunduh Surat Pernyataan, menandatanganinya secara mandiri
// (manual/elektronik), lalu mengunggahnya kembali. Berkas yang diunggah inilah
// yang disimpan sebagai dokumenUrl. Dibatasi multiple items per pengajuan
// dengan kodePeminjaman null.
async function create(userId, data, dokumenDataUrl, requestInfo = {}) {
  // CEK: Batas maksimal peminjaman aktif per user
  const peminjamanAktif = await prisma.peminjaman.count({
    where: {
      userId,
      status: { in: ['MENUNGGU', 'DISETUJUI', 'DIPINJAM', 'TERLAMBAT'] },
    },
  });
  const maxAktif = env.peminjaman?.maxAktif || 3;
  if (peminjamanAktif >= maxAktif) {
    throw new AppError(
      `Anda sudah memiliki ${peminjamanAktif} peminjaman aktif. Selesaikan atau batalkan yang ada sebelum membuat pengajuan baru. (Maksimum: ${maxAktif})`,
      400
    );
  }

  // CEK: Tidak boleh mengajukan barang yang sama lebih dari sekali.
  // Bila peminjam masih punya peminjaman AKTIF (menunggu/disetujui/dipinjam/
  // terlambat) atas salah satu barang yang diajukan, tolak pengajuan ini.
  // Barang baru dapat diajukan lagi hanya setelah peminjaman sebelumnya
  // selesai (dikembalikan/ditolak/dibatalkan).
  const barangIds = [...new Set((data.items || []).map((i) => i.barangId).filter(Boolean))];
  if (barangIds.length) {
    const sudahAktif = await prisma.peminjaman.findFirst({
      where: {
        userId,
        status: { in: ['MENUNGGU', 'DISETUJUI', 'DIPINJAM', 'TERLAMBAT'] },
        detail: { some: { barangId: { in: barangIds } } },
      },
      include: { detail: { include: { barang: { select: { id: true, nama: true } } } } },
    });
    if (sudahAktif) {
      const bentrok = sudahAktif.detail.find((d) => barangIds.includes(d.barangId));
      const namaBarang = bentrok?.barang?.nama || 'barang tersebut';
      throw new AppError(
        `Anda sudah memiliki pengajuan/peminjaman aktif untuk "${namaBarang}". ` +
          'Barang yang sama tidak dapat diajukan lebih dari sekali sampai peminjaman tersebut selesai.',
        400
      );
    }
  }

  // CEK: Surat pernyataan yang sudah ditandatangani WAJIB diunggah
  if (!dokumenDataUrl) {
    throw new AppError(
      'Unggah Surat Pernyataan Peminjaman yang sudah Anda tandatangani sebelum mengirim pengajuan.',
      400
    );
  }

  // Ambil data user untuk audit log dan email
  const user = await prisma.user.findUnique({ where: { id: userId } });

  // Generate kode transaksi unik untuk QR code dan referensi
  const kodeTransaksi = await kodeTransaksiUnik();

  // Proses semua items
  const detailItems = [];
  let kodeSnapshot = null;
  for (const item of data.items) {
    const barang = await prisma.barang.findUnique({ where: { id: item.barangId } });
    if (!barang) throw new AppError(`Barang dengan id ${item.barangId} tidak ditemukan.`, 404);
    if (item.jumlahPinjam > barang.jumlahTersedia) {
      throw new AppError(
        `Stok "${barang.nama}" tidak mencukupi. Tersedia ${barang.jumlahTersedia}, diminta ${item.jumlahPinjam}.`,
        400
      );
    }
    // Snapshot kode aset dari barang pertama (kolom kodePeminjaman NOT NULL).
    // Saat dibaca, kode di-resync via kodeDariBarang() dari barang terkait.
    if (!kodeSnapshot) kodeSnapshot = barang.kodeBarang;
    detailItems.push({ barangId: item.barangId, jumlahPinjam: item.jumlahPinjam });
  }

  const tahunSurat = new Date().getFullYear();

  const created = await prisma.$transaction(async (tx) => {
    // Nomor surat berurut & unik per tahun (atomik, anti race condition).
    const nomorSurat = await nomorSuratService.ambil(tx, nomorSuratService.JENIS.PEMINJAMAN, tahunSurat);

    return tx.peminjaman.create({
      data: {
        kodeTransaksi,
        kodePeminjaman: kodeSnapshot, // Snapshot kode barang pertama (kolom wajib)
        userId,
        nomorSurat,
        tahunSurat,
        tanggalPinjamRencana: data.tanggalPinjamRencana || null,
        tanggalKembaliRencana: data.tanggalKembaliRencana || null,
        alasanPeminjaman: data.alasanPeminjaman || null,
        dokumenUrl: dokumenDataUrl, // Surat pernyataan yang sudah ditandatangani peminjam
        status: 'MENUNGGU',
        detail: {
          create: detailItems,
        },
      },
      include: includeLengkap,
    });
  }, { timeout: 20000, maxWait: 10000 });

  // Audit log: catat pembuatan peminjaman baru
  const barangNames = created.detail?.map(d => d.barang?.nama).filter(Boolean).join(', ') || 'Barang';
  auditLogService.log({
    userId,
    userEmail: user?.email,
    userNama: user?.nama,
    aksi: auditLogService.AKSI.PEMINJAMAN_CREATE,
    entitas: auditLogService.ENTITAS.PEMINJAMAN,
    entitasId: created.id,
    dataBaru: {
      kodeTransaksi: created.kodeTransaksi,
      kodePeminjaman: created.kodePeminjaman,
      status: created.status,
      items: data.items,
    },
    requestInfo,
  }).catch(() => {});

  // Kirim email konfirmasi ke peminjam (async, tidak blocking)
  emailService.kirimKonfirmasiPengajuan(created, user).catch(() => {});

  // Kirim notifikasi ke admin (async, tidak blocking)
  emailService.kirimNotifikasiAdmin(created, user, env.email?.notifyAdmin).catch(() => {});

  // Kirim notifikasi ke semua admin tentang pengajuan baru
  notificationService.kirimKeSemuaAdmin({
    tipe: notificationService.TIPE_NOTIFIKASI.PEMINJAMAN_BARU,
    judul: 'Pengajuan Peminjaman Baru',
    pesan: `${user?.nama || 'Peminjam'} mengajukan peminjaman ${barangNames}`,
    referenceId: created.id,
    referenceType: 'PEMINJAMAN',
  }).catch(() => {});

  return serialisasi(created);
}

// --- Ambil daftar peminjaman (role-aware) ---
async function getSemua({ status, q, userId, role, page = 1, limit = 10 } = {}) {
  const halaman = Math.max(1, parseInt(page, 10) || 1);
  const perHalaman = Math.min(200, Math.max(1, parseInt(limit, 10) || 10));

  const where = {};
  if (status) {
    // Mendukung beberapa status sekaligus via koma, mis. "DISETUJUI,DIPINJAM,TERLAMBAT".
    const daftar = String(status).split(',').map((x) => x.trim()).filter(Boolean);
    where.status = daftar.length > 1 ? { in: daftar } : daftar[0];
  }
  // Peminjam hanya melihat miliknya sendiri
  if (role === 'PEMINJAM') where.userId = userId;
  if (q) {
    const cocok = { contains: q, mode: 'insensitive' };
    where.OR = [
      // Kode peminjaman (snapshot) + kode barang terkini = sumber kode yang tampil.
      { kodePeminjaman: cocok },
      { detail: { some: { barang: { kodeBarang: cocok } } } },
      { detail: { some: { barang: { nup: cocok } } } },
      // Nama & merk barang yang dipinjam.
      { detail: { some: { barang: { nama: cocok } } } },
      { detail: { some: { barang: { merk: cocok } } } },
      // Identitas peminjam.
      { peminjam: { nama: cocok } },
      { peminjam: { nip: cocok } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.peminjaman.findMany({
      where,
      include: includeLengkap,
      orderBy: { createdAt: 'desc' },
      skip: (halaman - 1) * perHalaman,
      take: perHalaman,
    }),
    prisma.peminjaman.count({ where }),
  ]);

  // Sinkronkan status berdasarkan tanggal (terlambat / pulihkan tanpa tenggat)
  const updates = [];
  for (const p of data) {
    const baru = statusBerdasarTanggal(p);
    if (baru !== p.status) {
      p.status = baru;
      updates.push(prisma.peminjaman.update({ where: { id: p.id }, data: { status: baru } }));
    }
  }
  if (updates.length) await Promise.all(updates);

  return {
    data: data.map((p) => {
      const s = serialisasiRingkas(p);
      // Catatan pengembalian hanya untuk admin — jangan bocorkan ke peminjam.
      if (role === 'PEMINJAM') delete s.catatanPengembalian;
      return s;
    }),
    meta: { total, page: halaman, limit: perHalaman, totalHalaman: Math.ceil(total / perHalaman) || 1 },
  };
}

// --- Ambil satu peminjaman (raw, tanpa serialisasi URL) ---
async function getRawById(id) {
  const p = await prisma.peminjaman.findUnique({ where: { id }, include: includeLengkap });
  if (!p) throw new AppError('Data peminjaman tidak ditemukan.', 404);
  return p;
}

// --- Ambil satu peminjaman dengan otorisasi & deteksi terlambat ---
async function getById(id, { userId, role } = {}) {
  const p = await getRawById(id);

  // Peminjam hanya boleh melihat miliknya sendiri
  if (role === 'PEMINJAM' && p.userId !== userId) {
    throw new AppError('Anda tidak memiliki akses ke peminjaman ini.', 403);
  }

  const baru = statusBerdasarTanggal(p);
  if (baru !== p.status) {
    p.status = baru;
    await prisma.peminjaman.update({ where: { id }, data: { status: baru } });
  }

  const hasil = serialisasi(p);
  // Catatan pengembalian hanya untuk admin — jangan bocorkan ke peminjam.
  if (role === 'PEMINJAM') delete hasil.catatanPengembalian;
  return hasil;
}

// --- Ambil peminjaman berdasarkan kode (untuk scan QR) ---
// kodePeminjaman tidak unik (= kode aset barang, bisa berulang tiap kali
// barang yang sama dipinjam lagi). Prioritaskan transaksi yang masih
// aktif/menunggu; bila semua sudah selesai, ambil yang paling baru.
async function getByKode(kodePeminjaman) {
  const kandidat = await prisma.peminjaman.findMany({
    where: {
      OR: [
        { kodePeminjaman: { equals: kodePeminjaman, mode: 'insensitive' } },
        // Cocokkan juga dengan kode barang terkini agar kode yang tampil
        // di Manajemen Peminjaman / QR selalu bisa dipindai.
        { detail: { some: { barang: { kodeBarang: { equals: kodePeminjaman, mode: 'insensitive' } } } } },
      ],
    },
    include: includeLengkap,
    orderBy: { createdAt: 'desc' },
  });
  if (kandidat.length === 0) {
    throw new AppError(`Peminjaman dengan kode "${kodePeminjaman}" tidak ditemukan.`, 404);
  }

  const aktif = ['MENUNGGU', 'DISETUJUI', 'DIPINJAM', 'TERLAMBAT'];
  const p = kandidat.find((k) => aktif.includes(k.status)) || kandidat[0];

  const baru = statusBerdasarTanggal(p);
  if (baru !== p.status) {
    p.status = baru;
    await prisma.peminjaman.update({ where: { id: p.id }, data: { status: baru } });
  }
  return serialisasi(p);
}

// --- Setujui pengajuan: kurangi stok + generate QR ---
async function setujui(id, adminId, catatan, requestInfo = {}) {
  // CEK: Admin tidak bisa menyetujui request milik sendiri
  const pCheck = await prisma.peminjaman.findUnique({ where: { id }, include: { peminjam: true } });
  if (!pCheck) throw new AppError('Data peminjaman tidak ditemukan.', 404);
  if (pCheck.userId === adminId) {
    throw new AppError('Anda tidak dapat menyetujui pengajuan milik sendiri.', 403);
  }

  // Ambil data admin untuk audit log
  const admin = await prisma.user.findUnique({ where: { id: adminId } });

  // Tahap 1: validasi & ubah stok dalam transaksi.
  // Cek stok harus tetap di dalam transaksi agar atomik (anti race condition);
  // timeout dinaikkan agar aman pada DB remote berlatensi tinggi (Neon).
  let dataLama = null;
  await prisma.$transaction(async (tx) => {
    const p = await tx.peminjaman.findUnique({ where: { id }, include: { detail: true } });
    if (!p) throw new AppError('Data peminjaman tidak ditemukan.', 404);
    dataLama = { status: p.status };

    if (p.status !== 'MENUNGGU') {
      throw new AppError('Hanya pengajuan berstatus "Menunggu" yang dapat disetujui.', 400);
    }

    // Pastikan stok mencukupi untuk semua item
    for (const d of p.detail) {
      const barang = await tx.barang.findUnique({ where: { id: d.barangId } });
      if (!barang || barang.jumlahTersedia < d.jumlahPinjam) {
        throw new AppError(
          `Stok "${barang?.nama || 'barang'}" tidak mencukupi (tersedia ${barang?.jumlahTersedia || 0}).`,
          400
        );
      }
    }

    // Kurangi stok tiap barang
    for (const d of p.detail) {
      await tx.barang.update({
        where: { id: d.barangId },
        data: { jumlahTersedia: { decrement: d.jumlahPinjam } },
      });
    }

    // Perbarui status peminjaman
    await tx.peminjaman.update({
      where: { id },
      data: { status: 'DISETUJUI', disetujuiOleh: adminId, catatanAdmin: catatan || null },
    });
  }, { timeout: 20000, maxWait: 10000 });

  // Tahap 2: generate QR Code (opsional — tidak membatalkan persetujuan bila gagal)
  // Pakai data terserialisasi agar QR memuat kode = kodeBarang terkini.
  const full = serialisasi(await getRawById(id));
  try {
    const qrPath = await qrcodeService.generateUntukPeminjaman(full);
    await prisma.peminjaman.update({ where: { id }, data: { qrCodeUrl: qrPath } });
  } catch {
    // QR generation gagal; persetujuan tetap valid, QR bisa di-generate ulang nanti
  }

  const updated = await prisma.peminjaman.findUnique({ where: { id }, include: includeLengkap });

  // Audit log: catat persetujuan
  auditLogService.log({
    userId: adminId,
    userEmail: admin?.email,
    userNama: admin?.nama,
    aksi: auditLogService.AKSI.PEMINJAMAN_STATUS_CHANGE,
    entitas: auditLogService.ENTITAS.PEMINJAMAN,
    entitasId: id,
    dataLama,
    dataBaru: { status: 'DISETUJUI', catatan },
    requestInfo,
  }).catch(() => {});

  // Kirim email notifikasi ke peminjam
  emailService.kirimStatusUpdate(updated, pCheck.peminjam, 'MENUNGGU', 'DISETUJUI', catatan).catch(() => {});

  // Kirim notifikasi ke peminjam bahwa pengajuan disetujui
  const barangDipinjam = updated.detail?.[0]?.barang?.nama || 'Barang';
  notificationService.kirimKeUser(pCheck.peminjam.id, {
    tipe: notificationService.TIPE_NOTIFIKASI.PEMINJAMAN_DISETUJUI,
    judul: 'Pengajuan Disetujui',
    pesan: `Pengajuan peminjaman ${barangDipinjam} telah disetujui. Silakan ambil barang.`,
    referenceId: id,
    referenceType: 'PEMINJAMAN',
  }).catch(() => {});

  return serialisasi(updated);
}

// --- Setujui banyak pengajuan sekaligus (khusus admin) ---
// Memakai ulang logika setujui() per item (cek stok + ubah status + QR).
// Pengajuan yang bukan MENUNGGU atau stoknya tidak cukup dilewati tanpa
// menggagalkan yang lain.
async function setujuiBanyak(ids, adminId) {
  const daftarId = Array.isArray(ids) ? [...new Set(ids.filter((v) => typeof v === 'string' && v))] : [];
  if (daftarId.length === 0) throw new AppError('Tidak ada peminjaman yang dipilih.', 400);

  let disetujui = 0;
  const dilewati = [];
  for (const id of daftarId) {
    try {
      await setujui(id, adminId);
      disetujui += 1;
    } catch (e) {
      dilewati.push({ id, pesan: e.message || 'Gagal disetujui.' });
    }
  }

  return { disetujui, dilewati: dilewati.length, detailDilewati: dilewati.slice(0, 50) };
}

// --- Tolak pengajuan (wajib catatan) ---
async function tolak(id, adminId, catatan, requestInfo = {}) {
  // CEK: Admin tidak bisa menolak request milik sendiri (conflict of interest)
  const p = await prisma.peminjaman.findUnique({ where: { id }, include: { peminjam: true } });
  if (!p) throw new AppError('Data peminjaman tidak ditemukan.', 404);
  if (p.userId === adminId) {
    throw new AppError('Anda tidak dapat menolak pengajuan milik sendiri.', 403);
  }
  if (p.status !== 'MENUNGGU') {
    throw new AppError('Hanya pengajuan berstatus "Menunggu" yang dapat ditolak.', 400);
  }

  // Ambil data admin untuk audit log
  const admin = await prisma.user.findUnique({ where: { id: adminId } });

  const updated = await prisma.peminjaman.update({
    where: { id },
    data: { status: 'DITOLAK', disetujuiOleh: adminId, catatanAdmin: catatan },
    include: includeLengkap,
  });

  // Audit log
  auditLogService.log({
    userId: adminId,
    userEmail: admin?.email,
    userNama: admin?.nama,
    aksi: auditLogService.AKSI.PEMINJAMAN_STATUS_CHANGE,
    entitas: auditLogService.ENTITAS.PEMINJAMAN,
    entitasId: id,
    dataLama: { status: 'MENUNGGU' },
    dataBaru: { status: 'DITOLAK', alasan: catatan },
    requestInfo,
  }).catch(() => {});

  // Kirim email notifikasi ke peminjam
  emailService.kirimStatusUpdate(updated, p.peminjam, 'MENUNGGU', 'DITOLAK', catatan).catch(() => {});

  // Kirim notifikasi ke peminjam bahwa pengajuan ditolak
  const barangDipinjam = updated.detail?.[0]?.barang?.nama || 'Barang';
  notificationService.kirimKeUser(p.peminjam.id, {
    tipe: notificationService.TIPE_NOTIFIKASI.PEMINJAMAN_DITOLAK,
    judul: 'Pengajuan Ditolak',
    pesan: `Pengajuan peminjaman ${barangDipinjam} ditolak. ${catatan ? `Alasan: ${catatan}` : ''}`,
    referenceId: id,
    referenceType: 'PEMINJAMAN',
  }).catch(() => {});

  return serialisasi(updated);
}

// --- Tandai barang telah diserahkan/diambil (DISETUJUI -> DIPINJAM) ---
async function serahkan(id) {
  const p = await prisma.peminjaman.findUnique({ where: { id } });
  if (!p) throw new AppError('Data peminjaman tidak ditemukan.', 404);
  if (p.status !== 'DISETUJUI') {
    throw new AppError('Hanya peminjaman berstatus "Disetujui" yang dapat diserahkan.', 400);
  }

  const updated = await prisma.peminjaman.update({
    where: { id },
    data: { status: 'DIPINJAM' },
    include: includeLengkap,
  });
  return serialisasi(updated);
}

// --- Tandai banyak peminjaman telah diserahkan sekaligus (khusus admin) ---
// Memakai ulang serahkan() per item. Peminjaman yang bukan DISETUJUI dilewati
// tanpa menggagalkan yang lain.
async function serahkanBanyak(ids) {
  const daftarId = Array.isArray(ids) ? [...new Set(ids.filter((v) => typeof v === 'string' && v))] : [];
  if (daftarId.length === 0) throw new AppError('Tidak ada peminjaman yang dipilih.', 400);

  let berhasil = 0;
  const dilewati = [];
  for (const id of daftarId) {
    try {
      await serahkan(id);
      berhasil += 1;
    } catch (e) {
      dilewati.push({ id, pesan: e.message || 'Gagal diserahkan.' });
    }
  }

  return { berhasil, dilewati: dilewati.length, detailDilewati: dilewati.slice(0, 50) };
}

// --- Buat Surat Pernyataan Pengembalian BMN (PDF) untuk diunduh peminjam ---
// Dihasilkan otomatis (on-demand). Peminjam mengunduh, mencetak, dan meminta
// tanda tangan fisik "Yang menerima BMN" sebelum mengunggahnya kembali.
async function generateSuratPengembalian(id, { userId, role } = {}) {
  const p = await getRawById(id);
  if (role === 'PEMINJAM' && p.userId !== userId) {
    throw new AppError('Anda tidak memiliki akses ke peminjaman ini.', 403);
  }
  if (!['DIPINJAM', 'TERLAMBAT'].includes(statusBerdasarTanggal(p))) {
    throw new AppError('Surat pengembalian hanya tersedia untuk barang yang sedang dipinjam.', 400);
  }
  return suratPengembalianService.generate(serialisasi(p));
}

// --- Peminjam mengajukan pengembalian (menunggu konfirmasi admin) ---
// Tidak mengubah stok/status; menandai tanggalPermintaanKembali agar admin
// mendapat sinyal untuk mengkonfirmasi pengembalian (kembalikan()), dan
// menyimpan Surat Pernyataan Pengembalian yang sudah ditandatangani fisik.
async function mintaPengembalian(id, { userId, role } = {}, dokumenPengembalianDataUrl, requestInfo = {}) {
  const p = await prisma.peminjaman.findUnique({ where: { id }, include: { peminjam: true } });
  if (!p) throw new AppError('Data peminjaman tidak ditemukan.', 404);

  // Peminjam hanya boleh mengajukan untuk peminjaman miliknya sendiri
  if (role === 'PEMINJAM' && p.userId !== userId) {
    throw new AppError('Anda tidak memiliki akses ke peminjaman ini.', 403);
  }

  // Wajib melampirkan surat pernyataan pengembalian yang sudah ditandatangani.
  if (!dokumenPengembalianDataUrl) {
    throw new AppError(
      'Unggah Surat Pernyataan Pengembalian yang sudah ditandatangani (PDF) sebelum mengajukan pengembalian.',
      400
    );
  }

  // Sinkronkan status berdasarkan tanggal (mis. DIPINJAM -> TERLAMBAT)
  const statusKini = statusBerdasarTanggal(p);

  if (!['DIPINJAM', 'TERLAMBAT'].includes(statusKini)) {
    throw new AppError('Pengembalian hanya dapat diajukan untuk barang yang sedang dipinjam.', 400);
  }
  if (p.tanggalPermintaanKembali) {
    throw new AppError('Permintaan pengembalian sudah diajukan dan menunggu konfirmasi admin.', 400);
  }

  const updated = await prisma.peminjaman.update({
    where: { id },
    data: {
      tanggalPermintaanKembali: new Date(),
      status: statusKini,
      dokumenPengembalianUrl: dokumenPengembalianDataUrl,
    },
    include: includeLengkap,
  });

  // Audit log: catat permintaan pengembalian oleh peminjam
  auditLogService.log({
    userId,
    userEmail: p.peminjam?.email,
    userNama: p.peminjam?.nama,
    aksi: auditLogService.AKSI.PEMINJAMAN_STATUS_CHANGE,
    entitas: auditLogService.ENTITAS.PEMINJAMAN,
    entitasId: id,
    dataLama: { tanggalPermintaanKembali: null },
    dataBaru: { tanggalPermintaanKembali: updated.tanggalPermintaanKembali },
    requestInfo,
  }).catch(() => {});

  // Kirim notifikasi ke admin agar segera mengkonfirmasi pengembalian
  emailService.kirimPermintaanPengembalian(updated, p.peminjam, env.email?.notifyAdmin).catch(() => {});

  return serialisasi(updated);
}

// --- Konfirmasi pengembalian: stok dikembalikan otomatis ---
// catatan (opsional) disimpan sebagai catatanPengembalian: HANYA untuk admin,
// tidak pernah dikirim ke peminjam (dibuang di getById/getSemua untuk PEMINJAM).
async function kembalikan(id, catatan, requestInfo = {}) {
  // Ambil data untuk audit log
  const pLama = await prisma.peminjaman.findUnique({ where: { id }, include: { peminjam: true, detail: true } });
  if (!pLama) throw new AppError('Data peminjaman tidak ditemukan.', 404);

  const statusLama = pLama.status;

  await prisma.$transaction(async (tx) => {
    const p = await tx.peminjaman.findUnique({ where: { id }, include: { detail: true } });
    if (!p) throw new AppError('Data peminjaman tidak ditemukan.', 404);
    if (!['DISETUJUI', 'DIPINJAM', 'TERLAMBAT'].includes(p.status)) {
      throw new AppError('Peminjaman ini tidak sedang dalam status dipinjam.', 400);
    }

    // Kembalikan stok untuk item yang masih berstatus DIPINJAM
    for (const d of p.detail) {
      if (d.statusItem === 'DIPINJAM') {
        await tx.barang.update({
          where: { id: d.barangId },
          data: { jumlahTersedia: { increment: d.jumlahPinjam } },
        });
        await tx.detailPeminjaman.update({
          where: { id: d.id },
          data: { statusItem: 'DIKEMBALIKAN' },
        });
      }
    }

    await tx.peminjaman.update({
      where: { id },
      data: {
        status: 'DIKEMBALIKAN',
        tanggalKembaliAktual: new Date(),
        catatanPengembalian: (typeof catatan === 'string' && catatan.trim()) ? catatan.trim() : null,
      },
    });
  }, { timeout: 20000, maxWait: 10000 });

  const updated = await getRawById(id);

  // Audit log: catat pengembalian
  auditLogService.log({
    userId: null, // Sistem
    userEmail: null,
    userNama: 'Sistem',
    aksi: auditLogService.AKSI.PEMINJAMAN_STATUS_CHANGE,
    entitas: auditLogService.ENTITAS.PEMINJAMAN,
    entitasId: id,
    dataLama: { status: statusLama },
    dataBaru: { status: 'DIKEMBALIKAN', tanggalKembaliAktual: updated.tanggalKembaliAktual },
    requestInfo,
  }).catch(() => {});

  // Kirim email notifikasi ke peminjam
  emailService.kirimStatusUpdate(updated, pLama.peminjam, statusLama, 'DIKEMBALIKAN').catch(() => {});

  // Kirim notifikasi ke peminjam bahwa barang telah dikembalikan
  const barangDikembalikan = updated.detail?.[0]?.barang?.nama || 'Barang';
  notificationService.kirimKeUser(pLama.peminjam.id, {
    tipe: notificationService.TIPE_NOTIFIKASI.PENGEMBALIAN,
    judul: 'Barang Dikembalikan',
    pesan: `Barang ${barangDikembalikan} telah berhasil dikembalikan.`,
    referenceId: id,
    referenceType: 'PEMINJAMAN',
  }).catch(() => {});

  return serialisasi(updated);
}

// --- Konfirmasi pengembalian banyak peminjaman sekaligus (khusus admin) ---
// Memakai ulang kembalikan() per item (stok dikembalikan otomatis). Peminjaman
// yang tidak sedang dipinjam dilewati tanpa menggagalkan yang lain.
async function kembalikanBanyak(ids, requestInfo = {}) {
  const daftarId = Array.isArray(ids) ? [...new Set(ids.filter((v) => typeof v === 'string' && v))] : [];
  if (daftarId.length === 0) throw new AppError('Tidak ada peminjaman yang dipilih.', 400);

  let berhasil = 0;
  const dilewati = [];
  for (const id of daftarId) {
    try {
      await kembalikan(id, undefined, requestInfo);
      berhasil += 1;
    } catch (e) {
      dilewati.push({ id, pesan: e.message || 'Gagal dikembalikan.' });
    }
  }

  return { berhasil, dilewati: dilewati.length, detailDilewati: dilewati.slice(0, 50) };
}

// --- Hapus peminjaman (khusus admin) ---
// Bila peminjaman masih memegang stok (DISETUJUI/DIPINJAM/TERLAMBAT dengan
// item berstatus DIPINJAM), stok dikembalikan dulu agar tidak hilang.
// DetailPeminjaman ikut terhapus otomatis (onDelete: Cascade).
async function hapus(id, requestInfo = {}) {
  // Baca data di luar transaksi agar transaksi interaktif sesingkat mungkin
  // (mencegah timeout 5s pada DB remote berlatensi tinggi seperti Neon).
  const p = await prisma.peminjaman.findUnique({ where: { id }, include: { detail: true } });
  if (!p) throw new AppError('Data peminjaman tidak ditemukan.', 404);

  // Agregasi pengembalian stok per barang agar jumlah query update minimal.
  const memegangStok = ['DISETUJUI', 'DIPINJAM', 'TERLAMBAT'].includes(p.status);
  const stokKembali = new Map();
  if (memegangStok) {
    for (const d of p.detail) {
      if (d.statusItem === 'DIPINJAM') {
        stokKembali.set(d.barangId, (stokKembali.get(d.barangId) || 0) + d.jumlahPinjam);
      }
    }
  }

  await prisma.$transaction(
    async (tx) => {
      for (const [barangId, jumlah] of stokKembali) {
        await tx.barang.update({
          where: { id: barangId },
          data: { jumlahTersedia: { increment: jumlah } },
        });
      }
      await tx.peminjaman.delete({ where: { id } });
    },
    { timeout: 20000, maxWait: 10000 }
  );

  // Audit log: catat penghapusan
  auditLogService.log({
    userId: null, // Admin melakukan, tapi kita tidak punya userId di sini
    userEmail: null,
    userNama: null,
    aksi: auditLogService.AKSI.PEMINJAMAN_DELETE,
    entitas: auditLogService.ENTITAS.PEMINJAMAN,
    entitasId: id,
    dataLama: {
      kodeTransaksi: p.kodeTransaksi,
      kodePeminjaman: p.kodePeminjaman,
      status: p.status,
      userId: p.userId,
    },
    requestInfo,
  }).catch(() => {});

  return { id };
}

// --- Hapus banyak peminjaman sekaligus (khusus admin) ---
// Untuk tiap peminjaman yang masih memegang stok, stok dikembalikan dulu,
// lalu seluruh record dihapus (detail ikut terhapus via cascade).
async function hapusBanyak(ids) {
  const daftarId = Array.isArray(ids) ? [...new Set(ids.filter((v) => typeof v === 'string' && v))] : [];
  if (daftarId.length === 0) throw new AppError('Tidak ada peminjaman yang dipilih.', 400);

  // Baca data di luar transaksi agar transaksi interaktif sesingkat mungkin
  // (mencegah timeout 5s pada DB remote berlatensi tinggi seperti Neon).
  const list = await prisma.peminjaman.findMany({
    where: { id: { in: daftarId } },
    include: { detail: true },
  });

  // Agregasi pengembalian stok per barang agar jumlah query update minimal.
  const stokKembali = new Map();
  for (const p of list) {
    const memegangStok = ['DISETUJUI', 'DIPINJAM', 'TERLAMBAT'].includes(p.status);
    if (!memegangStok) continue;
    for (const d of p.detail) {
      if (d.statusItem === 'DIPINJAM') {
        stokKembali.set(d.barangId, (stokKembali.get(d.barangId) || 0) + d.jumlahPinjam);
      }
    }
  }

  const dihapus = await prisma.$transaction(
    async (tx) => {
      for (const [barangId, jumlah] of stokKembali) {
        await tx.barang.update({
          where: { id: barangId },
          data: { jumlahTersedia: { increment: jumlah } },
        });
      }
      const res = await tx.peminjaman.deleteMany({ where: { id: { in: daftarId } } });
      return res.count;
    },
    { timeout: 20000, maxWait: 10000 }
  );

  return { dihapus };
}

// --- Simpan URL dokumen yang sudah distempel ---
async function setDokumenStempel(id, pathRelatif) {
  const updated = await prisma.peminjaman.update({
    where: { id },
    data: { dokumenStempelUrl: pathRelatif },
    include: includeLengkap,
  });
  return serialisasi(updated);
}

module.exports = {
  create,
  previewSurat,
  getSemua,
  getById,
  getRawById,
  getByKode,
  setujui,
  tolak,
  serahkan,
  serahkanBanyak,
  mintaPengembalian,
  generateSuratPengembalian,
  kembalikan,
  kembalikanBanyak,
  hapus,
  hapusBanyak,
  setujuiBanyak,
  setDokumenStempel,
  serialisasi,
  serialisasiRingkas,
  kodeDariBarang,
};
