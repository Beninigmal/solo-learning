import { prisma } from '../src/prisma';

async function main() {
  const user = await prisma.user.findFirst({
    where: { nickname: 'Val' }
  });

  if (!user) {
    console.log('User Val not found');
    return;
  }

  console.log('=== USER ===');
  console.log(user);

  console.log('=== RUNNING WRONG ANSWERS QUERY ===');
  const wrongAnswers = await prisma.wrongAnswer.findMany({
    where: { userId: user.id, resolvido: false },
    include: { quest: true }
  });

  console.log(`Found ${wrongAnswers.length} wrong answers.`);

  const wrongAnswersWithDelivery = await Promise.all(
    wrongAnswers.map(async (wa) => {
      const delivery = await prisma.questDelivery.findUnique({
        where: {
          questId_userId: {
            questId: wa.questId,
            userId: wa.userId
          }
        }
      });
      return {
        ...wa,
        delivery
      };
    })
  );

  console.log('=== QUERY RESULT ===');
  console.log(JSON.stringify(wrongAnswersWithDelivery, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
