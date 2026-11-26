import type { PickableEventDto } from '@cf/api';
import { pickAreaOf, pickArtTextOf, pickChoiceOf, pickNoteHintOf } from './pick-view';

const SUNRISE: PickableEventDto = {
  id: 'e1',
  title: 'Easter Sunrise 5K',
  category: 'run',
  startsAt: '2026-04-18T10:45:00+00:00',
  place: 'Martin Goodman Trail, Marilyn Bell Park',
  area: 'Waterfront, Toronto',
  priceCents: 0,
  spotsLeft: 58,
  imageKey: null,
  lastPickedAt: null,
};

// ADR 0098: the list and the graphics show the area up to its first comma, as the mocks draw it.
describe('pickAreaOf', () => {
  it.each([
    { area: 'Waterfront, Toronto', expected: 'Waterfront' },
    { area: 'Downtown', expected: 'Downtown' },
    { area: ' Scarborough , Toronto, ON', expected: 'Scarborough' },
    { area: '', expected: '' },
  ])('reads "$area" as "$expected"', ({ area, expected }) => {
    expect(pickAreaOf(area)).toBe(expected);
  });
});

// L2-072 AC1, AC13: each choice shows its date in Toronto, title and area, and when last picked.
describe('pickChoiceOf', () => {
  it('reads an event never picked, its photo the category fallback', () => {
    expect(pickChoiceOf(SUNRISE)).toEqual({
      id: 'e1',
      imageSrc: '/images/events/run.jpg',
      when: 'Sat Apr 18',
      title: 'Easter Sunrise 5K',
      area: 'Waterfront',
    });
  });

  it.each([
    { why: 'a morning in Toronto', at: '2026-04-06T14:10:00+00:00', expected: 'Last picked Apr 6' },
    // 02:30 UTC on April 7 is still the evening of April 6 in Toronto.
    {
      why: 'a late evening in Toronto',
      at: '2026-04-07T02:30:00+00:00',
      expected: 'Last picked Apr 6',
    },
    { why: 'a two-digit day', at: '2026-03-16T16:00:00+00:00', expected: 'Last picked Mar 16' },
  ])('adds when it was last picked on $why', ({ at, expected }) => {
    expect(pickChoiceOf({ ...SUNRISE, area: 'Downtown, Toronto', lastPickedAt: at }).area).toBe(
      `Downtown · ${expected}`,
    );
  });

  it('uses the event’s own photo when it has one', () => {
    expect(pickChoiceOf({ ...SUNRISE, imageKey: 'abc.jpg' }).imageSrc).toBe(
      '/api/events/images/abc.jpg',
    );
  });
});

// L2-072 AC5: the graphic says the title, weekday, date, time, area and note.
describe('pickArtTextOf', () => {
  it('reads the mocks’ graphic', () => {
    expect(pickArtTextOf(SUNRISE, '  Flat and fast.  ')).toEqual({
      label: 'Community Pick graphic: Easter Sunrise 5K, Sat Apr 18',
      title: 'Easter Sunrise 5K',
      when: 'Sat Apr 18 · 6:45 AM · Waterfront',
      note: 'Flat and fast.',
    });
  });

  it('reads an evening start in standard time', () => {
    expect(pickArtTextOf({ ...SUNRISE, startsAt: '2026-11-28T00:30:00+00:00' }, '').when).toBe(
      'Fri Nov 27 · 7:30 PM · Waterfront',
    );
  });
});

// L2-072 AC2: the hint says how many of the 70 characters are used.
describe('pickNoteHintOf', () => {
  it.each([
    { note: '', count: 0 },
    { note: 'Flat, stroller-friendly, and you finish as the sun comes up.', count: 60 },
    { note: 'x'.repeat(70), count: 70 },
  ])('counts $count characters', ({ note, count }) => {
    expect(pickNoteHintOf(note)).toBe(
      `One line. It goes on the graphics and in every caption. ${count} of 70 characters.`,
    );
  });
});
