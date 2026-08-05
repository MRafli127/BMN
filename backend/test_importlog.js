// Test importLog controller response
const req = { query: { page: '1', limit: '10' } };
let responsBody = null;
const res = {
  statusCode: 200,
  status: function(n) { this.statusCode = n; return this; },
  json: function(body) { responsBody = body; return this; },
  setEtag: function() {}
};

const controller = require('./src/controllers/importLog.controller');

async function main() {
  await controller.ambilSemuaLog(req, res);

  console.log('Status:', res.statusCode);
  console.log('Sukses:', responsBody.sukses);
  console.log('Pesan:', responsBody.pesan);
  console.log('Data count:', responsBody.data ? responsBody.data.length : 'N/A');
  console.log('Pagination:', JSON.stringify(responsBody.meta ? responsBody.meta.pagination : null));

  if (responsBody.data && responsBody.data.length > 0) {
    const first = responsBody.data[0];
    console.log('\n--- First log ---');
    console.log('keys:', Object.keys(first).join(', '));
    console.log('detailDitambahkan type:', typeof first.detailDitambahkan);
    console.log('detailDitambahkan:', JSON.stringify(first.detailDitambahkan));
    console.log('detailDiperbarui:', JSON.stringify(first.detailDiperbarui));
    console.log('detailPeminjaman:', JSON.stringify(first.detailPeminjaman));
    console.log('detailGagal:', JSON.stringify(first.detailGagal));
    console.log('detailBarangTidakDitemukan:', JSON.stringify(first.detailBarangTidakDitemukan));
  }
}

main().catch(console.error);
