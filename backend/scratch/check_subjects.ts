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

async function run() {
  console.log("=== COMPREHENSIVE SEARCH FOR PORTUGUÊS / MISSÕES ===");
  
  const subjects = await prisma.disciplina.findMany({
    where: {
      OR: [
        { nome: { contains: "port", mode: "insensitive" } },
        { nome: { contains: "miss", mode: "insensitive" } }
      ]
    },
    include: {
      professores: {
        include: { professor: true }
      },
      turmaDisciplinas: {
        include: { turma: true }
      }
    }
  });

  for (const s of subjects) {
    console.log(`\nDisciplina: "${s.nome}" (${s.id})`);
    console.log(`- Instituicao: ${s.instituicao} | InstitutionId: ${s.institutionId}`);
    console.log(`- Professores Vinculados (${s.professores.length}):`);
    for (const p of s.professores) {
      console.log(`  * ${p.professor.nome} (${p.professor.id}) | Inst: ${p.professor.instituicao}`);
    }
    console.log(`- Turmas Vinculadas (${s.turmaDisciplinas.length}):`);
    for (const td of s.turmaDisciplinas) {
      console.log(`  * Turma: ${td.turma.nome} (${td.turma.id}) | Inst: ${td.turma.instituicao}`);
    }
  }

  await prisma.$disconnect();
  await pool.end();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
