import { TestBed } from '@angular/core/testing';
import {
  DIRECTORY_SERVICE,
  type DirectoryApi,
  type ListingFollowDto,
  type ListingFollowState,
  TOASTS_SERVICE,
} from '@cf/api';
import { Subject } from 'rxjs';
import { FOLLOW_FAILED_TEXT, followFailedTitle, ListingFollowStore } from './listing-follow-store';

// L2-056 AC1 to AC4, AC8 and AC9 (ADR 0088): a press changes a listing at once and marks it in flight;
// the server's answer settles it, and a failure puts it back with a toast naming it.
describe('ListingFollowStore', () => {
  let answers: Subject<ListingFollowDto>[];
  let sent: string[];
  let toasts: [string, string][];
  let store: ListingFollowStore;

  beforeEach(() => {
    answers = [];
    sent = [];
    toasts = [];
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
      providers: [
        ListingFollowStore,
        { provide: DIRECTORY_SERVICE, useValue: directory },
        {
          provide: TOASTS_SERVICE,
          useValue: { show: (title: string, text: string) => toasts.push([title, text]) },
        },
      ],
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

    expect(state('lakeshore')).toEqual({
      following: !following,
      followers: followers + (following ? -1 : 1),
      busy: true,
    });
    expect(sent).toEqual([request]);
    answers[0].next(answer);
    expect(state('lakeshore')).toEqual({ ...answer, busy: false });
  });

  it('ignores a press while its change is in flight, and takes presses again once it settles', () => {
    store.track([{ id: 'lakeshore', following: false, followers: 612 }]);
    store.toggle('lakeshore', 'Lakeshore Runners Fellowship');

    store.toggle('lakeshore', 'Lakeshore Runners Fellowship');
    expect(sent).toEqual(['follow lakeshore']);
    answers[0].next({ following: true, followers: 613 });
    store.toggle('lakeshore', 'Lakeshore Runners Fellowship');

    expect(sent).toEqual(['follow lakeshore', 'unfollow lakeshore']);
    expect(state('lakeshore')).toEqual({ following: false, followers: 612, busy: true });
  });

  // One row per direction: a failure, a refusal by code included, puts it back and names it in a toast.
  it.each<[boolean, string]>([
    [false, "We couldn't follow Faith & Footwork"],
    [true, "We couldn't unfollow Faith & Footwork"],
  ])('puts it back after a failure (following %s) and says "%s"', (following, title) => {
    store.track([{ id: 'faith', following, followers: 40 }]);

    store.toggle('faith', 'Faith & Footwork');
    answers[0].error(new Error('too_many_attempts'));

    expect(state('faith')).toEqual({ following, followers: 40, busy: false });
    expect(toasts).toEqual([[title, 'Try again in a moment.']]);
    expect(followFailedTitle(!following, 'Faith & Footwork')).toBe(title);
    expect(FOLLOW_FAILED_TEXT).toBe('Try again in a moment.');
  });

  it('keeps a listing in flight when the screen loads its listings again', () => {
    store.track([
      { id: 'lakeshore', following: false, followers: 612 },
      { id: 'okafor', following: false },
    ]);
    store.toggle('lakeshore', 'Lakeshore Runners Fellowship');

    store.track([{ id: 'okafor', following: true }]);

    expect([...store.follows().keys()]).toEqual(['lakeshore', 'okafor']);
    expect(state('lakeshore')).toEqual({ following: true, followers: 613, busy: true });
    expect(state('okafor')).toEqual({ following: true, followers: null, busy: false });
    answers[0].next({ following: true, followers: 613 });
    store.track([{ id: 'okafor', following: true }]);
    expect([...store.follows().keys()]).toEqual(['okafor']);
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
