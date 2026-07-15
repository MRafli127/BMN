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
const { hitungRetirementDateDariNip, validasiNip } = require('../utils/nipHelper');

// Password default untuk user baru hasil reset
const PASSWORD_DEFAULT_RESET = 'BMN@Reset123';

// Daftar role valid dalam sistem
const ROLE_VALID = ['ADMIN', 'PEMINJAM', 'SUPER_ADMIN'];

// --- List semua user dengan pagination & filter ---
async function getSemua({ q, role, page = 1, limit = 10 } = {}) {
  const { halaman, perHalaman, skip } = parsePagination({ page, limit });

  const where = {};
  if (role) where.roles = { has: role };
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
        eselon2: true,
        eselon3: true,
        eselon4: true,
        roles: true,
        sumber: true,
        satkerAkses: true,
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
      eselon2: true,
      eselon3: true,
      eselon4: true,
      roles: true,
      sumber: true,
      satkerAkses: true,
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

  // Tentukan & validasi roles (default: peminjam)
  const roles = Array.isArray(data.roles) && data.roles.length ? [...new Set(data.roles)] : ['PEMINJAM'];
  if (roles.some((r) => !ROLE_VALID.includes(r))) {
    throw new AppError('Role tidak valid.', 400);
  }

  // Validasi NIP dan hitung retirement date
  const validasi = validasiNip(data.nip);
  if (!validasi.valid) {
    throw new AppError(validasi.error, 400);
  }

  const retirementDate = hitungRetirementDateDariNip(data.nip);
  if (!retirementDate) {
    throw new AppError('Format NIP tidak valid. Pastikan tanggal lahir dalam NIP benar.', 400);
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
      roles,
      sumber: 'MANUAL',
      retirementDate,
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

  // Catatan: role/peran TIDAK diubah di sini — gunakan endpoint promote/demote
  // (tambahRole/hapusRole) yang menegakkan guard "admin terakhir".

  // Validasi NIP & hitung ulang retirementDate jika NIP diubah
  let retirementDate = userLama.retirementDate;
  if (data.nip && data.nip !== userLama.nip) {
    const validasi = validasiNip(data.nip);
    if (!validasi.valid) {
      throw new AppError(validasi.error, 400);
    }
    const tanggalPensiun = hitungRetirementDateDariNip(data.nip);
    if (!tanggalPensiun) {
      throw new AppError('Format NIP tidak valid. Pastikan tanggal lahir dalam NIP benar.', 400);
    }
    retirementDate = tanggalPensiun;
  }

  const user = await prisma.user.update({
    where: { id },
    data: {
      nama: data.nama ?? userLama.nama,
      nip: data.nip ?? userLama.nip,
      email: data.email ?? userLama.email,
      jabatan: data.jabatan !== undefined ? (data.jabatan || null) : userLama.jabatan,
      unitKerja: data.unitKerja !== undefined ? (data.unitKerja || null) : userLama.unitKerja,
      eselon2: data.eselon2 !== undefined ? (data.eselon2 || null) : userLama.eselon2,
      eselon3: data.eselon3 !== undefined ? (data.eselon3 || null) : userLama.eselon3,
      eselon4: data.eselon4 !== undefined ? (data.eselon4 || null) : userLama.eselon4,
      retirementDate,
    },
  });

  return tanpaPassword(user);
}

// --- Tambah role ke user (promote) ---
// Idempotent: bila user sudah punya role tsb, tidak melakukan apa-apa.
async function tambahRole(id, role) {
  if (!ROLE_VALID.includes(role)) throw new AppError('Role tidak valid.', 400);

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('User tidak ditemukan.', 404);

  if (user.roles.includes(role)) {
    return tanpaPassword(user); // sudah punya → no-op
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { roles: { push: role } },
  });
  return tanpaPassword(updated);
}

