import { prisma } from './prisma';

function getMatrizCurricularDefault(name: string, turmaNome?: string, turmaNivel?: string) {
  const clean = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  if (turmaNivel === 'FUNDAMENTAL') {
    if (clean.includes('portugues')) return { aulas: 5, geminada: true };
    if (clean.includes('matematica')) return { aulas: 5, geminada: true };
    if (clean.includes('historia')) return { aulas: 3, geminada: false };
    if (clean.includes('geografia')) return { aulas: 3, geminada: false };
    if (clean.includes('ciencia')) return { aulas: 4, geminada: true };
    if (clean.includes('ingles')) return { aulas: 2, geminada: false };
    if (clean.includes('educacao fisica')) return { aulas: 2, geminada: true };
    if (clean.includes('filosofia') || clean.includes('sociologia')) return { aulas: 1, geminada: false };
  } else {
    const isTec = turmaNivel === 'MEDIO_TECNICO';
    if (clean.includes('portugues')) return { aulas: 4, geminada: true };
    if (clean.includes('matematica')) return { aulas: isTec ? 3 : 2, geminada: true };
    if (clean.includes('historia')) return { aulas: 2, geminada: false };
    if (clean.includes('geografia')) return { aulas: 2, geminada: false };
    if (clean.includes('quimica')) return { aulas: 2, geminada: false };
    if (clean.includes('fisica')) return { aulas: 2, geminada: false };
    if (clean.includes('biologia')) return { aulas: 2, geminada: false };
    if (clean.includes('ingles')) return { aulas: 2, geminada: false };
    if (clean.includes('educacao fisica')) return { aulas: 2, geminada: true };
    if (clean.includes('filosofia') || clean.includes('sociologia')) return { aulas: 1, geminada: false };
  }
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
  turmaNome?: string;
  turmaNivel?: string;
  relaxStage?: number;
}): { [key: string]: string } | null {
  const {
    turmaDisciplinas, positions, startPos, intervalAfterSlot,
    slotsCount, shift, professorRestrictions, professorWeeklyCount, alreadyBusySlots,
    turmaNome, turmaNivel, relaxStage = 0
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

  let totalRequired = Object.values(requiredCounts).reduce((a, b) => a + b, 0);
  if (totalRequired !== totalSlots) {
    let diff = totalSlots - totalRequired;
    const sortedKeys = Object.keys(requiredCounts).sort((a, b) => requiredCounts[b] - requiredCounts[a]);
    if (sortedKeys.length > 0) {
      let i = 0;
      while (diff !== 0) {
        const k = sortedKeys[i % sortedKeys.length];
        if (diff > 0) {
          requiredCounts[k]++;
          diff--;
        } else {
          if (requiredCounts[k] > 1) {
            requiredCounts[k]--;
            diff++;
          } else {
            let allOne = true;
            for (const key of sortedKeys) {
              if (requiredCounts[key] > 1) allOne = false;
            }
            if (allOne) break;
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

  function solve(slotIndex: number): boolean {
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
      
      // 1. Verificar choque físico com outras turmas
      if (relaxStage < 3) {
        if (alreadyBusySlots.has(`${day}_${pos}_${professorId}`)) return false;
      }

      // 2. Verificar restrição manual de agenda
      if (relaxStage < 1) {
        const hasRestriction = professorRestrictions.some(r => {
          if (r.professorId !== professorId || r.diaSemana !== day || r.shift !== shift) return false;
          if (r.posicao === null || r.posicao === undefined) return true;
          return r.posicao === pos;
        });
        if (hasRestriction) return false;
      }

      // 3. Verificar carga semanal cross-turma
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
      : 3;
    candidates = candidates.filter(td => {
      let countToday = 0;
      for (const p of positions) {
        if (assignedSlots[`${day}_${p}`] === td.disciplinaId) countToday++;
      }
      return countToday < maxDailyCount;
    });

    if (candidates.length === 0) return false;

    // Remove random factor to see why it fails deterministically first
    // shuffleArray(candidates);

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
  return success ? assignedSlots : null;
}

async function run() {
  console.log("=== DIAGNÓSTICO DO BATCH GENERATE EXCLUSIVO ===");
  const shift = 'MATUTINO';
  
  const eligibleTurmas = await prisma.turma.findMany({
    where: { instituicao: 'Desembargador Pedro Ribeiro' },
    include: {
      turmaDisciplinas: {
        include: { disciplina: true, professor: true }
      }
    }
  });

  console.log(`Turmas elegíveis para Desembargador Pedro Ribeiro: ${eligibleTurmas.length}`);
  
  const slotsCount = 5;
  const intervalAfterSlot = 3;
  const startPos = 1;
  const positions = [1, 2, 3, 4, 5];

  eligibleTurmas.sort((a, b) => b.turmaDisciplinas.length - a.turmaDisciplinas.length);

  const allProfessorRestrictions = await prisma.professorRestriction.findMany({
    where: { professor: { instituicao: 'Desembargador Pedro Ribeiro' } }
  });
  console.log(`Restrições encontradas: ${allProfessorRestrictions.length}`);
  allProfessorRestrictions.forEach(r => {
    console.log(`  - Professor ID: ${r.professorId} | Dia: ${r.diaSemana} | Slot: ${r.posicao}`);
  });

  const professorWeeklyCount = new Map<string, number>();
  const globalBusySlots = new Set<string>();

  for (const turma of eligibleTurmas) {
    if (turma.nivel === 'MEDIO') continue; // foca nas fundamental primeiro

    const turmaDisciplinas = turma.turmaDisciplinas;
    const turmaRestrictions = allProfessorRestrictions.filter(r =>
      turmaDisciplinas.some(td => td.professorId === r.professorId)
    );

    console.log(`\nTentando gerar grade para turma: ${turma.nome} (${turma.nivel}) com ${turmaDisciplinas.length} disciplinas...`);
    
    let assignedSlots = monarchSolveTurma({
      turmaDisciplinas,
      positions,
      startPos,
      intervalAfterSlot,
      slotsCount,
      shift,
      professorRestrictions: turmaRestrictions,
      professorWeeklyCount,
      alreadyBusySlots: globalBusySlots,
      turmaNome: turma.nome,
      turmaNivel: turma.nivel,
      relaxStage: 0
    });
    let stageSucceeded = 0;

    if (!assignedSlots) {
      stageSucceeded = 1;
      assignedSlots = monarchSolveTurma({
        turmaDisciplinas,
        positions,
        startPos,
        intervalAfterSlot,
        slotsCount,
        shift,
        professorRestrictions: turmaRestrictions,
        professorWeeklyCount,
        alreadyBusySlots: globalBusySlots,
        turmaNome: turma.nome,
        turmaNivel: turma.nivel,
        relaxStage: 1
      });
    }

    if (!assignedSlots) {
      stageSucceeded = 2;
      assignedSlots = monarchSolveTurma({
        turmaDisciplinas,
        positions,
        startPos,
        intervalAfterSlot,
        slotsCount,
        shift,
        professorRestrictions: turmaRestrictions,
        professorWeeklyCount,
        alreadyBusySlots: globalBusySlots,
        turmaNome: turma.nome,
        turmaNivel: turma.nivel,
        relaxStage: 2
      });
    }

    if (!assignedSlots) {
      stageSucceeded = 3;
      assignedSlots = monarchSolveTurma({
        turmaDisciplinas,
        positions,
        startPos,
        intervalAfterSlot,
        slotsCount,
        shift,
        professorRestrictions: turmaRestrictions,
        professorWeeklyCount,
        alreadyBusySlots: globalBusySlots,
        turmaNome: turma.nome,
        turmaNivel: turma.nivel,
        relaxStage: 3
      });
    }

    if (!assignedSlots) {
      console.error(`❌ FALHA na geração da turma: ${turma.nome}!`);
      // Diagnóstico detalhado de conflitos
      console.log(`\nDiagnóstico de recursos para a turma ${turma.nome}:`);
      
      let totalAulasMatriz = 0;
      for (const td of turmaDisciplinas) {
        const d = getMatrizCurricularDefault(td.disciplina.nome, turma.nome, turma.nivel);
        totalAulasMatriz += td.aulasSemanais || d.aulas;
      }
      console.log(`  - Total de aulas requeridas: ${totalAulasMatriz} (Máximo do turno: ${positions.length * 5} aulas)`);

      for (const td of turmaDisciplinas) {
        const profId = td.professorId;
        const curWeekly = professorWeeklyCount.get(profId) ?? 0;
        const d = getMatrizCurricularDefault(td.disciplina.nome, turma.nome, turma.nivel);
        const proposed = td.aulasSemanais || d.aulas;
        const limit = td.professor.maxAulasSemanais || 32;
        if (curWeekly + proposed > limit) {
          console.warn(`  [🚨 SOBRECARGA] Mestre ${td.professor.nome} está com ${curWeekly} aulas ocupadas e precisa de mais ${proposed} aulas nesta turma, ultrapassando seu limite de ${limit} aulas semanais!`);
        }
      }
      continue;
    }

    // Se deu certo, atualiza acumuladores
    for (const day of ['SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA']) {
      for (const pos of positions) {
        const discId = assignedSlots[`${day}_${pos}`];
        const td = turmaDisciplinas.find(x => x.disciplinaId === discId);
        if (td) {
          const profId = td.professorId;
          globalBusySlots.add(`${day}_${pos}_${profId}`);
          professorWeeklyCount.set(profId, (professorWeeklyCount.get(profId) ?? 0) + 1);
        }
      }
    }
    let statusText = 'OK';
    if (stageSucceeded === 1) statusText = 'OK (Restrições de agenda ignoradas)';
    else if (stageSucceeded === 2) statusText = 'OK (Carga horária semanal ignorada)';
    else if (stageSucceeded === 3) statusText = 'OK (Gerada com conflitos físicos)';

    console.log(`✅ Sucesso na turma: ${turma.nome} -> Status: ${statusText}`);
  }

  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
