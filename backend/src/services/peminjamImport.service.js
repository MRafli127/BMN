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
//  IDEMPOTENSI: NUP yang sama TIDAK AKAN diproses ulang untuk user
//  yang sama, meskipun statusnya SUDAH DIKEMBALIKAN. Ini mencegah
//  duplikasi peminjaman saat file di-import ulang. NUP berbeda
//  akan diproses normally.
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

// --- Proses import: TAMBAH/PERBARUI data peminjam dari file ---
//  Import bersifat HANYA-TAMBAH/PERBARUI (tidak pernah menghapus akun):
//    - NIP/email baru di file  -> akun dibuat (sumber IMPORT)
//    - NIP/email cocok          -> data (nama/Eselon III/Eselon IV) diperbarui
//                                  bila berubah
//    - akun yang hilang/baris tanpa NUP -> DIBIARKAN (tidak dihapus).
//  Akun peminjam bersifat PERMANEN; penghapusan hanya lewat aksi admin
//  manual di Manajemen Pengguna. Akun MANUAL (admin/registrasi) tidak
//  disentuh. Baris TANPA NUP tetap MEMBUAT/MEMPERBARUI akun (semua orang di
//  file punya akun), hanya tidak dibuatkan peminjaman. Satu orang boleh muncul
//  di beberapa baris (NUP berbeda) -> beberapa peminjaman. Pembuatan peminjaman
//  dari NUP idempoten (tidak dibuat ganda saat re-import).
async function importDariExcel(buffer, { dryRun = false, userId, userEmail, userNama, namaFile = 'file-import.xlsx' } = {}) {
  const { rows, gagal } = parse(buffer);
  const jumlahBaris = rows.length;

  // Dedup baris file dengan kunci NIP + NUP. Satu orang BOLEH muncul di
  // beberapa baris ber-NUP berbeda (meminjam beberapa unit) — tiap baris jadi
  // peminjaman tersendiri. Baris TANPA NUP TETAP diproses untuk membuat /
  // memperbarui AKUN (akun permanen, semua orang di file punya akun); hanya
  // tidak dibuatkan peminjaman. Kombinasi (NIP+NUP) yang sama persis dianggap
  // duplikat (baris terakhir menang); NUP kosong dipakai apa adanya sebagai
  // bagian kunci sehingga banyak baris tanpa-NUP untuk satu NIP -> satu akun.
  let dilewatiTanpaNup = 0; // jumlah baris tanpa NUP (akun dibuat, tanpa peminjaman)
  const petaFile = new Map(); // "nip|nup" -> row
  for (const r of rows) {
    if (!r.nup) dilewatiTanpaNup += 1;
    const kunci = `${r.nip}|${r.nup || ''}`;
    if (petaFile.has(kunci)) {
      gagal.push({ baris: r.baris, nama: r.nama, pesan: 'Baris duplikat (NIP + NUP sama) diabaikan.' });
    }
    petaFile.set(kunci, r); // last-wins
  }

  // Muat seluruh user untuk pencocokan (NIP/email unik global).
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      nama: true,
      email: true,
      nip: true,
      eselon4: true, // kolom "Eselon IV"
      eselon3: true, // kolom "Eselon III"
      roles: true,
      sumber: true,
    },
  });
  const userByNip = new Map(allUsers.map((u) => [u.nip, u]));
  const userByEmail = new Map(allUsers.map((u) => [u.email.toLowerCase(), u]));

  // Kombinasi (merk+NUP) dan NUP barang yang PERNAH dipinjam tiap user (SEMUA
  // history), untuk idempotensi: re-import tidak boleh membuat peminjaman
  // ganda. Once-a-NUP: jika NUP yang sama sudah pernah dipinjam user ini
  // (DIPINJAM, DIKEMBALIKAN, TERLAMBAT, dll), baris itu dilewati.
  // Combo dipakai saat baris menyebut merk (NUP bisa kembar antar-merk);
  // NUP saja menjadi cadangan untuk baris tanpa merk.
  const allLoans = await prisma.peminjaman.findMany({
    where: {
      detail: {
        some: { barang: { nup: { not: null } } },
      },
    },
    select: { userId: true, detail: { select: { barang: { select: { nup: true, merk: true } } } } },
  });
  const nupPernahByUser = new Map(); // userId -> Set("<nup>")
  const comboPernahByUser = new Map(); // userId -> Set("<merk>|<nup>")
  for (const p of allLoans) {
    for (const d of p.detail) {
      if (!d.barang?.nup) continue;
      tambahKe(nupPernahByUser, p.userId, d.barang.nup);
      tambahKe(comboPernahByUser, p.userId, `${normalMerk(d.barang.merk)}|${d.barang.nup}`);
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
  // Daftar rinci perubahan agar admin bisa melihat data APA yang
  // ditambahkan / diperbarui / dibuatkan peminjaman.
  const ditambahkanList = [];
  const diperbaruiList = [];
  const peminjamanDibuatList = [];
  const detailBarangGagal = [];
  const dipakaiBarangId = new Set();
  const tersedia = (b) => b.jumlahTersedia > 0 && !dipakaiBarangId.has(b.id);

  // CATATAN: import ini TIDAK PERNAH menghapus akun. Akun peminjam bersifat
  // permanen — hanya admin yang dapat menghapusnya secara manual lewat
  // Manajemen Pengguna. Baris tanpa NUP / akun yang hilang dari file cukup
  // diabaikan, bukan dihapus.

  await prisma.$transaction(
    async (tx) => {
      // Akun yang sudah dibuat/di-update pada run ini. Satu orang bisa muncul
      // di banyak baris (NUP berbeda), jadi pembuatan & update akun cukup SEKALI.
      const sudahDiproses = new Set();

      for (const r of rows) {
        const kunci = `${r.nip}|${r.nup || ''}`;
        if (!petaFile.get(kunci) || petaFile.get(kunci).baris !== r.baris) continue; // lewati baris duplikat

        let user = userByNip.get(r.nip) || userByEmail.get(r.email);

        if (user && user.roles.includes('ADMIN')) {
          gagal.push({ baris: r.baris, nama: r.nama, pesan: `NIP/email milik akun admin, dilewati.` });
          continue;
        }

        if (!user) {
          const dibuat = await tx.user.create({
            data: {
              nama: r.nama,
              nip: r.nip,
              email: r.email,
              password: passwordHash,
              eselon4: r.eselonIV, // kolom "Eselon IV"
              eselon3: r.eselonIII, // kolom "Eselon III"
              roles: ['PEMINJAM'],
              sumber: 'IMPORT',
            },
          });
          user = {
            id: dibuat.id,
            email: dibuat.email,
            nip: dibuat.nip,
            nama: r.nama,
            eselon4: r.eselonIV,
            eselon3: r.eselonIII,
            roles: ['PEMINJAM'],
            sumber: 'IMPORT',
          };
          // Daftarkan ke peta agar baris lain dengan NIP/email sama (NUP beda)
          // memakai akun ini, bukan membuat ulang (akan melanggar unik NIP).
          userByNip.set(user.nip, user);
          userByEmail.set(user.email.toLowerCase(), user);
          akunDitambahkan += 1;
          ditambahkanList.push({ nama: r.nama, nip: r.nip, email: r.email });
          sudahDiproses.add(user.id);
        } else if (!sudahDiproses.has(user.id)) {
          // Update/claim akun hanya sekali per run meski muncul di banyak baris.
          // Catat field yang berubah agar admin tahu APA yang diperbarui.
          const perubahan = [];
          if (!sama(user.nama, r.nama)) perubahan.push('Nama');
          if (!sama(user.eselon4, r.eselonIV)) perubahan.push('Eselon IV');
          if (!sama(user.eselon3, r.eselonIII)) perubahan.push('Eselon III');
          const fieldBerubah = perubahan.length > 0;
          const perluClaim = user.sumber !== 'IMPORT';
          if (fieldBerubah || perluClaim) {
            await tx.user.update({
              where: { id: user.id },
              data: { nama: r.nama, eselon4: r.eselonIV, eselon3: r.eselonIII, sumber: 'IMPORT' },
            });
            // Sinkronkan in-memory agar baris berikutnya tidak terdeteksi berubah lagi.
            user.nama = r.nama;
            user.eselon4 = r.eselonIV;
            user.eselon3 = r.eselonIII;
            user.sumber = 'IMPORT';
            if (fieldBerubah) {
              akunDiperbarui += 1;
              diperbaruiList.push({ nama: r.nama, nip: r.nip, perubahan });
            }
          }
          sudahDiproses.add(user.id);
        }

        // Baris tanpa NUP: cukup buat/perbarui AKUN, tidak ada peminjaman.
        if (!r.nup) continue;

        // Apakah merk pada baris ini dikenali di data barang? Bila ya, pencarian
        // DIKUNCI pada merk tersebut (cari merk dahulu, lalu NUP di dalamnya) dan
        // tidak melintas ke merk lain meski NUP-nya kebetulan sama. Bila merk
        // kosong/tak dikenali, dipakai cadangan: cocokkan hanya lewat NUP.
        const merkDikenali = !!r.merk && barangByMerk.has(normalMerk(r.merk));

        // Idempoten: jika user sudah pernah memiliki barang dengan NUP ini
        // (kondisi apapun: DIPINJAM, DIKEMBALIKAN, TERLAMBAT), baris dilewati.
        const sudahPernah = merkDikenali
          ? (comboPernahByUser.get(user.id) || new Set()).has(`${normalMerk(r.merk)}|${r.nup}`)
          : (nupPernahByUser.get(user.id) || new Set()).has(r.nup);
        if (sudahPernah) {
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
        // Update tracking agar baris NUP sama di file ini juga idempoten
        tambahKe(nupPernahByUser, user.id, kandidat.nup);
        tambahKe(comboPernahByUser, user.id, `${normalMerk(kandidat.merk)}|${kandidat.nup}`);
        peminjamanDibuat += 1;
        peminjamanDibuatList.push({
          nama: r.nama,
          merk: kandidat.merk,
          nup: kandidat.nup,
          kodeBarang: kandidat.kodeBarang,
        });
      }

      // Akun TIDAK PERNAH dihapus oleh import (lihat catatan di atas):
      // penghapusan akun hanya lewat aksi admin manual.

      // Mode pratinjau: batalkan semua perubahan, pertahankan hitungan.
      if (dryRun) throw Object.assign(new Error('DRY_RUN_ROLLBACK'), { __dryRun: true });
    },
    { timeout: 120000, maxWait: 20000 }
  ).catch((e) => {
    if (e && e.__dryRun === true) return; // rollback disengaja, abaikan
    throw e;
  });

  // Simpan log import setelah transaksi berhasil (di luar transaksi)
  let logId = null;
  if (!dryRun && userId) {
    try {
      const log = await prisma.importLog.create({
        data: {
          userId,
          userEmail: userEmail || '',
          userNama: userNama || '',
          jenisImport: 'PEMINJAM',
          namaFile,
          jumlahBaris,
          akunDitambahkan,
          akunDiperbarui,
          peminjamanDibuat,
          peminjamanDipertahankan,
          dilewatiTanpaNup,
          gagal: gagal.length,
          barangTidakDitemukan: detailBarangGagal.length,
          detailDitambahkan: { data: ditambahkanList.slice(0, 100) },
          detailDiperbarui: { data: diperbaruiList.slice(0, 100) },
          detailPeminjaman: { data: peminjamanDibuatList.slice(0, 100) },
          detailGagal: { data: gagal.slice(0, 50) },
          detailBarangTidakDitemukan: { data: detailBarangGagal.slice(0, 50) },
        },
      });
      logId = log.id;
    } catch (err) {
      console.error('Gagal menyimpan log import:', err);
    }
  }

  return {
    logId,
    akunDitambahkan,
    akunDiperbarui,
    peminjamanDibuat,
    peminjamanDipertahankan,
    dilewatiTanpaNup,
    detailDitambahkan: ditambahkanList.slice(0, 100),
    detailDiperbarui: diperbaruiList.slice(0, 100),
    detailPeminjamanDibuat: peminjamanDibuatList.slice(0, 100),
    gagal: gagal.length,
    detailGagal: gagal.slice(0, 50),
    barangTidakDitemukan: detailBarangGagal.length,
    detailBarangTidakDitemukan: detailBarangGagal.slice(0, 50),
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
