import { HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { SERVICES_SERVICE } from '@cf/api';
import { safeContactUrl } from '@cf/domain';
import type { Subscription } from 'rxjs';

/**
 * What a member does with a listing's contact action (L2-014; ADR 0052): Message asks the API for
 * the direct conversation with the professional and opens it in Messages; Contact asks for the
 * contact link, only now, and opens it in a new browsing context without access to this page
 * (`noopener,noreferrer`), and only when it is an http or https address. One action runs at a time;
 * a failure leaves a sentence in `problem` and the action can be pressed again. It is provided on
 * the screen that shows the card, so its request ends with the screen.
 */
@Injectable()
export class ProfessionalContact {
  private readonly services = inject(SERVICES_SERVICE);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private request: Subscription | null = null;

  readonly busy = signal(false);
  readonly problem = signal('');

  /** Message: opens the direct conversation with the listing's professional. */
  message(listingId: string): void {
    this.begin();
    this.request = this.services
      .startConversation(listingId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (answer) => {
          this.busy.set(false);
          void this.router.navigateByUrl(`/messages/${encodeURIComponent(answer.memberId)}`);
        },
        error: (error: unknown) => {
          this.busy.set(false);
          this.problem.set(
            codeOf(error) === 'recipient_unavailable'
              ? "This professional can't be messaged right now."
              : "We couldn't open that conversation. Check your connection and try again.",
          );
        },
      });
  }

  /** Contact: opens the listing's contact link in a new browsing context. */
  contact(listingId: string): void {
    this.begin();
    this.request = this.services
      .getContactLink(listingId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (answer) => {
          this.busy.set(false);
          const url = safeContactUrl(answer.url);
          if (url === null) {
            this.problem.set("We couldn't open that link.");
            return;
          }
          window.open(url, '_blank', 'noopener,noreferrer');
        },
        error: () => {
          this.busy.set(false);
          this.problem.set("We couldn't get that link. Check your connection and try again.");
        },
      });
  }

  /** Forgets a failure and the request in flight: the screen shows another listing. */
  reset(): void {
    this.request?.unsubscribe();
    this.busy.set(false);
    this.problem.set('');
  }

  private begin(): void {
    this.request?.unsubscribe();
    this.busy.set(true);
    this.problem.set('');
  }
}

function codeOf(error: unknown): string | null {
  const body: unknown = error instanceof HttpErrorResponse ? error.error : null;
  return typeof body === 'object' &&
    body !== null &&
    'code' in body &&
    typeof body.code === 'string'
    ? body.code
    : null;
}
