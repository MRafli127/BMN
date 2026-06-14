// ============================================================
//  Footer aplikasi.
// ============================================================

export function Footer() {
  const tahun = new Date().getFullYear();
  return (
    <footer className="border-t bg-white px-4 py-4 text-center text-xs text-muted-foreground md:px-6">
      <p>
        © {tahun} <span className="font-semibold text-foreground">SIPP-BMN</span> — Sistem Informasi Peminjaman &
        Pengembalian Barang Milik Negara.
      </p>
      <p className="mt-1">Dikelola oleh Bagian Umum & Pengelolaan BMN.</p>
    </footer>
  );
}
