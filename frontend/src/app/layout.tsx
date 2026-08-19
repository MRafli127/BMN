// ============================================================
//  Root layout aplikasi.
// ============================================================

import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { PreventDragScript } from './PreventDragScript';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: 'BMN — Sistem Informasi Barang Milik Negara',
  description:
    'Sistem Informasi Barang Milik Negara: pengelolaan BMN, peminjaman, pengembalian, dan pelacakan aset secara realtime.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${inter.variable} ${jakarta.variable}`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <PreventDragScript />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
