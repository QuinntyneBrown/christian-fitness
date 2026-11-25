import type { DirectoryListingRowDto, DirectoryPageDto, ListingKind } from '@cf/api';
import {
  appendDirectoryPage,
  DIRECTORY_FEED_LIMIT,
  directoryGroups,
  EMPTY_DIRECTORY_FEED,
} from './directory-feed';

const row = (id: string, kind: ListingKind = 'organization'): DirectoryListingRowDto => ({
  id,
  kind,
  name: `Listing ${id}`,
  tagline: '',
  area: '',
  isVerified: false,
  photoKey: null,
  hosting: 0,
});

const COUNTS = [{ kind: 'organization' as const, count: 3 }];

const page = (ids: string[], nextCursor: string | null): DirectoryPageDto => ({
  listings: ids.map((id) => row(id)),
  counts: COUNTS,
  nextCursor,
});

const ids = (from: number, count: number): string[] =>
  Array.from({ length: count }, (_, i) => String(from + i));

// L2-054 AC7 (L2-009 AC5, AC7; ADR 0082): pages append in order, a repeat shows once, and the list
// stops at 200 while more remain.
describe('appendDirectoryPage', () => {
  it('keeps the first page, its counts and its cursor', () => {
    expect(appendDirectoryPage(EMPTY_DIRECTORY_FEED, page(['a', 'b'], 'c1'))).toEqual({
      listings: [row('a'), row('b')],
      counts: COUNTS,
      nextCursor: 'c1',
      capped: false,
    });
  });

  it('appends the next page and drops a listing already shown', () => {
    const first = appendDirectoryPage(EMPTY_DIRECTORY_FEED, page(['a', 'b'], 'c1'));
    const both = appendDirectoryPage(first, page(['b', 'c'], null));
    expect(both.listings.map((l) => l.id)).toEqual(['a', 'b', 'c']);
    expect(both.nextCursor).toBeNull();
    expect(both.capped).toBe(false);
  });

  it('stops at the limit while more remain', () => {
    let feed = EMPTY_DIRECTORY_FEED;
    for (let n = 0; n < 4; n++) feed = appendDirectoryPage(feed, page(ids(n * 50, 50), `c${n}`));
    expect(feed.listings).toHaveLength(DIRECTORY_FEED_LIMIT);
    expect(feed.capped).toBe(true);
    expect(feed.nextCursor).toBeNull();
  });

  it('is not capped when the limit is reached exactly on the last page', () => {
    let feed = EMPTY_DIRECTORY_FEED;
    for (let n = 0; n < 4; n++) {
      feed = appendDirectoryPage(feed, page(ids(n * 50, 50), n < 3 ? `c${n}` : null));
    }
    expect(feed.listings).toHaveLength(200);
    expect(feed.capped).toBe(false);
  });
});

// L2-054 AC1: grouped in the directory's kind order; a kind with no listing has no group.
describe('directoryGroups', () => {
  it('groups in kind order, keeping each group in the order served, and skips empty kinds', () => {
    const groups = directoryGroups(
      [
        row('m1', 'church-ministry'),
        row('o1'),
        row('p1', 'person'),
        row('o2'),
        row('c1', 'company'),
      ],
      (r) => r.id,
    );
    expect(groups.map((g) => [g.info.plural, g.rows])).toEqual([
      ['Organizations', ['o1', 'o2']],
      ['People', ['p1']],
      ['Companies', ['c1']],
      ['Church Ministries', ['m1']],
    ]);
  });

  it('answers no group for no listing', () => {
    expect(directoryGroups([], (r) => r)).toEqual([]);
  });
});
