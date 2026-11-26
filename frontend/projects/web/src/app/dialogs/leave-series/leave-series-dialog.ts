import { Dialog as CdkDialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, DestroyRef, inject, type Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EVENT_SERIES_SERVICE, type SeriesDetailDto } from '@cf/api';
import { Alert, Button, Dialog } from '@cf/components';
import { leaveSeriesWordsOf } from '@cf/domain';

/** What the dialog is asked about: the joined series the member may leave. */
export type LeaveSeriesData = SeriesDetailDto;

/** What the dialog closes with: the series as the member now sees it, or nothing when they stayed. */
export type LeaveSeriesResult = SeriesDetailDto | null;

/**
 * The Leave the series dialog (L2-052 AC9; ADR 0099; mock `docs/mocks/dialogs/leave-series/`), a
 * CDK Dialog around the library's `cf-dialog`: the series with its cadence and how many places go
 * back. "Stay in the series", Close and Escape leave with nothing changed; "Leave the series" asks
 * the screen's `EVENT_SERIES_SERVICE` and, while it is on its way, both buttons are disabled and
 * the second reads "Leaving…". A failure keeps the dialog with its alert and changes nothing; it
 * closes with the series as the answer has it.
 */
@Component({
  selector: 'cf-leave-series-dialog',
  imports: [Alert, Button, Dialog],
  templateUrl: './leave-series-dialog.html',
  styleUrl: './leave-series-dialog.scss',
})
export class LeaveSeriesDialog {
  private readonly series = inject(EVENT_SERIES_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ref: DialogRef<LeaveSeriesResult, LeaveSeriesDialog> = inject(DialogRef);
  private readonly data: LeaveSeriesData = inject(DIALOG_DATA);

  protected readonly words = leaveSeriesWordsOf(this.data);
  protected readonly leaving = signal(false);
  protected readonly failed = signal(false);

  constructor() {
    // The dialog opens with `disableClose`, so Escape is the dialog's to decide.
    this.ref.keydownEvents.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      this.stay();
    });
  }

  /** Leaves with nothing changed, unless the leave is on its way. */
  protected stay(): void {
    if (!this.leaving()) this.ref.close(null);
  }

  protected leave(): void {
    if (this.leaving()) return;
    this.leaving.set(true);
    this.failed.set(false);
    this.series
      .leave(this.data.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (series) => this.ref.close(series),
        error: () => {
          this.leaving.set(false);
          this.failed.set(true);
        },
      });
  }
}

/**
 * Opens the Leave the series dialog with the CDK Dialog. `injector` is the screen's, so the dialog
 * uses the screen's `EVENT_SERIES_SERVICE`. The library's `cf-dialog` draws the scrim; the
 * container is the `role="dialog"` element named by its title, traps focus, starts it on "Stay in
 * the series" and returns it to the opener.
 */
export function openLeaveSeriesDialog(
  injector: Injector,
  data: LeaveSeriesData,
): DialogRef<LeaveSeriesResult, LeaveSeriesDialog> {
  return injector
    .get(CdkDialog)
    .open<LeaveSeriesResult, LeaveSeriesData, LeaveSeriesDialog>(LeaveSeriesDialog, {
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
