// Self-contained scratch solver test script to validate Monarch Solve constraints and rules

function getMatrizCurricularDefault(disciplinaNome: string, turmaNome?: string, turmaNivel?: string): { aulas: number; geminada: boolean } {
  const n = disciplinaNome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  let level: "FUNDAMENTAL" | "MEDIO_REGULAR" | "MEDIO_TECNICO" = "FUNDAMENTAL";
  if (turmaNivel) {
    if (turmaNivel === 'MEDIO') level = 'MEDIO_REGULAR';
    else if (turmaNivel === 'MEDIO_TECNICO') level = 'MEDIO_TECNICO';
    else if (turmaNivel === 'FUNDAMENTAL') level = 'FUNDAMENTAL';
  } else if (turmaNome) {
    const cleanTurma = turmaNome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (/tec|tecnico|profes/.test(cleanTurma)) {
      level = "MEDIO_TECNICO";
    } else if (/[56789]/.test(cleanTurma)) {
      level = "FUNDAMENTAL";
    } else if (/[123]/.test(cleanTurma)) {
      level = "MEDIO_REGULAR";
    }
  }

  if (/portugu[eê]s|lingua portuguesa|redacao/.test(n)) {
    return { aulas: (level === "FUNDAMENTAL") ? 5 : 4, geminada: false };
  }
  if (/matematica|calculo/.test(n)) {
    if (level === "FUNDAMENTAL") return { aulas: 5, geminada: false };
    if (level === "MEDIO_REGULAR") return { aulas: 2, geminada: false };
    return { aulas: 3, geminada: false }; 
  }
  if (/historia/.test(n)) {
    return { aulas: (level === "FUNDAMENTAL") ? 3 : 2, geminada: false };
  }
  if (/geografia/.test(n)) {
    return { aulas: (level === "FUNDAMENTAL") ? 3 : 2, geminada: false };
  }
  if (/ciencia|biologia/.test(n)) {
    return { aulas: (level === "FUNDAMENTAL") ? 3 : 2, geminada: false };
  }
  if (/fisica(?!.*educ)/.test(n)) return { aulas: 2, geminada: false };
  if (/quimica/.test(n)) return { aulas: 2, geminada: false };
  if (/ingles|lingua inglesa|lingua estrangeira/.test(n)) return { aulas: 2, geminada: true };
  if (/educacao fisica|ed\.?\s*fisica/.test(n)) return { aulas: 2, geminada: true };
  if (/arte|artes/.test(n)) return { aulas: 1, geminada: false };
  if (/filosofia|sociologia/.test(n)) return { aulas: 1, geminada: false };
  if (/religiao|ensino religioso/.test(n)) return { aulas: 1, geminada: false };

  return { aulas: 0, geminada: false }; 
}

