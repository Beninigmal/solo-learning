import { prisma } from './prisma';

async function main() {
  const partyCode = 'RAID-Y5E2';

  // Find party
  const party = await prisma.raid.findUnique({
    where: { codigo: partyCode },
    include: { participantes: true }
  });

  if (!party) {
    console.log('Raid not found');
    return;
  }

  console.log(`Found raid ${partyCode} with ${party.participantes.length} participants.`);

  const subject = await prisma.disciplina.findFirst({
    where: { nome: 'Matemática' }
  });

  if (!subject) {
    console.log('Disciplina não encontrada');
    return;
  }

  const qInfo = {
    pergunta: 'QUESTÃO DE NÍVEL GLOBAL: Resolva o enigma milenar do arquimago para derrotar o devorador de mentes. Demonstre a prova completa de que a integral de e^(-x^2) de -infinito a +infinito é raiz quadrada de Pi.',
    boss: 'Mind Flayer'
  };

  const finalEnunciado = `O inimigo ${qInfo.boss} surgiu! Desafio de ${subject.nome}:\n\n${qInfo.pergunta}`;

  const now = new Date();

  // Create quest for BOSS
  const quest = await prisma.quest.create({
    data: {
      enunciado: finalEnunciado,
      tags: ['BOSS', 'INVOCADO_MESTRE'],
      xp: 1500, // Bosses yield massive XP
      nivel: 'BOSS',
      disciplinaId: subject.id,
      expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 dias
    }
  });

  console.log(`Created GENERAL BOSS quest for ${subject.nome} with boss ${qInfo.boss}`);

  // Assign to participants
  for (const participant of party.participantes) {
    await prisma.questDelivery.create({
      data: {
        questId: quest.id,
        userId: participant.userId,
        status: 'DELIVERED',
        scheduledAt: now,
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      }
    });
    console.log(`Assigned BOSS to user ${participant.userId}`);
  }

  console.log('Done!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
