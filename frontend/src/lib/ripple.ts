// ============================================================
//  Efek riak (ripple) saat elemen diklik — dipakai Button,
//  Sidebar, dan elemen interaktif lain. Elemen target wajib
//  memiliki `position: relative` + `overflow: hidden`.
//  Warna riak bisa dioverride lewat variabel CSS `--ripple-c`.
//
//  Gaya penentu layout (position, ukuran, transform) ditulis
//  inline — bukan hanya lewat kelas CSS — agar riak tidak akan
//  pernah memengaruhi tata letak walau stylesheet belum termuat
//  (mis. saat cache .next basi).
// ============================================================

import type React from 'react';

export function buatRipple(e: React.MouseEvent<HTMLElement>) {
  const el = e.currentTarget;
  const rect = el.getBoundingClientRect();
  // Diameter secukupnya (≈ sisi terpanjang elemen) agar riak halus,
  // tidak menutupi seluruh elemen.
  const ukuran = Math.max(rect.width, rect.height);
  const riak = document.createElement('span');
  riak.className = 'ripple-ink';
  Object.assign(riak.style, {
    position: 'absolute',
    borderRadius: '9999px',
    pointerEvents: 'none',
    transform: 'scale(0)',
    width: `${ukuran}px`,
    height: `${ukuran}px`,
    left: `${e.clientX - rect.left - ukuran / 2}px`,
    top: `${e.clientY - rect.top - ukuran / 2}px`,
  });
  el.appendChild(riak);
  // Hapus saat animasi usai; timer cadangan menjamin span tetap
  // dibersihkan meski event animationend tidak pernah terpicu.
  riak.addEventListener('animationend', () => riak.remove());
  setTimeout(() => riak.remove(), 800);
}