function monarchSolveTurma(params: {
  turmaDisciplinas: any[];
  positions: number[];
  startPos: number;
  intervalAfterSlot: number;
  slotsCount: number;
  shift: string;
  professorRestrictions: any[];
  professorWeeklyCount: Map<string, number>;
  alreadyBusySlots: Set<string>;
  turmaNome: string;
  turmaNivel: string;
  relaxStage: number;
}) {
  const {
    turmaDisciplinas, positions, startPos, intervalAfterSlot,
    slotsCount, shift, professorRestrictions, professorWeeklyCount, alreadyBusySlots,
    turmaNome, turmaNivel, relaxStage
  } = params;

  const days = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA'];
  const totalSlots = days.length * slotsCount;

  const requiredCounts: { [disciplinaId: string]: number } = {};
  const isGeminada: { [disciplinaId: string]: boolean } = {};
  let assignedByMatriz = 0;
  const fallbackTds: any[] = [];

  for (const td of turmaDisciplinas) {
    const matrizDefault = getMatrizCurricularDefault(td.disciplina.nome, turmaNome, turmaNivel);
    const manualAulas = td.aulasSemanais ?? 0;
    const manualGeminada = td.geminada ?? false;

    if (manualAulas > 0) {
      requiredCounts[td.disciplinaId] = manualAulas;
      isGeminada[td.disciplinaId] = manualGeminada || matrizDefault.geminada;
      assignedByMatriz += manualAulas;
    } else if (matrizDefault.aulas > 0) {
      requiredCounts[td.disciplinaId] = matrizDefault.aulas;
      isGeminada[td.disciplinaId] = matrizDefault.geminada;
      assignedByMatriz += matrizDefault.aulas;
    } else {
      fallbackTds.push(td);
      isGeminada[td.disciplinaId] = false;
    }
  }

  const remaining = totalSlots - assignedByMatriz;
  if (fallbackTds.length > 0) {
    const baseCount = Math.max(1, Math.floor(remaining / fallbackTds.length));
    const extra = Math.max(0, remaining - baseCount * fallbackTds.length);
    fallbackTds.forEach((td, i) => {
      requiredCounts[td.disciplinaId] = baseCount + (i < extra ? 1 : 0);
    });
  }

  // Ajuste fino: priorizar disciplinas VIRTUAIS (UNLINKED) para ajuste!
  let totalRequired = Object.values(requiredCounts).reduce((a, b) => a + b, 0);
  if (totalRequired !== totalSlots) {
    let diff = totalSlots - totalRequired;
    
    const sortedKeys = Object.keys(requiredCounts).sort((a, b) => {
      const tdA = turmaDisciplinas.find(x => x.disciplinaId === a);
      const tdB = turmaDisciplinas.find(x => x.disciplinaId === b);
      const isVirtualA = tdA?.professorId === 'UNLINKED' ? 1 : 0;
      const isVirtualB = tdB?.professorId === 'UNLINKED' ? 1 : 0;
      
      if (isVirtualA !== isVirtualB) {
        return isVirtualB - isVirtualA; 
      }
      return requiredCounts[b] - requiredCounts[a];
    });

    if (sortedKeys.length > 0) {
      let i = 0;
      let loopSafety = 0;
      while (diff !== 0 && loopSafety < 1000) {
        loopSafety++;
        const k = sortedKeys[i % sortedKeys.length];
        const td = turmaDisciplinas.find(x => x.disciplinaId === k);
        const isVirtual = td?.professorId === 'UNLINKED';
        
        if (diff > 0) {
          const hasVirtuals = sortedKeys.some(x => turmaDisciplinas.find(y => y.disciplinaId === x)?.professorId === 'UNLINKED');
          if (isVirtual || !hasVirtuals) {
            requiredCounts[k]++;
            diff--;
          }
        } else {
          const hasVirtuals = sortedKeys.some(x => turmaDisciplinas.find(y => y.disciplinaId === x)?.professorId === 'UNLINKED');
          if ((isVirtual || !hasVirtuals) && requiredCounts[k] > 1) {
            requiredCounts[k]--;
            diff++;
          }
        }
        i++;
      }
    }
  }

  const slotsToFill: { day: string; pos: number }[] = [];
  for (const day of days) {
    for (const pos of positions) {
      slotsToFill.push({ day, pos });
    }
  }

  const assignedSlots: { [key: string]: string } = {};
  const assignedCounts: { [disciplinaId: string]: number } = {};
  const professorAssignedCountThisTurma: { [professorId: string]: number } = {};
  turmaDisciplinas.forEach(td => {
    assignedCounts[td.disciplinaId] = 0;
    professorAssignedCountThisTurma[td.professorId] = 0;
  });

  const shuffleArray = (array: any[]) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const MAX_AULAS_SEMANA_DEFAULT = 32;
  let backtrackCount = 0;
  const MAX_BACKTRACK_STEPS = 8000;

  function solve(slotIndex: number): boolean {
    backtrackCount++;
    if (backtrackCount > MAX_BACKTRACK_STEPS) {
      return false;
    }

    if (slotIndex >= slotsToFill.length) return true;

    const { day, pos } = slotsToFill[slotIndex];
    const key = `${day}_${pos}`;

    const prevPos = pos - 1;
    const prevKey = `${day}_${prevPos}`;
    const prevDisciplineId = positions.includes(prevPos) ? assignedSlots[prevKey] : null;

    const lastSlotBeforeInterval = startPos + intervalAfterSlot - 1;
    const crossesInterval = prevPos === lastSlotBeforeInterval;

    let candidates = turmaDisciplinas.filter(td => assignedCounts[td.disciplinaId] < (requiredCounts[td.disciplinaId] ?? 0));

    candidates = candidates.filter(td => {
      const professorId = td.professorId;

      if (professorId === 'UNLINKED') {
        return true;
      }

      if (relaxStage < 3) {
        if (alreadyBusySlots.has(`${day}_${pos}_${professorId}`)) return false;
      }

      if (relaxStage < 1) {
        const hasRestriction = professorRestrictions.some(r => {
          if (r.professorId !== professorId || r.diaSemana !== day || r.shift !== shift) return false;
          if (r.posicao === null || r.posicao === undefined) return true; 
          return r.posicao === pos; 
        });
        if (hasRestriction) return false;
      }

      if (relaxStage < 2) {
        const alreadyCrossCount = professorWeeklyCount.get(professorId) ?? 0;
        const assignedThisTurma = professorAssignedCountThisTurma[professorId] ?? 0;
        const maxAulas = (td.professor?.maxAulasSemanais) ?? MAX_AULAS_SEMANA_DEFAULT;
        if (alreadyCrossCount + assignedThisTurma >= maxAulas) return false;
      }

      return true;
    });

    const maxDailyCount = turmaDisciplinas.length === 1 ? slotsCount
      : turmaDisciplinas.length === 2 ? Math.ceil(slotsCount / 2) + 1
      : 2; 

    candidates = candidates.filter(td => {
      let countToday = 0;
      let hasNonAdjacent = false;
      
      for (const p of positions) {
        if (assignedSlots[`${day}_${p}`] === td.disciplinaId) {
          countToday++;
          if (Math.abs(p - pos) !== 1) {
            hasNonAdjacent = true;
          }
        }
      }
      
      if (countToday >= maxDailyCount) return false;
      if (countToday > 0 && hasNonAdjacent) return false;
      
      return true;
    });

    if (prevDisciplineId) {
      if (crossesInterval) {
        candidates = candidates.filter(c => c.disciplinaId !== prevDisciplineId);
      } else {
        if (isGeminada[prevDisciplineId]) {
          const gemCandidate = candidates.find(c => c.disciplinaId === prevDisciplineId);
          if (gemCandidate) candidates = [gemCandidate];
        } else {
          const geminadaIndex = candidates.findIndex(c => c.disciplinaId === prevDisciplineId);
          if (geminadaIndex > -1) {
            const [geminada] = candidates.splice(geminadaIndex, 1);
            candidates.unshift(geminada);
          }
        }
      }
    }

    if (relaxStage < 1) {
      const dayIndex = days.indexOf(day);
      const hasOnDay = (dIndex: number, discId: string): boolean => {
        if (dIndex < 0 || dIndex >= days.length) return false;
        const targetDay = days[dIndex];
        return positions.some(p => assignedSlots[`${targetDay}_${p}`] === discId);
      };

      candidates = candidates.filter(td => {
        const discId = td.disciplinaId;
        if (
          (hasOnDay(dayIndex - 2, discId) && hasOnDay(dayIndex - 1, discId)) ||
          (hasOnDay(dayIndex - 1, discId) && hasOnDay(dayIndex + 1, discId)) ||
          (hasOnDay(dayIndex + 1, discId) && hasOnDay(dayIndex + 2, discId))
        ) {
          return false;
        }
        return true;
      });
    }

    if (candidates.length === 0) return false;

    shuffleArray(candidates);

    for (const candidate of candidates) {
      const discId = candidate.disciplinaId;
      const profId = candidate.professorId;

      assignedSlots[key] = discId;
      assignedCounts[discId]++;
      professorAssignedCountThisTurma[profId] = (professorAssignedCountThisTurma[profId] ?? 0) + 1;

      if (solve(slotIndex + 1)) return true;

      delete assignedSlots[key];
      assignedCounts[discId]--;
      professorAssignedCountThisTurma[profId]--;
    }

    return false;
  }

  const success = solve(0);
  return { success, assignedSlots, requiredCounts };
}

