import { prisma } from '../src/prisma';

async function migrate() {
  console.log('--- INICIANDO MIGRAÇÃO DE INSTITUIÇÕES ---');
  
  // 1. Coleta todas as instituições existentes nas tabelas User, Turma e Disciplina
  const userInsts = await prisma.user.findMany({ select: { instituicao: true }, where: { instituicao: { not: null } } });
  const turmaInsts = await prisma.turma.findMany({ select: { instituicao: true }, where: { instituicao: { not: null } } });
  const discInsts = await prisma.disciplina.findMany({ select: { instituicao: true }, where: { instituicao: { not: null } } });
  
  const allNames = new Set<string>();
  userInsts.forEach(u => u.instituicao && allNames.add(u.instituicao.trim()));
  turmaInsts.forEach(t => t.instituicao && allNames.add(t.instituicao.trim()));
  discInsts.forEach(d => d.instituicao && allNames.add(d.instituicao.trim()));
  
  console.log(`Instituições encontradas para migração:`, Array.from(allNames));
  
  // 2. Cria as instituições no banco e migra os registros em cascata
  for (const name of allNames) {
    if (!name) continue;
    
    // Upsert da instituição
    const inst = await prisma.institution.upsert({
      where: { nome: name },
      update: {},
      create: { nome: name }
    });
    
    console.log(`Instituição forjada: ${name} (ID: ${inst.id})`);
    
    // Atualiza Users
    const uResult = await prisma.user.updateMany({
      where: { instituicao: name },
      data: { institutionId: inst.id }
    });
    console.log(`- Users atualizados para ${name}: ${uResult.count}`);
    
    // Atualiza Turmas
    const tResult = await prisma.turma.updateMany({
      where: { instituicao: name },
      data: { institutionId: inst.id }
    });
    console.log(`- Turmas atualizadas para ${name}: ${tResult.count}`);
    
    // Atualiza Disciplinas
    const dResult = await prisma.disciplina.updateMany({
      where: { instituicao: name },
      data: { institutionId: inst.id }
    });
    console.log(`- Disciplinas atualizadas para ${name}: ${dResult.count}`);
  }
  
  console.log('--- MIGRAÇÃO CONCLUÍDA COM SUCESSO! ---');
}

migrate()
  .catch(e => {
    console.error('Erro na migração:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
