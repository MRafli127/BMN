# ============================================================
#  PANDUAN DEPLOYMENT SIPP-BMN
# ============================================================

## 🚀 Cara Deploy ke Production

### Opsi 1: Clone Fresh (Auto-Setup)

```bash
# 1. Clone repository
git clone <repo-url>
cd sipp-bmn/backend

# 2. Setup environment (auto-generate JWT secrets)
npm run setup

# 3. Setup database
npm run prisma:migrate
npm run seed

# 4. Start server
npm start
```

### Opsi 2: Vercel / Railway / Render

1. **Set environment variables** di dashboard hosting:
   - `NODE_ENV=production`
   - `DATABASE_URL` → dari database provider (Supabase/Neon/PostgreSQL)
   - `JWT_ACCESS_SECRET` → generate dengan:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   - `JWT_REFRESH_SECRET` → generate dengan:
     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
     ```
   - `CLIENT_URL` → URL frontend production
   - `APP_URL` → URL backend production

2. **Deploy**

### Opsi 3: Server VPS (Ubuntu/Debian)

```bash
# 1. Clone repo
git clone <repo-url>
cd sipp-bmn/backend

# 2. Setup environment
npm run setup

# 3. Setup database
npm run prisma:migrate
npm run seed

# 4. Install PM2 untuk production server
npm install -g pm2
pm2 start src/server.js --name sipp-bmn

# 5. Setup nginx sebagai reverse proxy (opsional)
```

---

## 🔐 Checklist Keamanan Production

```bash
# Verifikasi konfigurasi sebelum deploy
npm run verify-env
```

| Checklist | Status |
|-----------|--------|
| ✅ `NODE_ENV=production` | Wajib |
| ✅ JWT secrets 64+ chars | Wajib |
| ✅ DATABASE_URL valid | Wajib |
| ✅ Admin password diganti | Wajib |
| ✅ HTTPS enabled | Disarankan |
| ✅ CORS hanya domain production | Wajib |

---

## 🆘 Troubleshooting

### Error: "JWT_ACCESS_SECRET WAJIB diisi"

```bash
# Generate dan set secrets
export JWT_ACCESS_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
export JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Atau gunakan script setup
npm run setup
```

### Error: "Database connection failed"

1. Cek `DATABASE_URL` sudah benar
2. Pastikan PostgreSQL accessible
3. Cek firewall/network settings

### Error: CORS blocked

Pastikan `CLIENT_URL` di `.env` sesuai dengan URL frontend production.

---

## 📁 Struktur File Environment

```
backend/
├── .env                 ← GENERATE OTOMATIS, JANGAN COMMIT!
├── .env.example        ← Template, AMAN di-commit
└── scripts/
    ├── setup-env.js    ← Generate .env dari .env.example
    └── verify-env.js   ← Verifikasi konfigurasi
```
