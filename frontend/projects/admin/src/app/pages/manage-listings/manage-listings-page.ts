import { Component, computed, DestroyRef, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ADMIN_DIRECTORY_SERVICE,
  type ListedListingDto,
  type ListingCheckSlug,
  type SuggestionCheckDto,
  type SuggestionDetailDto,
  type SuggestionListDto,
  TOASTS_SERVICE,
} from '@cf/api';
import {
  Button,
  type CheckRowChange,
  type CheckRowItem,
  EmptyState,
  ListedCell,
  type PickCardItem,
  PickCards,
  Skeleton,
  SkeletonRegion,
  Split,
  Suggestion,
  Table,
  type TableColumn,
  type TableRow,
  type TabItem,
  Tabs,
  type ToastData,
  ToastRegion,
} from '@cf/components';
import {
  APPROVE_HINT,
  decisionResult,
  decisionTag,
  kindLabel,
  LISTING_CHECKS,
  listedRowViewOf,
  type ListedRowView,
  passedCount,
  passedLine,
  suggestionByLine,
  suggestionFromLine,
  suggestionKindAndArea,
  type SuggestionClaim,
  reviewRefusalOf,
  ToastStore,
  websiteLabel,
} from '@cf/domain';
import { catchError, distinctUntilChanged, map, of, startWith, Subject, switchMap } from 'rxjs';
import { HttpAdminDirectoryService } from '../../services/http-admin-directory.service';

/** The list: skeletons, the answer (empty or not) with when it came, or the error state. */
type ListState =
  { kind: 'loading' } | { kind: 'ready'; list: SuggestionListDto; now: Date } | { kind: 'failed' };

/** The chosen suggestion: on its way, shown, or not loaded. */
type DetailState =
  { kind: 'loading' } | { kind: 'ready'; detail: SuggestionDetailDto } | { kind: 'failed' };

/** Listed: skeletons, the rows shown so far and where to read on, or the error state. */
type ListedState =
  | { kind: 'loading' }
  | { kind: 'ready'; listings: ListedListingDto[]; next: string | null; more: boolean }
  | { kind: 'failed' };

/** Listed's columns (mock `admin-listings/listed`). */
const LISTED_COLUMNS: readonly TableColumn[] = [
  { key: 'listing', label: 'Listing', kind: 'custom' },
  { key: 'kind', label: 'Kind', kind: 'nowrap' },
  { key: 'area', label: 'Area', kind: 'muted' },
  { key: 'followers', label: 'Followers', kind: 'num' },
];

const SUGGESTIONS_HREF = '/listings';
const LISTED_HREF = '/listings?tab=listed';

/** The toast of a tick that did not save (mock `admin-listings/tick-failed`). */
const TICK_FAILED = "We couldn't save that check";
/** The toast of an approval that did not go through (ADR 0090's stand-in for a missing mock). */
const APPROVE_FAILED = "We couldn't approve the suggestion";
/** The toast when another member of staff decided it first. */
const ALREADY_DECIDED = 'This suggestion was already decided';
/** The toasts announced at once, as failures. */
/** The toast when the next page of Listed did not load. */
const LISTED_MORE_FAILED = "More listings didn't load";
const FAILURES = new Set([TICK_FAILED, APPROVE_FAILED, ALREADY_DECIDED, LISTED_MORE_FAILED]);

/** A decision made on this visit. */
interface Decision {
  status: 'approved' | 'declined';
  claim: SuggestionClaim | null;
}

/**
 * Listings (mock docs/mocks/pages/admin-listings/; L2-073; journey 18; ADR 0090). Suggestions lists
 * every suggestion oldest first as pick cards, with who sent it and when, and shows the chosen one
 * (`?selected={id}`, else the first) with its checks; Listed (`?tab=listed`) is the published
 * listings. While the list loads, skeletons; with none waiting, an empty state pointing to Listed;
 * when it does not load, the error state with Try again. A Moderator uses it as an Admin does. Its
 * service is this screen's own, provided here (AGENTS.md, "Scope state to its use").
 */
