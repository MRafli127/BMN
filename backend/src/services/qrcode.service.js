const QRCode = require('qrcode');

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

// Generate QR Code sebagai data URL (base64 PNG) untuk disimpan di DB
async function generateUntukPeminjaman(peminjaman) {
  const payload = bangunPayload(peminjaman);

  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 400,
    color: { dark: '#1e3a5f', light: '#ffffff' },
  });
}

module.exports = { generateUntukPeminjaman, bangunPayload };