// --- Hapus role dari user (demote) ---
// Menegakkan: (1) super admin terakhir tidak boleh dicabut, (2) admin terakhir
// tidak boleh dicabut, (3) user harus tetap punya minimal 1 role.
// Saat mencabut ADMIN/SUPER_ADMIN, tokenVersion di-increment agar sesi
// yang berjalan langsung berakhir.
// Menggunakan transaksi untuk mencegah race condition.
async function hapusRole(id, role) {
  if (!ROLE_VALID.includes(role)) throw new AppError('Role tidak valid.', 400);

  // Gunakan transaksi untuk mencegah race condition:
  // antara cek guard dan update harus atomic.
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id } });
    if (!user) throw new AppError('User tidak ditemukan.', 404);

    if (!user.roles.includes(role)) {
      return tanpaPassword(user); // tidak punya → no-op
    }

    // Jaga: user harus tetap punya minimal 1 role.
    if (user.roles.length <= 1) {
      throw new AppError('User harus memiliki minimal satu peran.', 400);
    }

    // Guard: jangan cabut super admin terakhir.
    if (role === 'SUPER_ADMIN') {
      const jumlahSuperAdmin = await tx.user.count({
        where: { roles: { has: 'SUPER_ADMIN' } },
      });
      if (jumlahSuperAdmin <= 1) {
        throw new AppError('Tidak dapat mencabut super admin terakhir.', 400);
      }
    }

    // Guard: jangan cabut admin terakhir.
    if (role === 'ADMIN') {
      const jumlahAdmin = await tx.user.count({ where: { roles: { has: 'ADMIN' } } });
      if (jumlahAdmin <= 1) {
        throw new AppError('Tidak dapat mencabut admin terakhir.', 400);
      }
    }

    const rolesBaru = user.roles.filter((r) => r !== role);
    const updated = await tx.user.update({
      where: { id },
      data: {
        roles: { set: rolesBaru },
        // Cabut ADMIN/SUPER_ADMIN = sensitif → akhiri semua sesi berjalan.
        ...(role === 'ADMIN' || role === 'SUPER_ADMIN'
          ? { tokenVersion: { increment: 1 } }
          : {}),
      },
    });
    return tanpaPassword(updated);
  }, {
    isolationLevel: 'Serializable', // Level tertinggi untuk prevent race
  });
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
// Melindungi: (1) super admin terakhir, (2) admin terakhir.
// Semua pengecekan dan penghapusan dalam transaksi untuk mencegah race condition.
async function remove(id) {
  // Gunakan transaksi untuk atomicity + race condition prevention
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id },
      include: {
        _count: { select: { peminjaman: true } },
      },
    });
    if (!user) throw new AppError('User tidak ditemukan.', 404);

    // Cek: jangan hapus super admin terakhir.
    if (user.roles.includes('SUPER_ADMIN')) {
      const jumlahSuperAdmin = await tx.user.count({
        where: { roles: { has: 'SUPER_ADMIN' } },
      });
      if (jumlahSuperAdmin <= 1) {
        throw new AppError('Tidak dapat menghapus super admin terakhir.', 400);
      }
    }

    // Cek: jangan hapus admin terakhir.
    if (user.roles.includes('ADMIN')) {
      const jumlahAdmin = await tx.user.count({ where: { roles: { has: 'ADMIN' } } });
      if (jumlahAdmin <= 1) {
        throw new AppError('Tidak dapat menghapus admin terakhir.', 400);
      }
    }

    // Cek: user punya peminjaman aktif?
    const peminjamanAktif = await tx.peminjaman.count({
      where: { userId: id, status: { in: STATUS_AKTIF } },
    });
    if (peminjamanAktif > 0) {
      throw new AppError(`User memiliki ${peminjamanAktif} peminjaman aktif. Selesaikan dulu sebelum menghapus.`, 400);
    }

    // Hapus riwayat peminjaman lalu user.
    // Detail peminjaman ikut terhapus otomatis (onDelete: Cascade).
    await tx.peminjaman.deleteMany({ where: { userId: id } });
    await tx.user.delete({ where: { id } });

    return { id, nama: user.nama };
  }, {
    isolationLevel: 'Serializable',
  });
}

// --- Hapus banyak peminjam sekaligus (berdasarkan ID terpilih) ---
// Hanya menghapus user ber-role PEMINJAM. Peminjam yang masih punya peminjaman
// aktif dilewati (tidak dihapus). Sisanya dihapus beserta seluruh riwayat
// peminjamannya. Mengembalikan ringkasan { dihapus, dilewati }.
async function hapusBanyakPeminjam(ids) {
  const daftarId = Array.isArray(ids) ? [...new Set(ids.filter((v) => typeof v === 'string' && v))] : [];
  if (daftarId.length === 0) throw new AppError('Tidak ada peminjam yang dipilih.', 400);

  // Batasi hanya ke akun peminjam murni (punya PEMINJAM, BUKAN admin).
  // Akun yang juga ADMIN dilindungi dari hapus massal.
  const peminjam = await prisma.user.findMany({
    where: { id: { in: daftarId }, roles: { has: 'PEMINJAM' }, NOT: { roles: { has: 'ADMIN' } } },
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
    prisma.user.count({ where: { roles: { has: 'ADMIN' } } }),
    prisma.user.count({ where: { roles: { has: 'PEMINJAM' } } }),
  ]);

  return { totalUser, totalAdmin, totalPeminjam };
}

// --- Update satker akses (khusus SUPER_ADMIN) ---
async function updateSatkerAccess(id, satkerAkses) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError('User tidak ditemukan.', 404);

  // Validasi: jika user punya role ADMIN, harus punya minimal 1 satker
  if (user.roles.includes('ADMIN') && satkerAkses.length === 0) {
    // SUPER_ADMIN boleh kosong (akses semua satker)
    // Tapi ADMIN biasa harus punya satker
    if (!user.roles.includes('SUPER_ADMIN')) {
      throw new AppError('Admin harus memiliki akses ke minimal satu satker.', 400);
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { satkerAkses },
  });
  return tanpaPassword(updated);
}

module.exports = {
  getSemua,
  getById,
  create,
  update,
  tambahRole,
  hapusRole,
  resetPassword,
  remove,
  hapusBanyakPeminjam,
  getStatistik,
  updateSatkerAccess,
  tanpaPassword,
  PASSWORD_DEFAULT_RESET,
};
