// ============================================================
//  Shared PDF helper utilities.
// ============================================================

const { rgb } = require('pdf-lib');

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

/**
 * Cek apakah teks adalah checkmark (untuk domain join di surat).
 */
function adalahCheckmark(str) {
  return str === '✓' || str === 'V';
}

/**
 * Gambar checkbox dengan border dan checkmark ✓.
 * Dipusatkan di dalam area yang ditentukan (selX, selY, selW, selH).
 *
 * @param {object} page - pdf-lib page instance
 * @param {number} selX - posisi x kiri atas area checkbox
 * @param {number} selY - posisi y kiri atas area checkbox
 * @param {number} selW - lebar area checkbox
 * @param {number} selH - tinggi area checkbox
 */
function gambarCheckbox(page, selX, selY, selW, selH) {
  const BOX_SIZE = 16; // ukuran kotak checkbox
  const BORDER_WIDTH = 1.5;
  const CHECK_THICKNESS = 1.8;

  // Pusatkan kotak di dalam area
  const cx = selX + selW / 2;
  const cy = selY + selH / 2;
  const boxX = cx - BOX_SIZE / 2;
  const boxY = cy - BOX_SIZE / 2;

  // Kotak checkbox dengan border
  page.drawRectangle({
    x: boxX,
    y: boxY,
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderColor: rgb(0, 0, 0),
    borderWidth: BORDER_WIDTH,
    color: rgb(1, 1, 1),
  });

  // Checkmark ✓ yang benar
  // PDF: boxY = Y sisi BAWAH kotak
  // Garis 1 (/): dari kiri-bawah ke tengah-atas
  // Garis 2 (\): dari tengah-atas ke kanan-bawah
  const ckOff = 3;    // offset dari tepi
  const ckMidX = 8;   // titik tengah-x

  // Garis 1: /
  // Start: kiri-bawah = (boxX+3, boxY+16-3=13)
  // End: tengah-atas = (boxX+8, boxY+3)
  page.drawLine({
    start: { x: boxX + ckOff, y: boxY + BOX_SIZE - ckOff },
    end: { x: boxX + ckMidX, y: boxY + ckOff },
    thickness: CHECK_THICKNESS,
    color: rgb(0, 0, 0),
  });

  // Garis 2: \
  // Start: tengah-atas = (boxX+8, boxY+3)
  // End: kanan-bawah = (boxX+13, boxY+13)
  page.drawLine({
    start: { x: boxX + ckMidX, y: boxY + ckOff },
    end: { x: boxX + BOX_SIZE - ckOff, y: boxY + BOX_SIZE - ckOff },
    thickness: CHECK_THICKNESS,
    color: rgb(0, 0, 0),
  });
}

module.exports = { wrapText, adalahCheckmark, gambarCheckbox };
