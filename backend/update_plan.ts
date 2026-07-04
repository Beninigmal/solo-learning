import { prisma } from './src/prisma';

async function main() {
  const result = await prisma.institution.updateMany({
    where: { nome: 'UCS' },
    data: { plano: 'RANK_S', maxTurmasMonarch: 999 }
  });
  console.log(`Updated ${result.count} institutions.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
