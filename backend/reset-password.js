require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const pw = await bcrypt.hash('Peminjam123!', 10);
  await prisma.user.updateMany({
    where: { email: { in: ['budi@bmn.go.id', 'siti@bmn.go.id'] } },
    data: { password: pw }
  });
  console.log('Password Budi & Siti direset ke: Peminjam123!');
}

main().finally(() => prisma.$disconnect());
