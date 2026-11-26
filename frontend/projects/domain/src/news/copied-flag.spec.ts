import { COPIED_MS, CopiedFlag } from './copied-flag';

// L2-061 AC3 (ADR 0105): "Link copied" holds for about 2 seconds, a second press starts the 2
// seconds again, and disposing the flag clears its timer.
describe('CopiedFlag', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('is raised for 2,000 ms', () => {
    const flag = new CopiedFlag();

    flag.raise();
    vi.advanceTimersByTime(COPIED_MS - 1);
    const during = flag.copied();
    vi.advanceTimersByTime(1);

    expect([COPIED_MS, during, flag.copied()]).toEqual([2_000, true, false]);
  });

  it('restarts the 2 seconds on a second press', () => {
    const flag = new CopiedFlag();

    flag.raise();
    vi.advanceTimersByTime(1_500);
    flag.raise();
    vi.advanceTimersByTime(1_500);
    const during = flag.copied();
    vi.advanceTimersByTime(500);

    expect([during, flag.copied()]).toEqual([true, false]);
  });

  it('clears its timer when disposed', () => {
    const flag = new CopiedFlag();

    flag.raise();
    flag.dispose();

    expect([flag.copied(), vi.getTimerCount()]).toEqual([false, 0]);
  });
});
