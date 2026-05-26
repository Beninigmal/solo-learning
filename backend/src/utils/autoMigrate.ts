import { prisma } from '../prisma';

export async function autoMigrateInstitutions() {
  console.log('[AUTO-MIGRATE] Verificando integridade de dados de multi-tenant...');
  try {
    // 1. Coleta todas as strings de instituições que não estão associadas a um ID de relação
    const unmigratedUsers = await prisma.user.findMany({
      where: { instituicao: { not: null }, institutionId: null },
      select: { instituicao: true }
    });

    const unmigratedTurmas = await prisma.turma.findMany({
      where: { instituicao: { not: null }, institutionId: null },
      select: { instituicao: true }
    });

    const unmigratedDisciplinas = await prisma.disciplina.findMany({
      where: { instituicao: { not: null }, institutionId: null },
      select: { instituicao: true }
    });

    const allNames = new Set<string>();
    unmigratedUsers.forEach(u => u.instituicao && allNames.add(u.instituicao.trim()));
    unmigratedTurmas.forEach(t => t.instituicao && allNames.add(t.instituicao.trim()));
    unmigratedDisciplinas.forEach(d => d.instituicao && allNames.add(d.instituicao.trim()));

    if (allNames.size === 0) {
      console.log('[AUTO-MIGRATE] Todos os registros estão devidamente vinculados e isolados.');
      return;
    }

    console.log(`[AUTO-MIGRATE] Encontrados registros sem ID para as seguintes instituições:`, Array.from(allNames));

    for (const name of allNames) {
      if (!name) continue;

      // Upsert do registro da instituição relacional
      const inst = await prisma.institution.upsert({
        where: { nome: name },
        update: {},
        create: { nome: name }
      });

      console.log(`[AUTO-MIGRATE] Instituição ativa: ${name} (ID: ${inst.id})`);

      // Atualiza os registros órfãos que possuíam apenas o texto da instituição
      const uResult = await prisma.user.updateMany({
        where: { instituicao: name, institutionId: null },
        data: { institutionId: inst.id }
      });
      if (uResult.count > 0) {
        console.log(`[AUTO-MIGRATE] - Vinculados ${uResult.count} caçadores à instituição ${name}`);
      }

      const tResult = await prisma.turma.updateMany({
        where: { instituicao: name, institutionId: null },
        data: { institutionId: inst.id }
      });
      if (tResult.count > 0) {
        console.log(`[AUTO-MIGRATE] - Vinculadas ${tResult.count} turmas/guildas à instituição ${name}`);
      }

      const dResult = await prisma.disciplina.updateMany({
        where: { instituicao: name, institutionId: null },
        data: { institutionId: inst.id }
      });
      if (dResult.count > 0) {
        console.log(`[AUTO-MIGRATE] - Vinculadas ${dResult.count} matérias/disciplinas à instituição ${name}`);
      }
    }
    console.log('[AUTO-MIGRATE] Processo de auto-migração executado com sucesso.');
  } catch (error) {
    console.error('[AUTO-MIGRATE] Falha ao rodar auto-migração relacional de instituições:', error);
  }
}
