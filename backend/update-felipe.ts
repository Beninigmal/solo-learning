import { prisma } from './src/prisma';

async function main() {
  try {
    const users = await prisma.user.findMany({
      where: { nome: { contains: 'Felipe' } }
    });
    
    console.log("Found users matching Felipe:", users);
    
    const felipe = await prisma.user.findFirst({
      where: { nome: 'Felipe Frade' }
    });

    if (felipe) {
      await prisma.user.update({
        where: { id: felipe.id },
        data: { nickname: 'Ashes2Ashes' }
      });
      console.log('Nickname do Felipe Frade atualizado para Ashes2Ashes!');
    } else {
      console.log('Usuário Felipe Frade não encontrado no banco.');
    }
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
  }
}

main();
