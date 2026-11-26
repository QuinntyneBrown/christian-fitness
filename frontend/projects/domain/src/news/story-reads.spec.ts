import { STORY_READ_WINDOW_MS, storyReadLog } from './story-reads';

const NOW = Date.parse('2026-04-15T12:45:00Z');
const HOUR = 60 * 60 * 1000;

// L2-061 AC12 (ADR 0105): a story counts once per browser per 24 hours; the log keeps only the
// hashed ids counted in the last 24 hours.
describe('storyReadLog', () => {
  it.each([
    ['nothing stored', null, true, { a1: NOW }],
    ['storage that is not a log', 'not json', true, { a1: NOW }],
    ['a log that is a list', '[1,2]', true, { a1: NOW }],
    [
      'counted 23 hours ago',
      JSON.stringify({ a1: NOW - 23 * HOUR }),
      false,
      { a1: NOW - 23 * HOUR },
    ],
    [
      'counted exactly 24 hours ago',
      JSON.stringify({ a1: NOW - STORY_READ_WINDOW_MS }),
      true,
      { a1: NOW },
    ],
    [
      'another story counted, an old one dropped',
      JSON.stringify({ b2: NOW - HOUR, c3: NOW - 25 * HOUR }),
      true,
      { b2: NOW - HOUR, a1: NOW },
    ],
    ['an entry that is not a time', JSON.stringify({ b2: 'soon' }), true, { a1: NOW }],
  ])('%s', (_why, stored, counts, kept) => {
    const log = storyReadLog(stored, 'a1', NOW);

    expect([log.counts, JSON.parse(log.next)]).toEqual([counts, kept]);
  });
});
