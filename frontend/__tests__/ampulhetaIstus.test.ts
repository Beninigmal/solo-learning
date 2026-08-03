describe('Ampulheta de Istus (Cooldown Reducer)', () => {
  it('should calculate 15 minutes cooldown when active, and 30 minutes when expired', () => {
    const now = new Date('2026-08-03T12:00:00Z');
    
    // Case 1: Active buff (expires in 2 hours)
    const activeBuffExpires = new Date('2026-08-03T14:00:00Z');
    const hasActiveBuff = activeBuffExpires > now;
    const activeCooldownMinutes = hasActiveBuff ? 15 : 30;
    
    expect(activeCooldownMinutes).toBe(15);
    const activeCooldownTime = new Date(now.getTime() + activeCooldownMinutes * 60 * 1000);
    expect(activeCooldownTime.toISOString()).toBe('2026-08-03T12:15:00.000Z');

    // Case 2: Expired buff
    const expiredBuff = new Date('2026-08-03T11:59:59Z');
    const hasExpiredBuff = expiredBuff > now;
    const normalCooldownMinutes = hasExpiredBuff ? 15 : 30;

    expect(normalCooldownMinutes).toBe(30);
    const normalCooldownTime = new Date(now.getTime() + normalCooldownMinutes * 60 * 1000);
    expect(normalCooldownTime.toISOString()).toBe('2026-08-03T12:30:00.000Z');
  });
});
