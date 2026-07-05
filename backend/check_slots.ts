import { prisma } from './src/prisma';
async function main() {
  const turma = await prisma.turma.findFirst({ where: { nome: 'TURMA C' } });
  if (!turma) return;
  const slots = await prisma.timetableSlot.findMany({
    where: { turmaId: turma.id, diaSemana: 'QUINTA' },
    include: { disciplina: true }
  });
  console.log("QUINTA SLOTS FOR TURMA C:");
  slots.forEach(s => {
    console.log(`  Pos: ${s.posicao} | Disc: ${s.disciplina.nome}`);
  });
}
main().catch(console.error).finally(()=>prisma.$disconnect());
