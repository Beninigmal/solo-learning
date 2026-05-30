import { prisma } from './prisma';

async function run() {
  const professors = await prisma.user.findMany({
    where: { role: 'PROFESSOR' }
  });
  console.log("=== PROFESSORES ===");
  professors.forEach(p => console.log(`ID: ${p.id} | Nome: ${p.nome} | Nickname: ${p.nickname}`));

  const disciplinas = await prisma.disciplina.findMany();
  console.log("\n=== DISCIPLINAS ===");
  disciplinas.forEach(d => console.log(`ID: ${d.id} | Nome: ${d.nome}`));

  const turmas = await prisma.turma.findMany();
  console.log("\n=== TURMAS ===");
  turmas.forEach(t => console.log(`ID: ${t.id} | Nome: ${t.nome} | Nivel: ${t.nivel}`));

  const activeLinks = await prisma.turmaDisciplina.findMany({
    include: {
      turma: true,
      professor: true,
      disciplina: true
    }
  });
  console.log("\n=== VINCULOS ATIVOS ===");
  activeLinks.forEach(al => {
    console.log(`Turma: ${al.turma.nome} (${al.turma.nivel}) -> Professor: ${al.professor.nome} -> Disciplina: ${al.disciplina.nome}`);
  });

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
