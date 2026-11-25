import { Dialog as CdkDialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, DestroyRef, inject, type Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ADMIN_BYLINES_SERVICE, type BylineDto } from '@cf/api';
import { Alert, Button, Dialog } from '@cf/components';
import { bylineGone, bylineInUse, bylineStoriesText } from '@cf/domain';

/** The id that names the dialog. */
const HEADING_ID = 'remove-byline-title';

/**
 * How the dialog ended: `removed`; `gone` when the byline was not there any more; `stale` when a
 * story took it meanwhile, so the page reads the list again. Nothing when it was kept.
 */
export type RemoveBylineResult = 'removed' | 'gone' | 'stale' | null;

/**
 * The Remove byline dialog (mock docs/mocks/dialogs/remove-byline/; L2-077 AC6, AC7; ADR 0093), a
 * CDK Dialog around the library's `cf-dialog`. For a byline no story uses, "Keep it", Close,
 * Escape and the scrim leave it on the list; "Remove byline" asks the page's
 * `ADMIN_BYLINES_SERVICE` and, while it is on its way, is busy and everything holds still. For a
 * byline stories use, it says why it stays, with only Close. A story that took the byline
 * meanwhile (409 `byline_in_use`) or no answer keeps the dialog with an alert; a byline found gone
 * closes with `gone`. The name is rendered as text.
 */
@Component({
  selector: 'cf-remove-byline-dialog',
  imports: [Alert, Button, Dialog],
  templateUrl: './remove-byline-dialog.html',
  styleUrl: './remove-byline-dialog.scss',
})
export class RemoveBylineDialog {
  private readonly api = inject(ADMIN_BYLINES_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ref: DialogRef<RemoveBylineResult, RemoveBylineDialog> = inject(DialogRef);
  protected readonly byline: BylineDto = inject(DIALOG_DATA);

  protected readonly headingId = HEADING_ID;
  protected readonly inUse = this.byline.stories > 0;
  protected readonly heading = this.inUse
    ? `Can't remove ${this.byline.name}`
    : `Remove ${this.byline.name}?`;
  protected readonly usedBy = `${this.byline.name} is on ${bylineStoriesText(this.byline.stories)}`;
  protected readonly removing = signal(false);
  /** Why the last removal did not go through: a story took the byline, or no answer. */
  protected readonly refused = signal<'in-use' | 'failed' | null>(null);

  /** Whether a story took the byline meanwhile, so the page reads the list again on closing. */
  private stale = false;

  constructor() {
    // The dialog opens with `disableClose`, so Escape is ours to decide.
    this.ref.keydownEvents.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      this.keep();
    });
  }

  /** Leaves with the byline kept, unless the removal is on its way. */
  protected keep(): void {
    if (!this.removing()) this.ref.close(this.stale ? 'stale' : null);
  }

  protected remove(): void {
    if (this.removing()) return;
    this.removing.set(true);
    // Cleared first, so a second refusal draws the alert again, which takes focus.
    this.refused.set(null);
    this.api
      .remove(this.byline.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.ref.close('removed'),
        error: (error: unknown) => {
          if (bylineGone(error)) {
            this.ref.close('gone');
            return;
          }
          const inUse = bylineInUse(error);
          if (inUse) this.stale = true;
          this.refused.set(inUse ? 'in-use' : 'failed');
          this.removing.set(false);
        },
      });
  }
}

/**
 * Opens the Remove byline dialog on `byline` with `injector` (the Bylines page's, which binds
 * {@link ADMIN_BYLINES_SERVICE}). `cf-dialog` draws the scrim, so there is no CDK backdrop; focus
 * starts on the first foot button (Keep it, or Close) and returns to the row's Remove.
 */
export function openRemoveByline(
  injector: Injector,
  byline: BylineDto,
): DialogRef<RemoveBylineResult, RemoveBylineDialog> {
  return injector
    .get(CdkDialog)
    .open<RemoveBylineResult, BylineDto, RemoveBylineDialog>(RemoveBylineDialog, {
      data: byline,
      injector,
      ariaLabelledBy: HEADING_ID,
      ariaModal: true,
      width: '100%',
      height: '100%',
      maxWidth: '100%',
      autoFocus: '.dialog__foot .btn',
      restoreFocus: true,
      hasBackdrop: false,
      disableClose: true,
    });
}
