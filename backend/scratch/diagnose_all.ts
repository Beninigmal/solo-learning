import { prisma } from '../src/prisma';

async function diagnoseAll() {
  console.log('🔍 SOLEN DIAGNOSTIC - ALL CLASS 7A STUDENTS 🔍');
  console.log('=============================================');

  // Encontrar a Turma 7A
  const turma = await prisma.turma.findFirst({
    where: { nome: { contains: '7' } }
  });

  if (!turma) {
    console.error('❌ Turma 7A não encontrada.');
    return;
  }

  console.log(`Turma: ${turma.nome} (ID: ${turma.id})`);

  // Buscar todos os alunos da turma
  const students = await prisma.user.findMany({
    where: { turmaId: turma.id, role: 'ALUNO' }
  });

  for (const s of students) {
    console.log(`\n---------------------------------------------`);
    console.log(`👤 ALUNO: ${s.nome} (Matrícula: ${s.matricula}, ID: ${s.id})`);

    // Calcular estatísticas equivalentes a /subject-stats para este aluno
    const turmaDisciplinas = await prisma.turmaDisciplina.findMany({
      where: { turmaId: turma.id },
      include: { disciplina: true }
    });

    for (const td of turmaDisciplinas) {
      const disc = td.disciplina;
      
      const acertos = await prisma.questDelivery.count({
        where: { userId: s.id, isCorrect: true, quest: { disciplinaId: disc.id, nivel: { notIn: ['BOSS', 'MINIBOSS'] } } }
      });

      const totalQuestsInClass = await prisma.quest.count({
        where: { turmaAlvoId: turma.id, disciplinaId: disc.id, nivel: { notIn: ['BOSS', 'MINIBOSS'] } }
      });

      const totalDelivered = await prisma.questDelivery.count({
        where: { userId: s.id, quest: { disciplinaId: disc.id, nivel: { notIn: ['BOSS', 'MINIBOSS'] } }, status: { in: ['DELIVERED', 'WAITING', 'COMPLETED', 'EXPIRED'] } }
      });

      const disponiveis = Math.max(totalQuestsInClass - totalDelivered, 0);

      console.log(`   📚 Matéria: ${disc.nome}`);
      console.log(`      Acertos: ${acertos} | Disponíveis: ${disponiveis} | Total no Banco: ${totalQuestsInClass} | Total Entregues: ${totalDelivered}`);

      // Listar entregas desta disciplina
      const delivs = await prisma.questDelivery.findMany({
        where: { userId: s.id, quest: { disciplinaId: disc.id } },
        include: { quest: true }
      });

      for (const d of delivs) {
        console.log(`      └─ Quest ID: ${d.questId.substring(0, 8)} | Ordem: ${d.quest.ordem} | Status: ${d.status} | isCorrect: ${d.isCorrect}`);
      }
    }
  }
}

diagnoseAll().catch(console.error);
