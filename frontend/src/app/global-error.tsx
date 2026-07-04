'use client';

// ============================================================
//  Global Error Boundary - Menangkap error React yang tidak terduga.
//  Dipanggil oleh Next.js App Router error handling.
// ============================================================

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-xl">Terjadi Kesalahan</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Maaf, terjadi kesalahan yang tidak terduga. Silakan coba lagi atau hubungi administrator jika masalah
              terus berlanjut.
            </p>
            {error?.digest && <p className="text-xs text-muted-foreground font-mono">Error ID: {error.digest}</p>}
            <div className="flex gap-2 justify-center pt-2">
              <Button onClick={reset} variant="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                Coba Lagi
              </Button>
              <Button onClick={() => (window.location.href = '/')} variant="outline">
                Kembali ke Beranda
              </Button>
            </div>
          </CardContent>
        </Card>
      </body>
    </html>
  );
}
