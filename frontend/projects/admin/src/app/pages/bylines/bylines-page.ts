import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ADMIN_BYLINES_SERVICE, type BylineDto, TOASTS_SERVICE } from '@cf/api';
import {
  Button,
  EmptyState,
  Table,
  type TableColumn,
  type TableRow,
  type ToastData,
  ToastRegion,
} from '@cf/components';
import { bylineStoriesText, ToastStore } from '@cf/domain';
import { catchError, map, of, startWith, Subject, switchMap } from 'rxjs';
import { HttpAdminBylinesService } from '../../services/http-admin-bylines.service';

/** What the page shows: skeleton rows, the bylines, or the error state. */
type ListState =
  { kind: 'loading' } | { kind: 'ready'; bylines: readonly BylineDto[] } | { kind: 'failed' };

/** The table's columns, as mock `admin-bylines/default` heads them. */
const COLUMNS: readonly TableColumn[] = [
  { key: 'byline', label: 'Byline', kind: 'person' },
  { key: 'bio', label: 'Short bio', kind: 'muted' },
  { key: 'stories', label: 'Used by', kind: 'nowrap' },
];

/**
 * The Bylines page (mock docs/mocks/pages/admin-bylines/; L2-077 AC1, AC9; ADR 0093): every byline
 * by name with its short bio, how many stories use it, and Edit and Remove on each row, with Add
 * byline. While they load the table shows skeleton rows; with none, the empty state offers Add
 * byline; when they do not load, the error state with Try again, which asks again. Names and bios
 * are rendered as text. Admins only: the guard shows a Moderator "Admins only". Its services are
 * this screen's own, provided here (AGENTS.md, "Scope state to its use").
 */
@Component({
  selector: 'cf-admin-bylines-page',
  imports: [Button, EmptyState, Table, ToastRegion],
  templateUrl: './bylines-page.html',
  styleUrl: './bylines-page.scss',
  providers: [
    { provide: ADMIN_BYLINES_SERVICE, useClass: HttpAdminBylinesService },
    { provide: TOASTS_SERVICE, useClass: ToastStore },
  ],
})
export default class AdminBylinesPage {
  private readonly api = inject(ADMIN_BYLINES_SERVICE);
  protected readonly toasts = inject(TOASTS_SERVICE);

  /** Asks for the list again. */
  private readonly reload = new Subject<void>();

  protected readonly list = signal<ListState>({ kind: 'loading' });
  protected readonly columns = COLUMNS;
  protected readonly rows = computed<TableRow[]>(() => {
    const list = this.list();
    return list.kind === 'ready' ? list.bylines.map(rowOf) : [];
  });
  protected readonly toastViews = computed<ToastData[]>(() =>
    this.toasts.toasts().map(({ id, title, text }) => ({
      id: String(id),
      tone: 'info',
      heading: title,
      text,
    })),
  );

  constructor() {
    this.reload
      .pipe(
        startWith(undefined),
        switchMap(() =>
          this.api.list().pipe(
            map((answer): ListState => ({ kind: 'ready', bylines: answer.bylines })),
            catchError(() => of<ListState>({ kind: 'failed' })),
            startWith<ListState>({ kind: 'loading' }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((state) => this.list.set(state));
  }

  protected tryAgain(): void {
    this.reload.next();
  }

  protected dismissToast(id: string): void {
    this.toasts.dismiss(Number(id));
  }
}

/** A byline as its row reads it: the name with its initials, the bio, and how many stories use it. */
function rowOf(byline: BylineDto): TableRow {
  return {
    id: byline.id,
    name: byline.name,
    cells: {
      byline: { text: byline.name },
      bio: { text: byline.bio },
      stories: { text: bylineStoriesText(byline.stories) },
    },
  };
}
