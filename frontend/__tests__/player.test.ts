import { getPlayerRankInfo } from '../hooks/usePlayerState';

describe('Player Screen Unit Tests', () => {

  describe('Rank Mapping and Progress Calculations (getPlayerRankInfo)', () => {
    
    test('should assign E-Rank and calculate correct progress for low XP', () => {
      // 0 XP -> Rank E, 0% progress, next is D (1000 XP)
      const rankInfo = getPlayerRankInfo(0);
      expect(rankInfo.currentRank).toBe('E');
      expect(rankInfo.nextRank).toBe('Rank D');
      expect(rankInfo.nextRankXp).toBe(1000);
      expect(rankInfo.progressPercent).toBe(0);

      // 500 XP -> Rank E, 50% progress, next is D
      const rankInfo500 = getPlayerRankInfo(500);
      expect(rankInfo500.currentRank).toBe('E');
      expect(rankInfo500.progressPercent).toBe(50);

      // 999 XP -> Rank E, 99.9% progress
      const rankInfo999 = getPlayerRankInfo(999);
      expect(rankInfo999.currentRank).toBe('E');
      expect(rankInfo999.progressPercent).toBe(99.9);
    });

    test('should assign D-Rank and calculate correct progress', () => {
      // 1000 XP -> Rank D, 0% progress, next is C (3000 XP)
      const rankInfo = getPlayerRankInfo(1000);
      expect(rankInfo.currentRank).toBe('D');
      expect(rankInfo.nextRank).toBe('Rank C');
      expect(rankInfo.nextRankXp).toBe(3000);
      expect(rankInfo.progressPercent).toBe(0);

      // 2000 XP -> Rank D, 50% progress
      const rankInfo2000 = getPlayerRankInfo(2000);
      expect(rankInfo2000.currentRank).toBe('D');
      expect(rankInfo2000.progressPercent).toBe(50);
    });

    test('should assign C-Rank and calculate correct progress', () => {
      // 3000 XP -> Rank C, 0% progress, next is B (6000 XP)
      const rankInfo = getPlayerRankInfo(3000);
      expect(rankInfo.currentRank).toBe('C');
      expect(rankInfo.nextRank).toBe('Rank B');
      expect(rankInfo.nextRankXp).toBe(6000);
      expect(rankInfo.progressPercent).toBe(0);

      // 4500 XP -> Rank C, 50% progress
      const rankInfo4500 = getPlayerRankInfo(4500);
      expect(rankInfo4500.currentRank).toBe('C');
      expect(rankInfo4500.progressPercent).toBe(50);
    });

    test('should assign B-Rank and calculate correct progress', () => {
      // 6000 XP -> Rank B, 0% progress, next is A (10000 XP)
      const rankInfo = getPlayerRankInfo(6000);
      expect(rankInfo.currentRank).toBe('B');
      expect(rankInfo.nextRank).toBe('Rank A');
      expect(rankInfo.nextRankXp).toBe(10000);
      expect(rankInfo.progressPercent).toBe(0);

      // 8000 XP -> Rank B, 50% progress
      const rankInfo8000 = getPlayerRankInfo(8000);
      expect(rankInfo8000.currentRank).toBe('B');
      expect(rankInfo8000.progressPercent).toBe(50);
    });

    test('should assign A-Rank and calculate correct progress', () => {
      // 10000 XP -> Rank A, 0% progress, next is S (15000 XP)
      const rankInfo = getPlayerRankInfo(10000);
      expect(rankInfo.currentRank).toBe('A');
      expect(rankInfo.nextRank).toBe('Rank S');
      expect(rankInfo.nextRankXp).toBe(15000);
      expect(rankInfo.progressPercent).toBe(0);

      // 12500 XP -> Rank A, 50% progress
      const rankInfo12500 = getPlayerRankInfo(12500);
      expect(rankInfo12500.currentRank).toBe('A');
      expect(rankInfo12500.progressPercent).toBe(50);
    });

    test('should assign S-Rank and cap progress at 100% for high XP', () => {
      // 15000 XP -> Rank S, 100% progress, next is MAX
      const rankInfo = getPlayerRankInfo(15000);
      expect(rankInfo.currentRank).toBe('S');
      expect(rankInfo.nextRank).toBe('MAX');
      expect(rankInfo.nextRankXp).toBe(15000);
      expect(rankInfo.progressPercent).toBe(100);

      // 25000 XP -> remains Rank S, 100% progress
      const rankInfo25000 = getPlayerRankInfo(25000);
      expect(rankInfo25000.currentRank).toBe('S');
      expect(rankInfo25000.progressPercent).toBe(100);
    });

  });

  describe('Rank Ascension and Artifact Drops Rules', () => {
    
    // Simulate drop rules logic in checkAndTriggerRankUp
    const simulateRankUpDrop = (oldXp: number, newXp: number) => {
      const oldRankInfo = getPlayerRankInfo(oldXp);
      const newRankInfo = getPlayerRankInfo(newXp);

      if (newRankInfo.currentRank !== oldRankInfo.currentRank) {
        const rankOrder = ['E', 'D', 'C', 'B', 'A', 'S'];
        const oldIdx = rankOrder.indexOf(oldRankInfo.currentRank);
        const newIdx = rankOrder.indexOf(newRankInfo.currentRank);

        if (newIdx > oldIdx) {
          if (newRankInfo.currentRank === 'D') {
            return { id: 'poeira_estelar', name: 'Poeira Estelar', type: 'magic' };
          } else if (newRankInfo.currentRank === 'C') {
            return { id: 'martelo_magico', name: 'Martelo Mágico', type: 'magic' };
          } else if (newRankInfo.currentRank === 'B') {
            return { id: 'becker_alquimista', name: 'Becker do Alquimista', type: 'legendary' };
          } else if (newRankInfo.currentRank === 'A') {
            return { id: 'sussurros_sabios', name: 'Sussurros Sábios', type: 'legendary' };
          } else if (newRankInfo.currentRank === 'S') {
            return { id: 'olhar_monarca', name: 'Olhar do Monarca', type: 'legendary' };
          }
        }
      }
      return null;
    };

    test('should award Poeira Estelar when ascending E -> D', () => {
      const drop = simulateRankUpDrop(500, 1200);
      expect(drop).not.toBeNull();
      expect(drop?.id).toBe('poeira_estelar');
      expect(drop?.type).toBe('magic');
    });

    test('should award Martelo Mágico when ascending D -> C', () => {
      const drop = simulateRankUpDrop(1500, 3100);
      expect(drop).not.toBeNull();
      expect(drop?.id).toBe('martelo_magico');
      expect(drop?.type).toBe('magic');
    });

    test('should award Becker do Alquimista when ascending C -> B', () => {
      const drop = simulateRankUpDrop(4000, 6200);
      expect(drop).not.toBeNull();
      expect(drop?.id).toBe('becker_alquimista');
      expect(drop?.type).toBe('legendary');
    });

    test('should award Sussurros Sábios when ascending B -> A', () => {
      const drop = simulateRankUpDrop(8000, 10500);
      expect(drop).not.toBeNull();
      expect(drop?.id).toBe('sussurros_sabios');
      expect(drop?.type).toBe('legendary');
    });

    test('should award Olhar do Monarca when ascending A -> S', () => {
      const drop = simulateRankUpDrop(12000, 16000);
      expect(drop).not.toBeNull();
      expect(drop?.id).toBe('olhar_monarca');
      expect(drop?.type).toBe('legendary');
    });

    test('should not award any artifact if rank has not changed', () => {
      const drop = simulateRankUpDrop(100, 500);
      expect(drop).toBeNull();
    });

  });

  describe('Countdown and Timer Expire (Wait Mode TTL)', () => {
    
    // Simulate countdown display string formatting logic in hook
    const formatCountdown = (questExpiresAt: string, nowTime: number) => {
      const expiry = new Date(questExpiresAt).getTime();
      const diff = expiry - nowTime;

      if (diff <= 0) {
        return 'EXPIRADA';
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        let text = '';
        if (hours > 0) {
          text += `${hours}h `;
        }
        text += `${minutes}m ${seconds}s`;
        return text;
      }
    };

    test('should return EXPIRADA if the remaining time is zero or negative', () => {
      const now = new Date().getTime();
      const expiresAt = new Date(now - 1000).toISOString(); // 1s ago
      expect(formatCountdown(expiresAt, now)).toBe('EXPIRADA');
    });

    test('should format standard wait mode TTL (40 minutes remaining)', () => {
      const now = new Date().getTime();
      const expiresAt = new Date(now + 40 * 60 * 1000).toISOString(); // 40m from now
      expect(formatCountdown(expiresAt, now)).toBe('40m 0s');
    });

    test('should format hours correctly when time remaining is larger than 1 hour', () => {
      const now = new Date().getTime();
      const expiresAt = new Date(now + (2 * 60 * 60 * 1000) + (15 * 60 * 1000) + 30 * 1000).toISOString(); // 2h 15m 30s
      expect(formatCountdown(expiresAt, now)).toBe('2h 15m 30s');
    });

  });

  describe('Study Mode - Baú (Wrong Answers Recovery Mechanics)', () => {
    
    // Simulate the recovery reward calculation (10% XP of original quest)
    const calculateBauRecoveryXp = (originalQuestXp: number) => {
      return Math.round(originalQuestXp * 0.10);
    };

    test('should recover exactly 10% of the original XP for wrong answers retried in Baú', () => {
      expect(calculateBauRecoveryXp(100)).toBe(10);
      expect(calculateBauRecoveryXp(250)).toBe(25);
      expect(calculateBauRecoveryXp(400)).toBe(40);
    });

    test('should handle edge cases and round recovering XP', () => {
      // 10% of 105 is 10.5, rounding to nearest whole integer
      expect(calculateBauRecoveryXp(105)).toBe(11);
      expect(calculateBauRecoveryXp(104)).toBe(10);
    });

  });

});
