const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  try {
    const user = await prisma.user.findUnique({ where: { cpf: 'solen' } });
    if (user) {
      await prisma.user.update({
        where: { cpf: 'solen' },
        data: { cpf: '01661172504' }
      });
      console.log('Senha (CPF) do arquiteto atualizada para 01661172504 com sucesso!');
    } else {
      console.log('Você ainda não havia criado o usuário. Tudo certo!');
    }
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
run();
