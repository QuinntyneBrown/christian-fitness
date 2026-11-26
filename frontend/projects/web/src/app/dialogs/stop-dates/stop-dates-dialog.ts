import { Dialog as CdkDialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, DestroyRef, inject, type Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EVENT_SERIES_SERVICE, type SeriesDetailDto } from '@cf/api';
import { Alert, Button, Dialog } from '@cf/components';
import { dropInRefusalOf, stopDatesWordsOf } from '@cf/domain';

/**
 * What the dialog is asked about: the series, every date to come the member wants to hold, and the
 * numbers of the held dates they unticked.
 */
export interface StopDatesData {
  series: SeriesDetailDto;
  sessionIds: readonly string[];
  stopped: readonly number[];
}

/**
 * What the dialog closes with: the series as the member now sees it, the numbers of the dates
 * that filled meanwhile (an `event_full` refusal the page names), or nothing when they kept their
 * dates.
 */
export type StopDatesResult =
  { kind: 'saved'; series: SeriesDetailDto } | { kind: 'full'; sessions: number[] } | null;

/**
 * The Stop going to dates dialog (L2-053 AC4; ADR 0102; mock `docs/mocks/dialogs/stop-dates/`), a
 * CDK Dialog around the library's `cf-dialog`: how many held dates are unticked, the series and
 * those dates. "Keep my dates", Close and Escape leave with nothing changed; "Stop going" saves
 * the dates through the screen's `EVENT_SERIES_SERVICE` and, while it is on its way, both buttons
 * are disabled and the second reads "Stopping…". An `event_full` refusal closes the dialog for the
 * page to name the dates; any other failure keeps it with its alert and changes nothing.
 */
@Component({
  selector: 'cf-stop-dates-dialog',
  imports: [Alert, Button, Dialog],
  templateUrl: './stop-dates-dialog.html',
  styleUrl: './stop-dates-dialog.scss',
})
export class StopDatesDialog {
  private readonly series = inject(EVENT_SERIES_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ref: DialogRef<StopDatesResult, StopDatesDialog> = inject(DialogRef);
  private readonly data: StopDatesData = inject(DIALOG_DATA);

  protected readonly words = stopDatesWordsOf(this.data.series, this.data.stopped);
  protected readonly stopping = signal(false);
  protected readonly failed = signal(false);

  constructor() {
    // The dialog opens with `disableClose`, so Escape is the dialog's to decide.
    this.ref.keydownEvents.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      this.keep();
    });
  }

  /** Leaves with nothing changed, unless the change is on its way. */
  protected keep(): void {
    if (!this.stopping()) this.ref.close(null);
  }

  protected stop(): void {
    if (this.stopping()) return;
    this.stopping.set(true);
    this.failed.set(false);
    this.series
      .setDropIns(this.data.series.id, this.data.sessionIds)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (series) => this.ref.close({ kind: 'saved', series }),
        error: (error: unknown) => {
          const refusal = dropInRefusalOf(error);
          if (refusal.kind === 'full') {
            this.ref.close({ kind: 'full', sessions: refusal.sessions });
            return;
          }
          this.stopping.set(false);
          this.failed.set(true);
        },
      });
  }
}

/**
 * Opens the Stop going to dates dialog with the CDK Dialog. `injector` is the screen's, so the
 * dialog uses the screen's `EVENT_SERIES_SERVICE`. The library's `cf-dialog` draws the scrim; the
 * container is the `role="dialog"` element named by its title, traps focus, starts it on "Keep my
 * dates" and returns it to the opener.
 */
export function openStopDatesDialog(
  injector: Injector,
  data: StopDatesData,
): DialogRef<StopDatesResult, StopDatesDialog> {
  return injector
    .get(CdkDialog)
    .open<StopDatesResult, StopDatesData, StopDatesDialog>(StopDatesDialog, {
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
