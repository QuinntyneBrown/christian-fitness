import { Dialog as CdkDialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, DestroyRef, inject, type Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { type EventDetailDto, EVENTS_SERVICE } from '@cf/api';
import { Alert, Button, Dialog } from '@cf/components';

/** What the dialog is asked about: the event whose place the member may give up. */
export interface CancelRegistrationData {
  id: string;
  /** "Easter Sunrise 5K · Sat, Apr 18". */
  subtitle: string;
}

/** What the dialog closes with: the event as the member now sees it, or nothing when they kept the place. */
export type CancelRegistrationResult = EventDetailDto | null;

/**
 * The Cancel registration dialog (L2-012; ADR 0034; mock `docs/mocks/dialogs/cancel-registration/`),
 * a CDK Dialog around the library's `cf-dialog`. "Keep my place", Close, Escape and the scrim leave
 * with nothing changed; "Cancel registration" asks the screen's `EVENTS_SERVICE` and, while it is on
 * its way, is busy and everything holds still. Any refusal or no answer keeps the dialog with the
 * mock's `failed` message and the place, so the member can try again; it closes with the updated event.
 */
@Component({
  selector: 'cf-cancel-registration-dialog',
  imports: [Alert, Button, Dialog],
  templateUrl: './cancel-registration-dialog.html',
  styleUrl: './cancel-registration-dialog.scss',
})
export class CancelRegistrationDialog {
  private readonly events = inject(EVENTS_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ref: DialogRef<CancelRegistrationResult, CancelRegistrationDialog> =
    inject(DialogRef);
  private readonly data: CancelRegistrationData = inject(DIALOG_DATA);

  protected readonly subtitle = this.data.subtitle;
  protected readonly cancelling = signal(false);
  protected readonly failed = signal(false);

  constructor() {
    // The dialog opens with `disableClose`, so Escape is the screen's to decide.
    this.ref.keydownEvents.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      this.keep();
    });
  }

  /** Leaves with the place kept, unless the cancel is on its way. */
  protected keep(): void {
    if (!this.cancelling()) this.ref.close(null);
  }

  protected cancel(): void {
    if (this.cancelling()) return;
    this.cancelling.set(true);
    this.failed.set(false);
    this.events
      .cancelRegistration(this.data.id)
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
 * Opens the Cancel registration dialog with the CDK Dialog. `injector` is the screen's, so the
 * dialog uses the screen's `EVENTS_SERVICE`. The library's `cf-dialog` draws the scrim, so there is
 * no CDK backdrop; the container is the `role="dialog"` element named by the dialog's title, traps
 * focus, starts it on "Keep my place" and returns it to the opener.
 */
export function openCancelRegistrationDialog(
  injector: Injector,
  data: CancelRegistrationData,
): DialogRef<CancelRegistrationResult, CancelRegistrationDialog> {
  return injector
    .get(CdkDialog)
    .open<CancelRegistrationResult, CancelRegistrationData, CancelRegistrationDialog>(
      CancelRegistrationDialog,
      {
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
      },
    );
}
