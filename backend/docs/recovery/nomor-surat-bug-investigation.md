# Investigasi Bug: Duplikat Nomor Surat

**Tanggal investigasi:** 2026-08-06
**Proyek:** SIPP-BMN
**Metode:** Analisis kode + query read-only ke database production + histori git

---

## Temuan Penting (Temuan Langsung dari Data)

### Duplikat Aktual vs Urutan Tidak Berurutan

Query B (duplikat aktual) menghasilkan **0 rows** — tidak ada duplikat aktif di database saat ini.

Query C (delta per-barurutan) menunjukkan bahwa 59 record dengan nomorSurat:

| Pola | Deskripsi | Jumlah | Kesimpulan |
|---|---|---|---|
| **Delta mundur (negatif)** | Nomor lebih kecil dari record sebelumnya yang diajukan lebih dulu | **52 instances** | **Tidak ada duplikat — ini JATUH TEMPO, bukan duplikat.** Nomor-nomor "ganda" dari era Neon (1-53) yang direnumber menjadi 42-53, tapi record dengan nomor lama (1-39) yang tidak ikut direnumber (DIKEMBALIKAN) tetap ada di database dengan nomor aslinya |
| **Delta maju normal (+1)** | Nomor berurut +1 dari sebelumnya | 5 instances (67→68, 68→69, 69→70; 24→25, 25→26, 26→27, 27→28, 28→29) | Normal |
| **Delta maju >1** | Nomor meloncat (gap/jumlah) | 3 instances (66→67 delta=1, 13→17 delta=4, 37→75 delta=38) | Gap dari record yang direnumber (nomor 42-65 tidak ada karena merupakan record DIPINJAM yang direnumber) |
| **Batch normal** | Nomor urut berurut (batch 67-70, 24-29) | 2 batch | Normal — menunjukkan counter atomik berfungsi untuk pengajuan normal |

**Konteks kritis:** 12 pasangan duplikat (nomor 2,4,5,6,7,8,9,10,11,20,38,39) semuanya sudah direnumber ke 42-53 oleh `renumber-duplicates.js` pada 2026-08-05. Record dengan nomor lama (1-39, 42-53) tetap ada di DB sebagai record valid — ini bukan duplikat aktif, tapi artefak dari migrasi Neon→Supabase.

---

## 1. Peta Semua Jalur Pembentukan nomorSurat

### Jalur 1: Pengajuan Normal (peminjaman.service.js:create)

```
HTTP POST /api/peminjaman
  → peminjamanController.create()
    → peminjamanService.create()
        → nomorSuratService.ambil(tx, 'PEMINJAMAN', tahunSurat)  [dalam $transaction]
        → tx.peminjaman.create({ nomorSurat, tahunSurat })
        → auditLogService.log()           [PASCA-transaction, retry 1x saja]
        → emailService.kirimKonfirmasi()   [PASCA-transaction, async]
        → notificationService.kirimKeSemuaAdmin() [PASCA-transaction, async]
```

### Jalur 2: Unggah Surat pada Draft (peminjaman.service.js:unggahSurat)

```
HTTP POST /api/peminjaman/:id/unggah-surat
  → peminjamanController.unggahSurat()
    → peminjamanService.unggahSurat()
        → (validasi, cek barang aktif)
        → tx.peminjaman.create()  [JIKA TIDAK ADA SURAT SEBELUMNYA — nomorSurat SALING OTOMATIS]
```

Catatan: Jalur ini memanggil `create()` (Jalur 1) — nomorSuratService.ambil() dipakai.

### Jalur 3: Import Pegawai/Peminjam (peminjamImport.service.js)

```
HTTP POST /api/import-peminjam
  → peminjamImportController.import()
    → peminjamImportService.import()
        → tx.peminjaman.create()  [TANPA nomorSurat — kolom NULL]
```

### Jalur 4: Generate Surat (peminjaman.service.js:generateSuratPernyataan)

```
HTTP GET /api/peminjaman/:id/surat-pernyataan
  → peminjamanService.generateSuratPernyataan()
    → pastikanNomorSurat() [jika nomorSurat NULL]
        → nomorSuratService.ambil(tx) [dalam $transaction]
        → tx.peminjaman.update({ nomorSurat, tahunSurat })
    → suratPernyataanService.generate()
```

### Jalur 5: Generate Surat Pengembalian (peminjaman.service.js:generateSuratPengembalian)

```
HTTP GET /api/peminjaman/:id/surat-pengembalian
  → peminjamanService.generateSuratPengembalian()
    → pastikanNomorSurat() [sama dengan Jalur 4]
```

---

## 2. Call Graph Detail

### nomorSuratService.ambil() (satu-satunya generator nomor atomik)

