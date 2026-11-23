import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ADMIN_MEMBERS_SERVICE,
  type AdminMemberDto,
  type AdminMemberListDto,
  type AdminMemberQuery,
} from '@cf/api';
import {
  Button,
  EmptyState,
  Pagination,
  SearchField,
  SkeletonRegion,
  Status,
  Table,
  type TableColumn,
  type TableRow,
  type TabItem,
  Tabs,
} from '@cf/components';
import {
  joinedOn,
  MEMBER_SEARCH_DELAY_MS,
  memberCountLabel,
  memberListHref,
  memberListQueryOf,
  memberPageCount,
  memberRangeLabel,
  memberStatusLabel,
  memberTabs,
  noMembersMessage,
} from '@cf/domain';
import {
  catchError,
  combineLatest,
  debounceTime,
  map,
  of,
  startWith,
  Subject,
  switchMap,
} from 'rxjs';
import { HttpAdminMembersService } from '../../services/http-admin-members.service';

/** The table's columns (mock `admin-members`); a member with no home church reads "Not given". */
const COLUMNS: readonly TableColumn[] = [
  { key: 'member', label: 'Member', kind: 'person' },
  { key: 'church', label: 'Church', kind: 'muted', empty: 'Not given' },
  { key: 'joined', label: 'Joined', kind: 'nowrap' },
  { key: 'events', label: 'Events', kind: 'num' },
  { key: 'status', label: 'Status', kind: 'custom' },
];

/** Everyone, unsearched, on the first page. */
const EVERYONE: AdminMemberQuery = { status: 'all', q: '', page: 1 };

/** What the list shows: skeleton rows, the answered page of members, or the error state. */
type ListState =
  { kind: 'loading' } | { kind: 'ready'; list: AdminMemberListDto } | { kind: 'failed' };

/** What the pages under the table are worked out from: the last answer, and the list it was for. */
interface Paging {
  listKey: string;
  matches: number;
  pageSize: number;
}

/** A list apart from its page: the tab and the search. */
const listKeyOf = (query: AdminMemberQuery): string => `${query.status}\n${query.q}`;

/**
 * The Members page (mock docs/mocks/pages/admin-members/; L2-028; ADR 0022): the members newest
 * joined first, 25 to a page, with the number of members in the community. The URL is its state:
 * `status` names the tab, `q` the search and `page` the page, so a tab or a page moves without
 * reloading and asks for that list, and Back, a reload and a shared link show it again. Typing in
 * the search waits for the last key, then replaces the URL and returns to the first page. A new
 * page moves focus to the table. While the list loads, skeleton rows, with the pages kept in
 * place;
 * with nobody to list, an empty state; when it does not load, the error state with Try again.
 * Every part is the design system's, composed from the library: search field, tabs, table with a
 * person cell and a status badge, skeleton region and empty and error states.
 * Its service is this screen's own, provided here (AGENTS.md, "Scope state to its use").
 */
@Component({
  selector: 'cf-admin-members-page',
  imports: [Button, EmptyState, Pagination, SearchField, SkeletonRegion, Status, Table, Tabs],
  templateUrl: './members-page.html',
  styleUrl: './members-page.scss',
  providers: [{ provide: ADMIN_MEMBERS_SERVICE, useClass: HttpAdminMembersService }],
})
export class AdminMembersPage {
  private readonly members = inject(ADMIN_MEMBERS_SERVICE);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  private readonly reload = new Subject<void>();
  /** Each edit of the search field, asked for once typing pauses. */
  private readonly typed = new Subject<string>();
  /** Whether the next answer is a page asked for from the pagination, so focus follows to the table. */
  private focusTable = false;

  protected readonly query = signal<AdminMemberQuery>(EVERYONE);
  protected readonly state = signal<ListState>({ kind: 'loading' });
  /** The community's size as the API last gave it; none before the first answer or after a failure. */
  private readonly total = signal<number | null>(null);
  /**
   * The search field's text. It is the person's while they type (a space after a word stays) and
   * the URL's when the URL names another search: on arrival, on Back and after Clear search.
   */
  protected readonly term = signal('');
  private readonly paging = signal<Paging | null>(null);

