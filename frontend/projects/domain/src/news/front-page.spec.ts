import { NEWS_SECTIONS, newsSectionOf, riverEndOf } from './front-page';

// L2-001 AC3 (ADR 0071, ADR 0107): the address's `section` value names one of the six sections
// by its feed slug; anything else, or none, is Latest.
describe('newsSectionOf', () => {
  it.each([
    [null, 'latest', 'Latest', null],
    ['', 'latest', 'Latest', null],
    ['events', 'events', 'Events', 'events'],
    ['training', 'training', 'Training', 'training'],
    ['nutrition', 'nutrition', 'Nutrition', 'nutrition'],
    ['faith-body', 'faith-body', 'Faith & Body', 'faith-and-body'],
    ['community', 'community', 'Community', 'community'],
    ['pros', 'pros', 'Pros', 'pros'],
    ['faith-and-body', 'latest', 'Latest', null],
    ['Events', 'latest', 'Latest', null],
    ['sports', 'latest', 'Latest', null],
  ])('reads %j as %s', (value, slug, label, story) => {
    expect(newsSectionOf(value)).toEqual({ slug, label, story });
  });

  it('lists the masthead order, Latest first, each leading to its address', () => {
    expect(NEWS_SECTIONS.map((s) => [s.label, s.href])).toEqual([
      ['Latest', '/'],
      ['Events', '/?section=events'],
      ['Training', '/?section=training'],
      ['Nutrition', '/?section=nutrition'],
      ['Faith & Body', '/?section=faith-body'],
      ['Community', '/?section=community'],
      ['Pros', '/?section=pros'],
    ]);
  });
});

// L2-001 AC2 with AGENTS.md "bound what grows" (ADR 0107): the river ends with More stories while
// older stories follow, with the capped line once 60 show, and with nothing at the end.
describe('riverEndOf', () => {
  it.each([
    [12, true, 'more'],
    [48, true, 'more'],
    [59, true, 'more'],
    [60, true, 'capped'],
    [60, false, 'end'],
    [5, false, 'end'],
    [0, false, 'end'],
  ] as const)('with %i shown and more %s ends with %s', (shown, more, end) => {
    expect(riverEndOf(shown, more)).toBe(end);
  });
});
