import { prisma } from '../src/prisma';

async function diagnose() {
  console.log('🔍 SOLEN QUEST SYSTEM DIAGNOSTIC (RAFAEL) 🔍');
  console.log('============================================');

  // 1. Encontrar o aluno Rafael (matricula 9876)
  const user = await prisma.user.findFirst({
    where: { matricula: '9876' }
  });

  if (!user) {
    console.error('❌ Aluno Rafael (matricula 9876) não encontrado no banco.');
    return;
  }

  console.log(`👤 Aluno Selecionado: ${user.nome} (ID: ${user.id}, Turma ID: ${user.turmaId})`);

  // 2. Listar todas as matérias/disciplinas vinculadas à turma do Rafael
  const turmaDisciplinas = await prisma.turmaDisciplina.findMany({
    where: { turmaId: user.turmaId || '' },
    include: { disciplina: true }
  });

  console.log(`\n📚 Disciplinas Vinculadas à Turma do Rafael (${turmaDisciplinas.length}):`);
  for (const td of turmaDisciplinas) {
    console.log(`   - ID: ${td.disciplina.id} | Nome: ${td.disciplina.nome}`);
  }

  // 3. Listar todas as Entregas (QuestDelivery) para o Rafael
  const deliveries = await prisma.questDelivery.findMany({
    where: { userId: user.id },
    include: { quest: { include: { disciplina: true } } }
  });

  console.log(`\n📦 Total de Entregas (QuestDelivery) para o Rafael: ${deliveries.length}`);
  for (const d of deliveries) {
    console.log(`   - ID: ${d.id}`);
    console.log(`     Quest ID: ${d.questId} | Matéria: ${d.quest.disciplina.nome} | Tema: ${d.quest.tema}`);
    console.log(`     Nível: ${d.quest.nivel} | Ordem: ${d.quest.ordem}`);
    console.log(`     Status: ${d.status} | isCorrect: ${d.isCorrect} | erros: ${d.erros}`);
    console.log(`     scheduledAt: ${d.scheduledAt} | deliveredAt: ${d.deliveredAt} | answeredAt: ${d.answeredAt}`);
    console.log('     ------------------------------------------------');
  }

  // 4. Listar itens no Baú (WrongAnswer) do Rafael
  const chestItems = await prisma.wrongAnswer.findMany({
    where: { userId: user.id },
    include: { quest: { include: { disciplina: true } } }
  });

  console.log(`\n🎒 Itens no Baú (WrongAnswer) do Rafael: ${chestItems.length}`);
  for (const c of chestItems) {
    console.log(`   - ID: ${c.id} | Quest: ${c.quest.enunciado.substring(0, 30)}... | Matéria: ${c.quest.disciplina.nome} | Resolvido: ${c.resolvido} | Tentativas: ${c.tentativas}`);
  }
}

diagnose().catch(console.error);
