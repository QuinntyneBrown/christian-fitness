import type { ApiHandlers } from './api-handlers';

/**
 * Answers `GET /api/events/series/count` with `count` (ADR 0093), or refuses it with `fail`.
 * Returns how many times it was asked.
 */
export function answerSeriesCount(
  api: ApiHandlers,
  count: number,
  fail?: { status: number },
): { asked: number } {
  const seen = { asked: 0 };
  api.on('GET', '/api/events/series/count', () => {
    seen.asked += 1;
    return fail ? { status: fail.status, json: { code: 'error' } } : { json: { count } };
  });
  return seen;
}
