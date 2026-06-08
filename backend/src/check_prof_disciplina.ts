import { prisma } from './prisma';

async function run() {
  const turmas = await prisma.turma.findMany({
    where: { instituicao: 'Desembargador Pedro Ribeiro' },
    include: {
      turmaDisciplinas: {
        include: { disciplina: true, professor: true }
      }
    }
  });

  console.log("=== VÍNCULOS POR TURMA EM DESEMBARGADOR PEDRO RIBEIRO ===");
  turmas.forEach(t => {
    console.log(`\nTurma: ${t.nome} (${t.nivel})`);
    if (t.turmaDisciplinas.length === 0) {
      console.log("  (Nenhum vínculo configurado)");
    } else {
      t.turmaDisciplinas.forEach(td => {
        console.log(`  - ID Vínculo: ${td.id} | Disciplina: ${td.disciplina.nome} | Professor: ${td.professor?.nome || 'NENHUM'} (@${td.professor?.nickname || 'sem-nickname'}) | Aulas: ${td.aulasSemanais}`);
      });
    }
  });

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
