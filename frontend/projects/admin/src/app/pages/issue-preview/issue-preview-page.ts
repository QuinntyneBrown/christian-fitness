import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ADMIN_NEWSLETTER_SERVICE, type IssueDto } from '@cf/api';
import { Banner, Button, EmptyState, IssueView, Skeleton, SkeletonRegion } from '@cf/components';
import { issueNumberOf, issueWordsOf } from '@cf/domain';
import type { Subscription } from 'rxjs';
import { HttpAdminNewsletterService } from '../../services/http-admin-newsletter.service';

const NOT_FOUND = '/not-found';

/**
 * The issue preview (journey 28; L2-070 AC9), opened by Preview on the Newsletter desk in a tab of
 * its own, outside the console's navigation: the issue as it is saved now, drawn by the same issue
 * view as the web version, under a banner that says so. It greets nobody: a greeting is each
 * reader's own. A story's address is the member app's, so following a link here goes nowhere. An
 * address that names no issue opens the not-found screen; a preview that does not load offers Try
 * again. Its service is this screen's own (AGENTS.md, "Scope state to its use").
 */
@Component({
  selector: 'cf-issue-preview-page',
  imports: [Banner, Button, EmptyState, IssueView, Skeleton, SkeletonRegion],
  templateUrl: './issue-preview-page.html',
  styleUrl: './issue-preview-page.scss',
  providers: [{ provide: ADMIN_NEWSLETTER_SERVICE, useClass: HttpAdminNewsletterService }],
})
export default class IssuePreviewPage {
  private readonly api = inject(ADMIN_NEWSLETTER_SERVICE);
  private readonly router = inject(Router);
  protected readonly number = issueNumberOf(
    inject(ActivatedRoute).snapshot.queryParamMap.get('issue'),
  );
  private reading: Subscription | undefined;

  protected readonly state = signal<'loading' | 'ready' | 'failed'>('loading');
  private readonly issue = signal<IssueDto | null>(null);
  protected readonly words = computed(() => {
    const issue = this.issue();
    return issue ? issueWordsOf(issue, null) : null;
  });
  protected readonly noticeText = `Issue ${this.number ?? ''} as it is saved now. Links work once it is sent.`;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.reading?.unsubscribe());
    if (this.number === null) {
      void this.router.navigateByUrl(NOT_FOUND, { skipLocationChange: true });
      return;
    }
    this.load();
  }

  protected load(): void {
    if (this.number === null) return;
    this.reading?.unsubscribe();
    this.state.set('loading');
    this.reading = this.api.preview(this.number).subscribe({
      next: (issue) => {
        this.issue.set(issue);
        this.state.set('ready');
      },
      error: () => this.state.set('failed'),
    });
  }
}
