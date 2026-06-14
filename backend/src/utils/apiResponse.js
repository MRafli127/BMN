// ============================================================
//  Format respons API yang konsisten di seluruh aplikasi.
//  Bentuk: { sukses: boolean, pesan: string, data: any, meta?: any }
// ============================================================

// Respons sukses
function responsSukses(res, { pesan = 'Berhasil', data = null, meta = null, status = 200 } = {}) {
  const body = { sukses: true, pesan, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

// Respons gagal/error
function responsGagal(res, { pesan = 'Terjadi kesalahan', errors = null, status = 400 } = {}) {
  const body = { sukses: false, pesan };
  if (errors) body.errors = errors;
  return res.status(status).json(body);
}

// Mengubah path file relatif (mis. "/uploads/foto-barang/x.jpg")
// menjadi URL absolut berdasarkan APP_URL. Aman untuk nilai null.
function urlPublik(pathRelatif) {
  if (!pathRelatif) return null;
  if (/^data:/i.test(pathRelatif)) return pathRelatif; // data URL (base64) — kirim apa adanya
  if (/^https?:\/\//i.test(pathRelatif)) return pathRelatif; // sudah absolut
  const env = require('../config/env');
  const base = env.appUrl.replace(/\/$/, '');
  const path = pathRelatif.startsWith('/') ? pathRelatif : `/${pathRelatif}`;
  return `${base}${path}`;
}

module.exports = { responsSukses, responsGagal, urlPublik };
