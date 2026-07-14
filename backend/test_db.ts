import { prisma } from './src/prisma';

async function main() {
  const users = await prisma.user.findMany({ where: { role: 'PROFESSOR' } });
  console.log("Professors:");
  for (const u of users) {
    console.log(`- ${u.nome} (ID: ${u.id})`);
    const links = await prisma.turmaDisciplina.findMany({
      where: { professorId: u.id },
      include: { turma: true, disciplina: true }
    });
    for (const l of links) {
      console.log(`   -> Teaches ${l.disciplina.nome} (ID: ${l.disciplina.id}) in Turma ${l.turma.nome} (ID: ${l.turma.id})`);
    }
  }
}

main().then(() => prisma.$disconnect()).catch(e => { console.error(e); prisma.$disconnect(); });