// -------------------------------------------------------------
// CENÁRIO DE TESTE: 1º Ano do Ensino Médio com 25 slots semanais
// -------------------------------------------------------------
const mockDisciplinas = [
  { id: 'port', nome: 'Português', professorId: 'prof_veneno', aulasSemanais: 4 },
  { id: 'ing', nome: 'Inglês', professorId: 'prof_ingles', aulasSemanais: 2 },
  // Virtuais / Sem mestre
  { id: 'mat', nome: 'Matemática', professorId: 'UNLINKED', aulasSemanais: 0 },
  { id: 'hist', nome: 'História', professorId: 'UNLINKED', aulasSemanais: 0 },
  { id: 'geo', nome: 'Geografia', professorId: 'UNLINKED', aulasSemanais: 0 },
  { id: 'cien', nome: 'Ciências', professorId: 'UNLINKED', aulasSemanais: 0 },
  { id: 'art', nome: 'Arte', professorId: 'UNLINKED', aulasSemanais: 0 },
  { id: 'edf', nome: 'Educação Física', professorId: 'UNLINKED', aulasSemanais: 0 },
  { id: 'fil', nome: 'Filosofia', professorId: 'UNLINKED', aulasSemanais: 0 },
  { id: 'soc', nome: 'Sociologia', professorId: 'UNLINKED', aulasSemanais: 0 },
];

