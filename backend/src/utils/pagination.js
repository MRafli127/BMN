// ============================================================
//  Shared pagination helper.
// ============================================================

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 200;

/**
 * Parse dan normalisasi page & limit dari query.
 * @param {object} params - { page, limit, defaultLimit }
 * @returns {{ halaman: number, perHalaman: number, skip: number }}
 */
function parsePagination({ page = 1, limit = DEFAULT_LIMIT, defaultLimit = DEFAULT_LIMIT } = {}) {
  const halaman = Math.max(1, parseInt(page, 10) || 1);
  const def = defaultLimit || DEFAULT_LIMIT;
  const perHalaman = Math.min(MAX_LIMIT, Math.max(1, parseInt(limit, 10) || def));
  return { halaman, perHalaman, skip: (halaman - 1) * perHalaman };
}

module.exports = { parsePagination, DEFAULT_LIMIT, MAX_LIMIT };
