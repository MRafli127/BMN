// ============================================================
//  Dialog konfirmasi tindakan (mis. hapus, setujui, kembalikan).
// ============================================================

'use client';

import { Loader2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  terbuka: boolean;
  onUbahTerbuka: (terbuka: boolean) => void;
  judul: string;
  deskripsi?: string;
  teksKonfirmasi?: string;
  teksBatal?: string;
  variantKonfirmasi?: 'default' | 'destructive' | 'sukses';
  sedangProses?: boolean;
  disabledKonfirmasi?: boolean;
  onKonfirmasi: () => void;
  children?: React.ReactNode;
}

export function KonfirmasiDialog({
  terbuka,
  onUbahTerbuka,
  judul,
  deskripsi,
  teksKonfirmasi = 'Ya, Lanjutkan',
  teksBatal = 'Batal',
  variantKonfirmasi = 'default',
  sedangProses = false,
  disabledKonfirmasi = false,
  onKonfirmasi,
  children,
}: Props) {
  return (
    <Dialog open={terbuka} onOpenChange={onUbahTerbuka}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <DialogTitle>{judul}</DialogTitle>
          </div>
          {deskripsi && <DialogDescription className="pt-2">{deskripsi}</DialogDescription>}
        </DialogHeader>

        {children}

        <DialogFooter>
          <Button variant="outline" onClick={() => onUbahTerbuka(false)} disabled={sedangProses}>
            {teksBatal}
          </Button>
          <Button variant={variantKonfirmasi} onClick={onKonfirmasi} disabled={sedangProses || disabledKonfirmasi}>
            {sedangProses && <Loader2 className="h-4 w-4 animate-spin" />}
            {teksKonfirmasi}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
