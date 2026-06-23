// ============================================================
//  Service Import Peminjam dari Excel/CSV (khusus admin).
//
//  Tujuan: migrasi data pegawai yang SEDANG meminjam barang
//  (data lama di luar sistem) sekaligus dalam satu file:
//    - Akun PEMINJAM dibuat otomatis (NIP/email yang sudah
//      terdaftar tidak dibuat ulang, akun lama dipakai).
//    - Kolom "NUP Laptop" dicocokkan ke Barang.nup (barang hasil
//      import BMN). Bila cocok & stok tersedia, dibuatkan
//      Peminjaman berstatus DIPINJAM langsung (melewati alur
//      persetujuan, karena ini data pinjaman yang sudah berjalan)
//      dan stok barang dikurangi.
//    - NUP yang tidak ketemu / stok habis -> baris itu dilewati,
//      tapi akun peminjam tetap dibuat bila datanya valid.
//
//  Semua akun baru memakai password default yang sama
//  (lihat PASSWORD_DEFAULT) — admin wajib menyampaikan ke
//  peminjam agar segera menggantinya.
// ============================================================

const XLSX = require('xlsx');
const { prisma } = require('../config/database');
const { hashPassword } = require('../utils/hashPassword');
const { AppError } = require('../middleware/error.middleware');

const PASSWORD_DEFAULT = 'Bmn@2026';

// Kolom template yang dipahami importer (urut tampil).
const KOLOM_TEMPLATE = [
  'Email',
  'Nama',
  'NIP',
  'Eselon III',
  'Eselon IV',
  'Merk Laptop',
  'Tipe Laptop',
  'NUP Laptop',
];

function normalHeader(h) {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

// Pemetaan nama header (yang sudah dinormalisasi) -> field internal.
// Kolom lain di luar daftar ini (mis. "NUP Usulan", "Apakah ...") diabaikan.
const ALIAS_KOLOM = {
  email: 'email',
  name: 'nama',
  nama: 'nama',
  nip: 'nip',
  'eselon iii': 'eselonIII',
  'eselon iv': 'eselonIV',
  'merk laptop': 'merk',
  merk: 'merk',
  'tipe laptop': 'tipe',
  tipe: 'tipe',
  'nup laptop': 'nup',
  nup: 'nup',
};

function teksAtauNull(v) {
  const s = String(v ?? '').trim();
  return s === '' ? null : s;
}

// Normalisasi merk untuk pencocokan barang: abaikan beda huruf besar/kecil
// dan spasi berlebih (mis. "Hp  Probook" == "HP Probook"). Konsisten dengan
// pengelompokan folder per merk di Manajemen Barang.
function normalMerk(v) {
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// --- Baca worksheet menjadi grid, tahan terhadap !ref yang rusak ---
// raw:true WAJIB agar NIP/NUP panjang (mis. 18 digit) dibaca apa adanya
// sebagai teks. Tanpa ini, XLSX mengubahnya jadi angka float dan presisi
// hilang (mis. ...011001 -> ...011000) sehingga identitas peminjam rusak.
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
    const adaPenanda = sel.some((s) => s === 'email' || s === 'nip' || s === 'nama' || s === 'name');
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
      'Header kolom tidak ditemukan. Pastikan ada kolom "Email", "NIP", dan "Nama" (unduh template untuk format yang benar).',
      400
    );
  }

  const peta = petaKolom(grid[idxHeader]);
  if (peta.nama === undefined || peta.nip === undefined || peta.email === undefined) {
    throw new AppError('Kolom "Email", "NIP", dan "Nama" wajib ada di file.', 400);
  }

  const ambil = (row, field) => (peta[field] === undefined ? '' : row[peta[field]]);

  const rows = [];
  const gagal = [];

  for (let i = idxHeader + 1; i < grid.length; i += 1) {
    const row = grid[i];
    const nomorBaris = i + 1; // 1-based, sesuai tampilan Excel

    const adaIsi = row.some((c) => String(c ?? '').trim() !== '');
    if (!adaIsi) continue;

    const nama = teksAtauNull(ambil(row, 'nama'));
    const nip = teksAtauNull(ambil(row, 'nip'));
    const emailMentah = teksAtauNull(ambil(row, 'email'));

    if (!nama || !nip || !emailMentah) {
      gagal.push({ baris: nomorBaris, nama: nama || '-', pesan: 'Email / NIP / Nama kosong.' });
      continue;
    }

    const email = emailMentah.toLowerCase();
    if (!REGEX_EMAIL.test(email)) {
      gagal.push({ baris: nomorBaris, nama, pesan: `Format email tidak valid (${emailMentah}).` });
      continue;
    }

    rows.push({
      baris: nomorBaris,
      nama,
      nip,
      email,
      eselonIII: teksAtauNull(ambil(row, 'eselonIII')),
      eselonIV: teksAtauNull(ambil(row, 'eselonIV')),
      merk: teksAtauNull(ambil(row, 'merk')),
      nup: teksAtauNull(ambil(row, 'nup')),
    });
  }

  return { rows, gagal };
}

