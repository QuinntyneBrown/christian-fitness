import type { SeriesDetailDto } from '@cf/api';
import { seriesPageViewOf } from './series-page-view';

/** Couch to 5K as the mock `event-series/default` draws it: eight Tuesdays, May 12 cancelled, joined. */
const COUCH: SeriesDetailDto = {
  id: '0190c0de-0000-7000-8000-0000000005e1',
  title: 'Couch to 5K Run Club',
  category: 'run',
  summary: 'Eight weeks from walking to running a full 5K, together.',
  imageKey: null,
  host: {
    id: '0190c0de-0000-7000-8000-00000000a001',
    kind: 'organization',
    name: 'Lakeshore Runners Fellowship',
    isVerified: true,
    photoKey: null,
  },
  cadence: { weekday: 2, dates: 7 },
  startsAt: '2026-04-21T22:30:00Z',
  firstStartsAt: '2026-04-07T22:30:00Z',
  lastStartsAt: '2026-05-26T22:30:00Z',
  place: 'Humber Bay Park East',
  area: 'Etobicoke, Toronto',
  priceCents: 0,
  dropInPriceCents: 0,
  capacity: 40,
  spotsLeft: 9,
  sessionsLeft: 5,
  joined: true,
  sessions: [
    'done',
    'done',
    'live',
    'upcoming',
    'upcoming',
    'cancelled',
    'upcoming',
    'upcoming',
  ].map((state, n) => ({
    id: `s${n + 1}`,
    number: n + 1,
    startsAt: '2026-04-21T22:30:00Z',
    topic: null,
    state: state as SeriesDetailDto['sessions'][number]['state'],
    held: false,
  })),
};

// L2-051 AC1 (ADR 0091, ADR 0093, ADR 0096): the page's head, in Toronto time.
describe('seriesPageViewOf', () => {
  it('words the mock series: its kind, cadence and time, the date range, place and host', () => {
    const view = seriesPageViewOf(COUCH);

    expect(view.eyebrow).toBe('Run series · 8 sessions');
    expect(view.sessions.note).toBe('2 done · 5 to go');
    expect(view.when).toBe('Every Tuesday, 6:30 PM');
    expect(view.range).toBe('Apr 7 – May 26');
    expect(view.place).toBe('Humber Bay Park East');
    expect(view.area).toBe('Etobicoke, Toronto');
    expect(view.imageSrc).toBe('/images/events/run.jpg');
    expect(view.host.href).toBe('/directory/0190c0de-0000-7000-8000-00000000a001');
    expect(view.host.verified).toBe(true);
  });

  it.each([
    {
      why: 'a monthly series reads its count of dates and a range of months',
      series: {
        ...COUCH,
        category: 'basketball',
        cadence: { weekday: null, dates: 6 },
        startsAt: '2026-04-30T23:00:00Z',
        firstStartsAt: '2026-01-30T00:00:00Z',
        lastStartsAt: '2026-06-25T23:00:00Z',
      },
      eyebrow: 'Basketball series · 8 sessions',
      when: '6 dates, 7:00 PM',
      range: 'Jan – Jun',
    },
    {
      why: 'one date alone reads that date',
      series: {
        ...COUCH,
        category: 'workshop',
        cadence: { weekday: null, dates: 1 },
        startsAt: '2026-05-02T14:00:00Z',
        firstStartsAt: '2026-05-02T14:00:00Z',
        lastStartsAt: '2026-05-02T14:00:00Z',
      },
      eyebrow: 'Workshop series · 8 sessions',
      when: '1 date, 10:00 AM',
      range: 'May',
    },
  ] as const)('$why', ({ series, eyebrow, when, range }) => {
    const view = seriesPageViewOf(series as SeriesDetailDto);

    expect([view.eyebrow, view.when, view.range]).toEqual([eyebrow, when, range]);
  });

  it('a picture of its own is served from the event images', () => {
    expect(seriesPageViewOf({ ...COUCH, imageKey: 'a b.jpg' }).imageSrc).toBe(
      '/api/events/images/a%20b.jpg',
    );
  });
});
