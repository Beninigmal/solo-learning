import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({
    where: { role: 'PROFESSOR' },
    select: { id: true, nome: true, matricula: true, createdAt: true }
  });
  console.log('Professores:', users);
  
  const disciplinas = await prisma.disciplina.findMany();
  console.log('Disciplinas:', disciplinas);
  
  const rel = await prisma.disciplinaProfessor.findMany();
  console.log('Relacionamentos:', rel);
}
main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
