import type { ListingConnectionDto } from '@cf/api';
import { connectionRowViewOf } from './listing-connections';

const connection = (over: Partial<ListingConnectionDto> = {}): ListingConnectionDto => ({
  id: 'l-1',
  kind: 'company',
  name: 'Northline Athletic',
  photoKey: null,
  relation: 'Shoe partner',
  ...over,
});

// L2-055 AC4 (mock `listing-profile/default`): a connected listing reads "<relation> · <kind>"
// beside its mark and name, and leads to its own profile.
describe('connectionRowViewOf', () => {
  it('words a group by its relation and kind, with initials on a square mark', () => {
    expect(connectionRowViewOf(connection())).toEqual({
      id: 'l-1',
      href: '/directory/l-1',
      name: 'Northline Athletic',
      text: 'Shoe partner · Company',
      person: false,
      initials: 'NA',
      photoSrc: null,
    });
  });

  it.each([
    { kind: 'person', singular: 'Person', person: true },
    { kind: 'instructor', singular: 'Instructor', person: true },
    { kind: 'ambassador', singular: 'Ambassador', person: true },
    { kind: 'organization', singular: 'Organization', person: false },
    { kind: 'church-ministry', singular: 'Church Ministry', person: false },
  ] as const)('a $kind reads "$singular"', ({ kind, singular, person }) => {
    const view = connectionRowViewOf(connection({ kind, relation: 'Founder' }));
    expect(view.text).toBe(`Founder · ${singular}`);
    expect(view.person).toBe(person);
  });

  it('shows a photo when the listing has one', () => {
    const view = connectionRowViewOf(
      connection({ kind: 'ambassador', name: 'Michael Chen', photoKey: 'ab.jpg' }),
    );
    expect(view.photoSrc).toBe('/api/directory/photos/ab.jpg');
  });
});