@Component({
  selector: 'cf-manage-listings-page',
  imports: [
    Button,
    EmptyState,
    PickCards,
    Skeleton,
    SkeletonRegion,
    Split,
    ListedCell,
    Suggestion,
    Table,
    Tabs,
    ToastRegion,
  ],
  templateUrl: './manage-listings-page.html',
  styleUrl: './manage-listings-page.scss',
  providers: [
    { provide: ADMIN_DIRECTORY_SERVICE, useClass: HttpAdminDirectoryService },
    { provide: TOASTS_SERVICE, useClass: ToastStore },
  ],
})
export default class ManageListingsPage {
  private readonly directory = inject(ADMIN_DIRECTORY_SERVICE);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  /** The decline dialog is open or on its way, so a second press does nothing. */
  private dialogOpen = false;
  protected readonly toasts = inject(TOASTS_SERVICE);
  private readonly reload = new Subject<void>();
  /** The suggestion to show, each time the list or the address may have changed it. */
  private readonly shown = new Subject<string | null>();

  protected readonly listedHref = LISTED_HREF;
  protected readonly tab = signal<'suggestions' | 'listed'>('suggestions');
  private readonly selected = signal<string | null>(null);
  protected readonly state = signal<ListState>({ kind: 'loading' });
  protected readonly detailState = signal<DetailState>({ kind: 'loading' });
  /** The decisions made on this visit, by suggestion id. */
  private readonly decisions = signal<Readonly<Partial<Record<string, Decision>>>>({});
  /** An approval of the suggestion showing is on its way. */
  protected readonly approving = signal(false);
  protected readonly listedState = signal<ListedState>({ kind: 'loading' });
  private readonly listedReload = new Subject<void>();
  private listedAsked = false;
  protected readonly listedColumns = LISTED_COLUMNS;
  /** Each Listed row's cell view, by listing id. */
  protected readonly listedViews = computed<ReadonlyMap<string, ListedRowView>>(() => {
    const state = this.listedState();
    const listings = state.kind === 'ready' ? state.listings : [];
    return new Map(listings.map((listing) => [listing.id, listedRowViewOf(listing)]));
  });
  protected readonly listedRows = computed<TableRow[]>(() =>
    Array.from(this.listedViews().values(), (view) => ({
      id: view.id,
      name: view.name,
      cells: {
        listing: { text: view.name },
        kind: { text: view.kind },
        area: { text: view.area },
        followers: { text: view.followers },
      },
    })),
  );

  protected readonly tabs = computed<TabItem[]>(() => {
    const state = this.state();
    const list = state.kind === 'ready' ? state.list : null;
    const decidedHere = list
      ? list.suggestions.filter((s) => s.status === 'waiting' && this.decisions()[s.id]).length
      : 0;
    return [
      {
        label: 'Suggestions',
        href: SUGGESTIONS_HREF,
        count: list ? Math.max(list.waiting - decidedHere, 0) : undefined,
      },
      { label: 'Listed', href: LISTED_HREF, count: list?.listed },
    ];
  });
  protected readonly currentTab = computed(() =>
    this.tab() === 'listed' ? LISTED_HREF : SUGGESTIONS_HREF,
  );
  protected readonly cards = computed<PickCardItem[]>(() => {
    const state = this.state();
    if (state.kind !== 'ready') return [];
    const decisions = this.decisions();
    return state.list.suggestions.map((suggestion) => ({
      id: suggestion.id,
      href: `${SUGGESTIONS_HREF}?selected=${encodeURIComponent(suggestion.id)}`,
      title: suggestion.name,
      meta: [suggestionKindAndArea(suggestion), suggestionFromLine(suggestion, state.now)],
      tag: decisionTag(decisions[suggestion.id]?.status ?? suggestion.status),
    }));
  });
  /** The suggestion showing: the one the address names when listed, else the first. */
  protected readonly currentId = computed(() => {
    const cards = this.cards();
    const asked = this.selected();
    return cards.find((card) => card.id === asked)?.id ?? cards[0]?.id ?? null;
  });
  protected readonly view = computed(() => {
    const state = this.detailState();
    if (state.kind !== 'ready') return null;
    const detail = state.detail;
    const decision = this.decisions()[detail.id];
    const status = decision?.status ?? detail.status;
    const checks: CheckRowItem[] = LISTING_CHECKS.map((info) => ({
      check: info.check,
      label: info.label,
      standard: info.standard,
      passed: detail.checks.some((check) => check.check === info.check && check.passed),
    }));
    return {
      kind: kindLabel(detail.kind),
      name: detail.name,
      area: detail.area,
      website: detail.website,
      websiteLabel: detail.website ? websiteLabel(detail.website) : '',
      note: detail.reason,
      by: suggestionByLine(detail),
      checks,
      passed: passedLine(detail.checks),
      canApprove: passedCount(detail.checks) === LISTING_CHECKS.length,
      locked: status !== 'waiting' || this.approving(),
      result: status === 'waiting' ? null : decisionResult(status, decision?.claim ?? null),
    };
  });
  protected readonly approveHint = APPROVE_HINT;
  protected readonly toastViews = computed<ToastData[]>(() =>
    this.toasts.toasts().map(({ id, title, text }) => ({
      id: String(id),
      tone: FAILURES.has(title) ? 'danger' : 'success',
      heading: title,
      text,
    })),
  );

