const QRCode = require('qrcode');
const { uploadKeBlob } = require('../utils/blob');

function bangunPayload(peminjaman) {
  const namaBarang = (peminjaman.detail || [])
    .map((d) => `${d.barang?.nama || 'Barang'} (${d.jumlahPinjam})`)
    .join(', ');

  return JSON.stringify({
    kodePeminjaman: peminjaman.kodePeminjaman,
    peminjam: peminjaman.peminjam?.nama || '-',
    barang: namaBarang,
    status: peminjaman.status,
    tanggal: peminjaman.tanggalPinjamRencana,
  });
}

async function generateUntukPeminjaman(peminjaman) {
  const payload = bangunPayload(peminjaman);

  const buffer = await QRCode.toBuffer(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 400,
    color: { dark: '#1e3a5f', light: '#ffffff' },
  });

  const namaFile = `qrcode/qr-${peminjaman.kodePeminjaman}.png`;
  const url = await uploadKeBlob(namaFile, buffer, 'image/png');
  return url;
}

module.exports = { generateUntukPeminjaman, bangunPayload };
