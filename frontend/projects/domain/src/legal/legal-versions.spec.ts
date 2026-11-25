import { describe, expect, it, vi } from 'vitest';
import { LegalVersions } from './legal-versions';

describe('Versions effective at midnight UTC', () => {
  const versions = new LegalVersions({
    privacy: ['2026-04-01', '2026-06-01'],
    terms: ['2026-04-01'],
  });
  it.each([
    ['2026-03-31', null, '2026-04-01'],
    ['2026-04-01', '2026-04-01', null],
    ['2026-05-01', '2026-04-01', null],
    ['2026-05-02', '2026-04-01', '2026-06-01'],
    ['2026-05-31', '2026-04-01', '2026-06-01'],
    ['2026-06-01', '2026-06-01', null],
  ])('%s', (today, current, next) => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date(today!));
      expect(versions.inForce('privacy')).toBe(current);
      expect(versions.upcoming('privacy')).toBe(next);
    } finally {
      vi.useRealTimers();
    }
  });
});
