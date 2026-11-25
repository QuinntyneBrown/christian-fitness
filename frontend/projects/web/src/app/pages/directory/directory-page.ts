import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { DIRECTORY_SERVICE, LISTING_FOLLOWS, type ListingKind, TOASTS_SERVICE } from '@cf/api';
import {
  Button,
  Chip,
  ChipBar,
  Container,
  DirectoryGroup,
  EmptyState,
  InlineMessage,
  Link,
  List,
  ListingRow,
  SearchField,
  SkeletonRegion,
  Spinner,
  type ToastData,
  ToastRegion,
} from '@cf/components';
import {
  appendDirectoryPage,
  DIRECTORY_SEARCH_DEBOUNCE_MS,
  DIRECTORY_SEARCH_MAX,
  directoryGroups,
  directoryHref,
  directoryKindChips,
  directorySearchTerm,
  type DirectoryFeed,
  EMPTY_DIRECTORY_FEED,
  listingKindInfo,
  ListingFollowStore,
  listingKindOf,
  type ListingRowView,
  listingRowViewOf,
  noDirectoryMatchText,
  ToastStore,
} from '@cf/domain';
import { debounceTime, Subject, type Subscription } from 'rxjs';
import { HttpDirectoryService } from '../../services/http-directory.service';
import { InView } from '../events/in-view';

/** Two groups of three skeleton rows stand in while the first page loads (mock `directory/loading`). */
const SKELETON_GROUPS = [
  { id: 'a', rows: [{ id: '1' }, { id: '2' }, { id: '3' }] },
  { id: 'b', rows: [{ id: '4' }, { id: '5' }, { id: '6' }] },
];

/**
 * Directory at `/directory` (L2-054; ADR 0082): the published listings grouped by kind, each kind
 * in name order, with a chip for All and each kind and its count, and a search. The kind and the
 * search live in the address (`?kind=&q=`), so Back and a reload keep them; a chosen kind shows one
 * list without a heading. Typing waits 300 ms after the last keystroke, and a search under 2
 * characters is none. The next 50 load when the end of the list comes into view, until there is no
 * more or 200 are shown. `DIRECTORY_SERVICE` is bound here, so the client lives only while the
 * screen does, and the request, the debounce, the observer and the rows go with it. While the
 * first page loads, skeleton rows show under the heading, search and chips; with nobody listed it
 * points to Events; a 4xx or no answer shows "The directory didn't load" with Try again (a 5xx is
 * the server-error screen's). Each row leads to the listing's profile (ADR 0087) and ends with
 * Follow, which follows or unfollows the listing at once and, if the request fails, goes back with
 * a toast naming it (L2-056; ADR 0088); the follows and the toasts end with the visit.
 */
@Component({
  selector: 'cf-directory-page',
  imports: [
    Button,
    Chip,
    ChipBar,
    Container,
    DirectoryGroup,
    EmptyState,
    InlineMessage,
    InView,
    Link,
    List,
    ListingRow,
    SearchField,
    SkeletonRegion,
    Spinner,
    ToastRegion,
  ],
  providers: [
    { provide: DIRECTORY_SERVICE, useClass: HttpDirectoryService },
    { provide: LISTING_FOLLOWS, useClass: ListingFollowStore },
    { provide: TOASTS_SERVICE, useClass: ToastStore },
  ],
  templateUrl: './directory-page.html',
  styleUrl: './directory-page.scss',
})
export default class DirectoryPage {
  private readonly directory = inject(DIRECTORY_SERVICE);
  private readonly follows = inject(LISTING_FOLLOWS);
  protected readonly toasts = inject(TOASTS_SERVICE);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly typed = new Subject<string>();
  private request: Subscription | null = null;

  protected readonly searchMax = DIRECTORY_SEARCH_MAX;
  protected readonly skeletons = SKELETON_GROUPS;
  /** The chosen kind, or All. */
  protected readonly kind = signal<ListingKind | null>(null);
  /** The search the address carries, or none. */
  protected readonly q = signal<string | null>(null);
  /** What the field shows: the address's search, then what the member types. */
  protected readonly searchText = signal('');
  protected readonly state = signal<'loading' | 'loaded' | 'failed'>('loading');
  /** The next page: waiting for the end to show, on its way, or failed. */
  protected readonly more = signal<'idle' | 'loading' | 'failed'>('idle');
  private readonly feed = signal<DirectoryFeed>(EMPTY_DIRECTORY_FEED);

