import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed no banco do Render...');

  // 1. Criar Turma Alpha
  const turma = await prisma.turma.upsert({
    where: { id: 'turma-alpha-id' },
    update: {},
    create: {
      id: 'turma-alpha-id',
      nome: 'Turma Alpha',
    },
  });
  console.log('Turma Alpha garantida.');

  // 2. Criar Usuário Arquiteto
  // Senha: 00000000000 (CPF)
  const architect = await prisma.user.upsert({
    where: { cpf: '00000000000' },
    update: {
      role: 'ADMIN',
      turmaId: turma.id,
    },
    create: {
      nome: 'Arquiteto do Sistema',
      nickname: 'arquiteto',
      cpf: '00000000000',
      role: 'ADMIN',
      turmaId: turma.id,
    },
  });

  console.log('Usuário Arquiteto garantido no Render!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
