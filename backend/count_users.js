const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const count = await prisma.user.count({ where: { role: 'ALUNO' } });
  console.log('Alunos no banco:', count);
}
main().finally(() => prisma.$disconnect());
