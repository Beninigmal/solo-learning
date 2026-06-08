import { prisma } from '../src/prisma';

async function main() {
  console.log('=== RUNNING WRONG ANSWERS QUERY ===');
  const wrongAnswers = await prisma.wrongAnswer.findMany({
    include: { quest: true, user: { select: { id: true, nickname: true, nome: true } } }
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
