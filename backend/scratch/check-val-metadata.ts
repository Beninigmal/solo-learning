import { prisma } from '../src/prisma';

async function main() {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { nickname: '@val' },
        { nickname: 'val' }
      ]
    }
  });

  console.log('=== USER DETAILS ===');
  if (user) {
    console.log({
      id: user.id,
      nome: user.nome,
      nickname: user.nickname,
      role: user.role,
      instituicao: user.instituicao,
      institutionId: user.institutionId,
      turmaId: user.turmaId
    });
  } else {
    console.log('User not found');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
