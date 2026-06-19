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

  const adalahAdmin = pathname.startsWith('/admin');
  const adalahPeminjam = pathname.startsWith('/peminjam');
  const adalahBantuan = pathname.startsWith('/bantuan');
  const adalahPengaturan = pathname.startsWith('/pengaturan');
  const adalahAuth = pathname === '/login' || pathname === '/register';

  // 1) Rute terproteksi tanpa token → arahkan ke login
  if ((adalahAdmin || adalahPeminjam || adalahBantuan || adalahPengaturan) && !token) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // 2) Cegah peminjam mengakses area admin & sebaliknya
  if (token) {
    if (adalahAdmin && role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/peminjam/dashboard', request.url));
    }
    if (adalahPeminjam && role !== 'PEMINJAM') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    // 3) Sudah login tapi membuka halaman auth → arahkan ke dashboard sesuai peran
    if (adalahAuth) {
      const tujuan = role === 'ADMIN' ? '/admin/dashboard' : '/peminjam/dashboard';
      return NextResponse.redirect(new URL(tujuan, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
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
