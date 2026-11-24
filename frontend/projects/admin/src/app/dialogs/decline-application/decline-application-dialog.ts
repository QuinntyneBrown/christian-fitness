import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, computed, DestroyRef, inject, type Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ADMIN_SERVICES_SERVICE, type PendingApplicationDto } from '@cf/api';
import { Alert, type AlertItem, Button, Dialog as DialogShell, Textarea } from '@cf/components';
import {
  DECLINE_REASON_MAX,
  declineFailure,
  declineReasonProblem,
  type DecisionRefusal,
  decisionRefusalOf,
} from '@cf/domain';

/** The ids that name and describe the dialog. */
const HEADING_ID = 'decline-application-title';
const DESCRIPTION_ID = 'decline-application-desc';
const REASON_ID = 'f-reason';

/**
 * What the dialog closes with: `declined` once staff declined the application, or `stale` when it
 * found the application already decided, so the page shows the queue as it is now. Closing
 * otherwise gives nothing.
 */
export type DeclineResult = 'declined' | 'stale';

/**
 * The decline dialog (mock docs/mocks/dialogs/decline-application/; L2-025 AC3; ADR 0000): a CDK
 * Dialog rendering the library's dialog, which draws its own scrim and panel. A decline needs a
 * reason: an empty or over-long one is named in an error summary that takes focus and beside the
 * field, and nothing is sent. While the decline is on its way the field holds still and the dialog
 * stays open. A decline closes it; a refusal shows its own sentence by code and keeps the reason.
 */
@Component({
  selector: 'cf-decline-application-dialog',
  imports: [Alert, Button, DialogShell, Textarea],
  templateUrl: './decline-application-dialog.html',
  styleUrl: './decline-application-dialog.scss',
})
export class DeclineApplicationDialog {
  private readonly services = inject(ADMIN_SERVICES_SERVICE);
  private readonly ref = inject<DialogRef<DeclineResult, DeclineApplicationDialog>>(DialogRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly application = inject<PendingApplicationDto>(DIALOG_DATA);

  protected readonly headingId = HEADING_ID;
  protected readonly descriptionId = DESCRIPTION_ID;
  protected readonly reasonId = REASON_ID;
  protected readonly reasonMax = DECLINE_REASON_MAX;
  protected readonly heading = `Decline ${this.application.name}`;
  protected readonly subtitle = `${this.application.role} · ${this.application.credentials}`;
  protected readonly summaryHeading = '1 thing to fix';

  protected readonly reason = signal('');
  protected readonly saving = signal(false);
  private readonly problem = signal<string | null>(null);
  private readonly refusal = signal<DecisionRefusal | null>(null);
  /** Counts the presses that found the reason missing, so each shows a new, focused summary. */
  protected readonly attempts = signal<readonly number[]>([]);

  protected readonly reasonError = computed(() => this.problem());
  protected readonly summaryItems = computed<AlertItem[]>(() => {
    const text = this.problem();
    return text ? [{ text, target: REASON_ID }] : [];
  });
  protected readonly failureMessage = computed(() => {
    const refusal = this.refusal();
    return refusal ? declineFailure(refusal) : null;
  });

  protected setReason(reason: string): void {
    this.reason.set(reason);
    this.problem.set(null);
  }

  protected close(): void {
    if (this.saving()) return;
    this.ref.close(this.refusal() === 'decided' ? 'stale' : undefined);
  }

  protected submit(): void {
    if (this.saving()) return;
    const reason = this.reason().trim();
    const problem = declineReasonProblem(reason);
    this.refusal.set(null);
    this.problem.set(problem);
    if (problem) {
      this.attempts.update(([last = 0]) => [last + 1]);
      return;
    }
    this.saving.set(true);
    // Escape, Close and the scrim wait for the answer, so it is never lost.
    this.ref.disableClose = true;
    this.services
      .decline(this.application.id, reason)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.ref.close('declined'),
        error: (error: unknown) => {
          this.refusal.set(decisionRefusalOf(error));
          this.saving.set(false);
          this.ref.disableClose = false;
        },
      });
  }
}

/**
 * Opens the decline dialog for `application`, with `injector` (the Services page's, which binds
 * {@link ADMIN_SERVICES_SERVICE}); it closes with the result, or nothing. The page imports this
 * file on the first Decline, so the dialog and its field stay out of the page's chunk.
 */
export function openDeclineApplication(
  injector: Injector,
  application: PendingApplicationDto,
): DialogRef<DeclineResult, DeclineApplicationDialog> {
  return injector
    .get(Dialog)
    .open<DeclineResult, PendingApplicationDto, DeclineApplicationDialog>(
      DeclineApplicationDialog,
      {
        injector,
        data: application,
        ariaLabelledBy: HEADING_ID,
        ariaDescribedBy: DESCRIPTION_ID,
        ariaModal: true,
        autoFocus: `#${REASON_ID}`,
        restoreFocus: true,
        // The dialog draws its own scrim and panel, so the CDK adds no backdrop.
        hasBackdrop: false,
        width: '100%',
        maxWidth: '100%',
        height: '100%',
      },
    );
}
