import { calculateTeacherDemandSummary, getSubjectDefaultHours } from '../utils/teacherDemand';

describe('Teacher Demand & Capacity Validation (calculateTeacherDemandSummary)', () => {
  test('should return default hours per subject depending on level correctly', () => {
    expect(getSubjectDefaultHours('Língua Portuguesa', 'FUNDAMENTAL')).toBe(5);
    expect(getSubjectDefaultHours('Língua Portuguesa', 'MEDIO')).toBe(4);
    expect(getSubjectDefaultHours('Matemática', 'FUNDAMENTAL')).toBe(5);
    expect(getSubjectDefaultHours('Matemática', 'MEDIO')).toBe(3);
    expect(getSubjectDefaultHours('Física', 'MEDIO')).toBe(2);
    expect(getSubjectDefaultHours('Arte', 'FUNDAMENTAL')).toBe(1);
  });

  test('should calculate correct teacher projection for 5 turmas with Português (4 aulas/turma)', () => {
    const turmas = [
      { id: 't1', nome: '1º Ano', nivel: 'MEDIO' },
      { id: 't2', nome: '2º Ano', nivel: 'MEDIO' },
      { id: 't3', nome: '3º Ano', nivel: 'MEDIO' },
      { id: 't4', nome: '4º Ano', nivel: 'MEDIO' },
      { id: 't5', nome: '5º Ano', nivel: 'MEDIO' },
    ];

    const allDisciplinasList = [
      {
        id: 'disc-portugues',
        nome: 'Português',
        professores: [
          {
            id: 'prof-1',
            nome: 'Mestre Machado',
            turmas: [
              { id: 't1', nome: '1º Ano', aulasSemanais: 4 },
              { id: 't2', nome: '2º Ano', aulasSemanais: 4 },
              { id: 't3', nome: '3º Ano', aulasSemanais: 4 },
            ]
          }
        ]
      }
    ];

    const masters = [{ id: 'prof-1', nome: 'Mestre Machado' }];

    const summary = calculateTeacherDemandSummary(turmas, allDisciplinasList, masters);

    expect(summary.totalTurmas).toBe(5);

    const portSummary = summary.subjectsSummary.find(s => s.disciplinaId === 'disc-portugues');
    expect(portSummary).toBeDefined();
    // 5 turmas × 4 aulas/semana = 20 aulas/semana
    expect(portSummary?.totalAulasNecessarias).toBe(20);
    // ceil(20 / 13) = 2 professores necessários
    expect(portSummary?.professoresNecessarios).toBe(2);
    // 1 professor alocado com 12 aulas -> 8 aulas em déficit
    expect(portSummary?.professoresAlocadosCount).toBe(1);
    expect(portSummary?.aulasAlocadas).toBe(12);
    expect(portSummary?.status).toBe('ALERTA');
  });

  test('should report status OK when all required classes are covered', () => {
    const turmas = [
      { id: 't1', nome: '1º Ano A', nivel: 'MEDIO' },
      { id: 't2', nome: '1º Ano B', nivel: 'MEDIO' },
    ];

    const allDisciplinasList = [
      {
        id: 'disc-fisica',
        nome: 'Física',
        professores: [
          {
            id: 'prof-1',
            nome: 'Mestre Einstein',
            turmas: [
              { id: 't1', nome: '1º Ano A', aulasSemanais: 2 },
              { id: 't2', nome: '1º Ano B', aulasSemanais: 2 },
            ]
          }
        ]
      }
    ];

    const summary = calculateTeacherDemandSummary(turmas, allDisciplinasList, [{ id: 'prof-1' }]);
    const fisicaSummary = summary.subjectsSummary.find(s => s.disciplinaId === 'disc-fisica');

    expect(fisicaSummary?.totalAulasNecessarias).toBe(4);
    expect(fisicaSummary?.aulasAlocadas).toBe(4);
    expect(fisicaSummary?.status).toBe('OK');
  });

  test('should report DEFICIT when 0 teachers are allocated for active turmas', () => {
    const turmas = [{ id: 't1', nome: '1º Ano', nivel: 'MEDIO' }];
    const allDisciplinasList = [{ id: 'disc-quimica', nome: 'Química', professores: [] }];

    const summary = calculateTeacherDemandSummary(turmas, allDisciplinasList, []);
    const quimicaSummary = summary.subjectsSummary.find(s => s.disciplinaId === 'disc-quimica');

    expect(quimicaSummary?.totalAulasNecessarias).toBe(2);
    expect(quimicaSummary?.professoresAlocadosCount).toBe(0);
    expect(quimicaSummary?.status).toBe('DEFICIT');
  });
});
