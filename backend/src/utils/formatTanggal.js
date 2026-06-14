// ============================================================
//  Utilitas format tanggal & waktu dalam bahasa Indonesia.
//  Menggunakan date-fns dengan locale 'id'.
//  Contoh hasil: "Sabtu, 13 Juni 2026, 14:30 WIB"
// ============================================================

const { format } = require('date-fns');
const { id } = require('date-fns/locale');

// Format lengkap dengan hari, tanggal, dan jam (WIB)
function formatTanggalLengkap(tanggal) {
  if (!tanggal) return '-';
  const d = new Date(tanggal);
  return `${format(d, "EEEE, dd MMMM yyyy, HH:mm", { locale: id })} WIB`;
}

// Format tanggal saja (tanpa jam)
function formatTanggalSaja(tanggal) {
  if (!tanggal) return '-';
  const d = new Date(tanggal);
  return format(d, 'dd MMMM yyyy', { locale: id });
}

// Cek apakah tanggal sudah terlewati dari sekarang
function sudahTerlewati(tanggal) {
  if (!tanggal) return false;
  return new Date(tanggal).getTime() < Date.now();
}

module.exports = { formatTanggalLengkap, formatTanggalSaja, sudahTerlewati };
