import { prisma } from './prisma';

const mappings = [
  { subjectName: 'Matemática', teacherNickname: 'mestre_matematica' },
  { subjectName: 'Língua Portuguesa', teacherNickname: 'mestre_portugues' },
  { subjectName: 'História', teacherNickname: 'mestre_historia' },
  { subjectName: 'Geografia', teacherNickname: 'mestre_geografia' },
  { subjectName: 'Filosofia', teacherNickname: 'mestre_filosofia' },
  { subjectName: 'Educação Física', teacherNickname: 'mestre_edfisica' },
  { subjectName: 'Ciências', teacherNickname: 'Erika' },
  { subjectName: 'Inglês', teacherNickname: 'Ade' }
];

async function run() {
  console.log("=== INICIANDO LIMPEZA E REDISTRIBUIÇÃO DE VÍNCULOS FUNDAMENTAIS ===");

  // 1. Encontra todas as turmas e filtra em memória
  const allTurmas = await prisma.turma.findMany();
  const turmas = allTurmas.filter(t => !t.nivel || t.nivel === 'FUNDAMENTAL');

  console.log(`Encontradas ${turmas.length} turmas de Ensino Fundamental.`);

  // 2. Remove todos os vínculos existentes destas turmas
  const turmaIds = turmas.map(t => t.id);
  const deleteResult = await prisma.turmaDisciplina.deleteMany({
    where: {
      turmaId: {
        in: turmaIds
      }
    }
  });
  console.log(`Removidos ${deleteResult.count} vínculos antigos.`);

  // 3. Cria os novos vínculos limpos e perfeitamente compatíveis
  let createdCount = 0;
  for (const t of turmas) {
    console.log(`\nProcessando turma: ${t.nome}...`);

    for (const map of mappings) {
      // Encontra a disciplina por aproximação de nome
      const disciplina = await prisma.disciplina.findFirst({
        where: {
          nome: {
            equals: map.subjectName,
            mode: 'insensitive'
          }
        }
      });

      // Encontra o professor pelo nickname ou nome exato
      const professor = await prisma.user.findFirst({
        where: {
          role: 'PROFESSOR',
          OR: [
            { nickname: map.teacherNickname },
            { nome: map.teacherNickname }
          ]
        }
      });

      if (disciplina && professor) {
        // Cria o vínculo
        try {
          await prisma.turmaDisciplina.create({
            data: {
              turmaId: t.id,
              disciplinaId: disciplina.id,
              professorId: professor.id,
              aulasSemanais: 0, // automático
              geminada: false
            }
          });
          console.log(`  [OK] Vínculo criado: ${disciplina.nome} -> ${professor.nome}`);
          createdCount++;
        } catch (e: any) {
          console.log(`  [ERRO] Não foi possível vincular ${disciplina.nome} a ${professor.nome}: ${e.message}`);
        }
      } else {
        console.log(`  [AVISO] Não foi possível mapear "${map.subjectName}" ou "${map.teacherNickname}"`);
      }
    }
  }

  console.log(`\n=== PROCESSAMENTO CONCLUÍDO! Total de novos vínculos criados: ${createdCount} ===`);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
