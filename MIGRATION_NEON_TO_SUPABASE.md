# ============================================================
#  Panduan Migrasi Database: Neon → Supabase
#  Sistem Informasi Peminjaman & Pengembalian Barang Milik Negara
# ============================================================

## PRASYARAT

1. **Akun Supabase** - Daftar di https://supabase.com
2. **Project PostgreSQL baru** - Buat project di Supabase Dashboard
3. **pg_dump terinstall** - Untuk export data (biasanya sudah ada dengan PostgreSQL)

---

## LANGKAH 1: BACKUP DATA DARI NEON

### Opsi A: Export via pg_dump (REKOMENDASI - Full backup)

```bash
# Install neon tools jika belum punya
npm install -g @neondatabase/cli

# Login ke Neon
neon auth

# Export seluruh database
pg_dump "postgresql://neondb_owner:npg_VugFpAU8Peb5@ep-morning-credit-ao6v2vr2.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require" -F c -b -v -f ./backup_neon.dump
```

### Opsi B: Export per tabel (lebih kecil file-nya)

```bash
# Buat folder backup
mkdir backup_neon

# Export tiap tabel penting
pg_dump "postgresql://neondb_owner:npg_VugFpAU8Peb5@ep-morning-credit-ao6v2vr2.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require" \
  -t users -t barang -t peminjaman -t detail_peminjaman \
  -t notifikasi -t audit_logs -t import_logs \
  -t nomor_surat_counter -t blacklisted_tokens \
  -F c -b -v -f ./backup_neon/full_backup.dump
```

### Opsi C: Export JSON via Node.js script

```bash
cd backend
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function exportAll() {
  const data = {
    exportDate: new Date().toISOString(),
    users: await prisma.user.findMany(),
    barang: await prisma.barang.findMany(),
    peminjaman: await prisma.peminjaman.findMany({ include: { detail: true } }),
    notifikasi: await prifikasi.notifikasi.findMany(),
    auditLogs: await prisma.auditLog.findMany(),
    importLogs: await prisma.importLog.findMany(),
    nomorSuratCounter: await prisma.nomorSuratCounter.findMany(),
    blacklistedToken: await prisma.blacklistedToken.findMany(),
  };
  console.log(JSON.stringify(data, null, 2));
}
exportAll().finally(() => prisma.\$disconnect());
" > ../backup_neon_data.json
```

---

## LANGKAH 2: SETUP SUPABASE

### 2.1 Buat Project Baru

1. Buka https://supabase.com/dashboard
2. Klik **New Project**
3. Isi:
   - **Name**: `sipp-bmn` (atau sesuai preferensi)
   - **Database Password**: Simpan password ini dengan AMAN!
   - **Region**: Pilih yang terdekat (Asia: Singapore)
4. Tunggu sampai project selesai dibuat (~2 menit)

### 2.2 Ambil Connection String

1. Di Dashboard Supabase → **Settings** → **Database**
2. Scroll ke **Connection string**
3. Pilih **URI** dan copy connection string-nya
4. Format: `postgresql://postgres.[project-id]:[password]@aws-[region].pooler.supabase.com:6543/postgres`

Contoh:
```
postgresql://postgres.abcdefghijk:your-password@aws-apse1.pooler.supabase.com:6543/postgres
```

---

## LANGKAH 3: PUSH SCHEMA KE SUPABASE

### 3.1 Update .env dengan URL Supabase (SALIN DULU .env LAMA!)

```bash
# Backup .env lama
cp .env .env.neon_backup

# Edit .env
# Ganti DATABASE_URL dengan connection string Supabase
```

### 3.2 Push Schema

```bash
cd backend
npx prisma db push
```

### 3.3 Generate Prisma Client

```bash
npx prisma generate
```

---

## LANGKAH 4: IMPORT DATA KE SUPABASE

### 4.1 Import via pg_restore

```bash
pg_restore -h aws-[region].pooler.supabase.com \
  -U postgres \
  -d postgres \
  -v \
  --clean \
  --if-exists \
  -F c \
  ./backup_neon/full_backup.dump
```

### 4.2 Import via SQL (Jika pg_restore bermasalah)

```bash
# Convert dump ke SQL
pg_restore ./backup_neon/full_backup.dump -F p -v > ./backup_neon/restore.sql

# Import via psql (install dulu jika belum)
psql "postgresql://postgres.[project-id]:[password]@aws-[region].pooler.supabase.com:6543/postgres" -f ./backup_neon/restore.sql
```

### 4.3 Import via Supabase Dashboard

1. Buka **Table Editor** di Supabase Dashboard
2. Import CSV untuk tiap tabel

---

## LANGKAH 5: VERIFIKASI

### 5.1 Test Koneksi

```bash
cd backend
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verify() {
  const userCount = await prisma.user.count();
  const barangCount = await prisma.barang.count();
  const peminjamanCount = await prisma.peminjaman.count();
  console.log('Users:', userCount);
  console.log('Barang:', barangCount);
  console.log('Peminjaman:', peminjamanCount);
}
verify().finally(() => prisma.\$disconnect());
"
```

### 5.2 Verifikasi Manual

1. Buka http://localhost:3000
2. Login sebagai admin
3. Cek:
   - [ ] Data barang tampil
   - [ ] Data peminjaman tampil
   - [ ] Data user/peminjam tampil
   - [ ] Notifikasi berfungsi

---

## LANGKAH 6: UPDATE APLIKASI

### 6.1 Pastikan .env Benar

```env
DATABASE_URL="postgresql://postgres.[project-id]:[password]@aws-[region].pooler.supabase.com:6543/postgres"
```

### 6.2 Restart Backend

```bash
# Stop backend lama (Ctrl+C)
# Start ulang
npm run dev
```

### 6.3 Test Full Flow

1. Login
2. Buat peminjaman baru
3. Approve/Reject peminjaman
4. Test logout/login

---

## ROLLBACK PLAN (JIKA GAGAL)

```bash
# Kembalikan ke .env Neon
cp .env.neon_backup .env

# Restore connection string Neon
# DATABASE_URL="postgresql://neondb_owner:npg_VugFpAU8Peb5@ep-morning-credit-ao6v2vr2.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

# Restart backend
```

---

## CATATAN PENTING

1. **Hapus file backup dari git** - Jangan push backup ke repo
   ```bash
   rm -rf backup_neon
   rm backup_neon_data.json
   ```

2. **Simpan credentials Supabase dengan aman** - Jangan commit ke git

3. **Backup berkala** - Setup automated backup di Supabase Dashboard

4. **Pooler vs Direct** - Supabase pakai connection pooler (port 6543). 
   Untuk development lokal, bisa juga pakai direct connection port 5432.

5. **SSL Required** - Pastikan `sslmode=require` di connection string

---

## CHECKLIST MIGRASI

- [ ] 1. Buat project Supabase baru
- [ ] 2. Simpan connection string Supabase
- [ ] 3. Backup data dari Neon (pg_dump / script)
- [ ] 4. Push schema Prisma ke Supabase
- [ ] 5. Import data ke Supabase
- [ ] 6. Update .env dengan DATABASE_URL Supabase
- [ ] 7. Test koneksi & data
- [ ] 8. Test aplikasi full
- [ ] 9. Hapus file backup
- [ ] 10. Opsional: Update connection string Neon sebagai backup
