// ============================================================
//  Validator Satker
// ============================================================

const { body, param, query } = require('express-validator');

const createSatkerSchema = [
  body('kode')
    .notEmpty().withMessage('Kode satker wajib diisi.')
    .isString().withMessage('Kode satker harus string.')
    .trim()
    .isLength({ min: 3, max: 50 }).withMessage('Kode satker 3-50 karakter.'),
  body('nama')
    .notEmpty().withMessage('Nama satker wajib diisi.')
    .isString().withMessage('Nama satker harus string.')
    .trim()
    .isLength({ min: 3, max: 255 }).withMessage('Nama satker 3-255 karakter.'),
  body('singkat')
    .optional()
    .isString().withMessage('Nama singkat harus string.')
    .trim()
    .isLength({ max: 100 }).withMessage('Nama singkat maksimal 100 karakter.'),
  body('aktif')
    .optional()
    .isBoolean().withMessage('Aktif harus boolean.'),
];

const updateSatkerSchema = [
  body('kode')
    .optional()
    .isString().withMessage('Kode satker harus string.')
    .trim()
    .isLength({ min: 3, max: 50 }).withMessage('Kode satker 3-50 karakter.'),
  body('nama')
    .optional()
    .isString().withMessage('Nama satker harus string.')
    .trim()
    .isLength({ min: 3, max: 255 }).withMessage('Nama satker 3-255 karakter.'),
  body('singkat')
    .optional()
    .isString().withMessage('Nama singkat harus string.')
    .trim()
    .isLength({ max: 100 }).withMessage('Nama singkat maksimal 100 karakter.'),
  body('aktif')
    .optional()
    .isBoolean().withMessage('Aktif harus boolean.'),
];

module.exports = {
  createSatkerSchema,
  updateSatkerSchema,
};
