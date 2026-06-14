// ============================================================
//  Store UI (Zustand) — kontrol tampilan seperti sidebar mobile.
// ============================================================

import { create } from 'zustand';

interface UIState {
  sidebarTerbuka: boolean;
  bukaSidebar: () => void;
  tutupSidebar: () => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarTerbuka: false,
  bukaSidebar: () => set({ sidebarTerbuka: true }),
  tutupSidebar: () => set({ sidebarTerbuka: false }),
  toggleSidebar: () => set((s) => ({ sidebarTerbuka: !s.sidebarTerbuka })),
}));
