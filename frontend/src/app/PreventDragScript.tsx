// ============================================================
//  Script untuk mencegah drag & drop secara komprehensif.
//  Dijalankan di client-side untuk perlindungan tambahan.
// ============================================================

'use client';

import { useEffect } from 'react';

export function PreventDragScript() {
  useEffect(() => {
    // 1. Cegah semua drag event
    const dragEvents = [
      'dragstart', 'drag', 'dragend', 'dragover', 'dragenter',
      'dragleave', 'drop'
    ];

    const preventDrag = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    dragEvents.forEach(event => {
      document.addEventListener(event, preventDrag, { capture: true, passive: false });
    });

    // 2. Nonaktifkan draggable pada elemen baru
    const disableDraggable = () => {
      const elements = document.querySelectorAll('[draggable="true"]');
      elements.forEach(el => {
        (el as HTMLElement).setAttribute('draggable', 'false');
      });
    };

    // Jalankan segera dan secara berkala
    disableDraggable();
    const interval = setInterval(disableDraggable, 500);

    // MutationObserver untuk elemen baru
    const observer = new MutationObserver(disableDraggable);
    observer.observe(document.body, { childList: true, subtree: true });

    // 3. CSS injection untuk keamanan tambahan
    const styleId = 'prevent-drag-styles';
    let style = document.getElementById(styleId);

    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      // Catatan: JANGAN set `user-select: none` di sini. Itu yang membuat
      // teks tidak bisa diblok/di-copy. Kita hanya mencegah drag, dan tetap
      // mengizinkan seleksi teks agar mudah menyalin kata/kalimat.
      style.textContent = `
        * {
          -webkit-user-drag: none !important;
          user-drag: none !important;
          draggable: false !important;
          -webkit-user-select: text !important;
          user-select: text !important;
        }
        input, textarea, select {
          -webkit-user-select: auto !important;
          user-select: auto !important;
        }
        img, video, svg {
          -webkit-user-drag: none !important;
          user-drag: none !important;
          draggable: false !important;
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      dragEvents.forEach(event => {
        document.removeEventListener(event, preventDrag, { capture: true });
      });
      clearInterval(interval);
      observer.disconnect();
      // Jangan hapus style saat unmount karena mungkin masih dibutuhkan
    };
  }, []);

  return null;
}
