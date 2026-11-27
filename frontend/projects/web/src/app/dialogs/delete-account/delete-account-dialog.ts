import { Dialog as CdkDialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, DestroyRef, ElementRef, inject, type Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DATA_SERVICE } from '@cf/api';
import { Alert, Button, Dialog, TextField } from '@cf/components';
import { deleteAccountRefusalOf, deleteConfirms, type DeleteAccountRefusal } from '@cf/domain';

/** Whose account the dialog deletes: the name and email it names under its title. */
export interface DeleteAccountData {
  name: string;
  email: string;
}

/** What the dialog closes with: true once the account is deleting and the member signed out. */
export type DeleteAccountResult = boolean;

/**
 * The Delete your account dialog (L2-066 AC4, AC5; ADR 0118; mock
 * `docs/mocks/dialogs/delete-account/`), a CDK Dialog around the library's `cf-dialog`: the account,
 * what happens and when, and the field for the word "delete". Another word marks the field and
 * sends nothing; "Delete my account" asks the screen's `DATA_SERVICE` and, while it is on its way,
 * both buttons are disabled, the field holds still and the second reads "Deleting…". A failure or a
 * staff account keeps the dialog with its alert and the word as typed. "Keep my account", Close and
 * Escape leave with nothing changed.
 */
@Component({
  selector: 'cf-delete-account-dialog',
  imports: [Alert, Button, Dialog, TextField],
  templateUrl: './delete-account-dialog.html',
  styleUrl: './delete-account-dialog.scss',
})
export class DeleteAccountDialog {
  private readonly data = inject(DATA_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly ref: DialogRef<DeleteAccountResult, DeleteAccountDialog> = inject(DialogRef);
  private readonly account: DeleteAccountData = inject(DIALOG_DATA);

  protected readonly subtitle = `${this.account.name} · ${this.account.email}`;
  protected readonly word = signal('');
  protected readonly deleting = signal(false);
  protected readonly refusal = signal<DeleteAccountRefusal | null>(null);

  constructor() {
    // The dialog opens with `disableClose`, so Escape is the dialog's to decide.
    this.ref.keydownEvents.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      this.keep();
    });
  }

  /** Leaves with nothing changed, unless the deletion is on its way. */
  protected keep(): void {
    if (!this.deleting()) this.ref.close(false);
  }

  protected type(word: string): void {
    this.word.set(word);
    if (this.refusal() === 'invalid' && deleteConfirms(word)) this.refusal.set(null);
  }

  protected delete(event: Event): void {
    event.preventDefault();
    if (this.deleting()) return;
    if (!deleteConfirms(this.word())) {
      this.invalid();
      return;
    }
    this.deleting.set(true);
    this.refusal.set(null);
    this.data
      .deleteAccount(this.word())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.ref.close(true),
        error: (error: unknown) => {
          this.deleting.set(false);
          const refusal = deleteAccountRefusalOf(error);
          if (refusal === 'invalid') this.invalid();
          else this.refusal.set(refusal);
        },
      });
  }

  /** Marks the field and moves focus to it, which is already in place (mock `invalid`). */
  private invalid(): void {
    this.refusal.set('invalid');
    this.host.nativeElement.querySelector<HTMLInputElement>('#f-confirm')?.focus();
  }
}

/**
 * Opens the Delete your account dialog with the CDK Dialog. `injector` is the screen's, so the
 * dialog uses the screen's `DATA_SERVICE`. The library's `cf-dialog` draws the scrim; the container
 * is the `role="dialog"` element named by its title, traps focus, starts it on "Keep my account"
 * and returns it to the opener.
 */
export function openDeleteAccountDialog(
  injector: Injector,
  data: DeleteAccountData,
): DialogRef<DeleteAccountResult, DeleteAccountDialog> {
  return injector
    .get(CdkDialog)
    .open<DeleteAccountResult, DeleteAccountData, DeleteAccountDialog>(DeleteAccountDialog, {
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
