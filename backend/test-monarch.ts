import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const turma = await prisma.turma.findFirst({
    where: { nome: { contains: '6º ANO B' } },
    include: {
      turmaDisciplinas: {
        include: { disciplina: true, professor: true }
      },
      users: { select: { turno: true } }
    }
  });

  if (!turma) {
    console.log('Turma 6º ANO B not found');
    return;
  }
  
  console.log('Turma Disciplinas:', turma.turmaDisciplinas.map(td => ({
    disciplina: td.disciplina.nome,
    prof: td.professor?.nome,
    aulas: td.aulasSemanais
  })));

  const restrictions = await prisma.professorRestriction.findMany({
    where: { professorId: { in: turma.turmaDisciplinas.map(t => t.professorId) } }
  });
  console.log('Restrictions:', restrictions);

}
run().catch(console.error).finally(() => prisma.$disconnect());
