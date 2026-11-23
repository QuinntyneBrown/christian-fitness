import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ADMIN_MEMBERS_SERVICE,
  type AdminMemberDto,
  type AdminMemberListDto,
  type AdminMemberQuery,
} from '@cf/api';
import {
  Button,
  EmptyState,
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
  memberCountLabel,
  memberStatusLabel,
  memberTabs,
  noMembersMessage,
} from '@cf/domain';
import { catchError, map, of, startWith, Subject, switchMap } from 'rxjs';
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

/**
 * The Members page (mock docs/mocks/pages/admin-members/; L2-028; ADR 0022): the members newest
 * joined first, with the number of members in the community. While the list loads, skeleton rows;
 * with nobody to list, an empty state; when it does not load, the error state with Try again.
 * Every part is the design system's, composed from the library: search field, tabs, table with a
 * person cell and a status badge, skeleton region and empty and error states.
 * Its service is this screen's own, provided here (AGENTS.md, "Scope state to its use").
 */
@Component({
  selector: 'cf-admin-members-page',
  imports: [Button, EmptyState, SearchField, SkeletonRegion, Status, Table, Tabs],
  templateUrl: './members-page.html',
  styleUrl: './members-page.scss',
  providers: [{ provide: ADMIN_MEMBERS_SERVICE, useClass: HttpAdminMembersService }],
})
export class AdminMembersPage {
  private readonly members = inject(ADMIN_MEMBERS_SERVICE);

  private readonly reload = new Subject<void>();

  protected readonly query = signal<AdminMemberQuery>(EVERYONE);
  protected readonly state = signal<ListState>({ kind: 'loading' });
  /** The community's size as the API last gave it; none before the first answer or after a failure. */
  private readonly total = signal<number | null>(null);

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

  constructor() {
    this.reload
      .pipe(
        startWith(undefined),
        switchMap(() => {
          this.state.set({ kind: 'loading' });
          return this.members.search(this.query()).pipe(
            map((list) => ({ list })),
            catchError(() => of({ list: null })),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(({ list }) => {
        this.total.set(list ? list.total : null);
        this.state.set(list ? { kind: 'ready', list } : { kind: 'failed' });
      });
  }

  /** The status badge's variant for the row `id`. */
  protected statusOf(id: string): AdminMemberDto['status'] {
    return this.shownMembers().find((member) => member.id === id)?.status ?? 'active';
  }

  protected tryAgain(): void {
    this.reload.next();
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
