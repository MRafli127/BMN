// ============================================================
//  Store tema (Zustand) — kontrol mode terang/gelap aplikasi.
//  Preferensi disimpan di localStorage agar bertahan antar sesi.
// ============================================================

import { create } from 'zustand';

type Tema = 'light' | 'dark';

const KUNCI_TEMA = 'tema';

function terapkanTema(tema: Tema) {
  document.documentElement.classList.toggle('dark', tema === 'dark');
}

interface ThemeState {
  tema: Tema;
  muatTema: () => void;
  toggleTema: () => void;
  aturTema: (tema: Tema) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  tema: 'light',

  // Sinkronkan state dengan class yang sudah diset skrip anti-kedip di <html>
  muatTema: () => {
    if (typeof document === 'undefined') return;
    const tema: Tema = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    set({ tema });
  },

  toggleTema: () => {
    const tema: Tema = get().tema === 'dark' ? 'light' : 'dark';
    localStorage.setItem(KUNCI_TEMA, tema);
    terapkanTema(tema);
    set({ tema });
  },

  aturTema: (tema) => {
    localStorage.setItem(KUNCI_TEMA, tema);
    terapkanTema(tema);
    set({ tema });
  },
}));
