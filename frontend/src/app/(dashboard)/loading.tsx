// ============================================================
//  Skeleton transisi rute dashboard.
//  Tampil seketika saat berpindah halaman sehingga navigasi
//  terasa responsif (tidak menunggu layar kosong).
// ============================================================

export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-5">
      {/* Judul */}
      <div className="space-y-2">
        <div className="h-7 w-56 rounded-md bg-muted" />
        <div className="h-4 w-72 rounded bg-muted/70" />
      </div>

      {/* Kartu statistik */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl border bg-muted/60" />
        ))}
      </div>

      {/* Konten utama */}
      <div className="h-72 rounded-xl border bg-muted/50" />
    </div>
  );
}
