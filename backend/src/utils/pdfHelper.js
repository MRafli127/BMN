// ============================================================
//  Shared PDF helper utilities.
// ============================================================

/**
 * Pecah teks menjadi baris-baris agar muat dalam maxWidth.
 * Pecah paksa kata yang lebih panjang dari kolom.
 */
function wrapText(text, font, size, maxWidth) {
  const hasil = [];
  const kata = String(text ?? '').split(/\s+/).filter(Boolean);
  let baris = '';
  for (let w of kata) {
    while (font.widthOfTextAtSize(w, size) > maxWidth) {
      let i = 1;
      while (i <= w.length && font.widthOfTextAtSize(w.slice(0, i), size) <= maxWidth) i++;
      if (baris) {
        hasil.push(baris);
        baris = '';
      }
      hasil.push(w.slice(0, i - 1));
      w = w.slice(i - 1);
    }
    const coba = baris ? `${baris} ${w}` : w;
    if (font.widthOfTextAtSize(coba, size) > maxWidth && baris) {
      hasil.push(baris);
      baris = w;
    } else {
      baris = coba;
    }
  }
  if (baris) hasil.push(baris);
  return hasil.length ? hasil : [''];
}

module.exports = { wrapText };
