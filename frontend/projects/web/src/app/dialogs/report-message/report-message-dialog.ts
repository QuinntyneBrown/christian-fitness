import { Dialog as CdkDialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, computed, DestroyRef, inject, type Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { REPORTS_SERVICE } from '@cf/api';
import { Alert, Button, Dialog, FormLayout, Textarea } from '@cf/components';
import {
  REPORT_REASON_MAX,
  reportOf,
  reportReasonFits,
  type ReportRefusal,
  reportRefusalOf,
} from '@cf/domain';

/** The message the dialog asks about: its id, who wrote it and when ("8:40 AM"). */
export interface ReportMessageTarget {
  id: string;
  author: string;
  time: string;
}

/**
 * The Report a message dialog (L2-017; ADR 0057; mock `docs/mocks/dialogs/report-message/`), a CDK
 * Dialog that renders the library's `cf-dialog` shell around an optional Reason. Cancel, Close, Escape
 * and the scrim leave with nothing sent. While the report is on its way the button reads "Reporting…",
 * the reason holds still and everything else does nothing (mock `busy`). A refusal or no answer keeps
 * the dialog and the reason with a message (mock `failed`); a message the member already reported says
 * so and offers only Done (mock `refused`). Once recorded it shows "Message reported" (mock `success`).
 * It uses the `REPORTS_SERVICE` of the screen that opened it, and closes with `true` when reported.
 */
@Component({
  selector: 'cf-report-message-dialog',
  imports: [Alert, Button, Dialog, FormLayout, Textarea],
  templateUrl: './report-message-dialog.html',
  styleUrl: './report-message-dialog.scss',
})
export class ReportMessageDialog {
  private readonly reports = inject(REPORTS_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ref: DialogRef<boolean, ReportMessageDialog> = inject(DialogRef);
  private readonly target: ReportMessageTarget = inject(DIALOG_DATA);

  protected readonly subtitle = `${this.target.author} · ${this.target.time}`;
  protected readonly reason = signal('');
  protected readonly sending = signal(false);
  protected readonly sent = signal(false);
  /** What the last answer refused, until the next send. */
  protected readonly refusal = signal<ReportRefusal | null>(null);
  protected readonly tooLong = computed(() => !reportReasonFits(this.reason()));
  protected readonly reasonError = computed(() =>
    this.tooLong() ? `Use ${REPORT_REASON_MAX} characters or fewer` : null,
  );
  /** Nothing is left to send: it was recorded, or it was already. */
  protected readonly finished = computed(() => this.sent() || this.refusal() === 'already');
  protected readonly heading = computed(() =>
    this.sent() ? 'Message reported' : 'Report this message?',
  );

  constructor() {
    // The dialog opens with `disableClose`, so Escape is the screen's to decide.
    this.ref.keydownEvents.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      this.dismiss();
    });
  }

  /** Leaves, unless the report is on its way. */
  protected dismiss(): void {
    if (!this.sending()) this.ref.close(this.sent());
  }

  protected send(event: Event): void {
    event.preventDefault();
    if (this.sending() || this.sent() || this.tooLong()) return;
    this.sending.set(true);
    this.refusal.set(null);
    this.reports
      .report(this.target.id, reportOf(this.reason()))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.sending.set(false);
          this.sent.set(true);
        },
        // The dialog stays as it was, so the member can try again (or is told it is already done).
        error: (error: unknown) => {
          this.sending.set(false);
          this.refusal.set(reportRefusalOf(error));
        },
      });
  }
}

/**
 * Opens the Report a message dialog with the CDK Dialog (ADR 0057). `injector` is the screen's, so the
 * dialog uses the screen's `REPORTS_SERVICE`. The library's `cf-dialog` draws the scrim, so there is
 * no CDK backdrop; the CDK container is the `role="dialog"`, `aria-modal` element named by the dialog's
 * title, traps focus, starts it in Reason and returns it to the Report button. Escape and the scrim go
 * through the dialog's own `dismiss`, which ignores them while a report is on its way.
 */
export function openReportMessageDialog(
  injector: Injector,
  target: ReportMessageTarget,
): DialogRef<boolean, ReportMessageDialog> {
  return injector
    .get(CdkDialog)
    .open<boolean, ReportMessageTarget, ReportMessageDialog>(ReportMessageDialog, {
      injector,
      data: target,
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      ariaModal: true,
      width: '100%',
      height: '100%',
      maxWidth: '100%',
      autoFocus: '#f-reason',
      restoreFocus: true,
      hasBackdrop: false,
      disableClose: true,
    });
}
