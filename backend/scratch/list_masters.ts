import { prisma } from '../src/prisma';

async function listMasters() {
  console.log('🧙‍♂️ LISTANDO CONTAS DE MESTRE E ARQUITETO 🧙‍♂️');
  console.log('============================================');

  const users = await prisma.user.findMany({
    where: {
      role: { in: ['PROFESSOR', 'ADMIN'] }
    },
    select: {
      id: true,
      nome: true,
      nickname: true,
      matricula: true,
      role: true
    }
  });

  users.forEach(u => {
    console.log(`🧙‍♂️ [${u.role}] - Nome: ${u.nome} | Nickname: ${u.nickname} | Matrícula: ${u.matricula}`);
  });

  console.log('============================================');
}

listMasters().catch(console.error);
