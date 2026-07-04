// ============================================================
//  Service Export Data
//  Export data ke format Excel (.xlsx) untuk laporan.
// ============================================================

const XLSX = require('xlsx');
const { formatTanggalIndonesia, formatTanggalSingkat } = require('../utils/formatTanggal');
const { LABEL_KONDISI } = require('../constants');

// Mapping status ke label Indonesia
const LABEL_STATUS = {
  MENUNGGU: 'Menunggu',
  DISETUJUI: 'Disetujui',
  DITOLAK: 'Ditolak',
  DIPINJAM: 'Dipinjam',
  DIKEMBALIKAN: 'Dikembalikan',
  TERLAMBAT: 'Terlambat',
};

// Mapping jenis barang
const LABEL_JENIS = {
  ELEKTRONIK: 'Elektronik',
  FURNITUR: 'Furnitur',
  KENDARAAN: 'Kendaraan',
  ATK: 'Alat Tulis Kantor',
  LAINNYA: 'Lainnya',
};

// Format tanggal standar Indonesia
function formatTanggal(date) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Format datetime
function formatDateTime(date) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Buat workbook dari data
function buatWorkbook(data) {
  const wb = XLSX.utils.book_new();
  return wb;
}

// Convert array of objects to worksheet
function dataToWorksheet(data, sheetName = 'Sheet1') {
  // Konversi tanggal ke string untuk Excel
  const dataReady = data.map((row) => {
    const processed = {};
    for (const [key, value] of Object.entries(row)) {
      if (value instanceof Date) {
        processed[key] = formatDateTime(value);
      } else if (key.includes('Tanggal') || key.includes('tanggal') || key.includes('Date') || key.includes('date')) {
        processed[key] = value ? formatTanggal(value) : '-';
      } else {
        processed[key] = value ?? '-';
      }
    }
    return processed;
  });

  const ws = XLSX.utils.json_to_sheet(dataReady);
  return ws;
}

// Set column widths berdasarkan header
function setColumnWidths(ws, headers) {
  ws['!cols'] = headers.map((h) => ({
    wch: Math.max(h.label.length + 2, 15),
  }));
}

// --- Export Peminjaman ---
async function exportPeminjaman(data) {
  const headers = [
    { label: 'Kode Transaksi', key: 'kodeTransaksi' },
    { label: 'Kode Barang', key: 'kodePeminjaman' },
    { label: 'Nama Peminjam', key: 'namaPeminjam' },
    { label: 'NIP Peminjam', key: 'nipPeminjam' },
    { label: 'Unit Kerja', key: 'unitKerja' },
    { label: 'Barang', key: 'namaBarang' },
    { label: 'Jumlah', key: 'jumlahPinjam' },
    { label: 'Status', key: 'status' },
    { label: 'Tanggal Pengajuan', key: 'tanggalPengajuan' },
    { label: 'Tanggal Pinjam', key: 'tanggalPinjam' },
    { label: 'Tanggal Kembali Rencana', key: 'tanggalKembaliRencana' },
    { label: 'Tanggal Kembali Aktual', key: 'tanggalKembaliAktual' },
    { label: 'Alasan', key: 'alasanPeminjaman' },
    { label: 'Disetujui Oleh', key: 'disetujuiOleh' },
    { label: 'Catatan Admin', key: 'catatanAdmin' },
  ];

  // Transform data
  const rows = data.map((p) => {
    const item = p.detail?.[0];
    return {
      kodeTransaksi: p.kodeTransaksi || '-',
      kodePeminjaman: p.kodePeminjaman || '-',
      namaPeminjam: p.peminjam?.nama || '-',
      nipPeminjam: p.peminjam?.nip || '-',
      unitKerja: p.peminjam?.unitKerja || '-',
      namaBarang: item?.barang?.nama || '-',
      jumlahPinjam: item?.jumlahPinjam || '-',
      status: LABEL_STATUS[p.status] || p.status || '-',
      tanggalPengajuan: formatTanggal(p.tanggalPengajuan),
      tanggalPinjam: formatTanggal(p.tanggalPinjamRencana),
      tanggalKembaliRencana: formatTanggal(p.tanggalKembaliRencana),
      tanggalKembaliAktual: formatTanggal(p.tanggalKembaliAktual),
      alasanPeminjaman: p.alasanPeminjaman || '-',
      disetujuiOleh: p.admin?.nama || '-',
      catatanAdmin: p.catatanAdmin || '-',
    };
  });

  const wb = buatWorkbook();
  const ws = dataToWorksheet(rows);
  setColumnWidths(ws, headers);

  // Style header row
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[address]) continue;
    ws[address].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: 'E5E7EB' } },
    };
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Peminjaman');
  return wb;
}

