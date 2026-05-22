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

async function getStatsForUser(userId: string) {
  const student = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, nome: true, turmaId: true }
  });

  if (!student || !student.turmaId) {
    return { name: student?.nome || 'Unknown', stats: [] };
  }

  const turmaDisciplinas = await prisma.turmaDisciplina.findMany({
    where: { turmaId: student.turmaId },
    include: { disciplina: true }
  });

  const stats = [];

  for (const td of turmaDisciplinas) {
    const disciplina = td.disciplina;

    const acertos = await prisma.questDelivery.count({
      where: {
        userId,
        isCorrect: true,
        quest: {
          disciplinaId: disciplina.id,
          nivel: { notIn: ['BOSS', 'MINIBOSS'] }
        }
      }
    });

    const falhas = await prisma.questDelivery.count({
      where: {
        userId,
        quest: {
          disciplinaId: disciplina.id,
          nivel: { notIn: ['BOSS', 'MINIBOSS'] }
        },
        OR: [
          { erros: { gt: 0 } },
          { isCorrect: false }
        ]
      }
    });

    const totalQuestsInClass = await prisma.quest.count({
      where: {
        turmaAlvoId: student.turmaId,
        disciplinaId: disciplina.id,
        nivel: { notIn: ['BOSS', 'MINIBOSS'] }
      }
    });

    const totalDeliveredQuests = await prisma.questDelivery.count({
      where: {
        userId,
        quest: {
          disciplinaId: disciplina.id,
          nivel: { notIn: ['BOSS', 'MINIBOSS'] }
        },
        status: { in: ['DELIVERED', 'WAITING', 'COMPLETED', 'EXPIRED'] }
      }
    });

    const disponiveis = Math.max(totalQuestsInClass - totalDeliveredQuests, 0);

    stats.push({
      disciplinaId: disciplina.id,
      nome: disciplina.nome,
      acertos,
      falhas,
      disponiveis
    });
  }

  return { name: student.nome, stats };
}

async function main() {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'ALUNO' }
    });

    console.log(`Testando ${users.length} alunos...`);
    for (const u of users) {
      const res = await getStatsForUser(u.id);
      console.log(`\nAluno: ${res.name} (ID: ${u.id})`);
      console.log(`Stats calculadas:`, JSON.stringify(res.stats, null, 2));
    }
  } catch (e: any) {
    console.error('Erro:', e);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
main();
