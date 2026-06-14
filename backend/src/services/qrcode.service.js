// ============================================================
//  Service QR Code
//  Membuat gambar QR Code peminjaman dan menyimpannya
//  sebagai file PNG di folder uploads/qrcode.
//  Isi QR: kodePeminjaman, nama barang, peminjam, status, tanggal.
// ============================================================

const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const { pastikanFolder } = require('../config/multer');

// Bangun payload teks/JSON yang akan dikodekan ke dalam QR
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

// Generate QR Code, simpan ke file, kembalikan path relatif publik
async function generateUntukPeminjaman(peminjaman) {
  const folder = pastikanFolder('qrcode');
  const namaFile = `qr-${peminjaman.kodePeminjaman}.png`;
  const fullPath = path.join(folder, namaFile);

  const payload = bangunPayload(peminjaman);

  await QRCode.toFile(fullPath, payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 400,
    color: { dark: '#1e3a5f', light: '#ffffff' },
  });

  // Path relatif yang dapat diakses publik (disajikan oleh express.static)
  return `/uploads/qrcode/${namaFile}`;
}

// Hapus file QR lama bila ada
function hapusFile(pathRelatif) {
  if (!pathRelatif) return;
  try {
    const full = path.resolve(__dirname, '../../', pathRelatif.replace(/^\//, ''));
    if (fs.existsSync(full)) fs.unlinkSync(full);
  } catch {
    /* abaikan kegagalan penghapusan file */
  }
}

module.exports = { generateUntukPeminjaman, bangunPayload, hapusFile };
