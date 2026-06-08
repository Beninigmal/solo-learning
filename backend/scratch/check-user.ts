import { prisma } from '../src/prisma';

async function main() {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { nickname: '@val' },
        { nickname: 'val' },
        { nickname: { equals: 'val', mode: 'insensitive' } }
      ]
    },
    include: {
      turma: true
    }
  });

  console.log('=== USER INFO ===');
  console.log(JSON.stringify(user, null, 2));

  if (user) {
    const wrongAnswers = await prisma.wrongAnswer.findMany({
      where: { userId: user.id },
      include: { quest: true }
    });
    console.log('\n=== WRONG ANSWERS ===');
    console.log(JSON.stringify(wrongAnswers, null, 2));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