  constructor() {
    // Subscribed before the address is read, which emits at once and may ask for Listed.
    this.listedReload
      .pipe(
        switchMap(() => {
          this.listedState.set({ kind: 'loading' });
          return this.directory.listings().pipe(
            map(
              ({ listings, next }) =>
                ({ kind: 'ready', listings, next, more: false }) satisfies ListedState,
            ),
            catchError(() => of({ kind: 'failed' } satisfies ListedState)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((state) => this.listedState.set(state));

    const route = inject(ActivatedRoute);
    route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.tab.set(params.get('tab') === 'listed' ? 'listed' : 'suggestions');
      this.selected.set(params.get('selected'));
      this.shown.next(this.currentId());
      // Listed is read the first time its tab shows.
      if (this.tab() === 'listed' && !this.listedAsked) {
        this.listedAsked = true;
        this.listedReload.next();
      }
    });

    this.reload
      .pipe(
        startWith(undefined),
        switchMap(() => {
          this.state.set({ kind: 'loading' });
          this.decisions.set({});
          // The suggestion showing is read again with the list, even when it stays the same one.
          this.shown.next(null);
          return this.directory.suggestions().pipe(
            map((list) => ({ kind: 'ready', list, now: new Date() }) satisfies ListState),
            catchError(() => of({ kind: 'failed' } satisfies ListState)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((state) => {
        this.state.set(state);
        this.shown.next(this.currentId());
      });

    this.shown
      .pipe(
        distinctUntilChanged(),
        switchMap((id) => {
          if (id === null) return of(null);
          this.detailState.set({ kind: 'loading' });
          return this.directory.suggestion(id).pipe(
            map((detail) => ({ kind: 'ready', detail }) satisfies DetailState),
            catchError(() => of({ kind: 'failed' } satisfies DetailState)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((state) => {
        if (state) this.detailState.set(state);
      });
  }

  protected navigate(href: string): void {
    void this.router.navigateByUrl(href);
  }

  protected choose(id: string): void {
    void this.router.navigateByUrl(`${SUGGESTIONS_HREF}?selected=${encodeURIComponent(id)}`);
  }

  protected tryAgain(): void {
    this.reload.next();
  }

  protected dismissToast(id: string): void {
    this.toasts.dismiss(Number(id));
  }

  /**
   * Saves a tick or untick at once (L2-073 AC4): the box shows the change while it is sent and
   * the answer's checks after; one that does not save goes back as it was and a toast says so.
   */
  protected setCheck({ check, passed }: CheckRowChange): void {
    const state = this.detailState();
    if (state.kind !== 'ready') return;
    const id = state.detail.id;
    const slug = check as ListingCheckSlug;
    const before = state.detail.checks;
    this.setChecks(id, withCheck(before, slug, passed));
    this.directory
      .setCheck(id, slug, passed)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (answer) => this.setChecks(id, answer.checks),
        error: () => {
          this.setChecks(id, withCheck(this.checksOf(id) ?? before, slug, !passed));
          this.toasts.show(TICK_FAILED, 'The box is back as it was. Try again in a moment.');
        },
      });
  }

  /**
   * Approves the suggestion showing (L2-073 AC6): the button reads "Approving…" and the checks are
   * read-only while it is sent; then the panel says how the claim went, its card is tagged and the
   * count falls. One that does not go through says so; one decided elsewhere first shows the list
   * as it is now.
   */
  protected approve(): void {
    const state = this.detailState();
    if (state.kind !== 'ready' || this.approving()) return;
    const id = state.detail.id;
    this.approving.set(true);
    this.directory
      .approve(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (answer) => {
          this.approving.set(false);
          this.decide(id, { status: 'approved', claim: answer.claim });
        },
        error: (error: unknown) => this.refused(error, APPROVE_FAILED),
      });
  }

  /**
   * Opens the decline dialog for the suggestion showing (L2-073 AC8; mock `decline-suggestion`),
   * imported on the first Decline. A decline marks it Declined; one found already decided shows
   * the list as it is now.
   */
  protected async decline(): Promise<void> {
    const state = this.detailState();
    if (state.kind !== 'ready' || this.approving() || this.dialogOpen) return;
    const { id, name } = state.detail;
    this.dialogOpen = true;
    const { openDeclineSuggestion } =
      await import('../../dialogs/decline-suggestion/decline-suggestion-dialog');
    if (this.destroyRef.destroyed) return;
    openDeclineSuggestion(this.injector, {
      id,
      name,
      kindAndArea: suggestionKindAndArea(state.detail),
    })
      .closed.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.dialogOpen = false;
        if (result === 'declined') this.decide(id, { status: 'declined', claim: null });
        if (result === 'stale') this.reload.next();
      });
  }

  protected tryListedAgain(): void {
    this.listedReload.next();
  }

  /** Reads the next page of Listed after the last shown and adds it below (ADR 0090). */
  protected loadMoreListed(): void {
    const state = this.listedState();
    if (state.kind !== 'ready' || state.next === null || state.more) return;
    this.listedState.set({ ...state, more: true });
    this.directory
      .listings(state.next)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (page) =>
          this.listedState.set({
            kind: 'ready',
            listings: [...state.listings, ...page.listings],
            next: page.next,
            more: false,
          }),
        error: () => {
          this.listedState.set({ ...state, more: false });
          this.toasts.show(LISTED_MORE_FAILED, 'Try again in a moment.');
        },
      });
  }

  /**
   * Opens the staff listing editor on the listing `id` (L2-073 AC13; mock
   * `directory-listing-editor`), imported on the first Edit. A save reads Listed again and a toast
   * says so (mock `admin-listings/listing-saved`); a listing found gone reads Listed again.
   */
  protected async edit(id: string): Promise<void> {
    const state = this.listedState();
    const listing = state.kind === 'ready' ? state.listings.find((l) => l.id === id) : undefined;
    if (!listing || this.dialogOpen) return;
    this.dialogOpen = true;
    const { openDirectoryListingEditor } =
      await import('../../dialogs/decline-suggestion/decline-suggestion-dialog');
    if (this.destroyRef.destroyed) return;
    openDirectoryListingEditor(this.injector, listing)
      .closed.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.dialogOpen = false;
        if (!result) return;
        if ('saved' in result) {
          this.toasts.show(`${result.saved.name} updated`, 'The directory shows the changes now.');
        }
        this.listedReload.next();
      });
  }

  private decide(id: string, decision: Decision): void {
    this.decisions.update((decisions) => ({ ...decisions, [id]: decision }));
  }

  /** A decision that did not go through: a toast says why, and a stale list is read again. */
  private refused(error: unknown, failed: string): void {
    this.approving.set(false);
    if (reviewRefusalOf(error) === 'decided') {
      this.toasts.show(ALREADY_DECIDED, 'The list shows where it stands now.');
      this.reload.next();
      return;
    }

    this.toasts.show(failed, 'Nothing changed. Try again in a moment.');
  }

  private checksOf(id: string): SuggestionCheckDto[] | null {
    const state = this.detailState();
    return state.kind === 'ready' && state.detail.id === id ? state.detail.checks : null;
  }

  /** Shows `checks` on the suggestion `id` when it is still the one showing. */
  private setChecks(id: string, checks: SuggestionCheckDto[]): void {
    this.detailState.update((state) =>
      state.kind === 'ready' && state.detail.id === id
        ? { kind: 'ready', detail: { ...state.detail, checks } }
        : state,
    );
  }
}

/** `checks` with `check` set to `passed`. */
function withCheck(
  checks: readonly SuggestionCheckDto[],
  check: ListingCheckSlug,
  passed: boolean,
): SuggestionCheckDto[] {
  return [...checks.filter((row) => row.check !== check), { check, passed }];
}