// --- Export Barang ---
async function exportBarang(data) {
  const headers = [
    { label: 'Kode Barang', key: 'kodeBarang' },
    { label: 'Nama', key: 'nama' },
    { label: 'Merk/Model', key: 'merk' },
    { label: 'Jenis', key: 'jenis' },
    { label: 'Kondisi', key: 'kondisi' },
    { label: 'Jumlah Total', key: 'jumlahTotal' },
    { label: 'Jumlah Tersedia', key: 'jumlahTersedia' },
    { label: 'Lokasi', key: 'lokasiPenyimpanan' },
    { label: 'Kode Satker', key: 'kodeSatker' },
    { label: 'Nama Satker', key: 'namaSatker' },
    { label: 'Kode BMN', key: 'kodeBarangBmn' },
    { label: 'NUP', key: 'nup' },
    { label: 'Deskripsi', key: 'deskripsi' },
    { label: 'Sumber', key: 'sumber' },
  ];

  const rows = data.map((b) => ({
    kodeBarang: b.kodeBarang || '-',
    nama: b.nama || '-',
    merk: b.merk || '-',
    jenis: LABEL_JENIS[b.jenis] || b.jenis || '-',
    kondisi: LABEL_KONDISI[b.kondisi] || b.kondisi || '-',
    jumlahTotal: b.jumlahTotal ?? '-',
    jumlahTersedia: b.jumlahTersedia ?? '-',
    lokasiPenyimpanan: b.lokasiPenyimpanan || '-',
    kodeSatker: b.kodeSatker || '-',
    namaSatker: b.namaSatker || '-',
    kodeBarangBmn: b.kodeBarangBmn || '-',
    nup: b.nup || '-',
    deskripsi: b.deskripsi || '-',
    sumber: b.sumber === 'IMPORT' ? 'Import' : 'Manual',
  }));

  const wb = buatWorkbook();
  const ws = dataToWorksheet(rows);
  setColumnWidths(ws, headers);

  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[address]) continue;
    ws[address].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: 'E5E7EB' } },
    };
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Barang');
  return wb;
}

// --- Export Users ---
async function exportUsers(data) {
  const headers = [
    { label: 'Nama', key: 'nama' },
    { label: 'NIP', key: 'nip' },
    { label: 'Email', key: 'email' },
    { label: 'Jabatan', key: 'jabatan' },
    { label: 'Unit Kerja', key: 'unitKerja' },
    { label: 'Role', key: 'role' },
    { label: 'Sumber', key: 'sumber' },
    { label: 'Total Peminjaman', key: 'totalPeminjaman' },
    { label: 'Tanggal Dibuat', key: 'createdAt' },
  ];

  const rows = data.map((u) => ({
    nama: u.nama || '-',
    nip: u.nip || '-',
    email: u.email || '-',
    jabatan: u.jabatan || '-',
    unitKerja: u.unitKerja || '-',
    role: u.role === 'ADMIN' ? 'Administrator' : 'Peminjam',
    sumber: u.sumber === 'IMPORT' ? 'Import' : 'Manual',
    totalPeminjaman: u.totalPeminjaman ?? '-',
    createdAt: formatTanggal(u.createdAt),
  }));

  const wb = buatWorkbook();
  const ws = dataToWorksheet(rows);
  setColumnWidths(ws, headers);

  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[address]) continue;
    ws[address].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: 'E5E7EB' } },
    };
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Users');
  return wb;
}

// Generate file buffer untuk download
function workbookToBuffer(wb) {
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// Generate filename dengan timestamp
function generateFilename(prefix) {
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `${prefix}_${timestamp}.xlsx`;
}

module.exports = {
  exportPeminjaman,
  exportBarang,
  exportUsers,
  workbookToBuffer,
  generateFilename,
  formatTanggal,
  formatDateTime,
};
