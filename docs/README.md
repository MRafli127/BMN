# Dokumentasi SIPP-BMN

Dokumentasi sistem dalam format LaTeX.

## File

- `Dokumentasi_SIPP_BMN.tex` — Kode sumber dokumen utama

## Kompilasi PDF

### Menggunakan pdflatex (lokal)

Pastikan LaTeX sudah terinstall (misalnya MiKTeX, TeX Live, atau MacTeX).

```bash
pdflatex Dokumentasi_SIPP_BMN.tex
```

Untuk hasil terbaik (dua kali kompilasi agar index dan referensi silang akurat):

```bash
pdflatex Dokumentasi_SIPP_BMN.tex
pdflatex Dokumentasi_SIPP_BMN.tex
```

### Menggunakan Docker

```bash
docker run --rm -v .:/data -w /data texlive/texlive:latest pdflatex Dokumentasi_SIPP_BMN.tex
```

### VS Code (LaTeX Workshop)

Jika menggunakan VS Code dengan ekstensi LaTeX Workshop, cukup buka file `.tex`
dan klik **Build** (Ctrl+Alt+B).

## Package yang Dibutuhkan

Dokumen ini memerlukan distribusi LaTeX dengan package berikut:

- `inputenc` — UTF-8 encoding
- `fontenc` — Font encoding (T1)
- `babel` — Dukungan bahasa Indonesia
- `geometry` — Pengaturan halaman
- `hyperref` — Hyperlink dan PDF metadata
- `bookmark` — Bookmark PDF
- `graphicx` — Gambar
- `xcolor` — Warna (dengan opsi `table`)
- `booktabs` — Tabel profesional
- `longtable` — Tabel multi-halaman
- `tabularx` — Tabel dengan kolom otomatis
- `multirow` — Sel tabel multi-baris
- `colortbl` — Warna baris tabel
- `titlesec` — Format judul bab
- `fancyhdr` — Header dan footer
- `caption` — Caption tabel/gambar
- `setspace` — Spasi antar-baris
- `amsmath`, `amssymb` — Simbol matematika
- `indentfirst` — Indentasi paragraf pertama
- `ifthen` — Kondisi
- `etoolbox` —工具
- `enumerate` — Daftar bernomor

Semua package di atas sudah termasuk dalam distribusi LaTeX standar
(TeX Live, MiKTeX, MacTeX).

## Output

Setelah kompilasi berhasil, akan dihasilkan:

- `Dokumentasi_SIPP_BMN.pdf` — Dokumen PDF final
- `Dokumentasi_SIPP_BMN.aux` — File bantuan (xref, index)
- `Dokumentasi_SIPP_BMN.log` — Log kompilasi
- `Dokumentasi_SIPP_BMN.out` — Bookmark untuk hyperref

## Struktur Dokumen

| Bab | Judul |
|-----|-------|
| 1 | Pendahuluan |
| 2 | Gambaran Sistem |
| 3 | Peran dan Hak Akses |
| 4 | Fitur dan Halaman --- Super Admin |
| 5 | Fitur dan Halaman --- Administrator |
| 6 | Fitur dan Halaman --- Peminjam |
| 7 | Halaman dan Fitur Bersama |
| 8 | Alur Kerja Peminjaman |
| 9 | Entitas Basis Data |
| 10 | Rute API |
| 11 | Fitur Keamanan |
| 12 | Fitur Tambahan |
| 13 | Penjadwalan Otomatis (Cron Jobs) |
| 14 | Penutup |
| Lampiran A | Daftar Singkatan dan Istilah |
| Lampiran B | Diagram Tambahan |
| Lampiran C | Kode Status HTTP |
