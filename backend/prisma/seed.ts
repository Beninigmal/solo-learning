import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } 
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando seeding completo (Novo Schema)...');

  const defaultPassword = await bcrypt.hash('Solen2026', 10);

  // 1. Criar Arquiteto (ADMIN)
  await prisma.user.upsert({
    where: { matricula: 'admin' },
    update: { 
      role: 'ADMIN',
      password: defaultPassword,
      isFirstAccess: false
    },
    create: {
      matricula: 'admin',
      nome: 'Arquiteto do Sistema',
      nickname: 'arquiteto',
      password: defaultPassword,
      isFirstAccess: false,
      role: 'ADMIN',
    },
  });

  // 2. Criar Mestre (PROFESSOR)
  const mestre = await prisma.user.upsert({
    where: { matricula: 'mestre' },
    update: { 
      role: 'PROFESSOR',
      password: defaultPassword,
      isFirstAccess: false
    },
    create: {
      matricula: 'mestre',
      nome: 'Mestre Solen',
      nickname: 'mestre',
      password: defaultPassword,
      isFirstAccess: false,
      role: 'PROFESSOR',
    },
  });

  // 3. Criar Turma Alpha
  const turma = await prisma.turma.upsert({
    where: { nome: 'TURMA ALPHA' },
    update: { 
      ano: '2026'
    },
    create: { 
      nome: 'TURMA ALPHA',
      ano: '2026',
    },
  });

  // 3.5 Criar Disciplina e Vínculo
  const disciplina = await prisma.disciplina.upsert({
    where: { nome: 'Matemática' },
    update: {},
    create: { nome: 'Matemática' }
  });

  await prisma.turmaDisciplina.upsert({
    where: {
      turmaId_disciplinaId: {
        turmaId: turma.id,
        disciplinaId: disciplina.id
      }
    },
    update: {
      professorId: mestre.id
    },
    create: {
      turmaId: turma.id,
      disciplinaId: disciplina.id,
      professorId: mestre.id
    }
  });

  // 4. Criar Aluno (PLAYER) - Ashes2Ashes
  await prisma.user.upsert({
    where: { matricula: 'player01' },
    update: { 
      role: 'ALUNO', 
      turmaId: turma.id,
      password: defaultPassword,
      isFirstAccess: true
    },
    create: {
      matricula: 'player01',
      nome: 'Ashes To Ashes',
      nickname: 'Ashes2Ashes',
      password: defaultPassword,
      isFirstAccess: true,
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
