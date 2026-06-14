const { put } = require('@vercel/blob');

async function uploadKeBlob(namaFile, buffer, contentType) {
  const { url } = await put(namaFile, buffer, {
    access: 'public',
    contentType,
    allowOverwrite: true,
  });
  return url;
}

module.exports = { uploadKeBlob };
