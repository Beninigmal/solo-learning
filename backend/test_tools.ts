import { prisma } from './src/prisma';

async function run() {
  console.log('Testing getClasses...');
  const turmas = await prisma.turma.findMany({ where: { instituicao: 'UCS' } });
  console.log('Turmas:', turmas.map(t => ({ id: t.id, nome: t.nome })));

  if (turmas.length > 0) {
    const turmaId = turmas[0].id;
    console.log(`\nTesting getTimetable for ${turmaId}...`);
    const slots = await prisma.timetableSlot.findMany({ where: { turmaId }, include: { disciplina: true } });
    console.log('Slots:', slots.length);
  }
}

run().catch(console.error).finally(() => prisma.$disconnect());
