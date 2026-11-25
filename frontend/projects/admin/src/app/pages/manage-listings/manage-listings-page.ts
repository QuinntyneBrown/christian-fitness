import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { ADMIN_DIRECTORY_SERVICE, type SuggestionDetailDto, type SuggestionListDto } from '@cf/api';
import {
  Button,
  type CheckRowItem,
  EmptyState,
  type PickCardItem,
  PickCards,
  Skeleton,
  SkeletonRegion,
  Split,
  Suggestion,
  type TabItem,
  Tabs,
} from '@cf/components';
import {
  APPROVE_HINT,
  kindLabel,
  LISTING_CHECKS,
  passedCount,
  passedLine,
  suggestionByLine,
  suggestionFromLine,
  suggestionKindAndArea,
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

const SUGGESTIONS_HREF = '/listings';
const LISTED_HREF = '/listings?tab=listed';

/**
 * Listings (mock docs/mocks/pages/admin-listings/; L2-073; journey 18; ADR 0087). Suggestions lists
 * every suggestion oldest first as pick cards, with who sent it and when, and shows the chosen one
 * (`?selected={id}`, else the first) with its checks; Listed (`?tab=listed`) is the published
 * listings. While the list loads, skeletons; with none waiting, an empty state pointing to Listed;
 * when it does not load, the error state with Try again. A Moderator uses it as an Admin does. Its
 * service is this screen's own, provided here (AGENTS.md, "Scope state to its use").
 */
@Component({
  selector: 'cf-manage-listings-page',
  imports: [Button, EmptyState, PickCards, Skeleton, SkeletonRegion, Split, Suggestion, Tabs],
  templateUrl: './manage-listings-page.html',
  styleUrl: './manage-listings-page.scss',
  providers: [{ provide: ADMIN_DIRECTORY_SERVICE, useClass: HttpAdminDirectoryService }],
})
export default class ManageListingsPage {
  private readonly directory = inject(ADMIN_DIRECTORY_SERVICE);
  private readonly router = inject(Router);
  private readonly reload = new Subject<void>();
  /** The suggestion to show, each time the list or the address may have changed it. */
  private readonly shown = new Subject<string | null>();

  protected readonly listedHref = LISTED_HREF;
  protected readonly tab = signal<'suggestions' | 'listed'>('suggestions');
  private readonly selected = signal<string | null>(null);
  protected readonly state = signal<ListState>({ kind: 'loading' });
  protected readonly detailState = signal<DetailState>({ kind: 'loading' });

  protected readonly tabs = computed<TabItem[]>(() => {
    const state = this.state();
    const list = state.kind === 'ready' ? state.list : null;
    return [
      { label: 'Suggestions', href: SUGGESTIONS_HREF, count: list?.waiting },
      { label: 'Listed', href: LISTED_HREF, count: list?.listed },
    ];
  });
  protected readonly currentTab = computed(() =>
    this.tab() === 'listed' ? LISTED_HREF : SUGGESTIONS_HREF,
  );
  protected readonly cards = computed<PickCardItem[]>(() => {
    const state = this.state();
    if (state.kind !== 'ready') return [];
    return state.list.suggestions.map((suggestion) => ({
      id: suggestion.id,
      href: `${SUGGESTIONS_HREF}?selected=${encodeURIComponent(suggestion.id)}`,
      title: suggestion.name,
      meta: [suggestionKindAndArea(suggestion), suggestionFromLine(suggestion, state.now)],
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
    };
  });
  protected readonly approveHint = APPROVE_HINT;

  constructor() {
    const route = inject(ActivatedRoute);
    route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.tab.set(params.get('tab') === 'listed' ? 'listed' : 'suggestions');
      this.selected.set(params.get('selected'));
      this.shown.next(this.currentId());
    });

    this.reload
      .pipe(
        startWith(undefined),
        switchMap(() => {
          this.state.set({ kind: 'loading' });
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
}
