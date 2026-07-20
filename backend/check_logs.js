const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.importLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  if (logs.length === 0) {
    console.log('No import logs found in database.');
    return;
  }

  for (const log of logs) {
    console.log('--- LOG:', log.id);
    console.log('jenis:', log.jenisImport);
    console.log('file:', log.namaFile);
    console.log('akunDitambahkan:', log.akunDitambahkan, '| akunDiperbarui:', log.akunDiperbarui, '| peminjamanDibuat:', log.peminjamanDibuat, '| gagal:', log.gagal);

    const detailFields = ['detailDitambahkan', 'detailDiperbarui', 'detailPeminjaman', 'detailGagal', 'detailBarangTidakDitemukan'];
    for (const field of detailFields) {
      const val = log[field];
      const isArr = Array.isArray(val);
      const isObj = typeof val === 'object' && val !== null && !Array.isArray(val);
      const hasDataKey = isObj && 'data' in val;
      const arr = isArr ? val : (hasDataKey ? val.data : []);
      const count = Array.isArray(arr) ? arr.length : 0;
      console.log('  ' + field + ': isArray=' + isArr + ', isObj=' + isObj + ', hasDataKey=' + hasDataKey + ', itemCount=' + count);
      if (count > 0) {
        console.log('    first item keys:', Object.keys(arr[0]).join(', '));
        console.log('    first item:', JSON.stringify(arr[0]));
      }
    }
    console.log();
  }
}

main()
  .catch(console.error)
  .then(() => prisma.$disconnect());
