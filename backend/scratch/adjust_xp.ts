import { prisma } from '../src/prisma';

async function adjustXp() {
  console.log('🔮 DECREMENTING AIZ XP FOR RANK UP TESTING 🔮');
  console.log('============================================');

  // Encontrar o aluno com o nome Aiz (case-insensitive)
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { nome: { contains: 'Aiz', mode: 'insensitive' } },
        { nickname: { contains: 'Aiz', mode: 'insensitive' } }
      ]
    }
  });

  if (!user) {
    console.error('❌ Aluna Aiz não encontrada no banco de dados.');
    return;
  }

  const oldXp = user.xp;
  const newXp = Math.max(oldXp - 100, 0);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { xp: newXp }
  });

  console.log(`👤 ALUNA: ${updated.nome}`);
  console.log(`📉 XP Anterior: ${oldXp}`);
  console.log(`📈 XP Atualizado: ${updated.xp} (Removido 100 pontos!)`);
  console.log('============================================');
  console.log('✅ Operação concluída com sucesso!');
}

adjustXp().catch(console.error);
