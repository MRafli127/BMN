// ============================================================
//  Service Manajemen User
//  CRUD user untuk admin: list, create, update, reset password, delete
// ============================================================

const { prisma } = require('../config/database');
const { hashPassword } = require('../utils/hashPassword');
const { STATUS_AKTIF } = require('../constants');
const { tanpaPassword } = require('../utils/userHelper');
const { parsePagination } = require('../utils/pagination');
const { AppError } = require('../middleware/error.middleware');

// Password default untuk user baru hasil reset
const PASSWORD_DEFAULT_RESET = 'BMN@Reset123';

// --- List semua user dengan pagination & filter ---
async function getSemua({ q, role, page = 1, limit = 10 } = {}) {
  const { halaman, perHalaman, skip } = parsePagination({ page, limit });

  const where = {};
  if (role) where.role = role;
  if (q) {
    const cocok = { contains: q, mode: 'insensitive' };
    where.OR = [
      { nama: cocok },
      { nip: cocok },
      { email: cocok },
      { jabatan: cocok },
      { unitKerja: cocok },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        nama: true,
        nip: true,
        email: true,
        jabatan: true,
        unitKerja: true,
        role: true,
        sumber: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            peminjaman: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (halaman - 1) * perHalaman,
      take: perHalaman,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    data: data.map((u) => ({
      ...tanpaPassword(u),
      totalPeminjaman: u._count.peminjaman,
    })),
    meta: { total, page: halaman, limit: perHalaman, totalHalaman: Math.ceil(total / perHalaman) || 1 },
  };
}

// --- Ambil satu user ---
async function getById(id) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      nama: true,
      nip: true,
      email: true,
      jabatan: true,
      unitKerja: true,
      role: true,
      sumber: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          peminjaman: true,
        },
      },
    },
  });
  if (!user) throw new AppError('User tidak ditemukan.', 404);

  return {
    ...tanpaPassword(user),
    totalPeminjaman: user._count.peminjaman,
  };
}

// --- Buat user baru (oleh admin) ---
async function create(data) {
  // Cek email & NIP unik
  const sudahAda = await prisma.user.findFirst({
    where: { OR: [{ email: data.email }, { nip: data.nip }] },
  });
  if (sudahAda) {
    if (sudahAda.email === data.email) {
      throw new AppError('Email sudah terdaftar.', 409);
    }
    throw new AppError('NIP sudah terdaftar.', 409);
  }

  // Validasi role
  if (data.role && !['ADMIN', 'PEMINJAM'].includes(data.role)) {
    throw new AppError('Role tidak valid.', 400);
  }

  const passwordHash = await hashPassword(data.password || PASSWORD_DEFAULT_RESET);

  const user = await prisma.user.create({
    data: {
      nama: data.nama,
      nip: data.nip,
      email: data.email,
      password: passwordHash,
      jabatan: data.jabatan || null,
      unitKerja: data.unitKerja || null,
      eselon2: data.eselon2 || null,
      eselon3: data.eselon3 || null,
      eselon4: data.eselon4 || null,
      role: data.role || 'PEMINJAM',
      sumber: 'MANUAL',
    },
  });

  return {
    user: tanpaPassword(user),
    passwordDefault: data.password ? null : PASSWORD_DEFAULT_RESET,
  };
}

// --- Update user ---
async function update(id, data) {
  const userLama = await prisma.user.findUnique({ where: { id } });
  if (!userLama) throw new AppError('User tidak ditemukan.', 404);

  // Cek email & NIP unik (kecuali user ini)
  if (data.email || data.nip) {
    const bentrok = await prisma.user.findFirst({
      where: {
        id: { not: id },
        OR: [
          data.email ? { email: data.email } : {},
          data.nip ? { nip: data.nip } : {},
        ],
      },
    });
    if (bentrok) {
      if (data.email && bentrok.email === data.email) {
        throw new AppError('Email sudah digunakan user lain.', 409);
      }
      if (data.nip && bentrok.nip === data.nip) {
        throw new AppError('NIP sudah digunakan user lain.', 409);
      }
    }
  }

  // Validasi role jika diubah
  if (data.role && !['ADMIN', 'PEMINJAM'].includes(data.role)) {
    throw new AppError('Role tidak valid.', 400);
  }

  // Cek: jangan ubah role admin terakhir
  if (data.role && data.role !== userLama.role) {
    const jumlahAdmin = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (userLama.role === 'ADMIN' && jumlahAdmin <= 1) {
      throw new AppError('Tidak dapat mengubah role admin terakhir.', 400);
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      nama: data.nama ?? userLama.nama,
      nip: data.nip ?? userLama.nip,
      email: data.email ?? userLama.email,
      jabatan: data.jabatan !== undefined ? (data.jabatan || null) : userLama.jabatan,
      unitKerja: data.unitKerja !== undefined ? (data.unitKerja || null) : userLama.unitKerja,
      role: data.role ?? userLama.role,
    },
  });

  return tanpaPassword(user);
}

