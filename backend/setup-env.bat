@echo off
REM ============================================================
REM  Setup Script SIPP-BMN
REM  Menyalin .env.example ke .env dengan JWT secrets aman.
REM  Jalankan SEKALI setelah clone repo.
REM ============================================================

setlocal

echo ================================================
echo  SIPP-BMN Setup Script
echo ================================================
echo.

REM Cek apakah .env sudah ada
if exist ".env" (
    echo [SKIP] File .env sudah ada.
    echo        Jika ingin reset, hapus .env terlebih dahulu.
    echo.
    echo Untuk cek apakah JWT secrets valid, jalankan:
    echo   npm run verify-env
    echo.
    pause
    exit /b 0
)

REM Cek apakah .env.example ada
if not exist ".env.example" (
    echo [ERROR] File .env.example tidak ditemukan!
    echo         Pastikan Anda menjalankan script dari folder backend.
    pause
    exit /b 1
)

echo [INFO] Menyalin .env.example ke .env...

REM Salin .env.example ke .env
copy ".env.example" ".env" >nul

REM Generate JWT secrets
echo [INFO] Generate JWT secrets yang aman...

REM Generate access secret
for /f "delims=" %%i in ('node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))"') do set ACCESS_SECRET=%%i

REM Generate refresh secret
for /f "delims=" %%i in ('node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))"') do set REFRESH_SECRET=%%i

REM Update .env dengan secrets baru
REM Menggunakan PowerShell untuk replace yang lebih reliable
powershell -Command "(Get-Content '.env') -replace 'JWT_ACCESS_SECRET=.*', 'JWT_ACCESS_SECRET=%ACCESS_SECRET%' | Set-Content '.env'"
powershell -Command "(Get-Content '.env') -replace 'JWT_REFRESH_SECRET=.*', 'JWT_REFRESH_SECRET=%REFRESH_SECRET%' | Set-Content '.env'"

echo.
echo ================================================
echo  Setup Selesai!
echo ================================================
echo.
echo [✅] File .env telah dibuat dengan JWT secrets aman
echo [✅] JWT_ACCESS_SECRET = %ACCESS_SECRET:~0,20%...
echo [✅] JWT_REFRESH_SECRET = %REFRESH_SECRET:~0,20%...
echo.
echo [⚠️] IMPORTANT:
echo     - Jangan pernah commit .env ke git!
echo     - Simpan backup .env di tempat yang aman!
echo.
echo [NEXT] Jalankan setup database dan start server:
echo        1. npm run db:setup   ^<-- setup database
echo        2. npm run dev        ^<-- start development server
echo.
pause
