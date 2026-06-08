import { prisma } from '../src/prisma';

async function main() {
  const user = await prisma.user.findFirst({
    where: { nickname: 'Val' }
  });

  if (user) {
    console.log('MATRICULA:', user.matricula);
  } else {
    console.log('User Val not found');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
