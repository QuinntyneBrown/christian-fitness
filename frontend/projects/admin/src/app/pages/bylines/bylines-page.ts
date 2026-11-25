import { Component, computed, DestroyRef, inject, Injector, signal } from '@angular/core';
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
import { bylineStoriesText, ToastStore, withByline, withoutByline } from '@cf/domain';
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
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly toasts = inject(TOASTS_SERVICE);

  /** One dialog at a time: a second press while one is opening does nothing. */
  private dialogOpen = false;

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

  /** Add byline: the editor opens blank. */
  protected add(): void {
    void this.openEditor(null);
  }

  /** Edit on a row: the editor opens on that byline. */
  protected edit(id: string): void {
    const list = this.list();
    const byline = list.kind === 'ready' ? list.bylines.find((b) => b.id === id) : undefined;
    if (byline) void this.openEditor(byline);
  }

  /**
   * Remove on a row (mock `remove-byline`), imported on the first Remove: a byline no story uses
   * leaves the list once removed, with a toast (mock `admin-bylines/removed`); one stories use
   * says why it stays. A byline found gone, or one a story took meanwhile, reads the list again.
   */
  protected async remove(id: string): Promise<void> {
    const list = this.list();
    const byline = list.kind === 'ready' ? list.bylines.find((b) => b.id === id) : undefined;
    if (!byline || this.dialogOpen) return;
    this.dialogOpen = true;
    const { openRemoveByline } = await import('../../dialogs/remove-byline/remove-byline-dialog');
    if (this.destroyRef.destroyed) return;
    openRemoveByline(this.injector, byline)
      .closed.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.dialogOpen = false;
        if (result === 'removed') {
          this.list.update((state) =>
            state.kind === 'ready'
              ? { kind: 'ready', bylines: withoutByline(state.bylines, byline.id) }
              : state,
          );
          this.toasts.show(
            'Byline removed',
            `${byline.name} is no longer in the story editor's list.`,
          );
        } else if (result === 'gone' || result === 'stale') {
          this.reload.next();
        }
      });
  }

  /**
   * Opens the byline editor (mock `byline-editor`), imported on the first Add byline or Edit. A
   * save shows the byline in its place in the list at once, with a toast (mock
   * `admin-bylines/saved`); a byline found gone reads the list again.
   */
  private async openEditor(byline: BylineDto | null): Promise<void> {
    if (this.dialogOpen) return;
    this.dialogOpen = true;
    const { openBylineEditor } = await import('../../dialogs/byline-editor/byline-editor-dialog');
    if (this.destroyRef.destroyed) return;
    openBylineEditor(this.injector, byline)
      .closed.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        this.dialogOpen = false;
        if (!result) return;
        if ('gone' in result) {
          this.reload.next();
          return;
        }
        const { saved } = result;
        this.list.update((list) =>
          list.kind === 'ready'
            ? { kind: 'ready', bylines: withByline(list.bylines, saved) }
            : list,
        );
        this.toasts.show('Byline saved', `Admins can choose ${saved.name} in the story editor.`);
      });
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
