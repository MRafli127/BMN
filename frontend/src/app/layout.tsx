// ============================================================
//  Root layout aplikasi.
// ============================================================

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'SIPP-BMN — Sistem Informasi Peminjaman & Pengembalian Barang Milik Negara',
  description:
    'Aplikasi peminjaman dan pengembalian Barang Milik Negara: pengajuan, persetujuan, stempel digital, QR Code, dan pelacakan status secara realtime.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
