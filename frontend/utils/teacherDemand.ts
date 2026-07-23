/**
 * Utilitário de Cálculo de Dimensionamento e Capacidade de Docentes
 * 
 * Valida a demanda semanal de aulas por matéria em relação ao número de turmas ativas
 * e projeta a quantidade necessária de professores para cobertura total.
 */

export interface SubjectDemandSummary {
  disciplinaId: string;
  disciplinaNome: string;
  totalAulasNecessarias: number;
  aulasAlocadas: number;
  professoresAlocadosCount: number;
  professoresNecessarios: number;
  professoresDeficit: number;
  aulasDeficit: number;
  status: 'OK' | 'ALERTA' | 'DEFICIT';
}

export interface GlobalTeacherDemandSummary {
  totalTurmas: number;
  totalAulasNecessariasGlobal: number;
  totalAulasAlocadasGlobal: number;
  totalProfessoresNecessariosGlobal: number;
  totalProfessoresAlocadosGlobal: number;
  subjectsSummary: SubjectDemandSummary[];
}

export const cleanNormalize = (name: string): string => {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export const getSubjectDefaultHours = (name: string, level?: string): number => {
  const cleanSub = cleanNormalize(name);
  const isMedio = level === 'MEDIO' || level === 'MEDIO_REGULAR' || level === 'MEDIO_TECNICO';

  if (cleanSub.includes("portugues") || cleanSub.includes("lingua portuguesa") || cleanSub.includes("redacao")) {
    return isMedio ? 4 : 5;
  }
  if (cleanSub.includes("matematica") || cleanSub.includes("calculo")) {
    return isMedio ? 3 : 5;
  }
  if (cleanSub.includes("historia") || cleanSub.includes("geografia") || cleanSub.includes("ciencia") || cleanSub.includes("biologia")) {
    return isMedio ? 2 : 3;
  }
  if (cleanSub.includes("fisica") || cleanSub.includes("quimica") || cleanSub.includes("ingles") || cleanSub.includes("ed") || cleanSub.includes("esport")) {
    return 2;
  }
  if (cleanSub.includes("arte") || cleanSub.includes("filosofia") || cleanSub.includes("relig") || cleanSub.includes("sociologia")) {
    return 1;
  }
  return 2;
};

export const DEFAULT_TEACHER_MAX_HOURS = 13; // Padrão Concursado 20h (13 aulas de regência)

export function calculateTeacherDemandSummary(
  turmas: any[] = [],
  allDisciplinasList: any[] = [],
  masters: any[] = []
): GlobalTeacherDemandSummary {
  const totalTurmas = turmas.length;
  let totalAulasNecessariasGlobal = 0;
  let totalAulasAlocadasGlobal = 0;

  const subjectsSummary: SubjectDemandSummary[] = allDisciplinasList.map((disc) => {
    // 1. Calcular Aulas Necessárias para todas as turmas ativas nesta disciplina
    let totalAulasNecessarias = 0;
    turmas.forEach((turma) => {
      // Verifica se há configuração customizada de aulasSemanais na turma
      const customConfig = turma.turmaDisciplinas?.find((td: any) => td.disciplinaId === disc.id || td.disciplina?.id === disc.id);
      if (customConfig && customConfig.aulasSemanais && customConfig.aulasSemanais > 0) {
        totalAulasNecessarias += customConfig.aulasSemanais;
      } else {
        totalAulasNecessarias += getSubjectDefaultHours(disc.nome, turma.nivel);
      }
    });

    // 2. Calcular Aulas Alocadas atualmente a professores vinculados
    let aulasAlocadas = 0;
    const profIdsSet = new Set<string>();

    if (Array.isArray(disc.professores)) {
      disc.professores.forEach((prof: any) => {
        if (prof.id) profIdsSet.add(prof.id);
        if (Array.isArray(prof.turmas)) {
          prof.turmas.forEach((t: any) => {
            if (t.aulasSemanais && t.aulasSemanais > 0) {
              aulasAlocadas += t.aulasSemanais;
            } else {
              // Pega a turma correspondente para verificar o nível
              const matchedTurma = turmas.find((tm) => tm.id === t.id);
              aulasAlocadas += getSubjectDefaultHours(disc.nome, matchedTurma?.nivel);
            }
          });
        }
      });
    }

    const professoresAlocadosCount = profIdsSet.size;

    // 3. Projeção de Professores Necessários (Base 13 aulas/semana por mestre)
    const professoresNecessarios = totalTurmas > 0
      ? Math.max(1, Math.ceil(totalAulasNecessarias / DEFAULT_TEACHER_MAX_HOURS))
      : 0;

    const professoresDeficit = Math.max(0, professoresNecessarios - professoresAlocadosCount);
    const aulasDeficit = Math.max(0, totalAulasNecessarias - aulasAlocadas);

    let status: 'OK' | 'ALERTA' | 'DEFICIT' = 'OK';
    if (totalTurmas > 0) {
      if (aulasAlocadas >= totalAulasNecessarias && totalAulasNecessarias > 0) {
        status = 'OK';
      } else if (aulasAlocadas > 0) {
        status = 'ALERTA';
      } else {
        status = 'DEFICIT';
      }
    }

    totalAulasNecessariasGlobal += totalAulasNecessarias;
    totalAulasAlocadasGlobal += aulasAlocadas;

    return {
      disciplinaId: disc.id,
      disciplinaNome: disc.nome,
      totalAulasNecessarias,
      aulasAlocadas,
      professoresAlocadosCount,
      professoresNecessarios,
      professoresDeficit,
      aulasDeficit,
      status,
    };
  });

  const totalProfessoresNecessariosGlobal = Math.ceil(totalAulasNecessariasGlobal / DEFAULT_TEACHER_MAX_HOURS);
  const totalProfessoresAlocadosGlobal = masters.length;

  return {
    totalTurmas,
    totalAulasNecessariasGlobal,
    totalAulasAlocadasGlobal,
    totalProfessoresNecessariosGlobal,
    totalProfessoresAlocadosGlobal,
    subjectsSummary,
  };
}
