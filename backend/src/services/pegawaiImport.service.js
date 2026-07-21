// ============================================================
//  Service Import Data Pegawai (Daftar Pegawai) dari Excel/CSV.
//
//  Tujuan: mengisi & menyinkronkan DATA DIRI peminjam dari file
//  master pegawai (mis. Data-Pegawai-BPPK.xlsx). Field yang
//  diisi persis sama dengan yang ada di halaman "Pengaturan Akun":
//
//    Kolom Excel          Label Pengaturan Akun   Field User
//    ----------------------------------------------------------
//    NIP                  NIP                     nip
//    Nama                 Nama                    nama
//    Email                Alamat Email            email
//    Jabatan / Jabatan1   Jabatan                 jabatan
//    Unit Kerja           Unit Kerja              unitKerja
//    UE2 / Eselon II      Eselon II               eselon2
//    UE3 / Eselon III     Eselon III              eselon3
//    UE4 / Eselon IV      Eselon IV               eselon4
//
//  Perilaku sinkronisasi (HANYA-TAMBAH/PERBARUI, TIDAK MENGHAPUS):
//    - NIP belum terdaftar  -> dibuatkan akun PEMINJAM baru
//                              (password default PASSWORD_DEFAULT).
//    - NIP sudah terdaftar   -> field data diri yang KOSONG diisi,
//                              yang BERUBAH diperbarui. Cocok via NIP
//                              (cadangan: email).
//    - Sel Excel KOSONG       -> tidak menimpa data lama (biarkan apa
//                              adanya) — memang ada pegawai yg sebagian
//                              kolomnya kosong.
//    - Akun yang hilang dari file / baris yang dihapus -> DIBIARKAN.
//                              Penghapusan hanya lewat aksi admin manual.
//
//  NIP & Email adalah jangkar identitas (kunci unik) — TIDAK diubah
//  untuk akun yang sudah ada, agar tidak melanggar unik. Akun non-
//  PEMINJAM (mis. ADMIN) tidak disentuh.
// ============================================================

const XLSX = require('xlsx');
const { prisma } = require('../config/database');
const { hashPassword } = require('../utils/hashPassword');
const { AppError } = require('../middleware/error.middleware');
const { hitungRetirementDateDariNip, validasiNip } = require('../utils/nipHelper');

// Password default untuk akun baru hasil import. Samakan dengan importer
// peminjam lain agar admin cukup menyampaikan satu kata sandi awal.
const PASSWORD_DEFAULT = 'Bmn@2026';

// Kolom template yang diunduh admin (urut tampil) — memakai label yang
// sama dengan halaman Pengaturan Akun.
const KOLOM_TEMPLATE = ['NIP', 'Nama', 'Jabatan', 'Email', 'Unit Kerja', 'Eselon II', 'Eselon III', 'Eselon IV'];

function normalHeader(h) {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

// Pemetaan nama header (ternormalisasi) -> field internal. Mendukung
// header file master (Jabatan1, UE2/UE3/UE4) maupun header template
// (Jabatan, Eselon II/III/IV). Kolom lain (Jenis Kelamin, Status, dll)
// diabaikan.
const ALIAS_KOLOM = {
  nip: 'nip',
  nama: 'nama',
  name: 'nama',
  email: 'email',
  'alamat email': 'email',
  // Jabatan pegawai (fungsional)
  jabatan: 'jabatan',
  jabatan1: 'jabatan',
  'unit kerja': 'unitKerja',
  // Eselon II
  ue2: 'eselon2',
  'ue 2': 'eselon2',
  'eselon ii': 'eselon2',
  'eselon 2': 'eselon2',
  // Eselon III
  ue3: 'eselon3',
  'ue 3': 'eselon3',
  'eselon iii': 'eselon3',
  'eselon 3': 'eselon3',
  // Eselon IV
  ue4: 'eselon4',
  'ue 4': 'eselon4',
  'eselon iv': 'eselon4',
  'eselon 4': 'eselon4',
};

// Field data diri yang boleh diisi/diperbarui pada akun yang SUDAH ADA
// (NIP & email sengaja tidak termasuk — jangkar identitas). Dipetakan ke
// label yang ramah untuk laporan perubahan.
const FIELD_DATA_DIRI = [
  { key: 'nama', label: 'Nama' },
  { key: 'jabatan', label: 'Jabatan' },
  { key: 'unitKerja', label: 'Unit Kerja' },
  { key: 'eselon2', label: 'Eselon II' },
  { key: 'eselon3', label: 'Eselon III' },
  { key: 'eselon4', label: 'Eselon IV' },
];

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function teksAtauNull(v) {
  const s = String(v ?? '').trim();
  return s === '' ? null : s;
}

function sama(a, b) {
  return (a ?? null) === (b ?? null);
}

// --- Baca worksheet menjadi grid, tahan terhadap !ref yang rusak ---
// raw:true WAJIB agar NIP panjang (18 digit) dibaca apa adanya sebagai
// teks. Tanpa ini XLSX mengubahnya jadi float dan presisi hilang
// (mis. ...011001 -> ...011000) sehingga identitas pegawai rusak.
function bacaGrid(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', raw: true });
  if (!wb.SheetNames.length) throw new AppError('File tidak memiliki sheet apa pun.', 400);
  const ws = wb.Sheets[wb.SheetNames[0]];

  const selKeys = Object.keys(ws).filter((k) => !k.startsWith('!'));
  if (selKeys.length === 0) return [];

  let maxRow = 0;
  let maxCol = 0;
  for (const k of selKeys) {
    const c = XLSX.utils.decode_cell(k);
    if (c.r > maxRow) maxRow = c.r;
    if (c.c > maxCol) maxCol = c.c;
  }
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxRow, c: maxCol } });

  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
}

