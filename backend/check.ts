import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const alvus = await prisma.user.findFirst({ where: { role: 'PROFESSOR', nome: { contains: 'Alvus' } } });
  if (!alvus) { console.log('Alvus not found'); return; }
  const vinculos = await prisma.turmaDisciplina.findMany({
    where: { professorId: alvus.id },
    include: { disciplina: true, turma: true }
  });
  console.log(`Found ${vinculos.length} vinculos for Alvus (${alvus.id}):`);
  for (const v of vinculos) {
    console.log(`- ${v.disciplina.nome} in ${v.turma.nome}`);
  }
}
main().finally(() => prisma.$disconnect());
