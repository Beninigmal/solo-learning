import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seeding...');

  // Criar Arquiteto (Admin) padrão
  const admin = await prisma.user.upsert({
    where: { cpf: '00000000000' },
    update: {},
    create: {
      cpf: '00000000000',
      nome: 'Arquiteto do Sistema',
      nickname: 'arquiteto',
      role: 'ADMIN',
    },
  });

  console.log('✅ Arquiteto criado:', admin.nickname);
  
  // Criar uma Turma de exemplo
  const turma = await prisma.turma.upsert({
    where: { nome: 'Turma de Teste' },
    update: {},
    create: {
      nome: 'Turma de Teste',
    },
  });

  console.log('✅ Turma de teste criada:', turma.nome);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