// Temukan baris header (baris pertama yang memuat penanda kolom kunci).
function cariBarisHeader(grid) {
  for (let i = 0; i < grid.length; i += 1) {
    const sel = grid[i].map(normalHeader);
    const adaPenanda = sel.some((s) => s === 'nip' || s === 'nama' || s === 'name' || s === 'email');
    if (adaPenanda) return i;
  }
  return -1;
}

function petaKolom(barisHeader) {
  const peta = {};
  barisHeader.forEach((h, idx) => {
    const field = ALIAS_KOLOM[normalHeader(h)];
    if (field && peta[field] === undefined) peta[field] = idx;
  });
  return peta;
}

// --- Parse buffer menjadi daftar baris ternormalisasi + daftar error ---
function parse(buffer) {
  const grid = bacaGrid(buffer);
  if (grid.length === 0) {
    return { rows: [], gagal: [{ baris: 0, nama: '-', pesan: 'File kosong.' }] };
  }

  const idxHeader = cariBarisHeader(grid);
  if (idxHeader === -1) {
    throw new AppError(
      'Header kolom tidak ditemukan. Pastikan ada kolom "NIP", "Nama", dan "Email" (unduh template untuk format yang benar).',
      400
    );
  }

  const peta = petaKolom(grid[idxHeader]);
  if (peta.nip === undefined || peta.nama === undefined || peta.email === undefined) {
    throw new AppError('Kolom "NIP", "Nama", dan "Email" wajib ada di file.', 400);
  }

  const ambil = (row, field) => (peta[field] === undefined ? '' : row[peta[field]]);

  const rows = [];
  const gagal = [];

  for (let i = idxHeader + 1; i < grid.length; i += 1) {
    const row = grid[i];
    const nomorBaris = i + 1; // 1-based, sesuai tampilan Excel

    const adaIsi = row.some((c) => String(c ?? '').trim() !== '');
    if (!adaIsi) continue;

    const nip = teksAtauNull(ambil(row, 'nip'));
    const nama = teksAtauNull(ambil(row, 'nama'));
    const emailMentah = teksAtauNull(ambil(row, 'email'));

    // NIP, Nama, Email adalah identitas — wajib agar akun bisa dibuat/dicocokkan.
    if (!nip || !nama || !emailMentah) {
      gagal.push({ baris: nomorBaris, nama: nama || '-', pesan: 'NIP / Nama / Email kosong.' });
      continue;
    }

    const email = emailMentah.toLowerCase();
    if (!REGEX_EMAIL.test(email)) {
      gagal.push({ baris: nomorBaris, nama, pesan: `Format email tidak valid (${emailMentah}).` });
      continue;
    }

    rows.push({
      baris: nomorBaris,
      nip,
      nama,
      email,
      jabatan: teksAtauNull(ambil(row, 'jabatan')), //     Jabatan
      unitKerja: teksAtauNull(ambil(row, 'unitKerja')), // Unit Kerja
      eselon2: teksAtauNull(ambil(row, 'eselon2')), //     Eselon II
      eselon3: teksAtauNull(ambil(row, 'eselon3')), //     Eselon III
      eselon4: teksAtauNull(ambil(row, 'eselon4')), //     Eselon IV
    });
  }

  return { rows, gagal };
}

