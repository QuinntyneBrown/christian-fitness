import { TestBed } from '@angular/core/testing';
import {
  DIRECTORY_SERVICE,
  type DirectoryApi,
  type ListingFollowDto,
  type ListingFollowState,
} from '@cf/api';
import { Subject } from 'rxjs';
import { ListingFollowStore } from './listing-follow-store';

// L2-056 AC1 to AC4 (ADR 0088): a press changes a listing at once and the server's answer settles it.
describe('ListingFollowStore', () => {
  let answers: Subject<ListingFollowDto>[];
  let sent: string[];
  let store: ListingFollowStore;

  beforeEach(() => {
    answers = [];
    sent = [];
    const answer = (what: string) => (id: string) => {
      sent.push(`${what} ${id}`);
      const reply = new Subject<ListingFollowDto>();
      answers.push(reply);
      return reply;
    };
    const directory: Partial<DirectoryApi> = {
      follow: answer('follow'),
      unfollow: answer('unfollow'),
    };
    TestBed.configureTestingModule({
      providers: [ListingFollowStore, { provide: DIRECTORY_SERVICE, useValue: directory }],
    });
    store = TestBed.inject(ListingFollowStore);
  });

  const state = (id: string): ListingFollowState | undefined => store.follows().get(id);

  it('takes each listing as loaded, with its count where the screen shows one', () => {
    store.track([
      { id: 'lakeshore', following: false, followers: 612 },
      { id: 'okafor', following: true },
    ]);

    expect(state('lakeshore')).toEqual({ following: false, followers: 612, busy: false });
    expect(state('okafor')).toEqual({ following: true, followers: null, busy: false });
  });

  // One row per direction: the press changes the state and the count at once, then the answer settles it.
  it.each<[string, boolean, number, string, ListingFollowDto]>([
    ['follows', false, 612, 'follow lakeshore', { following: true, followers: 640 }],
    ['unfollows', true, 612, 'unfollow lakeshore', { following: false, followers: 600 }],
  ])('%s at once and takes the server’s count', (_, following, followers, request, answer) => {
    store.track([{ id: 'lakeshore', following, followers }]);

    store.toggle('lakeshore', 'Lakeshore Runners Fellowship');

    expect(state('lakeshore')).toMatchObject({
      following: !following,
      followers: followers + (following ? -1 : 1),
    });
    expect(sent).toEqual([request]);
    answers[0].next(answer);
    expect(state('lakeshore')).toEqual({ ...answer, busy: false });
  });

  it('keeps a row without a count without one', () => {
    store.track([{ id: 'okafor', following: false }]);

    store.toggle('okafor', 'Danielle Okafor');
    answers[0].next({ following: true, followers: 936 });

    expect(state('okafor')).toEqual({ following: true, followers: null, busy: false });
  });

  it('does nothing for a listing it was not given', () => {
    store.toggle('unknown', 'Nobody');

    expect(sent).toEqual([]);
    expect(store.follows().size).toBe(0);
  });

  it('drops the requests in flight when its screen ends', () => {
    store.track([{ id: 'lakeshore', following: false, followers: 612 }]);
    store.toggle('lakeshore', 'Lakeshore Runners Fellowship');

    store.ngOnDestroy();

    expect(answers[0].observed).toBe(false);
  });
});
