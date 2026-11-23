import { Dialog as CdkDialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, DestroyRef, inject, type Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ADMIN_EVENTS_SERVICE, type AdminEventDto } from '@cf/api';
import { Alert, Button, Dialog } from '@cf/components';
import { cancelEventText } from '@cf/domain';

/** What the dialog is asked about: the published event staff may cancel. */
export interface CancelEventData {
  id: string;
  /** "Saturday Park Bootcamp · Sat, Apr 25". */
  subtitle: string;
  /** How many members are registered. */
  going: number;
}

/** What the dialog closes with: the cancelled event, or nothing when staff kept it. */
export type CancelEventResult = AdminEventDto | null;

/**
 * The Cancel event confirmation (L2-023 AC2; ADR 0035; mock `docs/mocks/dialogs/cancel-event/`), a
 * CDK Dialog around the library's `cf-dialog`. "Keep event", Close, Escape and the scrim leave with
 * the event published; "Cancel event" asks the screen's `ADMIN_EVENTS_SERVICE` and, while it is on
 * its way, is busy and everything holds still. Any refusal or no answer keeps the dialog with the
 * mock's `failed` message so staff can try again; success closes with the cancelled event.
 */
@Component({
  selector: 'cf-cancel-event-dialog',
  imports: [Alert, Button, Dialog],
  templateUrl: './cancel-event-dialog.html',
  styleUrl: './cancel-event-dialog.scss',
})
export class CancelEventDialog {
  private readonly events = inject(ADMIN_EVENTS_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ref: DialogRef<CancelEventResult, CancelEventDialog> = inject(DialogRef);
  private readonly data: CancelEventData = inject(DIALOG_DATA);

  protected readonly subtitle = this.data.subtitle;
  protected readonly text = cancelEventText(this.data.going);
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

  /** Leaves with the event kept, unless the cancel is on its way. */
  protected keep(): void {
    if (!this.cancelling()) this.ref.close(null);
  }

  protected cancel(): void {
    if (this.cancelling()) return;
    this.cancelling.set(true);
    this.failed.set(false);
    this.events
      .cancel(this.data.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => this.ref.close(event),
        error: () => {
          this.cancelling.set(false);
          this.failed.set(true);
        },
      });
  }
}

/**
 * Opens the Cancel event dialog with the CDK Dialog. `injector` is the editor's, so the dialog uses
 * the Events page's `ADMIN_EVENTS_SERVICE`. The library's `cf-dialog` draws the scrim, so there is no
 * CDK backdrop; focus starts on "Keep event" and returns to the editor's Cancel event button.
 */
export function openCancelEventDialog(
  injector: Injector,
  data: CancelEventData,
): DialogRef<CancelEventResult, CancelEventDialog> {
  return injector
    .get(CdkDialog)
    .open<CancelEventResult, CancelEventData, CancelEventDialog>(CancelEventDialog, {
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
