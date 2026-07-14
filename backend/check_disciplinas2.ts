import { prisma } from './src/prisma.js';

async function main() {
  const alvus = await prisma.user.findFirst({ where: { role: 'PROFESSOR', nome: { contains: 'Alvo' } } });
  if (!alvus) return console.log('Alvus not found');
  console.log('Alvus ID:', alvus.id);
  const vinculos = await prisma.turmaDisciplina.findMany({
    where: { professorId: alvus.id },
    include: { disciplina: true }
  });
  console.log('Vinculos:', JSON.stringify(vinculos, null, 2));
  const disciplinas = Array.from(new Map(vinculos.map(v => [v.disciplina.id, v.disciplina])).values());
  console.log('Disciplinas:', JSON.stringify(disciplinas, null, 2));
}
main().finally(() => prisma.$disconnect());
