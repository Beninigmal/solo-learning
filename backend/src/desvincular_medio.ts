import { prisma } from './prisma';

async function run() {
  console.log("Iniciando limpeza de vínculos de Ensino Médio em turmas de Ensino Fundamental...");
  
  // Encontra todos os vínculos
  const vinculos = await prisma.turmaDisciplina.findMany({
    include: {
      disciplina: true,
      turma: true
    }
  });

  let deletedCount = 0;
  for (const v of vinculos) {
    const isFundamental = !v.turma.nivel || v.turma.nivel === 'FUNDAMENTAL';
    if (isFundamental) {
      const name = v.disciplina.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (name.includes("quimica") || name.includes("fisica")) {
        console.log(`Removendo vínculo: Turma "${v.turma.nome}" (Nível: ${v.turma.nivel || 'FUNDAMENTAL'}) -> Disciplina: "${v.disciplina.nome}"`);
        await prisma.turmaDisciplina.delete({
          where: { id: v.id }
        });
        deletedCount++;
      }
    }
  }

  console.log(`Limpeza concluída! Total de vínculos removidos: ${deletedCount}`);
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
