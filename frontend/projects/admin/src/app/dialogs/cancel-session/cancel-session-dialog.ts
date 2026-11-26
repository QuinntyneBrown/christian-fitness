import { Dialog as CdkDialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, DestroyRef, inject, type Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ADMIN_SERIES_SERVICE,
  type AdminSeriesDto,
  type AdminSessionDto,
  type SessionChangeDto,
} from '@cf/api';
import { Alert, Button, Dialog } from '@cf/components';
import { cancelSessionSubtitleOf, cancelSessionTextOf } from '@cf/domain';

/** What the dialog is asked about: the series and the date staff may cancel. */
export interface CancelSessionData {
  series: AdminSeriesDto;
  session: AdminSessionDto;
}

/** What the dialog closes with: the change, or nothing when staff kept the date. */
export type CancelSessionResult = SessionChangeDto | null;

/**
 * The Cancel a series date confirmation (L2-071 AC4; ADR 0103; mock
 * `docs/mocks/dialogs/cancel-session/`), a CDK Dialog around the library's `cf-dialog`. It names
 * the series, session and date, how many are going (joined and dropped in), who is told and that
 * refunds are the host's. "Keep the date", Close and Escape leave with nothing changed; "Cancel
 * date" asks the page's `ADMIN_SERIES_SERVICE` and, while it is on its way, reads "Cancelling…"
 * with both buttons disabled. Any refusal or no answer keeps the dialog with the `failed` message;
 * success closes with the change.
 */
@Component({
  selector: 'cf-cancel-session-dialog',
  imports: [Alert, Button, Dialog],
  templateUrl: './cancel-session-dialog.html',
  styleUrl: './cancel-session-dialog.scss',
})
export class CancelSessionDialog {
  private readonly api = inject(ADMIN_SERIES_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ref: DialogRef<CancelSessionResult, CancelSessionDialog> = inject(DialogRef);
  private readonly data: CancelSessionData = inject(DIALOG_DATA);

  protected readonly subtitle = cancelSessionSubtitleOf(
    this.data.series.title,
    this.data.session.number,
    this.data.session.startsAt,
  );
  protected readonly text = cancelSessionTextOf(
    this.data.session.joinedGoing,
    this.data.session.droppedInGoing,
  );
  protected readonly cancelling = signal(false);
  protected readonly failed = signal(false);

  constructor() {
    // The dialog opens with `disableClose`, so Escape is ours to decide.
    this.ref.keydownEvents.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      this.keep();
    });
  }

  /** Leaves with the date kept, unless the cancel is on its way. */
  protected keep(): void {
    if (!this.cancelling()) this.ref.close(null);
  }

  protected cancel(): void {
    if (this.cancelling()) return;
    this.cancelling.set(true);
    this.failed.set(false);
    this.api
      .cancelSession(this.data.series.id, this.data.session.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (change) => this.ref.close(change),
        error: () => {
          this.cancelling.set(false);
          this.failed.set(true);
        },
      });
  }
}

/**
 * Opens the Cancel a series date dialog with the CDK Dialog. `injector` is the page's, so the
 * dialog uses its `ADMIN_SERIES_SERVICE`. The library's `cf-dialog` draws the scrim, so there is no
 * CDK backdrop; focus starts on "Keep the date" and returns to the row's button.
 */
export function openCancelSession(
  injector: Injector,
  data: CancelSessionData,
): DialogRef<CancelSessionResult, CancelSessionDialog> {
  return injector
    .get(CdkDialog)
    .open<CancelSessionResult, CancelSessionData, CancelSessionDialog>(CancelSessionDialog, {
      data,
      injector,
      ariaLabelledBy: 'dlg-title',
      ariaModal: true,
      width: '100%',
      height: '100%',
      maxWidth: '100%',
      autoFocus: '.btn--secondary',
      restoreFocus: true,
      hasBackdrop: false,
      disableClose: true,
    });
}
