const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function run() {
  const allTurmas = await prisma.turma.findMany({
    where: { instituicao: 'Testeweb' },
    include: {
      turmaDisciplinas: {
        include: { disciplina: true, professor: true }
      },
      users: {
        select: { turno: true }
      }
    }
  });
  console.log('Got', allTurmas.length, 'turmas');
}
run().catch(console.error).finally(() => prisma.$disconnect());