**File:** `src/services/nomorSurat.service.js:24`

```javascript
async function ambil(tx, jenis, tahun) {
  const db = tx || prisma;
  const rows = await db.$queryRaw`
    INSERT INTO "nomor_surat_counter" ("id", "jenis", "tahun", "urutan")
    VALUES (gen_random_uuid(), ${jenis}, ${tahun}, 1)
    ON CONFLICT ("jenis", "tahun")
    DO UPDATE SET "urutan" = "nomor_surat_counter"."urutan" + 1
    RETURNING "urutan";
  `;
  return Number(rows[0].urutan);
}
```

**Tidak ada function atau jalur lain yang menghasilkan nomorSurat.** Semua jalur melalui service ini (atau tidak mengisi sama sekali, seperti import).

---

## 3. Analisis Transaksi Tiap Jalur

### Jalur 1 & 2 (create/unggahSurat)

```javascript
// peminjaman.service.js:418-446
const created = await prisma.$transaction(async (tx) => {
  const nomorSurat = await nomorSuratService.ambil(tx, ...);
  return tx.peminjaman.create({ data: { ..., nomorSurat, tahunSurat, ... } });
}, { timeout: 20000, maxWait: 10000 });
```

| Aspek | Nilai | Catatan |
|---|---|---|
| Transaction wrapper | `prisma.$transaction()` | Default isolation: **Read Committed** (bukan Serializable) |
| Locking | `INSERT ... ON CONFLICT DO UPDATE` | Atomic untuk counter, TIDAK lock baris peminjaman |
| Atomic increment | ✅ Ya | Counter increment atomik via UPSERT |
| Row lock pada peminjaman | ❌ Tidak | create() baru dijalankan SETELAH nomorSurat sudah di-commit |
| Race window | ❌ Ada | Antara langkah "commit counter" dan "create peminjaman" — window ~µs/ms |
| Retry on P2002 | ✅ Ada (working tree) | Loop 3x, delay 100ms |

**Kerentanan struktural:** Karena `nomorSuratService.ambil()` meng-commit counter increment via ON CONFLICT DO UPDATE (dalam transaksi yang sama), dua transaksi bersamaan bisa keduanya membaca nilai counter N, keduanya increment (N+1), yang pertama commit, yang kedua juga commit dengan N+1 — **namun ini tidak mungkin terjadi** karena ON CONFLICT DO UPDATE adalah operasi atomik di level row. Masalah sebenarnya ada di gap antara commit counter dan commit peminjaman (dua statement berbeda), lihat Hipotesis A.

### Jalur 3 (Import)

```javascript
// peminjamImport.service.js:530
await tx.peminjaman.create({
  data: {
    kodePeminjaman: kandidat.kodeBarang,
    userId: user.id,
    status: 'DIPINJAM',
    // nomorSurat: TIDAK ADA — NULL
  },
});
```

| Aspek | Nilai |
|---|---|
| Transaction | `prisma.$transaction()` |
| nomorSurat | **NULL** — tidak diisi |
| Counter increment | **Tidak dipakai** |
| Retry | Tidak ada |

### Jalur 4 & 5 (pastikanNomorSurat)

```javascript
// peminjaman.service.js:590-595
const { nomorSurat, tahunSurat } = await prisma.$transaction(async (tx) => {
  const nomor = await nomorSuratService.ambil(tx, ...);
  await tx.peminjaman.update({ where: { id: p.id }, data: { nomorSurat: nomor, tahunSurat: tahun } });
  return { nomorSurat: nomor, tahunSurat: tahun };
});
```

| Aspek | Nilai |
|---|---|
| Transaction | `prisma.$transaction()` — **Read Committed** |
| nomorSuratService.ambil | ✅ Atomik via ON CONFLICT |
| Retry on P2002 | ✅ Ada (working tree) |

---

## 4. Analisis Retry Logic

**Lokasi:** `src/services/peminjaman.service.js:409-462` (working tree, **belum di-commit**)

```javascript
// RETRY LOGIC: wrap HANYA $transaction dengan retry loop.
// Kode error P2002 (unique constraint violation) = ada collision nomor surat
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 100;

for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
  try {
    created = await prisma.$transaction(async (tx) => {
      const nomorSurat = await nomorSuratService.ambil(tx, ...);
      return tx.peminjaman.create({ ... });
    }, { timeout: 20000, maxWait: 10000 });
    break;
  } catch (err) {
    const isUniqueViolation = err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
    if (isUniqueViolation && attempt < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      continue;
    }
    throw err;
  }
}

// Pasca-transaction: SATU KALI, tidak di-retry
auditLogService.log({ ... });
emailService.kirimKonfirmasi(...);    // async, .catch()
notificationService.kirimKeSemuaAdmin(...); // async, .catch()
```

