// ============================================================
//  Input Tanda Tangan elektronik.
//   - Mode "Gambar": tulis/gambar tanda tangan pada kanvas.
//   - Mode "Unggah": unggah gambar tanda tangan (background putih
//     otomatis dibuat transparan).
//  Menghasilkan PNG data URL (background transparan) via onChange.
// ============================================================

'use client';

import { useEffect, useRef, useState } from 'react';
import { PencilLine, Upload, Eraser, ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/input';
import { notify } from '@/components/ui/toast';

interface Props {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
}

const LEBAR = 560;
const TINGGI = 180;

export function TandaTanganInput({ value, onChange }: Props) {
  const [mode, setMode] = useState<'gambar' | 'unggah'>('gambar');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sedangGambar = useRef(false);
  const adaGoresan = useRef(false);

  // Siapkan konteks kanvas saat mode gambar aktif.
  useEffect(() => {
    if (mode !== 'gambar') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
  }, [mode]);

  const posisi = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const mulai = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    sedangGambar.current = true;
    canvasRef.current?.setPointerCapture(e.pointerId);
    const { x, y } = posisi(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const gores = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!sedangGambar.current) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const { x, y } = posisi(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    adaGoresan.current = true;
  };

  const selesai = () => {
    if (!sedangGambar.current) return;
    sedangGambar.current = false;
    if (adaGoresan.current && canvasRef.current) {
      onChange(canvasRef.current.toDataURL('image/png'));
    }
  };

  const bersihkan = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    adaGoresan.current = false;
    onChange(null);
  };

  // Proses gambar unggahan: perkecil + buat background putih transparan.
  const pilihFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return notify.gagal('File harus berupa gambar.');

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maks = 600;
        const skala = Math.min(1, maks / img.width);
        const w = Math.round(img.width * skala);
        const h = Math.round(img.height * skala);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);
        try {
          const data = ctx.getImageData(0, 0, w, h);
          const p = data.data;
          for (let i = 0; i < p.length; i += 4) {
            // Piksel mendekati putih -> transparan (hapus background).
            if (p[i] > 235 && p[i + 1] > 235 && p[i + 2] > 235) p[i + 3] = 0;
          }
          ctx.putImageData(data, 0, 0);
        } catch {
          // Bila getImageData gagal (mis. CORS), pakai gambar apa adanya.
        }
        onChange(canvas.toDataURL('image/png'));
        notify.sukses('Tanda tangan diunggah.');
      };
      img.onerror = () => notify.gagal('Gagal memuat gambar.');
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Tanda Tangan</Label>
        <div className="inline-flex overflow-hidden rounded-md border">
          <button
            type="button"
            onClick={() => setMode('gambar')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === 'gambar' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'
            }`}
          >
            <PencilLine className="h-3.5 w-3.5" /> Gambar
          </button>
          <button
            type="button"
            onClick={() => setMode('unggah')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors ${
              mode === 'unggah' ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:bg-muted'
            }`}
          >
            <Upload className="h-3.5 w-3.5" /> Unggah
          </button>
        </div>
      </div>

      {mode === 'gambar' ? (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-lg border bg-[repeating-conic-gradient(#f1f5f9_0%_25%,#ffffff_0%_50%)] [background-size:16px_16px]">
            <canvas
              ref={canvasRef}
              width={LEBAR}
              height={TINGGI}
              onPointerDown={mulai}
              onPointerMove={gores}
              onPointerUp={selesai}
              onPointerLeave={selesai}
              className="h-44 w-full touch-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Tulis/gambar tanda tangan Anda di dalam kotak.</p>
            <Button type="button" variant="outline" size="sm" onClick={bersihkan}>
              <Eraser className="h-4 w-4" /> Bersihkan
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {value ? (
            <div className="flex items-center gap-3 rounded-lg border bg-[repeating-conic-gradient(#f1f5f9_0%_25%,#ffffff_0%_50%)] p-3 [background-size:16px_16px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value} alt="Tanda tangan" className="h-24 w-auto object-contain" />
            </div>
          ) : (
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-8 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted">
              <Upload className="h-6 w-6" />
              <span>Klik untuk mengunggah gambar tanda tangan (JPG/PNG)</span>
              <span className="text-xs">Background putih akan dibuat transparan otomatis.</span>
              <input type="file" accept="image/*" className="hidden" onChange={pilihFile} />
            </label>
          )}
          {value && (
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <Button type="button" variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="h-4 w-4" /> Ganti
                  </span>
                </Button>
                <input type="file" accept="image/*" className="hidden" onChange={pilihFile} />
              </label>
              <Button type="button" variant="ghost" size="sm" className="text-red-600" onClick={() => onChange(null)}>
                <ImageOff className="h-4 w-4" /> Hapus
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
