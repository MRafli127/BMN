// ============================================================
//  Penyimpanan file sebagai data URL (base64) di database.
//  Dipakai agar aplikasi berjalan di Vercel (filesystem read-only)
//  tanpa bergantung pada storage eksternal.
// ============================================================

// Ubah buffer + tipe MIME menjadi data URL: "data:<mime>;base64,<isi>"
function bufferKeDataUrl(buffer, mimetype) {
  const mime = mimetype || 'application/octet-stream';
  return `data:${mime};base64,${Buffer.from(buffer).toString('base64')}`;
}

// Urai data URL menjadi { mime, buffer }
function dataUrlKeBuffer(dataUrl) {
  const cocok = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl || '');
  if (!cocok) return null;
  return { mime: cocok[1], buffer: Buffer.from(cocok[2], 'base64') };
}

module.exports = { bufferKeDataUrl, dataUrlKeBuffer };
