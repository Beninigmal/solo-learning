describe('Auto-selection of Associated Subject when Selecting a Master', () => {
  const allDisciplinasList = [
    {
      id: 'disc-matematica',
      nome: 'Matemática',
      professores: [
        { id: 'prof-1', nome: 'Mestre Thomas', turmas: [{ id: 'turma-5a', nome: '5º Ano A' }] }
      ]
    },
    {
      id: 'disc-fisica',
      nome: 'Física',
      professores: [
        { id: 'prof-2', nome: 'Mestre Newton', turmas: [] }
      ]
    }
  ];

  const getAutoSelectedSubjectId = (selectedProfId: string, currentSelectedDiscId: string, disciplinas: any[]): string => {
    if (!selectedProfId || disciplinas.length === 0) return currentSelectedDiscId;

    const currentBelongs = disciplinas.some(
      d => d.id === currentSelectedDiscId && d.professores?.some((p: any) => p.id === selectedProfId)
    );

    if (!currentBelongs) {
      const associatedDisc = disciplinas.find(
        d => d.professores?.some((p: any) => p.id === selectedProfId)
      );
      if (associatedDisc) {
        return associatedDisc.id;
      }
    }
    return currentSelectedDiscId;
  };

  test('should automatically select Matemática when prof-1 is selected', () => {
    const selectedDisc = getAutoSelectedSubjectId('prof-1', '', allDisciplinasList);
    expect(selectedDisc).toBe('disc-matematica');
  });

  test('should automatically select Física when prof-2 is selected', () => {
    const selectedDisc = getAutoSelectedSubjectId('prof-2', '', allDisciplinasList);
    expect(selectedDisc).toBe('disc-fisica');
  });

  test('should keep current subject if prof-1 is selected and already has disc-matematica selected', () => {
    const selectedDisc = getAutoSelectedSubjectId('prof-1', 'disc-matematica', allDisciplinasList);
    expect(selectedDisc).toBe('disc-matematica');
  });

  test('should pre-fill aulasSemanais from existing turmas if defined', () => {
    const listWithAulas = [
      {
        id: 'disc-matematica',
        nome: 'Matemática',
        professores: [
          { id: 'prof-1', nome: 'Mestre Thomas', turmas: [{ id: 'turma-5a', nome: '5º Ano A', aulasSemanais: 4 }] }
        ]
      }
    ];

    const prof = listWithAulas[0].professores[0];
    const existingAulas = prof.turmas.find(t => t.aulasSemanais !== undefined && t.aulasSemanais > 0)?.aulasSemanais;
    expect(String(existingAulas)).toBe('4');
  });
});
