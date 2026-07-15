import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  try {
    const res = await prisma.user.findMany({ where: { turma: { nome: 'TURMA 2' } } });
    console.log('SUCCESS', res.length);
  } catch(e) {
    console.error('ERROR', e);
  }
  await prisma.$disconnect();
}
main();
