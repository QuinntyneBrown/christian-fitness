import { attendeeLabelOf } from './attendee-label';

// L2-065 AC4 (ADR 0116) and the avatar stack's content rule (docs/design-system/components/
// avatar.html): a stack names two people by first name, then counts everyone else going, named or
// not. One case per row.
describe('attendeeLabelOf', () => {
  const cases: [names: string[], going: number, label: string | null][] = [
    [[], 0, null],
    [[], 12, null],
    [['Grace Thompson'], 1, 'Grace'],
    [['Grace Thompson'], 2, 'Grace and 1 other'],
    [['Grace Thompson'], 3, 'Grace and 2 others'],
    [['Michael Chen', 'Danielle Okafor'], 2, 'Michael and Danielle'],
    [['Michael Chen', 'Danielle Okafor'], 3, 'Michael, Danielle and 1 other'],
    [['Michael Chen', 'Danielle Okafor', 'Priya Nair'], 3, 'Michael, Danielle and 1 other'],
    [
      ['Michael Chen', 'Danielle Okafor', 'Priya Nair', 'Ama Kwarteng', 'Jordan Reyes'],
      142,
      'Michael, Danielle and 140 others',
    ],
  ];

  it.each(cases)('%j of %i going reads %j', (names, going, label) => {
    expect(attendeeLabelOf(names, going)).toBe(label);
  });
});