  protected readonly columns = COLUMNS;
  protected readonly subtitle = computed(() => {
    const total = this.total();
    return total === null ? null : memberCountLabel(total);
  });
  private readonly tabViews = computed(() => memberTabs(this.query()));
  protected readonly tabs = computed<TabItem[]>(() =>
    this.tabViews().map(({ label, href }) => ({ label, href })),
  );
  protected readonly currentHref = computed(() => this.tabViews().find((t) => t.current)?.href);
  private readonly shownMembers = computed(() => {
    const state = this.state();
    return state.kind === 'ready' ? state.list.members : [];
  });
  protected readonly rows = computed<TableRow[]>(() => this.shownMembers().map(rowOf));
  protected readonly empty = computed(() => noMembersMessage(this.query()));
  /** The pages of the list on screen; none while it is not known how many it has, or for one page. */
  protected readonly pages = computed(() => {
    const paging = this.paging();
    const query = this.query();
    if (!paging || paging.listKey !== listKeyOf(query)) return null;
    const pageCount = memberPageCount(paging.matches, paging.pageSize);
    if (pageCount < 2) return null;
    const state = this.state();
    const answered = state.kind === 'ready' ? state.list : null;
    return {
      pageCount,
      page: answered ? answered.page : Math.min(query.page, pageCount),
      summary: answered
        ? memberRangeLabel(
            answered.page,
            answered.pageSize,
            answered.members.length,
            answered.matches,
          )
        : undefined,
    };
  });
  protected readonly pageHref = computed(() => {
    const query = this.query();
    return (page: number) => memberListHref({ ...query, page });
  });

  constructor() {
    const query$ = inject(ActivatedRoute).queryParamMap.pipe(map(memberListQueryOf));
    combineLatest([query$, this.reload.pipe(startWith(undefined))])
      .pipe(
        switchMap(([query]) => {
          this.query.set(query);
          if (this.term().trim() !== query.q) this.term.set(query.q);
          this.state.set({ kind: 'loading' });
          return this.members.search(query).pipe(
            map((list) => ({ list })),
            catchError(() => of({ list: null })),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(({ list }) => {
        this.total.set(list ? list.total : null);
        this.paging.set(
          list
            ? { listKey: listKeyOf(this.query()), matches: list.matches, pageSize: list.pageSize }
            : null,
        );
        this.state.set(list ? { kind: 'ready', list } : { kind: 'failed' });
        if (this.focusTable) {
          this.focusTable = false;
          if (list) this.focusTableOnceDrawn();
        }
      });

    this.typed
      .pipe(debounceTime(MEMBER_SEARCH_DELAY_MS), takeUntilDestroyed())
      .subscribe((text) => this.searchFor(text));
  }

  /** The search field changed: show it at once, ask for it once typing pauses. */
  protected onSearch(text: string): void {
    this.term.set(text);
    this.typed.next(text);
  }

  /**
   * Empties the search in the URL, which empties the field, and returns focus to the field, so
   * the next search can be typed.
   */
  protected clearSearch(): void {
    this.searchFor('');
    this.host.nativeElement.querySelector<HTMLElement>('.search__input')?.focus();
  }

  /** A page was asked for from the pagination: move there, then focus the table. */
  protected goToPage(page: number): void {
    this.focusTable = true;
    this.navigate(this.pageHref()(page));
  }

  protected navigate(href: string): void {
    void this.router.navigateByUrl(href);
  }

  /** The status badge's variant for the row `id`. */
  protected statusOf(id: string): AdminMemberDto['status'] {
    return this.shownMembers().find((member) => member.id === id)?.status ?? 'active';
  }

  protected tryAgain(): void {
    this.reload.next();
  }

  /**
   * Names `text` as the search in the URL, on the first page of the same tab. The URL is replaced:
   * a search is one place in the history, not one a letter.
   */
  private searchFor(text: string): void {
    const query = this.query();
    const next = memberListQueryOf(new URLSearchParams({ status: query.status, q: text }));
    if (next.q === query.q) return;
    void this.router.navigateByUrl(memberListHref(next), { replaceUrl: true });
  }

  private focusTableOnceDrawn(): void {
    afterNextRender(
      () => this.host.nativeElement.querySelector<HTMLElement>('.table-wrap')?.focus(),
      { injector: this.injector },
    );
  }
}

function rowOf(member: AdminMemberDto): TableRow {
  return {
    id: member.id,
    name: member.name,
    cells: {
      member: { text: member.name, sub: member.email },
      church: { text: member.homeChurch ?? '' },
      joined: { text: joinedOn(member.joinedAt) },
      events: { text: String(member.eventsAttended) },
      status: { text: memberStatusLabel(member.status) },
    },
  };
}
