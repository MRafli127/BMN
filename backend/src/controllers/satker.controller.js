// ============================================================
//  Controller Satker
// ============================================================

const satkerService = require('../services/satker.service');
const { responsSukses, responsGagal } = require('../utils/apiResponse');

async function getSemua(req, res) {
  try {
    const { page, limit, q, aktif } = req.query;
    const hasil = await satkerService.getSemua({
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10) || 50,
      q,
      aktif,
    });
    return responsSukses(res, { data: hasil });
  } catch (error) {
    const status = error.statusCode || 500;
    return responsGagal(res, { pesan: error.message || 'Terjadi kesalahan.', status });
  }
}

async function getById(req, res) {
  try {
    const hasil = await satkerService.getById(req.params.id);
    return responsSukses(res, { data: hasil });
  } catch (error) {
    const status = error.statusCode || 500;
    return responsGagal(res, { pesan: error.message || 'Terjadi kesalahan.', status });
  }
}

async function create(req, res) {
  try {
    const hasil = await satkerService.create(req.body);
    return responsSukses(res, { data: hasil }, 201);
  } catch (error) {
    const status = error.statusCode || 500;
    return responsGagal(res, { pesan: error.message || 'Terjadi kesalahan.', status });
  }
}

async function update(req, res) {
  try {
    const hasil = await satkerService.update(req.params.id, req.body);
    return responsSukses(res, { data: hasil });
  } catch (error) {
    const status = error.statusCode || 500;
    return responsGagal(res, { pesan: error.message || 'Terjadi kesalahan.', status });
  }
}

async function remove(req, res) {
  try {
    const hasil = await satkerService.remove(req.params.id);
    return responsSukses(res, { data: hasil });
  } catch (error) {
    const status = error.statusCode || 500;
    return responsGagal(res, { pesan: error.message || 'Terjadi kesalahan.', status });
  }
}

async function sync(req, res) {
  try {
    const hasil = await satkerService.syncDariBarang();
    return responsSukses(res, { data: hasil });
  } catch (error) {
    const status = error.statusCode || 500;
    return responsGagal(res, { pesan: error.message || 'Terjadi kesalahan.', status });
  }
}

module.exports = {
  getSemua,
  getById,
  create,
  update,
  remove,
  sync,
};
