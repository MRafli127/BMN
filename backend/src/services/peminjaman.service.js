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

// Bentuk include lengkap untuk relasi
const includeLengkap = {
  peminjam: { select: { id: true, nama: true, nip: true, email: true, jabatan: true, unitKerja: true } },
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
    kodePeminjaman: kodeDariBarang(p),
    dokumenUrl: urlPublik(p.dokumenUrl),
    dokumenStempelUrl: urlPublik(p.dokumenStempelUrl),
    qrCodeUrl: urlPublik(p.qrCodeUrl),
    detail: p.detail?.map((d) => ({
      ...d,
      barang: d.barang ? { ...d.barang, fotoUrl: urlPublik(d.barang.fotoUrl) } : d.barang,
    })),
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

// --- Buat pengajuan peminjaman baru ---
// Dibatasi 1 barang per pengajuan (lihat peminjaman.validator.js) karena
// kodePeminjaman memakai kode aset barang yang dipinjam.
async function create(userId, data, dokumenPath) {
  const created = await prisma.$transaction(async (tx) => {
    const item = data.items[0];
    const barang = await tx.barang.findUnique({ where: { id: item.barangId } });
    if (!barang) throw new AppError(`Barang dengan id ${item.barangId} tidak ditemukan.`, 404);
    if (item.jumlahPinjam > barang.jumlahTersedia) {
      throw new AppError(
        `Stok "${barang.nama}" tidak mencukupi. Tersedia ${barang.jumlahTersedia}, diminta ${item.jumlahPinjam}.`,
        400
      );
    }

    return tx.peminjaman.create({
      data: {
        kodePeminjaman: barang.kodeBarang,
        userId,
        // Tanggal pinjam opsional: default ke hari ini bila tidak diisi.
        tanggalPinjamRencana: data.tanggalPinjamRencana || new Date(),
        tanggalKembaliRencana: data.tanggalKembaliRencana || null,
        alasanPeminjaman: data.alasanPeminjaman || null,
        dokumenUrl: dokumenPath || null,
        status: 'MENUNGGU',
        detail: {
          create: [{ barangId: item.barangId, jumlahPinjam: item.jumlahPinjam }],
        },
      },
      include: includeLengkap,
    });
  });

  // Bila tak ada dokumen diunggah tapi peminjam membubuhkan tanda tangan,
  // buat Surat Pernyataan Peminjaman (PDF) lalu simpan sebagai dokumenUrl.
  // Kegagalan membuat PDF tidak membatalkan pengajuan.
  if (!dokumenPath && data.tandaTangan) {
    try {
      const pdfDataUrl = await suratPernyataanService.generate(created, data.tandaTangan);
      const updated = await prisma.peminjaman.update({
        where: { id: created.id },
        data: { dokumenUrl: pdfDataUrl },
        include: includeLengkap,
      });
      return serialisasi(updated);
    } catch {
      // PDF gagal dibuat; pengajuan tetap valid, dokumen bisa dilengkapi nanti.
    }
  }

  return serialisasi(created);
}

// --- Ambil daftar peminjaman (role-aware) ---
async function getSemua({ status, q, userId, role, page = 1, limit = 10 } = {}) {
  const halaman = Math.max(1, parseInt(page, 10) || 1);
  const perHalaman = Math.min(200, Math.max(1, parseInt(limit, 10) || 10));

  const where = {};
  if (status) where.status = status;
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
    data: data.map(serialisasi),
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

  return serialisasi(p);
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
async function setujui(id, adminId, catatan) {
  // Tahap 1: validasi & ubah stok dalam transaksi
  await prisma.$transaction(async (tx) => {
    const p = await tx.peminjaman.findUnique({ where: { id }, include: { detail: true } });
    if (!p) throw new AppError('Data peminjaman tidak ditemukan.', 404);
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
  });

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
async function tolak(id, adminId, catatan) {
  const p = await prisma.peminjaman.findUnique({ where: { id } });
  if (!p) throw new AppError('Data peminjaman tidak ditemukan.', 404);
  if (p.status !== 'MENUNGGU') {
    throw new AppError('Hanya pengajuan berstatus "Menunggu" yang dapat ditolak.', 400);
  }

  const updated = await prisma.peminjaman.update({
    where: { id },
    data: { status: 'DITOLAK', disetujuiOleh: adminId, catatanAdmin: catatan },
    include: includeLengkap,
  });
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

// --- Konfirmasi pengembalian: stok dikembalikan otomatis ---
async function kembalikan(id) {
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
      data: { status: 'DIKEMBALIKAN', tanggalKembaliAktual: new Date() },
    });
  });

  const updated = await getRawById(id);
  return serialisasi(updated);
}

// --- Hapus peminjaman (khusus admin) ---
// Bila peminjaman masih memegang stok (DISETUJUI/DIPINJAM/TERLAMBAT dengan
// item berstatus DIPINJAM), stok dikembalikan dulu agar tidak hilang.
// DetailPeminjaman ikut terhapus otomatis (onDelete: Cascade).
async function hapus(id) {
  await prisma.$transaction(async (tx) => {
    const p = await tx.peminjaman.findUnique({ where: { id }, include: { detail: true } });
    if (!p) throw new AppError('Data peminjaman tidak ditemukan.', 404);

    const memegangStok = ['DISETUJUI', 'DIPINJAM', 'TERLAMBAT'].includes(p.status);
    if (memegangStok) {
      for (const d of p.detail) {
        if (d.statusItem === 'DIPINJAM') {
          await tx.barang.update({
            where: { id: d.barangId },
            data: { jumlahTersedia: { increment: d.jumlahPinjam } },
          });
        }
      }
    }

    await tx.peminjaman.delete({ where: { id } });
  });

  return { id };
}

// --- Hapus banyak peminjaman sekaligus (khusus admin) ---
// Untuk tiap peminjaman yang masih memegang stok, stok dikembalikan dulu,
// lalu seluruh record dihapus (detail ikut terhapus via cascade).
async function hapusBanyak(ids) {
  const daftarId = Array.isArray(ids) ? [...new Set(ids.filter((v) => typeof v === 'string' && v))] : [];
  if (daftarId.length === 0) throw new AppError('Tidak ada peminjaman yang dipilih.', 400);

  const dihapus = await prisma.$transaction(async (tx) => {
    const list = await tx.peminjaman.findMany({
      where: { id: { in: daftarId } },
      include: { detail: true },
    });

    for (const p of list) {
      const memegangStok = ['DISETUJUI', 'DIPINJAM', 'TERLAMBAT'].includes(p.status);
      if (!memegangStok) continue;
      for (const d of p.detail) {
        if (d.statusItem === 'DIPINJAM') {
          await tx.barang.update({
            where: { id: d.barangId },
            data: { jumlahTersedia: { increment: d.jumlahPinjam } },
          });
        }
      }
    }

    const res = await tx.peminjaman.deleteMany({ where: { id: { in: daftarId } } });
    return res.count;
  });

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
  getSemua,
  getById,
  getRawById,
  getByKode,
  setujui,
  tolak,
  serahkan,
  kembalikan,
  hapus,
  hapusBanyak,
  setujuiBanyak,
  setDokumenStempel,
  serialisasi,
  kodeDariBarang,
};
