const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
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
    console.log("Success!", allTurmas.length);
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
