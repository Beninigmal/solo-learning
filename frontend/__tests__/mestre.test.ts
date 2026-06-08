describe('Mestre Screen Unit Tests', () => {

  describe('Shift Normalization (Recrutamento em Lote)', () => {
    
    // Simulate shift normalization logic in handleBatchRecrutarExcel
    const normalizeTurno = (inputTurno: string, defaultTurno: string = 'MATUTINO') => {
      const normalizedTurno = String(inputTurno || defaultTurno)
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

      if (normalizedTurno.includes('VESPERTINO') || normalizedTurno.includes('TARDE')) {
        return 'VESPERTINO';
      } else if (normalizedTurno.includes('NOTURNO') || normalizedTurno.includes('NOITE')) {
        return 'NOTURNO';
      }
      return 'MATUTINO';
    };

    test('should normalize various strings to VESPERTINO', () => {
      expect(normalizeTurno('vespertino')).toBe('VESPERTINO');
      expect(normalizeTurno('tarde')).toBe('VESPERTINO');
      expect(normalizeTurno('TARDE')).toBe('VESPERTINO');
      expect(normalizeTurno('Vespertino')).toBe('VESPERTINO');
    });

    test('should normalize various strings to NOTURNO', () => {
      expect(normalizeTurno('noturno')).toBe('NOTURNO');
      expect(normalizeTurno('noite')).toBe('NOTURNO');
      expect(normalizeTurno('NOITE')).toBe('NOTURNO');
      expect(normalizeTurno('Noturno')).toBe('NOTURNO');
    });

    test('should fallback to MATUTINO for other inputs or defaults', () => {
      expect(normalizeTurno('manha')).toBe('MATUTINO');
      expect(normalizeTurno('MATUTINO')).toBe('MATUTINO');
      expect(normalizeTurno('')).toBe('MATUTINO');
    });

  });

  describe('Batch Recruitment and Class Name Matching', () => {

    const simulateExcelImport = (
      excelRows: any[],
      turmas: any[],
      recrutTurmaId: string,
      defaultTurno: string
    ) => {
      const studentsList: { nome: string; matricula: string; turno: string; targetTurmaId?: string }[] = [];
      const localValidationErrors: string[] = [];

      for (const row of excelRows) {
        const nomeVal = row.nome || '';
        const matriculaVal = row.matricula || '';
        if (!nomeVal || !matriculaVal) continue;

        let targetTurmaId = recrutTurmaId;
        if (row.turma) {
          const turmaNomeCSV = String(row.turma).trim();
          if (turmaNomeCSV) {
            const foundTurma = turmas.find((t) => t.nome.toUpperCase() === turmaNomeCSV.toUpperCase());
            if (foundTurma) {
              targetTurmaId = foundTurma.id;
            } else {
              localValidationErrors.push(
                `• Aluno "${nomeVal}": A guilda/turma "${turmaNomeCSV}" não existe nesta instituição.`
              );
            }
          }
        }

        studentsList.push({
          nome: String(nomeVal),
          matricula: String(matriculaVal),
          turno: defaultTurno,
          targetTurmaId: targetTurmaId,
        });
      }

      return { studentsList, localValidationErrors };
    };

    const mockTurmas = [
      { id: 't1', nome: '1º Ano A' },
      { id: 't2', nome: '2º Ano B' },
      { id: 't3', nome: '9º Ano C' },
    ];

    test('should import students successfully and match existing turmas by case-insensitive name', () => {
      const excelRows = [
        { nome: 'Alucard', matricula: 'M001', turma: '1º Ano A' },
        { nome: 'Sung Jinwoo', matricula: 'M002', turma: '2º ano b' },
      ];

      const result = simulateExcelImport(excelRows, mockTurmas, 't1', 'MATUTINO');

      expect(result.localValidationErrors.length).toBe(0);
      expect(result.studentsList.length).toBe(2);
      expect(result.studentsList[0].targetTurmaId).toBe('t1');
      expect(result.studentsList[1].targetTurmaId).toBe('t2');
    });

    test('should trigger error validation if turma mentioned in sheet does not exist in institution', () => {
      const excelRows = [
        { nome: 'Cha Hae-in', matricula: 'M003', turma: '7º Ano Inexistente' },
      ];

      const result = simulateExcelImport(excelRows, mockTurmas, 't1', 'MATUTINO');

      expect(result.localValidationErrors.length).toBe(1);
      expect(result.localValidationErrors[0]).toContain('não existe nesta instituição');
    });

  });

  describe('Radar of Turmas (Academic Danger Alert Rules)', () => {

    // Danger Alert thresholds: student is at danger if XP < 600
    const evaluateStudentRisk = (studentXp: number) => {
      return studentXp < 600 ? 'RISCO_PROVA_FISICA' : 'SEGURO';
    };

    test('should flag students with XP below 600 as at risk of physical exam', () => {
      expect(evaluateStudentRisk(0)).toBe('RISCO_PROVA_FISICA');
      expect(evaluateStudentRisk(350)).toBe('RISCO_PROVA_FISICA');
      expect(evaluateStudentRisk(599)).toBe('RISCO_PROVA_FISICA');
    });

    test('should mark students with XP equal or higher than 600 as safe', () => {
      expect(evaluateStudentRisk(600)).toBe('SEGURO');
      expect(evaluateStudentRisk(1200)).toBe('SEGURO');
      expect(evaluateStudentRisk(5000)).toBe('SEGURO');
    });

  });

  describe('LDB/MEC Monarch Engine School Level Heuristics', () => {

    // Monarch level deduction heuristics from REGRAS_MEC.md
    const deductSchoolLevel = (turmaNome: string) => {
      const normalized = turmaNome.toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
      
      // Technical school checks
      if (
        normalized.includes('tec') || 
        normalized.includes('tecnico') || 
        normalized.includes('profissionalizante') || 
        normalized.includes('profes')
      ) {
        return 'MEDIO_TECNICO';
      }

      // Fundamental II school checks: 5 to 9 digits
      const fundamentalMatch = normalized.match(/[5-9]/);
      if (fundamentalMatch) {
        return 'ENSINO_FUNDAMENTAL';
      }

      // Regular high school checks: 1 to 3 digits
      const medioMatch = normalized.match(/[1-3]/);
      if (medioMatch) {
        return 'ENSINO_MEDIO_REGULAR';
      }

      return 'OUTROS';
    };

    test('should detect Ensino Fundamental II turmas containing 5-9 digits', () => {
      expect(deductSchoolLevel('6A')).toBe('ENSINO_FUNDAMENTAL');
      expect(deductSchoolLevel('9º Ano C')).toBe('ENSINO_FUNDAMENTAL');
      expect(deductSchoolLevel('Turma 8B')).toBe('ENSINO_FUNDAMENTAL');
    });

    test('should detect Ensino Médio Técnico containing professional keywords', () => {
      expect(deductSchoolLevel('1º Técnico Info')).toBe('MEDIO_TECNICO');
      expect(deductSchoolLevel('2º Ano Tec Mecatrônica')).toBe('MEDIO_TECNICO');
      expect(deductSchoolLevel('Turma Profissionalizante')).toBe('MEDIO_TECNICO');
    });

    test('should detect Ensino Médio Regular containing 1-3 digits', () => {
      expect(deductSchoolLevel('1A')).toBe('ENSINO_MEDIO_REGULAR');
      expect(deductSchoolLevel('3ª Série Regular')).toBe('ENSINO_MEDIO_REGULAR');
      expect(deductSchoolLevel('2º Ano B')).toBe('ENSINO_MEDIO_REGULAR');
    });

    test('should return OUTROS for non-matching turma names', () => {
      expect(deductSchoolLevel('Maternal')).toBe('OUTROS');
      expect(deductSchoolLevel('Pre-Escolar')).toBe('OUTROS');
    });

  });

});