  /** Each shown listing's follow, changed at a press (L2-056). */
  protected readonly followStates = this.follows.follows;
  /** A failed follow or unfollow, as a danger toast (L2-056 AC3; mock `directory/follow-failed`). */
  protected readonly toastViews = computed<ToastData[]>(() =>
    this.toasts.toasts().map(({ id, title, text }) => ({
      id: String(id),
      tone: 'danger',
      heading: title,
      text,
    })),
  );
  protected readonly chips = computed(() =>
    directoryKindChips(this.kind(), this.feed().counts, this.q()),
  );
  protected readonly groups = computed(() => {
    const kind = this.kind();
    const listings = this.feed().listings;
    if (kind === null) return directoryGroups<ListingRowView>(listings, listingRowViewOf);
    return [{ info: listingKindInfo(kind), rows: listings.map(listingRowViewOf) }];
  });
  protected readonly none = computed(() => this.feed().listings.length === 0);
  protected readonly noMatchText = computed(() => noDirectoryMatchText(this.q() ?? ''));
  protected readonly noKindText = computed(() => {
    const kind = this.kind();
    return kind === null
      ? ''
      : `No ${listingKindInfo(kind).plural.toLowerCase()} are listed yet. Our team checks every suggestion.`;
  });
  /** The end of the list is watched only while there is a next page and none is on its way. */
  protected readonly watching = computed(
    () => this.state() === 'loaded' && this.more() === 'idle' && this.feed().nextCursor !== null,
  );
  protected readonly capped = computed(() => this.feed().capped);

  constructor() {
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        const q = directorySearchTerm(params.get('q'));
        this.kind.set(listingKindOf(params.get('kind')));
        // Back, a chip or a reload may change the search; what the member is typing stays.
        if (directorySearchTerm(this.searchText()) !== q) this.searchText.set(q ?? '');
        this.q.set(q);
        this.loadFirst();
      });
    this.typed
      .pipe(debounceTime(DIRECTORY_SEARCH_DEBOUNCE_MS), takeUntilDestroyed())
      .subscribe((text) => {
        const q = directorySearchTerm(text);
        if (q === this.q()) return;
        void this.router.navigateByUrl(directoryHref(this.kind(), q), { replaceUrl: true });
      });
  }

  protected navigate(href: string): void {
    void this.router.navigateByUrl(href);
  }

  protected onSearch(text: string): void {
    this.searchText.set(text);
    this.typed.next(text);
  }

  /** Follows or unfollows a row's listing at once (L2-056 AC1 to AC3). */
  protected toggleFollow(row: ListingRowView): void {
    this.follows.toggle(row.id, row.name);
  }

  protected dismissToast(id: string): void {
    this.toasts.dismiss(Number(id));
  }

  /** Clears the search and the kind (L2-054 AC5). */
  protected clearSearch(): void {
    this.searchText.set('');
    this.typed.next('');
    this.navigate('/directory');
  }

  /** Asks for the first page again, in place. */
  protected retry(): void {
    this.loadFirst();
  }

  /** Asks for the next page, when the end shows or Try again is pressed. */
  protected loadMore(): void {
    const cursor = this.feed().nextCursor;
    if (cursor === null || this.more() === 'loading') return;
    this.request?.unsubscribe();
    this.more.set('loading');
    this.request = this.directory
      .list({ kind: this.kind(), q: this.q(), cursor })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.feed.update((feed) => appendDirectoryPage(feed, page));
          this.follows.track(this.feed().listings);
          this.more.set('idle');
        },
        error: () => this.more.set('failed'),
      });
  }

  private loadFirst(): void {
    this.request?.unsubscribe();
    this.state.set('loading');
    this.more.set('idle');
    this.feed.update((feed) => ({ ...EMPTY_DIRECTORY_FEED, counts: feed.counts }));
    this.request = this.directory
      .list({ kind: this.kind(), q: this.q(), cursor: null })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) => {
          this.feed.set(appendDirectoryPage(EMPTY_DIRECTORY_FEED, page));
          this.follows.track(this.feed().listings);
          this.state.set('loaded');
        },
        // A 5xx has already opened the server-error screen; anything else shows the failed state.
        error: () => this.state.set('failed'),
      });
  }
}