// --- Proses import: TAMBAH akun baru / ISI & PERBARUI data diri ---
async function importDariExcel(buffer) {
  const { rows, gagal } = parse(buffer);

  // Dedup baris dalam file berdasarkan NIP (baris terakhir menang).
  const petaFile = new Map(); // nip -> row
  for (const r of rows) {
    if (petaFile.has(r.nip)) {
      gagal.push({ baris: r.baris, nama: r.nama, pesan: 'Baris duplikat (NIP sama) diabaikan.' });
    }
    petaFile.set(r.nip, r); // last-wins
  }

  // Muat seluruh user untuk pencocokan (NIP/email unik global) + data diri.
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      nama: true,
      nip: true,
      email: true,
      jabatan: true,
      unitKerja: true,
      eselon2: true,
      eselon3: true,
      eselon4: true,
      roles: true,
    },
  });
  const userByNip = new Map(allUsers.map((u) => [u.nip, u]));
  const userByEmail = new Map(allUsers.map((u) => [u.email.toLowerCase(), u]));

  const passwordHash = await hashPassword(PASSWORD_DEFAULT);

  // Klasifikasi baris -> buat baru / perbarui, sekaligus siapkan laporan.
  const toCreate = [];
  const toUpdate = []; // { id, data, nama, nip, perubahan[] }
  const ditambahkanList = [];
  const diperbaruiList = [];
  let takBerubah = 0;
  const emailBaruDipakai = new Set(); // cegah tabrakan email antar-baris pada create

  for (const r of petaFile.values()) {
    const user = userByNip.get(r.nip) || userByEmail.get(r.email);

    // Akun yang punya peran ADMIN tidak disentuh oleh import (lindungi akun admin).
    if (user && user.roles.includes('ADMIN')) {
      gagal.push({ baris: r.baris, nama: r.nama, pesan: `NIP/email milik akun admin, dilewati.` });
      continue;
    }

    if (!user) {
      // Email harus benar-benar bebas (belum ada di DB & belum dipakai baris lain).
      if (emailBaruDipakai.has(r.email)) {
        gagal.push({ baris: r.baris, nama: r.nama, pesan: `Email ${r.email} dobel di file untuk NIP berbeda.` });
        continue;
      }
      emailBaruDipakai.add(r.email);

      // Validasi NIP dan hitung retirement date
      const validasi = validasiNip(r.nip);
      if (!validasi.valid) {
        gagal.push({ baris: r.baris, nama: r.nama, pesan: `NIP tidak valid: ${validasi.error}` });
        continue;
      }

      const retirementDate = hitungRetirementDateDariNip(r.nip);
      if (!retirementDate) {
        gagal.push({ baris: r.baris, nama: r.nama, pesan: 'Format NIP tidak valid. Pastikan tanggal lahir dalam NIP benar.' });
        continue;
      }

      toCreate.push({
        nama: r.nama,
        nip: r.nip,
        email: r.email,
        password: passwordHash,
        roles: ['PEMINJAM'],
        sumber: 'IMPORT',
        jabatan: r.jabatan,
        unitKerja: r.unitKerja,
        eselon2: r.eselon2,
        eselon3: r.eselon3,
        eselon4: r.eselon4,
        retirementDate,
      });
      ditambahkanList.push({ nama: r.nama, nip: r.nip, email: r.email });
      continue;
    }

    // Akun sudah ada: isi field kosong / perbarui yang berubah.
    // Sel Excel kosong (null) TIDAK menimpa data lama. NIP & email tidak diubah.
    const data = {};
    const perubahan = [];
    for (const { key, label } of FIELD_DATA_DIRI) {
      const baru = r[key]; // sudah ternormalisasi null bila kosong
      if (baru !== null && !sama(user[key], baru)) {
        data[key] = baru;
        perubahan.push(label);
      }
    }
    if (perubahan.length > 0) {
      toUpdate.push({ id: user.id, data, nama: r.nama, nip: r.nip, perubahan });
      diperbaruiList.push({ nama: r.nama, nip: r.nip, perubahan });
    } else {
      takBerubah += 1;
    }
  }

  // Eksekusi dalam satu transaksi. createMany (satu pernyataan) cepat untuk
  // ribuan baris; update dilakukan hanya untuk akun yang benar-benar berubah.
  await prisma.$transaction(
    async (tx) => {
      if (toCreate.length) {
        await tx.user.createMany({ data: toCreate, skipDuplicates: true });
      }
      for (const u of toUpdate) {
        await tx.user.update({ where: { id: u.id }, data: u.data });
      }
    },
    { timeout: 120000, maxWait: 20000 }
  );

  return {
    ditambahkan: toCreate.length,
    diperbarui: toUpdate.length,
    takBerubah,
    gagal: gagal.length,
    detailDitambahkan: ditambahkanList.slice(0, 100),
    detailDiperbarui: diperbaruiList.slice(0, 100),
    detailGagal: gagal.slice(0, 50),
    passwordDefault: PASSWORD_DEFAULT,
  };
}

// --- Buffer template Excel untuk diunduh admin ---
function buatTemplateBuffer() {
  const contoh = [
    '198501012010011001',
    'Contoh Pegawai',
    'Widyaiswara Ahli Muda',
    'contoh.pegawai@kemenkeu.go.id',
    'Pusat Pendidikan dan Pelatihan Anggaran dan Perbendaharaan',
    'Badan Pendidikan dan Pelatihan Keuangan',
    'Bagian Umum',
    'Subbagian Tata Usaha',
  ];
  const ws = XLSX.utils.aoa_to_sheet([KOLOM_TEMPLATE, contoh]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Pegawai');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { importDariExcel, buatTemplateBuffer, parse, KOLOM_TEMPLATE, PASSWORD_DEFAULT };
