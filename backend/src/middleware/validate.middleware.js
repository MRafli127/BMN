// ============================================================
//  Middleware validasi input menggunakan skema Zod.
//  Memvalidasi req.body. Bila gagal, mengembalikan daftar
//  pesan error yang mudah dimengerti.
// ============================================================

const { responsGagal } = require('../utils/apiResponse');

function validate(schema) {
  return (req, res, next) => {
    const hasil = schema.safeParse(req.body);

    if (!hasil.success) {
      // Susun daftar error per field
      const errors = hasil.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        pesan: issue.message,
      }));

      return responsGagal(res, {
        pesan: 'Data yang dikirim tidak valid. Mohon periksa kembali isian Anda.',
        errors,
        status: 422,
      });
    }

    // Ganti body dengan data yang sudah tervalidasi & ter-sanitasi
    req.body = hasil.data;
    next();
  };
}

module.exports = validate;
