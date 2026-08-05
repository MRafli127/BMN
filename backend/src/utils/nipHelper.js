// ============================================================
//  Helper Utility — Parsing NIP & Perhitungan Tanggal Pensiun
//
//  Format NIP ASN 18 digit:
//  Digit 1-4  : Tahun lahir (YYYY)
//  Digit 5-6  : Bulan lahir (MM)
//  Digit 7-8  : Tanggal lahir (DD)
//
//  Contoh:
//  198703152010011001 → 1987-03-15
//
//  Tanggal pensiun = Tanggal lahir + 58 tahun
//  Contoh: 1987-03-15 + 58 tahun = 2045-03-15
// ============================================================

/**
 * Validasi format NIP
 * @param {string} nip - NIP yang akan divalidasi
 * @returns {object} - { valid: boolean, error?: string }
 */
function validasiNip(nip) {
  if (!nip || typeof nip !== 'string') {
    return { valid: false, error: 'NIP harus diisi.' };
  }

  // Hapus spasi dan karakter non-digit
  const nipBersih = nip.trim();

  // Cek apakah hanya berisi angka
  if (!/^\d+$/.test(nipBersih)) {
    return { valid: false, error: 'NIP harus berisi angka saja.' };
  }

  // Cek panjang harus 18 digit
  if (nipBersih.length !== 18) {
    return { valid: false, error: `NIP harus 18 digit. Sekarang: ${nipBersih.length} digit.` };
  }

  return { valid: true };
}

/**
 * Parse tanggal lahir dari NIP
 * @param {string} nip - NIP 18 digit
 * @returns {Date|null} - Tanggal lahir atau null jika gagal
 */
function parseTanggalLahirDariNip(nip) {
  const validasi = validasiNip(nip);
  if (!validasi.valid) {
    return null;
  }

  const nipBersih = nip.trim();

  // Extract tahun, bulan, tanggal dari NIP
  const tahun = parseInt(nipBersih.substring(0, 4), 10);
  const bulan = parseInt(nipBersih.substring(4, 6), 10);
  const tanggal = parseInt(nipBersih.substring(6, 8), 10);

  // Validasi range bulan dan tanggal
  if (bulan < 1 || bulan > 12) {
    return null;
  }

  // Validasi tanggal berdasarkan bulan (tidak perlu presisi untuk leap year)
  const maxTanggal = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][bulan - 1];
  if (tanggal < 1 || tanggal > maxTanggal) {
    return null;
  }

  // Validasi tahun masuk akal (minimal 1900, maksimal tahun sekarang)
  const tahunSekarang = new Date().getFullYear();
  const tahunMin = 1900;
  const tahunMax = tahunSekarang - 18; // Minimal 18 tahun (belum pensiun)

  if (tahun < tahunMin || tahun > tahunMax) {
    return null;
  }

  // Buat objek Date (bulan di JavaScript 0-indexed)
  const tanggalLahir = new Date(tahun, bulan - 1, tanggal);

  // Validasi date object valid
  if (isNaN(tanggalLahir.getTime())) {
    return null;
  }

  return tanggalLahir;
}

/**
 * Hitung tanggal pensiun dari tanggal lahir
 * Tanggal pensiun = Tanggal lahir + 58 tahun
 * @param {Date} tanggalLahir - Tanggal lahir
 * @returns {Date} - Tanggal pensiun
 */
function hitungTanggalPensiun(tanggalLahir) {
  if (!tanggalLahir || !(tanggalLahir instanceof Date) || isNaN(tanggalLahir.getTime())) {
    throw new Error('Tanggal lahir tidak valid.');
  }

  const tahun = tanggalLahir.getFullYear() + 58;
  const bulan = tanggalLahir.getMonth(); // 0-indexed
  const tanggal = tanggalLahir.getDate();

  return new Date(tahun, bulan, tanggal);
}

/**
 * Hitung sisa hari menuju pensiun
 * @param {Date} tanggalPensiun - Tanggal pensiun
 * @returns {number} - Sisa hari (positif = belum pensiun, negatif = sudah pensiun)
 */
function hitungSisaHari(tanggalPensiun) {
  if (!tanggalPensiun || !(tanggalPensiun instanceof Date) || isNaN(tanggalPensiun.getTime())) {
    return Infinity;
  }

  const sekarang = new Date();
  // Normalisasi ke awal hari (hilangkan jam, menit, detik)
  const hariIni = new Date(sekarang.getFullYear(), sekarang.getMonth(), sekarang.getDate());
  const tglPensiun = new Date(tanggalPensiun.getFullYear(), tanggalPensiun.getMonth(), tanggalPensiun.getDate());

  const selisihMs = tglPensiun.getTime() - hariIni.getTime();
  return Math.ceil(selisihMs / (1000 * 60 * 60 * 24)); // Convert ms ke hari
}

/**
 * Hitung retirement date dari NIP
 * Kombinasi parseTanggalLahirDariNip + hitungTanggalPensiun
 * @param {string} nip - NIP 18 digit
 * @returns {Date|null} - Tanggal pensiun atau null jika NIP tidak valid
 */
function hitungRetirementDateDariNip(nip) {
  const tanggalLahir = parseTanggalLahirDariNip(nip);
  if (!tanggalLahir) {
    return null;
  }
  return hitungTanggalPensiun(tanggalLahir);
}

/**
 * Format tanggal ke string Indonesia
 * @param {Date} date - Tanggal
 * @returns {string} - Format "15 Maret 1987"
 */
function formatTanggalIndonesia(date) {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return '-';
  }

  const namaBulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const hari = date.getDate();
  const bulan = namaBulan[date.getMonth()];
  const tahun = date.getFullYear();

  return `${hari} ${bulan} ${tahun}`;
}

module.exports = {
  validasiNip,
  parseTanggalLahirDariNip,
  hitungTanggalPensiun,
  hitungSisaHari,
  hitungRetirementDateDariNip,
  formatTanggalIndonesia,
};
