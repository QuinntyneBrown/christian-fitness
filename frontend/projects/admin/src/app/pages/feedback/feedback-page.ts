import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import {
  ADMIN_FEEDBACK_SERVICE,
  type FeedbackListDto,
  type FeedbackNoteDto,
  feedbackScreenshotUrl,
  type FeedbackStatusName,
  STAFF_SESSION_SERVICE,
  TOASTS_SERVICE,
} from '@cf/api';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  FeedbackDetail,
  FeedbackRow,
  Skeleton,
  SkeletonRegion,
  Tabs,
  Textarea,
  type ToastData,
  ToastRegion,
} from '@cf/components';
import {
  canManage,
  checkFeedbackReply,
  feedbackFirstName,
  feedbackHref,
  feedbackKindLabel,
  feedbackReplyHint,
  feedbackReplyToast,
  feedbackRowOf,
  feedbackSentFrom,
  feedbackStatusLabel,
  feedbackStatusOf,
  feedbackTabs,
  storyAge,
  ToastStore,
} from '@cf/domain';
import { catchError, of, type Subscription } from 'rxjs';
import { HttpAdminFeedbackService } from '../../services/http-admin-feedback.service';

type ListState =
  { kind: 'loading' } | { kind: 'ready'; list: FeedbackListDto } | { kind: 'failed' };

/**
 * The Feedback inbox (mock docs/mocks/pages/admin-feedback/; L2-074): every note newest first under
 * the tabs All, New, Replied and Resolved, each counted; the chosen note in full with who sent it,
 * where from and on what, its screenshot and the replies kept with it; "Reply to <first name>",
 * Mark resolved and Reopen. The tab and the chosen note are in the address. An Admin is offered the
 * story of a correction; a Moderator, who cannot open Stories, is not. While it loads, skeletons;
 * with no feedback, an empty state; when it does not load, Try again. Its service and toasts are
 * this screen's own (AGENTS.md, "Scope state to its use").
 */
@Component({
  selector: 'cf-feedback-page',
  imports: [
    Alert,
    Button,
    Card,
    EmptyState,
    FeedbackDetail,
    FeedbackRow,
    Skeleton,
    SkeletonRegion,
    Tabs,
    Textarea,
    ToastRegion,
  ],
  templateUrl: './feedback-page.html',
  styleUrl: './feedback-page.scss',
  providers: [
    { provide: ADMIN_FEEDBACK_SERVICE, useClass: HttpAdminFeedbackService },
    { provide: TOASTS_SERVICE, useClass: ToastStore },
  ],
})
export default class FeedbackPage {
  private readonly api = inject(ADMIN_FEEDBACK_SERVICE);
  protected readonly toasts = inject(TOASTS_SERVICE);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private listRead: Subscription | undefined;
  private noteRead: Subscription | undefined;
  private acting: Subscription | undefined;

  protected readonly skeletonRows = [0, 1, 2, 3];
  /** The tab the address names; none is All. */
  protected readonly tab = signal<FeedbackStatusName | null>(null);
  /** The note the address names; none chooses the first listed. */
  private readonly asked = signal<string | null>(null);
  protected readonly list = signal<ListState>({ kind: 'loading' });
  protected readonly note = signal<FeedbackNoteDto | null>(null);
  protected readonly noteFailed = signal(false);
  private readonly now = signal(new Date());
  /** True for an Admin: only they open Stories (L2-074 AC4). */
  private readonly opensStories = signal(false);

  protected readonly draft = signal('');
  protected readonly replyError = signal<string | null>(null);
  /** What is under way: nothing, a reply, or a change of status. */
  protected readonly busy = signal<'idle' | 'replying' | 'status'>('idle');
  /** What last failed, for the alert above the reply box. */
  protected readonly failed = signal<'reply' | 'status' | null>(null);

  protected readonly tabs = computed(() => {
    const list = this.list();
    return feedbackTabs(list.kind === 'ready' ? list.list.counts : null);
  });
  protected readonly currentTab = computed(() => feedbackHref(this.tab()));
  protected readonly rows = computed(() => {
    const list = this.list();
    return list.kind === 'ready'
      ? list.list.items.map((row) => feedbackRowOf(row, this.tab(), this.now()))
      : [];
  });
  /** No feedback at all, in any tab. */
  protected readonly none = computed(() => {
    const list = this.list();
    return list.kind === 'ready' && list.list.counts.all === 0;
  });
  /** The id of the note shown: the one asked for, else the first listed. */
  protected readonly chosenId = computed(() => this.asked() ?? this.rows()[0]?.id ?? null);
  protected readonly detail = computed(() => {
    const note = this.note();
    if (!note) return null;
    return {
      kindLabel: feedbackKindLabel(note.kind),
      statusLabel: feedbackStatusLabel(note.status),
      when: storyAge(note.sentAt, this.now()),
      initials: note.sender.name
        .split(/\s+/)
        .filter((part) => part)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join(''),
      sentFrom: feedbackSentFrom(note.page, note.storyId),
      device: [note.device, note.browser].filter((part) => part).join(' · '),
      replyLabel: `Reply to ${feedbackFirstName(note.sender.name)}`,
      replyHint: feedbackReplyHint(note.kind),
      storyHref:
        note.kind === 'correction' && note.storyId && this.opensStories()
          ? `/stories/${encodeURIComponent(note.storyId)}`
          : null,
      screenshot: note.hasScreenshot ? feedbackScreenshotUrl(note.id) : null,
      screenshotAlt: `Screenshot from ${note.sender.name}`,
    };
  });
  protected readonly toastViews = computed<ToastData[]>(() =>
    this.toasts.toasts().map(({ id, title, text }) => ({
      id: String(id),
      tone: 'success',
      heading: title,
      text,
    })),
  );

