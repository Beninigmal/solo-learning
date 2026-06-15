import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL || '';
const isProd = connectionString.includes('render.com');

const pool = new pg.Pool({ 
  connectionString,
  ...(isProd ? { ssl: { rejectUnauthorized: false } } : {})
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando seeding completo (Novo Schema com Super Admin e Instituições)...');

  const defaultPassword = await bcrypt.hash('Solen@18102010', 10);

  // 1. Criar Super Admin (ADMIN)
  await prisma.user.upsert({
    where: { matricula: 'superadmin' },
    update: { 
      role: 'ADMIN',
      password: defaultPassword,
      isFirstAccess: false
    },
    create: {
      matricula: 'superadmin',
      nome: 'Super Admin do Sistema',
      nickname: 'superadmin',
      password: defaultPassword,
      isFirstAccess: false,
      role: 'ADMIN',
    },
  });

  // 2. Criar Instituição
  const escola = await prisma.institution.upsert({
    where: { nome: 'Escola Solen' },
    update: {},
    create: { nome: 'Escola Solen' },
  });
  console.log('🏫 Instituição Escola Solen garantida.');

  // 3. Criar Arquiteto da Escola (ARQUITETO)
  await prisma.user.upsert({
    where: { matricula: 'admin' },
    update: { 
      role: 'ARQUITETO',
      instituicao: escola.nome,
      institutionId: escola.id,
      password: defaultPassword,
      isFirstAccess: false
    },
    create: {
      matricula: 'admin',
      nome: 'Arquiteto Solen',
      nickname: 'arquiteto',
      password: defaultPassword,
      isFirstAccess: false,
      role: 'ARQUITETO',
      instituicao: escola.nome,
      institutionId: escola.id,
    },
  });
  console.log('🏛️ Arquiteto Escola Solen garantido.');

  // 4. Criar Mestre (PROFESSOR)
  const mestre = await prisma.user.upsert({
    where: { matricula: 'mestre' },
    update: { 
      role: 'PROFESSOR',
      instituicao: escola.nome,
      institutionId: escola.id,
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
      instituicao: escola.nome,
      institutionId: escola.id,
    },
  });

  // 5. Criar Turma Alpha
  const turma = await prisma.turma.upsert({
    where: { id: 'turma-alpha-id' },
    update: { 
      nome: 'TURMA ALPHA',
      ano: '2026',
      instituicao: escola.nome,
      institutionId: escola.id,
    },
    create: { 
      id: 'turma-alpha-id',
      nome: 'TURMA ALPHA',
      ano: '2026',
      instituicao: escola.nome,
      institutionId: escola.id,
    },
  });

  // 6. Criar Disciplina e Vínculo
  const disciplina = await prisma.disciplina.upsert({
    where: { id: 'math-disc-id' },
    update: {
      nome: 'Matemática',
      instituicao: escola.nome,
      institutionId: escola.id,
    },
    create: { 
      id: 'math-disc-id',
      nome: 'Matemática',
      instituicao: escola.nome,
      institutionId: escola.id,
    }
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

  // 7. Criar Aluno (PLAYER) - Ashes2Ashes
  await prisma.user.upsert({
    where: { matricula: 'player01' },
    update: { 
      role: 'ALUNO', 
      turmaId: turma.id,
      instituicao: escola.nome,
      institutionId: escola.id,
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
      instituicao: escola.nome,
      institutionId: escola.id,
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
