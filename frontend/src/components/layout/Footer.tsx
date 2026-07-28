// ============================================================
//  Footer aplikasi.
//  Ergonomis: tautan teks desktop, ikon kompak mobile.
// ============================================================

export function Footer() {
  const tahun = new Date().getFullYear();
  return (
    <footer className="border-t border-outline-variant bg-surface-container-low px-5 py-stack-md sm:px-6 lg:px-8 pb-safe md:pb-0">
      <div className="mx-auto flex w-full sm:max-w-3xl lg:max-w-6xl xl:max-w-7xl flex-col items-center justify-between gap-3 text-center md:flex-row md:text-left">
        <p className="font-label-sm text-on-surface-variant">
          © {tahun} <span className="font-bold text-primary">SIPP-BMN</span> — Kementerian Keuangan RI.
          All Rights Reserved.
        </p>
        {/* Desktop: teks tautan; Mobile: ikon kompak */}
        <div className="flex items-center gap-1 sm:gap-4 font-label-sm text-on-surface-variant">
          {/* Mobile: ikon saja */}
          <a
            href="#"
            aria-label="Kebijakan Privasi"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-primary/5 hover:text-primary md:hidden"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M11.828 2.25a4.878 4.878 0 0 1 5.328 7.078l-7.75 7.75a1.25 1.25 0 0 1-1.768 0l-3.25-3.25a1.25 1.25 0 0 1 0-1.768l7.75-7.75a4.878 4.878 0 0 1-.002-6.762ZM9.03 3.97A6.878 6.878 0 0 1 11 6.25a6.878 6.878 0 0 1 5.03 2.22l7.75 7.75a2.75 2.75 0 0 1 0 3.89l-3.89 3.89a.75.75 0 0 1-1.06-1.06l3.89-3.89a1.25 1.25 0 0 0 0-1.768l-7.75-7.75Z" clipRule="evenodd" />
            </svg>
          </a>
          <a
            href="#"
            aria-label="Syarat dan Ketentuan"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-primary/5 hover:text-primary md:hidden"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M2.625 6.75a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Zm4.875 0A.75.75 0 0 1 8.25 6h12a.75.75 0 0 1 0 1.5h-12a.75.75 0 0 1-.75-.75ZM2.625 12a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0ZM7.5 12a.75.75 0 0 1 .75-.75h12a.75.75 0 0 1 0 1.5h-12A.75.75 0 0 1 7.5 12Zm-4.875 5.25a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Zm4.875 0a.75.75 0 0 1 .75-.75h12a.75.75 0 0 1 0 1.5h-12a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
            </svg>
          </a>
          <a
            href="#"
            aria-label="Kontak Kami"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-on-surface-variant transition-colors hover:bg-primary/5 hover:text-primary md:hidden"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M1.5 4.5a3 3 0 0 1 3-3h1.372c.86 0 1.61.626 1.774 1.153a.75.75 0 0 1 1.456.096c.197.64.77 1.082 1.456 1.082h1.724a2.25 2.25 0 0 1 2.25 2.25v9.75a2.25 2.25 0 0 1-2.25 2.25H4.5a3 3 0 0 1-3-3V4.5ZM4.5 3A1.5 1.5 0 0 0 3 4.5v15c0 .828.672 1.5 1.5 1.5h15c.828 0 1.5-.672 1.5-1.5v-15A1.5 1.5 0 0 0 19.5 3h-15Zm6.41 3.53a.75.75 0 0 0-1.06 1.06l1.72 1.72a.75.75 0 1 0 1.06-1.06l-1.72-1.72ZM12.44 14a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" clipRule="evenodd" />
            </svg>
          </a>
          {/* Desktop: teks tautan */}
          <a href="#" className="hidden transition-colors hover:text-primary md:inline">Kebijakan Privasi</a>
          <a href="#" className="hidden transition-colors hover:text-primary md:inline">Syarat &amp; Ketentuan</a>
          <a href="#" className="hidden transition-colors hover:text-primary md:inline">Kontak Kami</a>
        </div>
      </div>
    </footer>
  );
}
