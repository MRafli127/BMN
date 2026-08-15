// ============================================================
//  Middleware validasi input.
//  Mendukung dua format schema:
//   - Zod schema (memiliki method .safeParse)
//   - Array express-validator chain (memiliki method .run)
//
//  Memvalidasi req.body. Bila gagal, mengembalikan daftar
//  pesan error yang mudah dimengerti.
// ============================================================

const { validationResult } = require('express-validator');
const { responsGagal } = require('../utils/apiResponse');

function validate(schema) {
  return async (req, res, next) => {
    // Cek apakah ini Zod schema atau express-validator chain array
    const isZodSchema = typeof schema.safeParse === 'function';

    if (isZodSchema) {
      // Zod schema validation
      const hasil = schema.safeParse(req.body);

      if (!hasil.success) {
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

      req.body = hasil.data;
      next();
    } else {
      // express-validator chain array validation
      try {
        await Promise.all(schema.map((validator) => validator.run(req)));
      } catch {
        // validation run errors are handled via validationResult below
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const errorList = errors.array().map((err) => ({
          field: err.path || err.param || 'unknown',
          pesan: err.msg,
        }));

        return responsGagal(res, {
          pesan: 'Data yang dikirim tidak valid. Mohon periksa kembali isian Anda.',
          errors: errorList,
          status: 422,
        });
      }

      next();
    }
  };
}

module.exports = validate;