// Bandingkan dua nilai dengan null ternormalisasi.
function sama(a, b) {
  return (a ?? null) === (b ?? null);
}

// Tambahkan nilai ke Set di dalam Map (buat Set bila kuncinya belum ada).
function tambahKe(map, kunci, nilai) {
  const set = map.get(kunci) || new Set();
  set.add(nilai);
  map.set(kunci, set);
}

// --- Proses import: SINKRONISASI CERMIN data peminjam dari file ---
//  File menjadi sumber kebenaran untuk akun ber-sumber IMPORT:
//    - NIP baru di file        -> akun dibuat (sumber IMPORT)
//    - NIP cocok dengan akun    -> data (nama/jabatan/unitKerja) diperbarui
//                                  bila berubah; akun ditandai dikelola IMPORT
//    - akun IMPORT yang hilang  -> dihapus
//        (KECUALI yang punya riwayat peminjaman -> dilindungi)
//  Akun MANUAL (admin/registrasi) yang tidak ada di file TIDAK disentuh.
//  Pembuatan peminjaman dari NUP bersifat idempoten (tidak dibuat ganda
//  saat re-import bila peminjam sudah memegang barang ber-NUP tsb).
async function importDariExcel(buffer, { dryRun = false } = {}) {
  const { rows, gagal } = parse(buffer);

  // Buang duplikat NIP dalam file (baris terakhir menang); catat sebagai gagal.
  const petaFile = new Map(); // nip -> row
  for (const r of rows) {
    if (petaFile.has(r.nip)) {
      gagal.push({ baris: r.baris, nama: r.nama, pesan: 'NIP duplikat dalam file (baris ini diabaikan).' });
    }
    petaFile.set(r.nip, r); // last-wins
  }

  // Muat seluruh user untuk pencocokan (NIP/email unik global) + jumlah
  // keterkaitan peminjaman (untuk proteksi saat hapus).
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      nama: true,
      email: true,
      nip: true,
      jabatan: true,
      unitKerja: true,
      role: true,
      sumber: true,
      _count: { select: { peminjaman: true } },
    },
  });
  const userByNip = new Map(allUsers.map((u) => [u.nip, u]));
  const userByEmail = new Map(allUsers.map((u) => [u.email.toLowerCase(), u]));

  // Kombinasi (merk+NUP) dan NUP barang yang SEDANG dipinjam tiap user, untuk
  // idempotensi: re-import tidak boleh membuat peminjaman ganda. Combo dipakai
  // saat baris menyebut merk (NUP bisa kembar antar-merk); NUP saja menjadi
  // cadangan untuk baris tanpa merk.
  const loansAktif = await prisma.peminjaman.findMany({
    where: { status: 'DIPINJAM' },
    select: { userId: true, detail: { select: { barang: { select: { nup: true, merk: true } } } } },
  });
  const comboAktifByUser = new Map(); // userId -> Set("<merk>|<nup>")
  const nupAktifByUser = new Map(); //   userId -> Set("<nup>")
  for (const p of loansAktif) {
    for (const d of p.detail) {
      if (!d.barang?.nup) continue;
      tambahKe(nupAktifByUser, p.userId, d.barang.nup);
      tambahKe(comboAktifByUser, p.userId, `${normalMerk(d.barang.merk)}|${d.barang.nup}`);
    }
  }

  // Lookup barang ber-NUP (hasil import BMN). Pencocokan dibuat dua tingkat:
  // cari MERK lebih dulu, baru NUP di dalam merk tersebut — karena NUP bisa
  // kembar antar-merk/satker. barangByNup dipertahankan sebagai cadangan untuk
  // baris yang tidak menyertakan merk (atau merk-nya tidak cocok dengan data).
  const barangList = await prisma.barang.findMany({
    where: { nup: { not: null } },
    select: { id: true, nup: true, merk: true, jumlahTersedia: true, kodeBarang: true },
  });
  const barangByMerk = new Map(); // normalMerk -> Map(nup -> [barang])
  const barangByNup = new Map(); //  nup -> [barang]
  for (const b of barangList) {
    const arrNup = barangByNup.get(b.nup) || [];
    arrNup.push(b);
    barangByNup.set(b.nup, arrNup);

    const km = normalMerk(b.merk);
    let perNup = barangByMerk.get(km);
    if (!perNup) {
      perNup = new Map();
      barangByMerk.set(km, perNup);
    }
    const arr = perNup.get(b.nup) || [];
    arr.push(b);
    perNup.set(b.nup, arr);
  }

  const passwordHash = await hashPassword(PASSWORD_DEFAULT);

  let akunDitambahkan = 0;
  let akunDiperbarui = 0;
  let peminjamanDibuat = 0;
  let peminjamanDipertahankan = 0;
  const detailBarangGagal = [];
  const dipakaiBarangId = new Set();
  const tersedia = (b) => b.jumlahTersedia > 0 && !dipakaiBarangId.has(b.id);
  const dikelola = new Set(); // id user yang muncul di file (tidak boleh dihapus)

  // Akun IMPORT yang TIDAK ada di file -> kandidat hapus (pakai id agar cocok
  // walau baris file dicocokkan via email dengan NIP berbeda).
  const akanDihapus = [];
  const dilindungiList = [];

  await prisma.$transaction(
    async (tx) => {
      for (const r of rows) {
        if (!petaFile.get(r.nip) || petaFile.get(r.nip).baris !== r.baris) continue; // lewati baris duplikat

        let user = userByNip.get(r.nip) || userByEmail.get(r.email);

        if (user && user.role !== 'PEMINJAM') {
          gagal.push({ baris: r.baris, nama: r.nama, pesan: `NIP/email milik akun ${user.role}, dilewati.` });
          continue;
        }

        if (!user) {
          const dibuat = await tx.user.create({
            data: {
              nama: r.nama,
              nip: r.nip,
              email: r.email,
              password: passwordHash,
              jabatan: r.eselonIV, //   jabatan   <- kolom "Eselon IV"
              unitKerja: r.eselonIII, // unitKerja <- kolom "Eselon III"
              role: 'PEMINJAM',
              sumber: 'IMPORT',
            },
          });
          user = { id: dibuat.id, email: dibuat.email, nip: dibuat.nip };
          akunDitambahkan += 1;
        } else {
          const fieldBerubah =
            !sama(user.nama, r.nama) ||
            !sama(user.jabatan, r.eselonIV) ||
            !sama(user.unitKerja, r.eselonIII);
          const perluClaim = user.sumber !== 'IMPORT';
          if (fieldBerubah || perluClaim) {
            await tx.user.update({
              where: { id: user.id },
              data: { nama: r.nama, jabatan: r.eselonIV, unitKerja: r.eselonIII, sumber: 'IMPORT' },
            });
            if (fieldBerubah) akunDiperbarui += 1;
          }
        }

        dikelola.add(user.id);

        if (!r.nup) continue;

        // Apakah merk pada baris ini dikenali di data barang? Bila ya, pencarian
        // DIKUNCI pada merk tersebut (cari merk dahulu, lalu NUP di dalamnya) dan
        // tidak melintas ke merk lain meski NUP-nya kebetulan sama. Bila merk
        // kosong/tak dikenali, dipakai cadangan: cocokkan hanya lewat NUP.
        const merkDikenali = !!r.merk && barangByMerk.has(normalMerk(r.merk));

        // Idempoten: jika peminjam sudah memegang barang dengan kombinasi ini,
        // biarkan (re-import tidak menggandakan peminjaman).
        const sudahPunya = merkDikenali
          ? (comboAktifByUser.get(user.id) || new Set()).has(`${normalMerk(r.merk)}|${r.nup}`)
          : (nupAktifByUser.get(user.id) || new Set()).has(r.nup);
        if (sudahPunya) {
          peminjamanDipertahankan += 1;
          continue;
        }

        // Cari barang: merk dahulu (terkunci pada merk-nya), lalu NUP di dalamnya.
        const kandidat = merkDikenali
          ? (barangByMerk.get(normalMerk(r.merk)).get(r.nup) || []).find(tersedia)
          : (barangByNup.get(r.nup) || []).find(tersedia);

        if (!kandidat) {
          detailBarangGagal.push({
            baris: r.baris,
            nama: r.nama,
            merk: r.merk,
            nup: r.nup,
            pesan: merkDikenali
              ? 'NUP tersebut tidak ada pada merk ini, atau stoknya sudah habis.'
              : 'Barang dengan NUP tersebut tidak ditemukan, atau stoknya sudah habis.',
          });
          continue;
        }

        dipakaiBarangId.add(kandidat.id);
        await tx.peminjaman.create({
          data: {
            kodePeminjaman: kandidat.kodeBarang,
            userId: user.id,
            tanggalPinjamRencana: new Date(),
            status: 'DIPINJAM',
            alasanPeminjaman: 'Data migrasi: peminjaman yang sudah berjalan sebelum sistem digunakan.',
            detail: {
              create: [{ barangId: kandidat.id, jumlahPinjam: 1, statusItem: 'DIPINJAM' }],
            },
          },
        });
        await tx.barang.update({
          where: { id: kandidat.id },
          data: { jumlahTersedia: { decrement: 1 } },
        });
        tambahKe(nupAktifByUser, user.id, kandidat.nup);
        tambahKe(comboAktifByUser, user.id, `${normalMerk(kandidat.merk)}|${kandidat.nup}`);
        peminjamanDibuat += 1;
      }

      // --- Hapus akun IMPORT yang hilang dari file (lindungi yang berriwayat) ---
      for (const u of allUsers) {
        if (u.role !== 'PEMINJAM' || u.sumber !== 'IMPORT') continue;
        if (dikelola.has(u.id)) continue;
        if (u._count.peminjaman > 0) {
          dilindungiList.push(u);
        } else {
          akanDihapus.push(u.id);
        }
      }
      if (akanDihapus.length) {
        await tx.user.deleteMany({ where: { id: { in: akanDihapus } } });
      }

      // Mode pratinjau: batalkan semua perubahan, pertahankan hitungan.
      if (dryRun) throw Object.assign(new Error('DRY_RUN_ROLLBACK'), { __dryRun: true });
    },
    { timeout: 120000, maxWait: 20000 }
  ).catch((e) => {
    if (e && e.__dryRun === true) return; // rollback disengaja, abaikan
    throw e;
  });

  return {
    akunDitambahkan,
    akunDiperbarui,
    akunDihapus: akanDihapus.length,
    akunDilindungi: dilindungiList.length,
    peminjamanDibuat,
    peminjamanDipertahankan,
    gagal: gagal.length,
    detailGagal: gagal.slice(0, 50),
    barangTidakDitemukan: detailBarangGagal.length,
    detailBarangTidakDitemukan: detailBarangGagal.slice(0, 50),
    detailDilindungi: dilindungiList.slice(0, 50).map((u) => ({ nama: u.nama, nip: u.nip })),
    passwordDefault: PASSWORD_DEFAULT,
  };
}

// --- Buffer template Excel untuk diunduh admin ---
function buatTemplateBuffer() {
  const contoh = [
    'contoh.pegawai@kemenkeu.go.id',
    'Contoh Pegawai',
    '198501012010011001',
    'Bagian Umum',
    'Subbagian Teknologi Informasi',
    'Asus Notebook ROG',
    'ROG Strix G16',
    '212',
  ];
  const ws = XLSX.utils.aoa_to_sheet([KOLOM_TEMPLATE, contoh]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Peminjam');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = { importDariExcel, buatTemplateBuffer, parse, KOLOM_TEMPLATE, PASSWORD_DEFAULT };
