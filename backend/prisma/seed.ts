import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } 
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando seeding completo (via Adapter)...');

  // 1. Criar Turma Alpha
  const turma = await prisma.turma.upsert({
    where: { nome: 'Turma Alpha' },
    update: {},
    create: { nome: 'Turma Alpha' },
  });

  // 2. Criar Arquiteto (ADMIN)
  await prisma.user.upsert({
    where: { cpf: '00000000000' },
    update: { role: 'ADMIN' },
    create: {
      cpf: '00000000000',
      nome: 'Arquiteto do Sistema',
      nickname: 'arquiteto',
      role: 'ADMIN',
    },
  });

  // 3. Criar Professor (MESTRE)
  await prisma.user.upsert({
    where: { cpf: '22222222222' },
    update: { role: 'PROFESSOR', turmaId: turma.id },
    create: {
      cpf: '22222222222',
      nome: 'Mestre Solen',
      nickname: 'mestre',
      role: 'PROFESSOR',
      turmaId: turma.id
    },
  });

  // 4. Criar Aluno (PLAYER) - Ashes2Ashes
  await prisma.user.upsert({
    where: { cpf: '11111111111' },
    update: { role: 'ALUNO', turmaId: turma.id },
    create: {
      cpf: '11111111111',
      nome: 'Ashes To Ashes',
      nickname: 'Ashes2Ashes',
      role: 'ALUNO',
      turmaId: turma.id,
      xp: 0,
      level: 1
    },
  });

  console.log('✅ Seeding finalizado com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no Seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
