import { prisma } from '../src/prisma';

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      nome: true,
      nickname: true,
      role: true,
      instituicao: true,
      institutionId: true,
      turmaId: true
    }
  });

  console.log('=== ALL USERS ===');
  console.log(JSON.stringify(users, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
