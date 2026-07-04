import { prisma } from './src/prisma';
async function main() {
  const turmas = await prisma.turma.findMany({
    where: { nome: { in: ['TURMA A', 'TURMA B', 'TURMA C'] } }
  });
  for (const t of turmas) {
    const slots = await prisma.timetableSlot.findMany({
      where: { turmaId: t.id, diaSemana: 'QUINTA' },
      include: { disciplina: true },
      orderBy: { posicao: 'asc' }
    });
    console.log(`\nTurma: ${t.nome}`);
    slots.forEach(s => console.log(`  Pos: ${s.posicao} | Disc: ${s.disciplina.nome}`));
  }
}
main().catch(console.error).finally(()=>prisma.$disconnect());
