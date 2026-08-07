// ============================================================
//  Middleware otorisasi berbasis peran (role).
//  Contoh penggunaan: roleMiddleware('ADMIN') atau roleMiddleware('ADMIN', 'SUPER_ADMIN')
//  Harus dipasang SETELAH authMiddleware.
//
//  SUPER_ADMIN mendapat akses ADMIN secara implisit.
// ============================================================

const { responsGagal } = require('../utils/apiResponse');
const { rolesEfektif } = require('../services/auth.service');

function roleMiddleware(...peranDiizinkan) {
  return (req, res, next) => {
    if (!req.user) {
      return responsGagal(res, {
        pesan: 'Belum terautentikasi.',
        status: 401,
      });
    }

    // SUPER_ADMIN mendapat akses ADMIN (roles efektif)
    const rolesUser = rolesEfektif(req.user.roles);
    const boleh = peranDiizinkan.some((p) => rolesUser.includes(p));

    if (!boleh) {
      return responsGagal(res, {
        pesan: 'Anda tidak memiliki hak akses untuk tindakan ini.',
        status: 403,
      });
    }

    next();
  };
}

// Middleware cek scope satker untuk resource barang berdasarkan route param :id.
// SUPER_ADMIN bypass (semua satker).
// ADMIN harus memiliki akses ke kodeSatker barang yang dituju.
// READ-ONLY: hanya query, tidak ada operasi write.
function barangScopeMiddleware() {
  return async (req, res, next) => {
    if (!req.user) {
      return responsGagal(res, { pesan: 'Belum terautentikasi.', status: 401 });
    }

    // SUPER_ADMIN punya akses penuh ke semua satker
    if (req.user.role === 'SUPER_ADMIN') return next();

    if (req.user.role !== 'ADMIN') return next();

    // Ambil kodeSatker barang langsung dari DB — jangan percaya req.body/req.query
    const { prisma } = require('../config/database');
    const barang = await prisma.barang.findUnique({
      where: { id: req.params.id },
      select: { kodeSatker: true },
    });

    if (!barang) {
      // Biarkan handler/service tangani 404 — middleware ini bukan untuk itu
      return next();
    }

    const satkerAkses = req.user.satkerAkses || [];
    if (satkerAkses.length > 0 && !satkerAkses.includes(barang.kodeSatker)) {
      return responsGagal(res, {
        pesan: 'Anda tidak memiliki akses untuk mengelola barang di satker ini.',
        status: 403,
      });
    }

    next();
  };
}

// Middleware cek scope satker untuk ADMIN.
// SUPER_ADMIN bypass (semua satker).
// ADMIN harus memiliki akses ke satker yang dituju.
function satkerMiddleware(kodeSatker) {
  return (req, res, next) => {
    if (!req.user) {
      return responsGagal(res, {
        pesan: 'Belum terautentikasi.',
        status: 401,
      });
    }

    // SUPER_ADMIN punya akses penuh ke semua satker
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    // ADMIN harus punya akses ke satker yang dituju
    if (req.user.role === 'ADMIN') {
      const satkerAkses = req.user.satkerAkses || [];
      if (satkerAkses.length > 0 && !satkerAkses.includes(kodeSatker)) {
        return responsGagal(res, {
          pesan: 'Anda tidak memiliki akses untuk mengelola transaksi di satker ini.',
          status: 403,
        });
      }
    }

    next();
  };
}

module.exports = roleMiddleware;
module.exports.satkerMiddleware = satkerMiddleware;
module.exports.barangScopeMiddleware = barangScopeMiddleware;
