import { getAvailableAdminTabs } from '../utils/planPermissions';

describe('SaaS Plan Tab Visibility Permissions (getAvailableAdminTabs)', () => {
  test('RANK_B should include RELATÓRIOS but hide GRADE and ORDINATOR tabs', () => {
    const tabs = getAvailableAdminTabs('RANK_B');
    expect(tabs).toContain('RECRUTAR');
    expect(tabs).toContain('TURMAS');
    expect(tabs).toContain('MATÉRIAS');
    expect(tabs).toContain('ARQUITETO');
    expect(tabs).toContain('MATRIZ');
    expect(tabs).toContain('RELATÓRIOS');
    expect(tabs).toContain('LOGS');

    expect(tabs).not.toContain('GRADE');
    expect(tabs).not.toContain('ORDINATOR');
  });

  test('RANK_A should include GRADE and RELATÓRIOS, but hide ORDINATOR', () => {
    const tabs = getAvailableAdminTabs('RANK_A');
    expect(tabs).toContain('GRADE');
    expect(tabs).toContain('RELATÓRIOS');
    expect(tabs).not.toContain('ORDINATOR');
  });

  test('TRIAL should behave like RANK_A (include GRADE and RELATÓRIOS, hide ORDINATOR)', () => {
    const tabs = getAvailableAdminTabs('TRIAL');
    expect(tabs).toContain('GRADE');
    expect(tabs).toContain('RELATÓRIOS');
    expect(tabs).not.toContain('ORDINATOR');
  });

  test('RANK_S should include ALL tabs, including ORDINATOR', () => {
    const tabs = getAvailableAdminTabs('RANK_S');
    expect(tabs).toContain('RECRUTAR');
    expect(tabs).toContain('TURMAS');
    expect(tabs).toContain('MATÉRIAS');
    expect(tabs).toContain('ARQUITETO');
    expect(tabs).toContain('GRADE');
    expect(tabs).toContain('MATRIZ');
    expect(tabs).toContain('RELATÓRIOS');
    expect(tabs).toContain('ORDINATOR');
    expect(tabs).toContain('LOGS');
  });

  test('undefined or unknown plan should fallback safely without ORDINATOR', () => {
    const tabsUndefined = getAvailableAdminTabs(undefined);
    expect(tabsUndefined).toContain('GRADE');
    expect(tabsUndefined).not.toContain('ORDINATOR');

    const tabsUnknown = getAvailableAdminTabs('UNKNOWN_PLAN');
    expect(tabsUnknown).not.toContain('ORDINATOR');
  });
});