  constructor() {
    inject(STAFF_SESSION_SERVICE)
      .current()
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(),
      )
      .subscribe((session) =>
        this.opensStories.set(session !== null && canManage(session.role, 'stories')),
      );
    inject(ActivatedRoute)
      .queryParamMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        const tab = feedbackStatusOf(params.get('status'));
        const tabChanged = tab !== this.tab() || this.list().kind !== 'ready';
        this.tab.set(tab);
        this.asked.set(params.get('note'));
        if (tabChanged) this.loadList();
        else this.loadNote();
      });
    this.destroyRef.onDestroy(() => {
      this.listRead?.unsubscribe();
      this.noteRead?.unsubscribe();
      this.acting?.unsubscribe();
    });
  }

  protected go(href: string): void {
    void this.router.navigateByUrl(href);
  }

  protected tryAgain(): void {
    this.loadList();
  }

  protected edit(text: string): void {
    this.draft.set(text);
    this.replyError.set(null);
  }

  /** Send reply (L2-074 AC5): an empty reply is not sent and the box says to write one. */
  protected send(event: Event): void {
    event.preventDefault();
    const note = this.note();
    if (!note || this.busy() !== 'idle') return;
    const error = checkFeedbackReply(this.draft());
    if (error) {
      this.replyError.set(error);
      afterNextRender(() => this.document.getElementById('f-reply')?.focus(), {
        injector: this.injector,
      });
      return;
    }
    this.busy.set('replying');
    this.failed.set(null);
    this.acting = this.api.reply(note.id, this.draft().trim()).subscribe({
      next: (replied) => {
        this.note.set({
          ...note,
          status: replied.status,
          replies: [...note.replies, replied.reply],
        });
        this.draft.set('');
        this.busy.set('idle');
        const toast = feedbackReplyToast(replied.deliveredBy, note.sender.name);
        this.toasts.show(toast.title, toast.text);
        this.refreshList();
      },
      error: () => {
        this.busy.set('idle');
        this.failed.set('reply');
      },
    });
  }

  /** Mark resolved, or Reopen for a Resolved note (L2-074 AC6). */
  protected setResolved(resolved: boolean): void {
    const note = this.note();
    if (!note || this.busy() !== 'idle') return;
    this.busy.set('status');
    this.failed.set(null);
    this.acting = (resolved ? this.api.resolve(note.id) : this.api.reopen(note.id)).subscribe({
      next: ({ status }) => {
        this.note.set({ ...note, status });
        this.busy.set('idle');
        this.refreshList();
      },
      error: () => {
        this.busy.set('idle');
        this.failed.set('status');
      },
    });
  }

  protected dismissToast(id: string): void {
    this.toasts.dismiss(Number(id));
  }

  private loadList(): void {
    this.listRead?.unsubscribe();
    this.list.set({ kind: 'loading' });
    this.note.set(null);
    this.listRead = this.api.list(this.tab()).subscribe({
      next: (list) => {
        this.now.set(new Date());
        this.list.set({ kind: 'ready', list });
        this.loadNote();
      },
      error: () => this.list.set({ kind: 'failed' }),
    });
  }

  /** Reads the list again after a change, keeping what is on screen meanwhile. */
  private refreshList(): void {
    this.listRead?.unsubscribe();
    this.listRead = this.api.list(this.tab()).subscribe({
      next: (list) => this.list.set({ kind: 'ready', list }),
      error: () => undefined,
    });
  }

  private loadNote(): void {
    const id = this.chosenId();
    this.noteRead?.unsubscribe();
    this.noteFailed.set(false);
    if (!id) {
      this.note.set(null);
      return;
    }
    if (this.note()?.id === id) return;
    this.note.set(null);
    this.draft.set('');
    this.replyError.set(null);
    this.failed.set(null);
    this.noteRead = this.api.note(id).subscribe({
      next: (note) => this.note.set(note),
      error: () => this.noteFailed.set(true),
    });
  }
}
