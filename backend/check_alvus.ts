import { prisma } from './src/prisma.js';

async function main() {
  const alvus = await prisma.user.findMany({ where: { nome: { contains: 'Alvo' } } });
  console.log('Alvo count:', alvus.length);
  alvus.forEach(a => console.log(a.id, a.nome, a.role));
}
main().finally(() => prisma.$disconnect());