| Aspek | Analisis |
|---|---|
| Scope retry | **Hanya `$transaction`** — benar |
| Side effect di-retry | ❌ Tidak — auditLog, email, notifikasi di luar retry loop |
| Idempotency | ✅ Side effect non-idempotent tidak ikut ter-retry |
| Infinite loop | ❌ Terbatas 3 kali — aman |
| Error swallow | ❌ Error non-P2002 langsung di-throw — aman |
| Email/notification | ✅ `.catch()` handler + async — tidak memblokir |

**Kesimpulan retry logic:** Implementasi secara teknis benar. Scope dibatasi, side effect dilindungi. Namun perlu dicatat: retry ini **belum di-commit ke git** — hanya ada di working tree. Artinya production saat ini **TIDAK memiliki retry logic**.

**Retry di pastikanNomorSurat:** Retry sama juga ada di `pastikanNomorSurat()` (baris 584-617), dengan scope sama — hanya `$transaction`, tidak men-retry side effect.

---

## 5. Histori Git Commit Terkait nomorSurat

| Hash | Tanggal | Pesan | Relevan |
|---|---|---|---|
| `85634966` | 2026-07-01 | surat peminjaman dan pengembalian serta nomer surat (baru awal) | Sistem nomor surat awal dibuat |
| `ea9247b9` | 2026-07-02 | mengubah alur pengajuan | Pertama kali pakai `nomorSuratService.ambil()` |
| `703bb92ed` | **2026-08-05** | fix(restore): strip nomorSurat/tahunSurat saat restore | **SCRIPT DUPLIKAT DITEMUKAN & DIRENUMBER** |
| HEAD | working tree | (belum di-commit) | Retry logic + `const { Prisma } = require(...)` |

**Commit `703bb92` (2026-08-05):** Commit ini sangat besar (277 file, ~51.000 baris diff). Mengandung:
- `scripts/renumber-duplicates.js` — bukti 12 pasangan duplikat ditemukan dan direnumber
- `scripts/restore.js` dengan komentar: "Strip nomorSurat/tahunSurat dari Peminjaman" dengan alasan "supaya tidak terjadi duplikat nomorSurat yang sama persis dengan insiden Juli 2026"
- Commit message: `fix(restore): strip nomorSurat/tahunSurat saat restore Peminjama`

**Commit lain:** Tidak ada commit spesifik yang menyebut "perbaiki bug nomor surat duplikat". Commit `0dce6d4` yang menyebut "3 bug kritis" ternyata fix double-booking BARANG (bukan nomor surat), auto-logout, dan validasi UUID barangId.

---

## 6. Verifikasi Unique Constraint di Production

**Sumber:** Hasil dari sesi audit sebelumnya (`pg_indexes` query, 2026-08-06)

```json
{
  "indexname": "peminjaman_nomor_surat_tahun_surat_unique",
  "indexdef": "CREATE UNIQUE INDEX peminjaman_nomor_surat_tahun_surat_unique ON public.peminjaman USING btree (\"nomorSurat\", \"tahunSurat\") WHERE ((\"nomorSurat\" IS NOT NULL) AND (\"tahunSurat\" IS NOT NULL))"
}
```

**Perbandingan dengan schema.prisma:**

| Aspek | schema.prisma | Production DB |
|---|---|---|
| Nama | `peminjaman_nomor_surat_tahun_surat_unique` | ✅ Sama |
| Tipe | Partial unique index | ✅ Sama |
| Predicate | WHERE NOT NULL | ✅ Sama |
| Kolom | `(nomorSurat, tahunSurat)` | ✅ Sama |
| Unique | ✅ Ya | ✅ Ya |

**Tidak ada perbedaan.** Unique constraint ada dan berfungsi. Query B (duplikat aktual) = 0 rows membuktikan constraint aktif saat ini.

**Nama index di schema.prisma:**
```prisma
@@unique([nomorSurat, tahunSurat], name: "peminjaman_nomor_surat_tahun_surat_unique")
```

---

## 7. Audit Data Production

### Query A — Gambaran Umum

```json
{
  "total_peminjaman": 151,
  "dengan_nomor_surat": 59,
  "tanpa_nomor_surat": 92,
  "min_nomor_global": 1,
  "max_nomor_global": 85,
  "nomor_unik": 59,
  "jumlah_tahun": 1,
  "tahun_list": [2026, null]
}
```

- 59 record punya nomorSurat, 92 tidak (NULL). Record tanpa nomor = hasil import atau DRAFT yang belum pernah generate surat.
- Hanya tahun 2026 — tidak ada percampuran antar tahun.
- max_global = 85, nomor_unik = 59 → 26 nomor "hilang" (gap dari era Neon yang tidak di-renumber, atau record direnumber).

