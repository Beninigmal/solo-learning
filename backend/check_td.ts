import { prisma } from './src/prisma';
async function main() {
  const turmas = await prisma.turma.findMany({
    where: { instituicao: 'Teste' },
    include: { turmaDisciplinas: { include: { professor: true, disciplina: true } } }
  });
  turmas.forEach(t => {
    console.log(`Turma: ${t.nome}`);
    t.turmaDisciplinas.forEach(td => {
      console.log(`  - Disc: ${td.disciplina.nome} | Prof: ${td.professor.nome} (${td.professorId})`);
    });
  });
}
main().catch(console.error).finally(()=>prisma.$disconnect());
