const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const turmas = await prisma.turma.findMany();
  console.log("Turmas DB:", turmas.map(t => ({ id: t.id, nome: t.nome, instituicao: t.instituicao })));
}
main().finally(() => prisma.$disconnect());
