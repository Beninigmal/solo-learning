import { prisma } from './prisma';

async function run() {
  console.log("=== INICIANDO LIMPEZA DE DUPLICATAS DE DISCIPLINAS ===");

  const discs = await prisma.disciplina.findMany();
  console.log(`Encontradas ${discs.length} disciplinas no banco de dados.`);

  // Agrupar por nome normalizado
  const normalize = (name: string): string => {
    const clean = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    if (/(educacao|educ|ed)\.?\s*fisica|e\.?\s*f\.?|^ef$/i.test(clean)) {
      return "educacao fisica";
    }
    return clean;
  };

  const groups: { [key: string]: typeof discs } = {};
  for (const d of discs) {
    const instKey = d.instituicao ? d.instituicao.toLowerCase().trim() : 'global';
    const key = `${instKey}_${normalize(d.nome)}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(d);
  }

  for (const key of Object.keys(groups)) {
    const list = groups[key];
    if (list.length <= 1) continue;

    console.log(`\n--------------------------------------------------`);
    console.log(`Detectadas duplicatas para a matéria: "${list[0].nome}" (${list.length} registros encontrados)`);

    // O primeiro será a nossa disciplina primária/mestre
    const primary = list[0];
    const duplicates = list.slice(1);

    if (key.endsWith('_educacao fisica')) {
      console.log(`-> Padronizando nome da disciplina principal ID ${primary.id} para "Educação Física"`);
      await prisma.disciplina.update({
        where: { id: primary.id },
        data: { nome: 'Educação Física' }
      });
      primary.nome = 'Educação Física';
    }

    console.log(`-> Mantendo como principal: ID ${primary.id} ("${primary.nome}")`);

    for (const dup of duplicates) {
      console.log(`-> Mesclando ID ${dup.id} ("${dup.nome}") em ID ${primary.id}`);

      // 1. Atualizar Quest
      const questUpdate = await prisma.quest.updateMany({
        where: { disciplinaId: dup.id },
        data: { disciplinaId: primary.id }
      });
      if (questUpdate.count > 0) {
        console.log(`   - Atualizadas ${questUpdate.count} Quests.`);
      }

      // 2. Atualizar TimetableSlot
      const slotUpdate = await prisma.timetableSlot.updateMany({
        where: { disciplinaId: dup.id },
        data: { disciplinaId: primary.id }
      });
      if (slotUpdate.count > 0) {
        console.log(`   - Atualizados ${slotUpdate.count} slots de horário.`);
      }

      // 3. Atualizar DisciplinaProfessor (Relação Professor -> Matéria)
      // Como tem @@id([professorId, disciplinaId]), precisamos evitar duplicados primários
      const dupProfs = await prisma.disciplinaProfessor.findMany({
        where: { disciplinaId: dup.id }
      });

      for (const dp of dupProfs) {
        const existsPrimary = await prisma.disciplinaProfessor.findUnique({
          where: {
            professorId_disciplinaId: {
              professorId: dp.professorId,
              disciplinaId: primary.id
            }
          }
        });
        if (!existsPrimary) {
          await prisma.disciplinaProfessor.create({
            data: {
              professorId: dp.professorId,
              disciplinaId: primary.id,
              temp: dp.temp
            }
          });
        }
      }
      // Deletar associações da duplicata
      await prisma.disciplinaProfessor.deleteMany({
        where: { disciplinaId: dup.id }
      });

      // 4. Atualizar TurmaDisciplina (Vínculo de Turmas)
      // Como tem @@unique([turmaId, disciplinaId]), se já existir na primária, removemos para evitar conflito
      const dupTDs = await prisma.turmaDisciplina.findMany({
        where: { disciplinaId: dup.id }
      });

      for (const td of dupTDs) {
        const existsPrimary = await prisma.turmaDisciplina.findUnique({
          where: {
            turmaId_disciplinaId: {
              turmaId: td.turmaId,
              disciplinaId: primary.id
            }
          }
        });
        if (!existsPrimary) {
          // Mover para a primária
          await prisma.turmaDisciplina.create({
            data: {
              turmaId: td.turmaId,
              professorId: td.professorId,
              disciplinaId: primary.id,
              aulasSemanais: td.aulasSemanais,
              geminada: td.geminada
            }
          });
        } else {
          console.log(`   - Vínculo da turma ID ${td.turmaId} já existia na matéria primária. Mantendo o primário.`);
        }
      }
      // Deletar associações da duplicata
      await prisma.turmaDisciplina.deleteMany({
        where: { disciplinaId: dup.id }
      });

      // 5. Finalmente, deletar a Disciplina duplicada do banco
      await prisma.disciplina.delete({
        where: { id: dup.id }
      });
      console.log(`   - Matéria duplicada ID ${dup.id} removida com sucesso!`);
    }
  }

  console.log("\n=== LIMPEZA DE DUPLICATAS CONCLUÍDA COM SUCESSO! ===");
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
