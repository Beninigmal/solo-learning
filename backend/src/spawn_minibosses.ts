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

  // Find disciplines for Portuguese, Math, English
  const subjects = await prisma.disciplina.findMany({
    where: {
      nome: {
        in: ['Língua Portuguesa', 'Matemática', 'Língua Inglesa']
      }
    }
  });
  
  console.log(`Found ${subjects.length} disciplines:`, subjects.map(s => s.nome));

  const questions = {
    'Língua Portuguesa': {
      pergunta: 'Analise o uso da crase na frase: "Refiro-me àquelas alunas que estudam à noite". Justifique a ocorrência do acento grave em ambos os casos.',
      boss: 'Mind Flayer'
    },
    'Matemática': {
      pergunta: 'Seja a função f(x) = 3x² - 12x + 9. Determine as coordenadas do vértice da parábola e indique se este ponto representa um valor máximo ou mínimo da função.',
      boss: 'Tarrasque'
    },
    'Língua Inglesa': {
      pergunta: 'Rewrite the following sentence using the present perfect continuous tense: "She started studying English two hours ago and she is still studying now".',
      boss: 'Dragão Vermelho'
    }
  };

  const now = new Date();
  
  for (const subject of subjects) {
    const qInfo = questions[subject.nome as keyof typeof questions];
    if (!qInfo) continue;
    
    const finalEnunciado = `O inimigo ${qInfo.boss} surgiu! Desafio de ${subject.nome}:\n\n${qInfo.pergunta}`;

    // Create quest
    const quest = await prisma.quest.create({
      data: {
        enunciado: finalEnunciado,
        tags: ['MINIBOSS', 'TESTE_ANIMA'],
        xp: 300,
        nivel: 'MINIBOSS',
        disciplinaId: subject.id,
      }
    });

    console.log(`Created quest for ${subject.nome} with boss ${qInfo.boss}`);

    // Assign to participants
    for (const participant of party.participantes) {
      await prisma.questDelivery.create({
        data: {
          questId: quest.id,
          userId: participant.userId,
          status: 'DELIVERED',
          scheduledAt: now,
          expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000)
        }
      });
      console.log(`Assigned to user ${participant.userId}`);
    }
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
