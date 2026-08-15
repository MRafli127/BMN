// ============================================================
//  Middleware Next.js — proteksi rute berbasis peran.
//  Membaca cookie "sipp_token" & "sipp_role" yang ditulis
//  saat login (lihat lib/auth.ts).
// ============================================================

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('sipp_token')?.value;
  const role = request.cookies.get('sipp_role')?.value;

  const adalahSuperAdmin = pathname.startsWith('/super-admin');
  const adalahAdmin = pathname.startsWith('/admin');
  const adalahPeminjam = pathname.startsWith('/peminjam');
  const adalahBantuan = pathname.startsWith('/bantuan');
  const adalahPengaturan = pathname.startsWith('/pengaturan');
  const adalahAuth = pathname === '/login' || pathname === '/register';

  // 1) Rute terproteksi tanpa token → arahkan ke login
  if ((adalahSuperAdmin || adalahAdmin || adalahPeminjam || adalahBantuan || adalahPengaturan) && !token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // 2) Cegah akses berdasarkan role
  if (token) {
    // Super Admin punya akses ke semua area admin
    if (adalahSuperAdmin && role !== 'SUPER_ADMIN' && role !== 'ADMIN') {
      // ADMIN boleh masuk ke super-admin dengan limitasi (redirect ke admin dashboard jika perlu)
      // Untuk saat ini, SUPER_ADMIN saja yang bisa akses /super-admin
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    // Admin (non-super) tidak boleh ke super-admin
    if (adalahSuperAdmin && role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    // Super Admin tidak boleh ke area admin biasa (karena sudah punya super-admin)
    if (adalahAdmin && role === 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/super-admin/dashboard', request.url));
    }
    // Admin biasa ke /admin
    if (adalahAdmin && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/peminjam/dashboard', request.url));
    }
    // Peminjam
    if (adalahPeminjam && role !== 'PEMINJAM') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    // 3) Sudah login tapi membuka halaman auth → arahkan ke dashboard sesuai peran
    if (adalahAuth) {
      const tujuan =
        role === 'SUPER_ADMIN'
          ? '/super-admin/dashboard'
          : role === 'ADMIN'
          ? '/admin/dashboard'
          : '/peminjam/dashboard';
      return NextResponse.redirect(new URL(tujuan, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/super-admin/:path*',
    '/admin/:path*',
    '/peminjam/:path*',
    '/bantuan/:path*',
    '/bantuan',
    '/pengaturan/:path*',
    '/pengaturan',
    '/login',
    '/register',
  ],
};
