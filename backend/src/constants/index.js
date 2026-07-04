// ============================================================
//  Konstanta label & warna untuk status, jenis, dan kondisi.
//  Dipakai di semua service, export, dan surat.
// ============================================================

const LABEL_KONDISI = {
  BAIK: 'Baik',
  RUSAK_RINGAN: 'Rusak Ringan',
  RUSAK_BERAT: 'Rusak Berat',
};

const LABEL_JENIS = {
  ELEKTRONIK: 'Elektronik',
  FURNITUR: 'Furnitur',
  KENDARAAN: 'Kendaraan',
  ATK: 'ATK',
  LAINNYA: 'Lainnya',
};

// Status yang dihitung sebagai "peminjaman aktif"
const STATUS_AKTIF = ['DISETUJUI', 'DIPINJAM', 'TERLAMBAT'];

module.exports = {
  LABEL_KONDISI,
  LABEL_JENIS,
  STATUS_AKTIF,
};