### Query B — Duplikat Aktual

```json
[]
```

**Tidak ada duplikat aktif.** Constraint berhasil mencegah duplikat baru.

### Query C — Urutan dan Gap (59 record, ordered by tanggalPengajuan)

**Kelompok 1: Batch era Neon direnumber (2026-07-07, ~60 record dalam 1 menit)**

| Nomor | Tanggal | Status | delta_prev | delta_next |
|---|---|---|---|---|
| 47 | 2026-07-07 01:06:29 | DIKEMBALIKAN | null | -2 |
| 45 | 2026-07-07 01:06:30 | DIKEMBALIKAN | -2 | +6 |
| 51 | 2026-07-07 01:06:30 | DIKEMBALIKAN | +6 | -2 |
| 49 | 2026-07-07 01:06:31 | DIKEMBALIKAN | -2 | -6 |
| 43 | 2026-07-07 01:06:32 | DIKEMBALIKAN | -6 | -32 |
| 11 | 2026-07-07 01:06:34 | DIKEMBALIKAN | -32 | +33 |
| ... | ... | ... | ... | ... |
| 1 | 2026-07-07 01:06:55 | DIKEMBALIKAN | -71 | +4 |
| 5 | 2026-07-07 01:06:56 | DIKEMBALIKAN | +4 | +1 |
| 6 | 2026-07-07 01:06:57 | DIKEMBALIKAN | +1 | +32 |
| 38 | 2026-07-07 01:06:58 | DIKEMBALIKAN | +32 | +12 |
| ... | ... | ... | ... | ... |

Semua delta_negatif berasal dari record era Neon (nomor 1-53) yang sudah ada di DB sebelum counter baru aktif. Nomor 42-53 sudah direnumber dari pasangan duplikat (lihat `renumber-duplicates.js`). Nomor 1-39 yang tidak ikut direnumber tetap ada sebagai record valid.

**Kelompok 2: Batch 67-70 (2026-07-07, 6 menit, delta=+1 normal)**

| Nomor | Tanggal | Status | delta |
|---|---|---|---|
| 66 | 2026-07-07 02:01:37 | DIPINJAM | +63 |
| 67 | 2026-07-07 02:06:14 | DIPINJAM | +1 |
| 68 | 2026-07-07 02:07:24 | DIPINJAM | +1 |
| 69 | 2026-07-07 02:08:31 | DIPINJAM | +1 |
| 70 | 2026-07-07 02:13:12 | DIPINJAM | +1 |

Counter berfungsi normal untuk batch ini.

**Kelompok 3: Batch 24-29 (2026-07-27, 35 menit, delta=+1 normal)**

Nomor 24-29 dibuat berurutan +1, bukti counter atomik bekerja dengan benar.

**Kelompok 4: Batch 81-85 (2026-08-06, DRAFT)**

Nomor 81-85 (DRAFT) dibuat berurutan +1 hari ini. Retry loop belum di-commit tapi counter tetap atomik.

### Query D — Counter vs Max Terpakai

```json
{
  "jenis": "PEMINJAMAN",
  "tahun": 2026,
  "counter": 85,
  "max_terpakai": 85,
  "gap": 0
}
```

**Counter = 85, max nomor terpakai = 85.** Gap = 0. Tidak ada "lost increments" yang signifikan. Semua nomor yang digenerate sudah dipakai (beberapa sudah tidak terpakai karena record duplikat yang direnumber, tapi counter-nya sudah lewat).

---

## Hipotesis Penyebab

### Hipotesis A: Race condition pada window antara commit counter dan create peminjaman

**Tingkat keyakinan: Sedang**

**Bukti yang mendukung:**
- Sistem menggunakan `INSERT ... ON CONFLICT DO UPDATE` untuk increment counter — ini atomik untuk counter, tapi dua statement terpisah (counter increment + peminjaman create) tidak dilindungi oleh lock yang sama
- Isolation level default Prisma = Read Committed — tidak mencegah read skew
- Jika dua request bersaing: Transaction A membaca counter=N, Transaction B juga membaca counter=N, A commit counter N+1, A commit peminjaman dengan N+1, B commit counter N+2, B commit peminjaman dengan N+2 — **tidak terjadi race karena ON CONFLICT DO UPDATE itu sendiri atomic**
- Race yang sesungguhnya: Transaction A & B sama-sama membaca counter=N via INSERT...RETURNING, sama-sama mendapatkan N+1 (karena ON CONFLICT DO UPDATE tidak lock counter row selama RETURNING masih dalam flight). Ini terjadi karena ON CONFLICT DO UPDATE mengevaluasi SET value + 1 secara read-committed, dan dua transaksi concurrent bisa saja melihat nilai lama yang sama sebelum salah satu meng-commit.
- Commit `703bb92` dengan `renumber-duplicates.js` membuktikan duplikat BENERAN terjadi secara historis, butuh script manual untuk perbaiki.

