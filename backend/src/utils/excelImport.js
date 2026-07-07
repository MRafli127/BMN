const XLSX = require('xlsx');
const { AppError } = require('../middleware/error.middleware');

function normalHeader(h) {
  return String(h ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function teksAtauNull(v) {
  const s = String(v ?? '').trim();
  return s === '' ? null : s;
}

function sama(a, b) {
  return (a ?? null) === (b ?? null);
}

function bacaGrid(buffer, options = {}) {
  const { raw = false } = options;
  const wb = XLSX.read(buffer, { type: 'buffer', raw });
  if (!wb.SheetNames.length) throw new AppError('File tidak memiliki sheet apa pun.', 400);
  const ws = wb.Sheets[wb.SheetNames[0]];

  const selKeys = Object.keys(ws).filter((k) => !k.startsWith('!'));
  if (selKeys.length === 0) return [];

  let maxRow = 0;
  let maxCol = 0;
  for (const k of selKeys) {
    const c = XLSX.utils.decode_cell(k);
    if (c.r > maxRow) maxRow = c.r;
    if (c.c > maxCol) maxCol = c.c;
  }
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxRow, c: maxCol } });

  return XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: false });
}

function cariBarisHeader(grid, penanda) {
  for (let i = 0; i < grid.length; i += 1) {
    const sel = grid[i].map(normalHeader);
    const adaPenanda = sel.some((s) => penanda.includes(s));
    if (adaPenanda) return i;
  }
  return -1;
}

function petaKolom(barisHeader, aliasKolom) {
  const peta = {};
  barisHeader.forEach((h, idx) => {
    const field = aliasKolom[normalHeader(h)];
    if (field && peta[field] === undefined) peta[field] = idx;
  });
  return peta;
}

module.exports = {
  normalHeader,
  teksAtauNull,
  sama,
  bacaGrid,
  cariBarisHeader,
  petaKolom,
};
