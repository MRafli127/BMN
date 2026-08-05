// ============================================================
//  Footer aplikasi.
// ============================================================

export function Footer() {
  const tahun = new Date().getFullYear();
  return (
    <footer className="border-t border-outline-variant bg-surface-container-low px-margin-mobile py-stack-md md:px-margin-desktop pb-safe md:pb-0">
      <div className="mx-auto flex max-w-container-max flex-col items-center justify-between gap-2 text-center md:flex-row md:text-left">
        <p className="font-label-sm text-on-surface-variant">
          © {tahun} <span className="font-bold text-primary">SIPP-BMN</span> — Kementerian Keuangan RI.
          All Rights Reserved.
        </p>
        <div className="flex gap-6 font-label-sm text-on-surface-variant">
          <a href="#" className="transition-colors hover:text-primary">Kebijakan Privasi</a>
          <a href="#" className="transition-colors hover:text-primary">Syarat &amp; Ketentuan</a>
          <a href="#" className="transition-colors hover:text-primary">Kontak Kami</a>
        </div>
      </div>
    </footer>
  );
}