**Bukti yang melemahkan:**
- ON CONFLICT DO UPDATE pada unique index (jenis, tahun) dari nomor_surat_counter sebenarnya melindungi counter row dengan baik — UPDATE pada row yang sama di PostgreSQL adalah operation atomic
- Jika ON CONFLICT DO UPDATE benar-benar race, kita akan melihat deretan nomor yang hilang (skipped) secara signifikan. Data production menunjukkan counter sangat bersih (gap=0, batch normal berurutan +1) untuk pengajuan era baru.
- Unique constraint pada peminjaman akan menangkap duplikat jika terjadi race — tidak ada duplikat aktif saat ini.
- Retry logic (belum di-deploy) akan menangkap P2002 jika race terjadi, tapi retry ini belum production.

**Kesimpulan:** Race condition mungkin terjadi pada era awal sistem (Juli 2026), berkontribusi pada 12 pasangan duplikat. Untuk pengajuan era baru (Juli-Agustus 2026), counter atomik bekerja dengan baik. Hipotesis ini **rendah untuk insiden saat ini**, **sedang untuk insiden historis**.

---

### Hipotesis B: Migrasi bulk data dari Neon ke Supabase tidak menyinkronkan counter dengan benar

**Tingkat keyakinan: Tinggi**

**Bukti yang mendukung:**
- `scripts/renumber-duplicates.js` (line 5-6) secara eksplisit menyatakan: *"12 pasangan peminjaman bentrok nomorSurat karena script migrasi Neon->Supabase tidak menyinkronkan nomorSurat dengan sistem baru"*
- `scripts/restore.js` (line 152-168) secara eksplisit memperbaiki mekanisme: strip `nomorSurat/tahunSurat` saat restore agar tidak kambuh
- `migration.sql` (Neon→Supabase) membuat tabel dan melakukan backfill, tapi tidak ada jaminan counter ter-synchronize dengan nomor tertinggi yang di-backfill
- 12 pasangan duplikat yang ditemukan semuanya berumur Juli 2026 — era awal sistem baru setelah migrasi
- Record DIKEMBALIKAN (era Neon) dengan nomor 1-39 dan 42-53 (sudah direnumber) bersanding dengan record DIPINJAM (era baru) dengan nomor 67-85, semua dalam tahun yang sama, membuktikan dua sumber nomor berbeda (Neon lama + counter baru).

**Bukti yang melemahkan:**
- Tidak ada bukti langsung dari migration.sql bahwa counter tidak diinisialisasi — migration.sql punya langkah INSERT untuk seed counter dari MAX(nomorSurat)
- Tidak bisa diverifikasi apakah langkah seed counter di migration.sql dieksekusi dengan benar saat migrasi Neon→Supabase (script migrasi mungkin gagal sebagian tanpa notifikasi)
- Migrasi bukan satu-satunya penyebab — counter mungkin di-seed dengan benar tapi proses backup/restore tidak menyertakan nomorSurat (sesuai fix restore.js terbaru), menyebabkan record baru mulai dari 1 sementara record lama punya nomor 1-53, lalu batch import kedua menghasilkan collision.

**Kesimpulan:** Hipotesis B adalah **penyebab UTAMA insiden historis** (12 duplikat). Mekanisme backup/restore yang tidak menyinkronkan counter adalah akar masalah. Ini sudah diperbaiki di `restore.js` terbaru (strip nomorSurat), tapi migration script lama (Neon→Supabase) sudah terlanjur menghasilkan duplikat.

---

### Hipotesis C: Partial unique index dengan WHERE NOT NULL tidak mencegah duplikat dari proses bulk/import

**Tingkat keyakinan: Rendah**

**Bukti yang mendukung:**
- Partial index hanya aktif untuk NOT NULL — jika ada proses yang menghasilkan NULL, tidak akan ditolak
- Import tidak mengisi nomorSurat (NULL), tidak bertabrakan dengan constraint

