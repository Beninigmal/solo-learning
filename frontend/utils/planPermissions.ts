export type InstitutionPlan = 'TRIAL' | 'RANK_B' | 'RANK_A' | 'RANK_S' | string;

export function getAvailableAdminTabs(plano?: InstitutionPlan): string[] {
  const allTabs = [
    'RECRUTAR',
    'TURMAS',
    'MATÉRIAS',
    'ARQUITETO',
    'GRADE',
    'MATRIZ',
    'RELATÓRIOS',
    'ORDINATOR',
    'LOGS',
  ];

  const plan = plano ? String(plano).toUpperCase().trim() : 'TRIAL';

  if (plan === 'RANK_B') {
    // Rank B: Gamificação pura + Relatórios de acompanhamento. Sem Grade (Monarch Engine) e sem Ordinator.
    return allTabs.filter((t) => t !== 'GRADE' && t !== 'ORDINATOR');
  }

  if (plan === 'RANK_A' || plan === 'TRIAL') {
    // Rank A e Trial: Gamificação + Grade + Relatórios. Sem Ordinator.
    return allTabs.filter((t) => t !== 'ORDINATOR');
  }

  if (plan === 'RANK_S') {
    // Rank S: Todos os recursos + Ordinator.
    return allTabs;
  }

  // Default fallback
  return allTabs.filter((t) => t !== 'ORDINATOR');
}
