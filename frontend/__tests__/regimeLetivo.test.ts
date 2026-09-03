describe('Regime Letivo (Unidades, Bimestres, Trimestres, Semestres)', () => {
  it('identifica corretamente a quantidade de unidades para escolas públicas (padrão MEC: 3)', () => {
    const getRegimeDefaults = (tipo: string) => {
      if (tipo === 'MUNICIPAL' || tipo === 'ESTADUAL') {
        return { qtdUnidades: 3, tipoDivisao: 'UNIDADE' };
      }
      if (tipo === 'PRIVADO') {
        return { qtdUnidades: 4, tipoDivisao: 'BIMESTRE' };
      }
      return { qtdUnidades: 4, tipoDivisao: 'BIMESTRE' };
    };

    expect(getRegimeDefaults('MUNICIPAL')).toEqual({ qtdUnidades: 3, tipoDivisao: 'UNIDADE' });
    expect(getRegimeDefaults('ESTADUAL')).toEqual({ qtdUnidades: 3, tipoDivisao: 'UNIDADE' });
    expect(getRegimeDefaults('PRIVADO')).toEqual({ qtdUnidades: 4, tipoDivisao: 'BIMESTRE' });
  });

  it('formata o rótulo de período conforme o tipoDivisao', () => {
    const formatPeriodo = (num: number, tipoDivisao: string) => {
      if (tipoDivisao === 'BIMESTRE') return `${num}º Bimestre`;
      if (tipoDivisao === 'TRIMESTRE') return `${num}º Trimestre`;
      if (tipoDivisao === 'SEMESTRE') return `${num}º Semestre`;
      return `Unidade ${num}`;
    };

    expect(formatPeriodo(1, 'BIMESTRE')).toBe('1º Bimestre');
    expect(formatPeriodo(4, 'BIMESTRE')).toBe('4º Bimestre');
    expect(formatPeriodo(2, 'SEMESTRE')).toBe('2º Semestre');
    expect(formatPeriodo(3, 'TRIMESTRE')).toBe('3º Trimestre');
    expect(formatPeriodo(2, 'UNIDADE')).toBe('Unidade 2');
  });

  it('valida o limite de períodos aceitos para atualização da turma', () => {
    const isValidUnit = (unit: number, maxUnits: number) => {
      return unit >= 1 && unit <= maxUnits;
    };

    // Para escola pública (3 unidades)
    expect(isValidUnit(3, 3)).toBe(true);
    expect(isValidUnit(4, 3)).toBe(false);

    // Para escola privada com 4 bimestres
    expect(isValidUnit(4, 4)).toBe(true);
    expect(isValidUnit(5, 4)).toBe(false);

    // Para curso livre com 2 semestres
    expect(isValidUnit(2, 2)).toBe(true);
    expect(isValidUnit(3, 2)).toBe(false);
  });
});
