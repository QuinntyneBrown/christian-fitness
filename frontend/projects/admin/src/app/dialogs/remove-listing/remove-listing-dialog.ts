import { Dialog as CdkDialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, DestroyRef, inject, type Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ADMIN_SERVICES_SERVICE, type AdminListingDto, type ApiError } from '@cf/api';
import { Alert, Button, Dialog } from '@cf/components';
import { listingGone } from '@cf/domain';

/** How the dialog ended: the listing removed, or `gone` when it was not there any more; nothing when staff kept it. */
export type RemoveListingResult = 'removed' | 'gone' | null;

/**
 * The Remove listing confirmation (L2-027 AC2; ADR 0000; mock `docs/mocks/dialogs/remove-listing/`),
 * a CDK Dialog around the library's `cf-dialog`. "Keep listing", Close, Escape and the scrim leave
 * with the listing on Services; "Remove listing" asks the screen's `ADMIN_SERVICES_SERVICE` and,
 * while it is on its way, is busy and everything holds still. A refusal or no answer keeps the
 * dialog with the mock's `failed` message so staff can try again; a listing found gone closes with
 * `gone`, and success with `removed`. The professional's name is rendered as text.
 */
@Component({
  selector: 'cf-remove-listing-dialog',
  imports: [Alert, Button, Dialog],
  templateUrl: './remove-listing-dialog.html',
  styleUrl: './remove-listing-dialog.scss',
})
export class RemoveListingDialog {
  private readonly services = inject(ADMIN_SERVICES_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ref: DialogRef<RemoveListingResult, RemoveListingDialog> = inject(DialogRef);
  private readonly listing: AdminListingDto = inject(DIALOG_DATA);

  protected readonly subtitle = `${this.listing.name} · ${this.listing.role}`;
  protected readonly removing = signal(false);
  protected readonly failed = signal(false);

  constructor() {
    // The dialog opens with `disableClose`, so Escape is ours to decide.
    this.ref.keydownEvents.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      this.keep();
    });
  }

  /** Leaves with the listing kept, unless the removal is on its way. */
  protected keep(): void {
    if (!this.removing()) this.ref.close(null);
  }

  protected remove(): void {
    if (this.removing()) return;
    this.removing.set(true);
    this.failed.set(false);
    this.services
      .removeListing(this.listing.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.ref.close('removed'),
        error: (error: ApiError) => {
          if (listingGone(error)) {
            this.ref.close('gone');
            return;
          }
          this.removing.set(false);
          this.failed.set(true);
        },
      });
  }
}

/**
 * Opens the Remove listing dialog with the CDK Dialog. `injector` is the page's, so the dialog uses
 * the Services page's `ADMIN_SERVICES_SERVICE`. The library's `cf-dialog` draws the scrim, so there
 * is no CDK backdrop; focus starts on "Keep listing" and returns to the row's Remove button.
 */
export function openRemoveListing(
  injector: Injector,
  listing: AdminListingDto,
): DialogRef<RemoveListingResult, RemoveListingDialog> {
  return injector
    .get(CdkDialog)
    .open<RemoveListingResult, AdminListingDto, RemoveListingDialog>(RemoveListingDialog, {
      data: listing,
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
