import { hostCardViewOf } from './host-card-view';

// L2-010 AC4 (ADR 0089): an event's host as the "Hosted by" card reads.
describe('hostCardViewOf', () => {
  it('words a verified organization with initials and its profile address', () => {
    expect(
      hostCardViewOf({
        id: '0193a9c0-0000-7000-8000-00000000cf01',
        kind: 'organization',
        name: 'Christian Fitness',
        isVerified: true,
        photoKey: null,
      }),
    ).toEqual({
      href: '/directory/0193a9c0-0000-7000-8000-00000000cf01',
      name: 'Christian Fitness',
      kind: 'Organization',
      initials: 'CF',
      photoSrc: null,
      person: false,
      verified: true,
    });
  });

  it.each([
    { kind: 'instructor' as const, words: 'Instructor', person: true },
    { kind: 'person' as const, words: 'Person', person: true },
    { kind: 'ambassador' as const, words: 'Ambassador', person: true },
    { kind: 'company' as const, words: 'Company', person: false },
    { kind: 'church-ministry' as const, words: 'Church Ministry', person: false },
  ])('a $kind reads "$words" with a round mark: $person', ({ kind, words, person }) => {
    const view = hostCardViewOf({
      id: 'h1',
      kind,
      name: 'Danielle Okafor',
      isVerified: false,
      photoKey: null,
    });

    expect(view.kind).toBe(words);
    expect(view.person).toBe(person);
    expect(view.verified).toBe(false);
  });

  it('serves a photo from the directory by its key', () => {
    expect(
      hostCardViewOf({
        id: 'h1',
        kind: 'instructor',
        name: 'Danielle Okafor',
        isVerified: true,
        photoKey: 'a b.jpg',
      }).photoSrc,
    ).toBe('/api/directory/photos/a%20b.jpg');
  });
});
