// ============================================================
//  Helper utility: hapus field sensitif dari user object.
// ============================================================

/**
 * Buang field `password` dari user object.
 * Return undefined jika input undefined/null.
 */
function tanpaPassword(user) {
  if (!user) return user;
  const { password, ...sisanya } = user;
  return sisanya;
}

module.exports = { tanpaPassword };
