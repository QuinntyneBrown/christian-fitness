import type { AdminEventDto } from '@cf/api';
import { adminEventSubOf } from './admin-event-row';

describe('adminEventSubOf', () => {
  const bootcamp = {
    title: 'Saturday Park Bootcamp',
    place: 'Trillium Park, Ontario Place',
  } as AdminEventDto;

  it.each([
    {
      why: 'a session',
      series: { id: 'b1', title: 'Saturday Park Bootcamp' },
      sub: 'Part of Saturday Park Bootcamp · Trillium Park, Ontario Place',
    },
    { why: 'an event of no series', series: null, sub: 'Trillium Park, Ontario Place' },
    { why: 'an answer without the field', series: undefined, sub: 'Trillium Park, Ontario Place' },
  ])('$why', ({ series, sub }) => {
    expect(adminEventSubOf({ ...bootcamp, series })).toBe(sub);
  });
});