// --- Reset password user ---
async function resetPassword(id) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('User tidak ditemukan.', 404);

  const passwordHash = await hashPassword(PASSWORD_DEFAULT_RESET);

  // Increment tokenVersion untuk invalidate semua token user
  await prisma.user.update({
    where: { id },
    data: { password: passwordHash, tokenVersion: { increment: 1 } },
  });

  return {
    id: user.id,
    nama: user.nama,
    email: user.email,
    passwordBaru: PASSWORD_DEFAULT_RESET,
  };
}

// --- Hapus user ---
async function remove(id) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      _count: { select: { peminjaman: true } },
    },
  });
  if (!user) throw new AppError('User tidak ditemukan.', 404);

  // Cek: jangan hapus admin terakhir
  if (user.role === 'ADMIN') {
    const jumlahAdmin = await prisma.user.count({ where: { role: 'ADMIN' } });
    if (jumlahAdmin <= 1) {
      throw new AppError('Tidak dapat menghapus admin terakhir.', 400);
    }
  }

  // Cek: user punya peminjaman aktif?
  const peminjamanAktif = await prisma.peminjaman.count({
    where: { userId: id, status: { in: STATUS_AKTIF } },
  });
  if (peminjamanAktif > 0) {
    throw new AppError(`User memiliki ${peminjamanAktif} peminjaman aktif. Selesaikan dulu sebelum menghapus.`, 400);
  }

  // Hapus riwayat peminjaman (semua tinggal status non-aktif) lalu user-nya,
  // dalam satu transaksi. Tanpa ini, relasi Peminjaman→User memblokir delete.
  // Detail peminjaman ikut terhapus otomatis (onDelete: Cascade).
  await prisma.$transaction([
    prisma.peminjaman.deleteMany({ where: { userId: id } }),
    prisma.user.delete({ where: { id } }),
  ]);

  return { id, nama: user.nama };
}

// --- Hapus banyak peminjam sekaligus (berdasarkan ID terpilih) ---
// Hanya menghapus user ber-role PEMINJAM. Peminjam yang masih punya peminjaman
// aktif dilewati (tidak dihapus). Sisanya dihapus beserta seluruh riwayat
// peminjamannya. Mengembalikan ringkasan { dihapus, dilewati }.
async function hapusBanyakPeminjam(ids) {
  const daftarId = Array.isArray(ids) ? [...new Set(ids.filter((v) => typeof v === 'string' && v))] : [];
  if (daftarId.length === 0) throw new AppError('Tidak ada peminjam yang dipilih.', 400);

  // Batasi hanya ke user ber-role PEMINJAM yang benar-benar ada.
  const peminjam = await prisma.user.findMany({
    where: { id: { in: daftarId }, role: 'PEMINJAM' },
    select: { id: true },
  });
  const idPeminjam = peminjam.map((p) => p.id);
  if (idPeminjam.length === 0) return { dihapus: 0, dilewati: 0 };

  // Peminjam yang masih punya peminjaman aktif tidak boleh dihapus → dilewati.
  const aktif = await prisma.peminjaman.findMany({
    where: { userId: { in: idPeminjam }, status: { in: STATUS_AKTIF } },
    select: { userId: true },
    distinct: ['userId'],
  });
  const idAktif = new Set(aktif.map((p) => p.userId));
  const idHapus = idPeminjam.filter((id) => !idAktif.has(id));

  if (idHapus.length > 0) {
    await prisma.$transaction([
      prisma.peminjaman.deleteMany({ where: { userId: { in: idHapus } } }),
      prisma.user.deleteMany({ where: { id: { in: idHapus } } }),
    ]);
  }

  return { dihapus: idHapus.length, dilewati: idAktif.size };
}

// --- Statistik user ---
async function getStatistik() {
  const [totalUser, totalAdmin, totalPeminjam] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.user.count({ where: { role: 'PEMINJAM' } }),
  ]);

  return { totalUser, totalAdmin, totalPeminjam };
}

module.exports = {
  getSemua,
  getById,
  create,
  update,
  resetPassword,
  remove,
  hapusBanyakPeminjam,
  getStatistik,
  tanpaPassword,
  PASSWORD_DEFAULT_RESET,
};