const turmaDisciplinasInput = mockDisciplinas.map(d => ({
  id: `td_${d.id}`,
  turmaId: 'turma_1',
  disciplinaId: d.id,
  professorId: d.professorId,
  aulasSemanais: d.aulasSemanais,
  geminada: false,
  disciplina: { id: d.id, nome: d.nome }
}));

const positions = [1, 2, 3, 4, 5];

console.log('🧪 Iniciando simulação do Monarch Solve...');
const result = monarchSolveTurma({
  turmaDisciplinas: turmaDisciplinasInput,
  positions,
  startPos: 1,
  intervalAfterSlot: 3,
  slotsCount: 5,
  shift: 'MATUTINO',
  professorRestrictions: [],
  professorWeeklyCount: new Map(),
  alreadyBusySlots: new Set(),
  turmaNome: '1º Ano A',
  turmaNivel: 'MEDIO',
  relaxStage: 0
});

console.log('\n📊 RESULTADOS DA SIMULAÇÃO:');
console.log('Sucesso:', result.success);
console.log('Aulas Semanais Calculadas (requiredCounts):');
for (const [discId, count] of Object.entries(result.requiredCounts)) {
  const d = mockDisciplinas.find(x => x.id === discId);
  console.log(`- ${d?.nome} (${discId}): ${count} aulas (Professor: ${d?.professorId})`);
}

if (result.success) {
  console.log('\n📅 Grade de Horários Gerada:');
  const days = ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA'];
  const grid: any = {};
  days.forEach(d => { grid[d] = {}; });
  
  for (const [key, discId] of Object.entries(result.assignedSlots)) {
    const [day, pos] = key.split('_');
    const d = mockDisciplinas.find(x => x.id === discId);
    grid[day][`Slot ${pos}`] = d?.nome;
  }
  console.table(grid);
  
  // Validar se alguma matéria ocorre por 3 dias consecutivos
  console.log('\n🔍 Verificando regras de negócio...');
  let hasConsecutiveDayClash = false;
  mockDisciplinas.forEach(d => {
    const activeDays = days.map(day => positions.some(p => result.assignedSlots[`${day}_${p}`] === d.id));
    for (let i = 0; i < activeDays.length - 2; i++) {
      if (activeDays[i] && activeDays[i+1] && activeDays[i+2]) {
        console.log(`❌ VIOLAÇÃO DETECTADA: ${d.nome} agendada por 3 dias seguidos (${days[i]}, ${days[i+1]}, ${days[i+2]})`);
        hasConsecutiveDayClash = true;
      }
    }
  });
  if (!hasConsecutiveDayClash) {
    console.log('✅ REGRA 3 RESPEITADA: Nenhuma matéria ocorre em 3 dias consecutivos!');
  }
}
