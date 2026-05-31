import { prisma } from './prisma';

async function run() {
  try {
    // Busca a usuária por nome ou nickname contendo "luaa"
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { nome: { contains: 'luaa', mode: 'insensitive' } },
          { nickname: { contains: 'luaa', mode: 'insensitive' } }
        ]
      }
    });

    if (!user) {
      console.error('❌ Usuária luaa não encontrada!');
      return;
    }

    console.log(`✅ Usuária encontrada: ${user.nome} (ID: ${user.id}, Nickname: ${user.nickname})`);

    const artifacts = [
      'martelo_magico',
      'martelo_magico',
      'pena_escriba',
      'pena_escriba',
      'pergaminho_oraculo',
      'pergaminho_oraculo'
    ];

    for (const artId of artifacts) {
      await prisma.giftedArtifact.create({
        data: {
          userId: user.id,
          artifactId: artId
        }
      });
    }

    console.log('🎉 2x Martelo Mágico, 2x Pena do Escriba e 2x Pergaminho do Oráculo adicionados com sucesso ao inventário de luaa!');
  } catch (e) {
    console.error('❌ Erro ao adicionar artefatos:', e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
