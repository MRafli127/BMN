// ============================================================
//  Pembentuk kode/identitas Barang.
//
//  Kode barang = KUNCI NATURAL aset BMN:
//      Kode Satker - Kode Barang - NUP
//  contoh: 015110199411868000KP-3100102002-1180
//
//  Menggantikan format lama BMN-<tahun>-NNNN (auto-increment)
//  yang sudah dihapus dari seluruh sistem. Dipakai bersama oleh
//  barang.service.js (input manual) & barangImport.service.js
//  (import Excel) agar kode konsisten dari mana pun barang dibuat.
// ============================================================

// Bentuk kode barang dari komponen identitas aset.
// Bagian yang kosong/null dilewati agar tidak ada pemisah '-' menggantung.
function kodeNaturalBarang({ kodeSatker, kodeBarangBmn, nup } = {}) {
  return [kodeSatker, kodeBarangBmn, nup]
    .map((v) => (v == null ? '' : String(v).trim()))
    .filter(Boolean)
    .join('-');
}

module.exports = { kodeNaturalBarang };
