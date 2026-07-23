import { getAutoDiscoveredLocalBackendUrl } from '../config';

describe('Auto-Discovery of Backend IP (getAutoDiscoveredLocalBackendUrl)', () => {
  test('should return a valid HTTP URL string with port 3333', () => {
    const url = getAutoDiscoveredLocalBackendUrl();
    expect(typeof url).toBe('string');
    expect(url).toMatch(/^http:\/\/.+:3333$/);
  });
});
