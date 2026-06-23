@echo off
setlocal EnableDelayedExpansion

:: ============================================================
::  SETUP DATABASE - SIPP-BMN
:: ============================================================

set DB_USER=postgres
set DB_PASS=kir123
set DB_HOST=localhost
set DB_PORT=5432
set DB_NAME=sipp_bmn
set PGPASSWORD=%DB_PASS%

echo.
echo =====================================================
echo    SETUP DATABASE - SIPP-BMN
echo =====================================================
echo.

:: --- LANGKAH 1: Cek psql ---
echo [1/4] Memeriksa instalasi PostgreSQL...

where psql >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [INFO] psql tidak ada di PATH, mencari di Program Files...
    set PSQL_FOUND=0
    for /d %%D in ("C:\Program Files\PostgreSQL\*") do (
        if exist "%%D\bin\psql.exe" (
            set "PATH=%%D\bin;!PATH!"
            set PSQL_FOUND=1
            echo [OK] Ditemukan: %%D\bin
        )
    )
    if !PSQL_FOUND! == 0 (
        echo [ERROR] PostgreSQL tidak ditemukan. Install dulu dari:
        echo         https://www.postgresql.org/download/windows/
        pause
        exit /b 1
    )
) else (
    echo [OK] psql tersedia.
)

:: --- LANGKAH 2: Cek koneksi ---
echo.
echo [2/4] Memeriksa koneksi ke %DB_HOST%:%DB_PORT%...

psql -U %DB_USER% -h %DB_HOST% -p %DB_PORT% -c "\q" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Tidak bisa terhubung ke PostgreSQL.
    echo.
    echo  Kemungkinan penyebab:
    echo  - Service PostgreSQL belum jalan
    echo  - Password salah
    echo.
    echo  Jalankan di PowerShell sebagai Admin:
    echo    net start postgresql-x64-18
    echo  (sesuaikan nomor versi PostgreSQL yang terinstall)
    echo.
    set PGPASSWORD=
    pause
    exit /b 1
)
echo [OK] Koneksi berhasil.

:: --- LANGKAH 3: Buat database ---
echo.
echo [3/4] Memeriksa database "%DB_NAME%"...

psql -U %DB_USER% -h %DB_HOST% -p %DB_PORT% -tc "SELECT 1 FROM pg_database WHERE datname='%DB_NAME%';" 2>nul | findstr "1" >nul 2>&1
if %ERRORLEVEL% == 0 (
    echo [OK] Database sudah ada, skip pembuatan.
) else (
    echo [INFO] Membuat database "%DB_NAME%"...
    psql -U %DB_USER% -h %DB_HOST% -p %DB_PORT% -c "CREATE DATABASE %DB_NAME%;" >nul 2>&1
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] Gagal membuat database.
        set PGPASSWORD=
        pause
        exit /b 1
    )
    echo [OK] Database berhasil dibuat.
)

:: --- LANGKAH 4: Migrate + Seed ---
echo.
echo [4/4] Menjalankan migrate dan seed...

cd /d "%~dp0"

if not exist "package.json" (
    echo [ERROR] package.json tidak ditemukan.
    echo         Pastikan file .bat ini ada di dalam folder backend\
    set PGPASSWORD=
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [INFO] Menjalankan npm install...
    npm install
    if !ERRORLEVEL! neq 0 (
        echo [ERROR] npm install gagal.
        set PGPASSWORD=
        pause
        exit /b 1
    )
)

echo.
echo -- prisma migrate deploy...
npx prisma migrate deploy
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Prisma migrate gagal.
    set PGPASSWORD=
    pause
    exit /b 1
)

echo.
echo -- prisma generate...
npx prisma generate >nul 2>&1

echo.
echo -- seed data awal...
npm run seed

:: --- SELESAI ---
echo.
echo =====================================================
echo    SETUP SELESAI!
echo =====================================================
echo.
echo  Database : %DB_NAME%
echo  Host     : %DB_HOST%:%DB_PORT%
echo  User     : %DB_USER%
echo.
echo  Login admin:
echo    Email    : admin@bmn.go.id
echo    Password : Admin123!
echo.
echo  Jalankan backend: npm run dev
echo.

set PGPASSWORD=
pause
