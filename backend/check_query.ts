import { prisma } from './src/prisma';
async function main() {
  const allProfessorRestrictions = await prisma.professorRestriction.findMany({
    where: { professor: { institution: { nome: 'Teste' } } }
  });
  console.log("With institution relation:", allProfessorRestrictions.length);
  const allProfessorRestrictions2 = await prisma.professorRestriction.findMany({
    where: { professor: { instituicao: 'Teste' } }
  });
  console.log("With instituicao string:", allProfessorRestrictions2.length);
}
main().catch(console.error).finally(()=>prisma.$disconnect());
