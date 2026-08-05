// ============================================================
//  Format respons API yang konsisten di seluruh aplikasi.
//  Bentuk: { sukses: boolean, pesan: string, data: any, meta?: any }
// ============================================================

// Generate simple ETag hash dari data
function generateEtag(data) {
  if (!data) return null;
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `"${Math.abs(hash).toString(16)}"`;
}

// Respons sukses — auto-set ETag header dari response body
function responsSukses(res, { pesan = 'Berhasil', data = null, meta = null, status = 200 } = {}) {
  const body = { sukses: true, pesan, data };
  if (meta) body.meta = meta;

  // Generate ETag dari response body
  const etag = generateEtag(body);
  if (etag) {
    // Gunakan res.setEtag jika ada (dari etag.middleware), fallback ke setHeader
    if (typeof res.setEtag === 'function') {
      res.setEtag(etag);
    } else {
      res.setHeader('ETag', etag);
    }
  }

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
