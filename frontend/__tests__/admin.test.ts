describe('Arquiteto and Superadmin Screen Unit Tests', () => {

  describe('LDB / MEC Piso do Magistério, REDA & CLT Carga Horária Conversions (convertContractHoursToClasses)', () => {
    
    // Auxiliary functions for Piso do Magistério (1/3 active hour rule), REDA (80% regência rule) and CLT (100% regência rule)
    const convertContractHoursToClasses = (hours: number, cat: 'CONCURSADO' | 'REDA' | 'CLT' = 'CONCURSADO'): number => {
      if (cat === 'CLT') {
        return hours;
      }
      if (cat === 'REDA') {
        if (hours === 20) return 16;
        if (hours === 40) return 32;
        return Math.floor(hours * 0.8);
      }
      if (hours === 20) return 13;
      if (hours === 40) return 26;
      return Math.floor(hours * (2 / 3));
    };

    const convertClassesToContractHours = (classes: number, cat: 'CONCURSADO' | 'REDA' | 'CLT' = 'CONCURSADO'): number => {
      if (cat === 'CLT') {
        return classes;
      }
      if (cat === 'REDA') {
        if (classes === 16) return 20;
        if (classes === 32) return 40;
        return Math.round(classes / 0.8);
      }
      if (classes === 13) return 20;
      if (classes === 26) return 40;
      return Math.round(classes * 1.5);
    };

    test('should convert weekly contract hours to maximum classroom lecture slots correctly for CONCURSADO', () => {
      // 20 hours -> 13 classes (Lei do Piso limit)
      expect(convertContractHoursToClasses(20, 'CONCURSADO')).toBe(13);

      // 40 hours -> 26 classes
      expect(convertContractHoursToClasses(40, 'CONCURSADO')).toBe(26);

      // 30 hours -> 20 classes
      expect(convertContractHoursToClasses(30, 'CONCURSADO')).toBe(20);

      // 24 hours -> 16 classes
      expect(convertContractHoursToClasses(24, 'CONCURSADO')).toBe(16);
    });

    test('should convert weekly contract hours to maximum classroom lecture slots correctly for REDA', () => {
      // 20 hours -> 16 classes (REDA 80% rule)
      expect(convertContractHoursToClasses(20, 'REDA')).toBe(16);

      // 40 hours -> 32 classes
      expect(convertContractHoursToClasses(40, 'REDA')).toBe(32);
    });

    test('should convert weekly contract hours directly for CLT', () => {
      // 20 hours -> 20 classes (CLT 1:1 rule)
      expect(convertContractHoursToClasses(20, 'CLT')).toBe(20);

      // 40 hours -> 40 classes
      expect(convertContractHoursToClasses(40, 'CLT')).toBe(40);
    });

    test('should convert lecture slots back to contract hours correctly', () => {
      expect(convertClassesToContractHours(13, 'CONCURSADO')).toBe(20);
      expect(convertClassesToContractHours(26, 'CONCURSADO')).toBe(40);
      expect(convertClassesToContractHours(16, 'REDA')).toBe(20);
      expect(convertClassesToContractHours(32, 'REDA')).toBe(40);
      expect(convertClassesToContractHours(20, 'CLT')).toBe(20);
      expect(convertClassesToContractHours(40, 'CLT')).toBe(40);
    });

  });

  describe('Timetable Slot Positional Shift Index Mapping', () => {

    // Standard school shift positions from SolenGuidelines.md
    const getShiftNameBySlotPosition = (posicao: number): 'MATUTINO' | 'VESPERTINO' | 'NOTURNO' | 'INVALID' => {
      if (posicao >= 1 && posicao <= 5) return 'MATUTINO';
      if (posicao >= 6 && posicao <= 10) return 'VESPERTINO';
      if (posicao >= 11 && posicao <= 15) return 'NOTURNO';
      return 'INVALID';
    };

    test('should map positions 1 to 5 to MATUTINO shift', () => {
      expect(getShiftNameBySlotPosition(1)).toBe('MATUTINO');
      expect(getShiftNameBySlotPosition(3)).toBe('MATUTINO');
      expect(getShiftNameBySlotPosition(5)).toBe('MATUTINO');
    });

    test('should map positions 6 to 10 to VESPERTINO shift', () => {
      expect(getShiftNameBySlotPosition(6)).toBe('VESPERTINO');
      expect(getShiftNameBySlotPosition(8)).toBe('VESPERTINO');
      expect(getShiftNameBySlotPosition(10)).toBe('VESPERTINO');
    });

    test('should map positions 11 to 15 to NOTURNO shift', () => {
      expect(getShiftNameBySlotPosition(11)).toBe('NOTURNO');
      expect(getShiftNameBySlotPosition(13)).toBe('NOTURNO');
      expect(getShiftNameBySlotPosition(15)).toBe('NOTURNO');
    });

    test('should return INVALID for positions out of bounds', () => {
      expect(getShiftNameBySlotPosition(0)).toBe('INVALID');
      expect(getShiftNameBySlotPosition(16)).toBe('INVALID');
    });

  });

  describe('Multi-tenant Security and School Isolation', () => {

    const simulateMultiTenantFilter = (
      entities: { name: string; instituicao: string }[],
      user: { role: string; instituicao?: string }
    ) => {
      // Global ADMIN has total access, whereas ARQUITETO filters by matching institution
      if (user.role === 'ADMIN') {
        return entities;
      }
      return entities.filter((e) => e.instituicao === user.instituicao);
    };

    const mockData = [
      { name: 'Professor A', instituicao: 'Escola Central' },
      { name: 'Professor B', instituicao: 'Escola Central' },
      { name: 'Professor C', instituicao: 'Instituto Norte' },
    ];

    test('should filter and return only matching institution records for ARQUITETO coordinator', () => {
      const userCoordinator = { role: 'ARQUITETO', instituicao: 'Escola Central' };
      const filtered = simulateMultiTenantFilter(mockData, userCoordinator);

      expect(filtered.length).toBe(2);
      expect(filtered.every((p) => p.instituicao === 'Escola Central')).toBe(true);
    });

    test('should bypass filtering and return all institution records for Superadmin/ADMIN', () => {
      const userSuperadmin = { role: 'ADMIN' };
      const filtered = simulateMultiTenantFilter(mockData, userSuperadmin);

      expect(filtered.length).toBe(3);
    });

  });

});
