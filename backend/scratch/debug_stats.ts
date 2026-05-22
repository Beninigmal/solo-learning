import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } 
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    console.log("=== DIAGNÓSTICO DO BANCO DE DADOS SOLEN ===");
    
    // 1. Alunos
    const students = await prisma.user.findMany({
      where: { role: 'ALUNO' },
      select: { id: true, nome: true, matricula: true, turmaId: true }
    });
    console.log(`\n[Alunos] Cadastrados: ${students.length}`);
    students.forEach(s => {
      console.log(`- ${s.nome} (@${s.matricula}) | TurmaID: ${s.turmaId || 'SEM TURMA'}`);
    });

    // 2. Turmas
    const turmas = await prisma.turma.findMany({
      select: { id: true, nome: true }
    });
    console.log(`\n[Turmas] Cadastradas: ${turmas.length}`);
    turmas.forEach(t => {
      console.log(`- ${t.nome} (ID: ${t.id})`);
    });

    // 3. Vínculos TurmaDisciplina
    const links = await prisma.turmaDisciplina.findMany({
      include: {
        turma: true,
        disciplina: true,
        professor: true
      }
    });
    console.log(`\n[Vínculos TurmaDisciplina] Ativos: ${links.length}`);
    links.forEach(l => {
      console.log(`- Turma: "${l.turma?.nome}" | Disciplina: "${l.disciplina?.nome}" | Professor: "${l.professor?.nome || 'sem-nome'}"`);
    });

    if (students.length > 0) {
      const targetStudent = students[0];
      console.log(`\n=== TESTANDO CÁLCULO DE STATS PARA: ${targetStudent.nome} ===`);
      
      if (!targetStudent.turmaId) {
        console.log("X Erro: O aluno não possui turmaId.");
      } else {
        const tdList = await prisma.turmaDisciplina.findMany({
          where: { turmaId: targetStudent.turmaId },
          include: { disciplina: true }
        });
        console.log(`Disciplinas vinculadas à turma do aluno (${targetStudent.turmaId}): ${tdList.length}`);
        for (const td of tdList) {
          console.log(`- Disciplina: ${td.disciplina?.nome}`);
        }
      }
    }

  } catch (e: any) {
    console.error('Erro de diagnóstico:', e.message);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
main();