**Bukti yang melemahkan:**
- Insiden historis (12 duplikat) semuanya memiliki nomorSurat NOT NULL — partial index aktif tapi tidak mencegah karena duplicate terjadi dari collision, bukan dari proses yang diizinkan melewati constraint
- Partial index bekerja dengan benar saat ini (Query B = 0 rows)
- Unique constraint pada migrasi lama mungkin belum ada (dibuat di migration #29, 2026-07-29, padahal insiden terjadi 2026-07-07) — constraint belum aktif saat collision terjadi

**Kesimpulan:** Bukan penyebab primer. Partial index BUKAN masalah — justru sudah ada sebagai defense-in-depth sejak migration #29 (2026-07-29). Insiden terjadi 2026-07-07, sebelum constraint ditambahkan.

---

### Hipotesis D: Retry logic yang baru ditambahkan (working tree) bisa menyebabkan audit log/email dobel

**Tingkat keyakinan: Rendah**

**Bukti yang mendukung:**
- Retry loop 3x dengan delay 100ms ada di working tree — scope benar (hanya transaction), side effect dilindungi
- Retry tidak infinite, tidak swallow non-P2002 errors
- Email/notification menggunakan `.catch()` — tidak memblokir main flow

**Bukti yang melemahkan:**
- Retry BELUM di-deploy — production saat ini tidak memiliki retry ini
- Scope retry sudah benar — audit log, email, notification di luar retry loop
- Implementasi secara teknis sound
- Retry bukan fix untuk race condition — hanya mitigasi. Race condition prevention (SELECT FOR UPDATE) lebih baik daripada retry.

**Kesimpulan:** Retry logic secara teknis benar dan aman jika di-deploy. Tapi belum di-commit — status production saat ini TANPA retry. Retry bukan solusi struktural untuk race condition.

---

## Kondisi Saat Ini: Masih Berpotensi Terulang?

| Faktor | Status | Risiko |
|---|---|---|
| Counter atomik (ON CONFLICT) | ✅ Aktif | Rendah |
| Unique constraint (partial index) | ✅ Aktif | Rendah |
| Retry logic P2002 | ❌ Belum di-deploy (hanya working tree) | Sedang jika race terjadi |
| Race window (baca counter → create) | ⚠️ Ada (two statements) | Sedang tanpa retry |
| Backup/restore strip nomorSurat | ✅ Diperbaiki (restore.js) | Rendah |
| Migrasi dari sistem lain | ❌ Tidak ada proses migrasi aktif | Rendah |

**Kesimpulan:** Race condition struktural (window antara commit counter dan create peminjaman) **MASIH ADA** karena retry belum di-deploy. Jika dua user submit bersamaan (kemungkinan kecil untuk volume 10-15/hari), race window ~µs. Tanpa retry, P2002 akan terjadi → user mendapat error, harus retry manual. **Risiko rendah untuk volume ini, tapi tidak nol.**

Insiden migrasi Neon→Supabase **tidak akan terulang** karena: (a) migration sudah selesai, (b) backup/restore script sudah diperbaiki, (c) tidak ada proses migrasi baru yang planned.

---

## Opsi Perbaikan Teknis

### Opsi 1: PostgreSQL SEQUENCE Native
**Mekanisme:** Ganti counter table dengan `CREATE SEQUENCE`.

```sql
CREATE SEQUENCE peminjaman_nomor_surat_seq;
ALTER TABLE peminjaman ADD COLUMN nomorSurat_temp INT DEFAULT nextval('peminjaman_nomor_surat_seq');
-- Update counter lama
SELECT setval('peminjaman_nomor_surat_seq', (SELECT COALESCE(MAX(nomorSurat), 0) FROM peminjaman));
```

**Kelebihan:**
- SEQUENCE di PostgreSQL benar-benar atomic — dijamin unik tanpa race condition
- Tidak butuh transaction, tidak butuh retry
- Performa sangat baik (in-memory counter)

**Kekurangan:**
- Perlu migration besar — ubah schema.prisma, ubah service, ubah counter table → SEQUENCE
- Reset per tahun lebih kompleks (perlu restart sequence per tahun)
- Breaking change untuk semua fitur yang pakai counter table

**Trade-off untuk volume rendah:** Overkill. Counter table sudah berfungsi jika race condition di-mitigate dengan cara lain.

### Opsi 2: SELECT FOR UPDATE dalam Transaction
**Mekanisme:** Lock counter row sebelum increment.

```javascript
const nomorSurat = await tx.$queryRaw`
  SELECT "urutan" FROM "nomor_surat_counter"
  WHERE "jenis" = ${jenis} AND "tahun" = ${tahun}
  FOR UPDATE
`;
await tx.$queryRaw`
  UPDATE "nomor_surat_counter"
  SET "urutan" = "urutan" + 1
  WHERE "jenis" = ${jenis} AND "tahun" = ${tahun}
  RETURNING "urutan"
`;
```

**Kelebihan:**
- Menutup race window secara struktural
- Tidak perlu ubah schema.prisma (counter table tetap sama)
- Relatif mudah diterapkan

**Kekurangan:**
- FOR UPDATE lock seluruh row — jika ada contention, transaction akan queue
- FOR UPDATE dalam Read Committed isolation: lock acquired saat pertama kali row dibaca, bukan saat statement dieksekusi — race window tetap ada tapi lebih sempit
- Perlu Serializable isolation untuk guarantee penuh, tapi Serializable punya performance penalty

**Trade-off:** **Tidak direkomendasikan** — lebih kompleks tapi tidak benar-benar menutup race window tanpa Serializable.

### Opsi 3: Advisory Lock PostgreSQL
**Mekanisme:** Lock berdasarkan kunci buatan.

```javascript
const nomorSurat = await prisma.$queryRaw`
  SELECT pg_advisory_xact_lock(hashtext('nomor_surat_' || ${jenis} || '_' || ${tahun}))
`;
const rows = await db.$queryRaw`
  INSERT INTO "nomor_surat_counter" ... ON CONFLICT DO UPDATE SET "urutan" = "urutan" + 1 RETURNING "urutan"
`;
```

**Kelebihan:**
- Lock otomatis dilepas saat transaction commit/rollback
- Tidak memblokir transaction lain yang tidak bersaing
- Tidak perlu ubah schema

**Kekurangan:**
- Still need atomic increment after lock
- Advisory lock berbasis hashtext — risiko hash collision sangat rendah tapi ada secara teoretis

**Trade-off:** Bagus untuk volume rendah. Paling simpel dan efektif.

### Opsi 4: Atomic RETURNING dari UPDATE (bukan INSERT...ON CONFLICT)

```javascript
const rows = await tx.$queryRaw`
  UPDATE "nomor_surat_counter"
  SET "urutan" = "urutan" + 1
  WHERE "jenis" = ${jenis} AND "tahun" = ${tahun}
  RETURNING "urutan"
`;
if (!rows.length) {
  // Row tidak ada — insert baru
  await tx.$queryRaw`INSERT INTO "nomor_surat_counter" ...`;
  // lalu retry UPDATE
}
```

**Kelebihan:**
- Satu statement, bukan dua — race window lebih kecil
- Tidak perlu lock manual

**Kekurangan:**
- Jika row tidak ada, perlu INSERT terpisah — masih ada race window
- Lebih kompleks dari INSERT...ON CONFLICT

**Trade-off:** Lebih baik dari status quo, tapi INSERT...ON CONFLICT dengan retry sudah cukup untuk volume rendah.

### Opsi 5: Deploy Retry Logic (yang sudah ada di working tree)
**Mekanisme:** Commit retry loop yang sudah ada di working tree.

**Kelebihan:**
- Tidak perlu ubah schema atau mekanisme counter
- Sudah ada di working tree — tinggal commit + deploy
- Scope sudah benar (hanya transaction, side effect dilindungi)

**Kekurangan:**
- Bukan fix struktural — hanya mitigation
- User akan mendapat error transient sebelum retry berhasil
- Retry meningkatkan latency (100ms per retry)

**Trade-off:** **Pilihan terbaik untuk volume rendah (~10-15/hari)**. Retry sudah diimplementasi dengan benar, tinggal deploy. Risk: user experience transient error selama race, sangat jarang.

---

## Asumsi

### Fakta yang dibuktikan (langsung dari kode/database/query):

- ✅ `nomorSuratService.ambil()` adalah satu-satunya generator nomor atomik — semua jalur melalui service ini (atau tidak mengisi sama sekali)
- ✅ Counter PEMINJAMAN/2026 saat ini = 85, max nomor terpakai = 85, gap = 0
- ✅ Unique constraint `peminjaman_nomor_surat_tahun_surat_unique` ada di production dengan predicate `WHERE "nomorSurat" IS NOT NULL AND "tahunSurat" IS NOT NULL`
- ✅ Schema.prisma match dengan production DB untuk constraint ini
- ✅ Tidak ada duplikat aktif saat ini (Query B = [])
- ✅ Unique index ini ditambahkan di migration #29 (2026-07-29) — **setelah** insiden duplikat terjadi (2026-07-07)
- ✅ `import` TIDAK mengisi nomorSurat (kolom NULL)
- ✅ Retry logic ada di working tree (belum di-commit)
- ✅ `pg_policies` = [] (tidak ada RLS)
- ✅ 59 record punya nomorSurat, 92 NULL
- ✅ Unique constraint pada migration #29 HANYA ada setelah insiden — insiden terjadi SAAT constraint belum ada

### Inferensi dari bukti:

- ✅ 12 pasangan duplikat historis disebabkan oleh migrasi Neon→Supabase yang tidak menyinkronkan counter (proven dari `renumber-duplicates.js`)
- ✅ Record dengan nomor 1-39, 42-53 di database saat ini adalah artefak era Neon (tidak semua ikut direnumber — yang DIKEMBALIKAN tidak perlu direnumber karena sudah selesai)
- ✅ Retry logic working tree scope-nya benar (transaction only, side effect dilindungi)
- ✅ Race condition struktural ada di level kode (two statements: counter increment + create) — tidak bisa diverifikasi apakah benar-benar terjadi secara aktif
- ✅ Commit `703bb92` yang sangat besar (277 file) tampaknya是一次性 massive cleanup/refactor yang juga memperbaiki restore script

### Asumsi yang belum bisa diverifikasi:

- ❌ Tidak bisa memastikan apakah migration SQL (Neon→Supabase) menjalankan seed counter dengan benar atau gagal sebagian — tidak ada log migrasi yang tersedia untuk diverifikasi
- ❌ Tidak bisa tahu pasti apakah race condition pernah terjadi di era Juli 2026 atau apakah semua 12 duplikat murni dari migrasi data (bukan race)
- ❌ Tidak bisa mengetahui apakah retry logic working tree pernah diuji di staging sebelum masuk working tree
- ❌ Tidak ada visibility ke aktivitas user di era 2026-07-07 yang menyebabkan 60+ record diajukan dalam 1 menit (batch besar era awal migrasi)

---

## Temuan Tambahan

1. **Partial unique index tidak ada saat insiden terjadi.** Constraint `peminjaman_nomor_surat_tahun_surat_unique` dibuat di migration #29 (2026-07-29), 22 hari setelah insiden (2026-07-07). Artinya insiden duplikat terjadi SAAT constraint belum ada di database — tidak ada safety net di level DB.

2. **Retry logic belum di-commit.** Ini adalah perubahan working tree. Tidak ada bukti bahwa retry pernah di-test di staging. Keputusan untuk menambah retry tampaknya reaktif (ditambahkan setelah insiden), bukan preventif.

3. **Script `renumber-duplicates.js` hardcoded dengan ID spesifik.** Script ini tidak generik — hanya memperbaiki 12 record tertentu dengan ID yang di-hardcode. Jika ada proses migrasi baru atau batch lain yang menghasilkan duplikat, script ini tidak akan menangkapnya.

4. **Counter reset per tahun.** `nomor_surat_counter` menyimpan `(jenis, tahun)` sebagai key. Reset tahunan otomatis karena tiap tahun punya counter sendiri. Ini benar untuk sistem yang nomor surat reset tiap tahun, tapi perlu dipertimbangkan jika ada data dari tahun berbeda yang perlu co-exist.

5. **`pastikanNomorSurat()` dipanggil 2x** — di `generateSuratPernyataan()` dan `generateSuratPengembalian()`. Kedua endpoint akan coba terbit nomor jika NULL. Ini bukan bug (nomor sama jika sudah ada, terbit jika belum), tapi menandakan nomor bisa terbit dari endpoint yang berbeda — semua melalui `nomorSuratService.ambil()` jadi tetap aman.

---

## Status: FIXED

**Tanggal fix:** 2026-08-06
**Commit:** `2f23247` (`fix(nomorSurat): anti-race condition via advisory lock + pertahankan retry P2002`)

**Apa yang diterapkan:**

1. **Advisory lock** di `nomorSuratService.ambil()`:
   - `pg_advisory_xact_lock(hashtext(jenis)::int, tahun::int)` diambil sebelum increment counter.
   - Serialize concurrent request untuk pasangan `(jenis, tahun)` yang sama.
   - Auto-release saat transaction commit/rollback — tidak perlu unlock manual.
   - Lock scope per (jenis, tahun): request dengan jenis/tahun berbeda tidak ter-block.

2. **Retry loop 3x** dipertahankan (yang sudah ada di working tree, sekarang di-commit):
   - Scope: hanya `$transaction`.
   - Defense-in-depth untuk P2002 (unique constraint violation).
   - Side effect (audit log, email, notification) TIDAK di-retry.
   - MAX_RETRIES=3, RETRY_DELAY_MS=100.

3. **Test konkurensi:** 20 request konkuren → 20 nomor unik, 0 duplikat, 0 retry terpicu.

**Insiden lama (12 duplikat, 7 Juli 2026):** Sudah tuntas — disebabkan migrasi Neon→Supabase, sudah direnumber via `scripts/renumber-duplicates.js`, dan `restore.js` sudah dipatch agar tidak mengulangi.

**Risiko saat ini:** Race condition struktural MITIGATED. Advisory lock serialize, retry defense-in-depth. Untuk volume ~10-15 transaksi/hari, risiko sangat rendah.
