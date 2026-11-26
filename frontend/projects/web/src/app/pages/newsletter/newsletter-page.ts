import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { type ApiError, type IssueDto, ISSUES_SERVICE, SESSION_SERVICE } from '@cf/api';
import {
  Button,
  Container,
  EmptyState,
  ErrorPage,
  IssueView,
  Skeleton,
  SkeletonRegion,
  SkipLink,
} from '@cf/components';
import { issueBarText, issueNumberOf, issueWordsOf } from '@cf/domain';
import { catchError, of, type Subscription } from 'rxjs';
import { HttpIssuesService } from '../../services/http-newsletter.service';

/**
 * The newsletter on the web (mock docs/mocks/pages/newsletter/; L2-059): the latest sent issue at
 * `/newsletter`, or the one `/newsletter/<number>` names, as the email reads, under a bar that
 * leads back to the news and names the issue once it is known. The issue is the same for every
 * reader; the page asks who is signed in beside it, and greets only a member, by first name. While
 * it loads, a skeleton; an issue that is not on the web shows the not-found view; no answer or
 * another refusal offers Try again and a way back to the news. Its service is this screen's own
 * (AGENTS.md, "Scope state to its use").
 */
@Component({
  selector: 'cf-newsletter-page',
  imports: [
    Button,
    Container,
    EmptyState,
    ErrorPage,
    IssueView,
    Skeleton,
    SkeletonRegion,
    SkipLink,
  ],
  providers: [{ provide: ISSUES_SERVICE, useClass: HttpIssuesService }],
  templateUrl: './newsletter-page.html',
  styleUrl: './newsletter-page.scss',
})
export default class NewsletterPage {
  private readonly issues = inject(ISSUES_SERVICE);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  /** The number the address names; none for `/newsletter`, the latest. */
  private number: number | null = null;
  private request: Subscription | null = null;

  protected readonly state = signal<'loading' | 'loaded' | 'not-found' | 'failed'>('loading');
  private readonly issue = signal<IssueDto | null>(null);
  /** The signed-in member's name; none for a visitor, or until the session answers. */
  private readonly sessionName = signal<string | null>(null);
  protected readonly words = computed(() => {
    const issue = this.issue();
    return issue ? issueWordsOf(issue, this.sessionName()) : null;
  });
  protected readonly bar = computed(() => issueBarText(this.issue()?.number ?? null));

  constructor() {
    // The session is asked beside the issue; a 401 greets nobody (L2-059 AC2).
    inject(SESSION_SERVICE)
      .current()
      .pipe(
        catchError(() => of(null)),
        takeUntilDestroyed(),
      )
      .subscribe((session) => this.sessionName.set(session?.name ?? null));
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        const param = params.get('number');
        this.number = issueNumberOf(param);
        if (param !== null && this.number === null) {
          // An address that names no issue asks the server nothing.
          this.state.set('not-found');
          return;
        }
        this.load();
      });
  }

  protected retry(): void {
    this.load();
  }

  protected go(href: string): void {
    void this.router.navigateByUrl(href);
  }

  private load(): void {
    this.request?.unsubscribe();
    this.state.set('loading');
    this.request = this.issues
      .issue(this.number)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (issue) => {
          this.issue.set(issue);
          this.state.set('loaded');
        },
        // A 5xx has already opened the server-error screen; a 404 is "not found", anything else "failed".
        error: (error: ApiError) => this.state.set(error?.status === 404 ? 'not-found' : 'failed'),
      });
  }
}
