import { Dialog as CdkDialog, DialogRef } from '@angular/cdk/dialog';
import { Component, computed, DestroyRef, inject, type Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  PROFESSIONAL_APPLICATIONS_SERVICE,
  SERVICE_CATEGORIES,
  type ServiceCategory,
} from '@cf/api';
import { Alert, Button, Dialog, FormLayout, Select, Textarea, TextField } from '@cf/components';
import {
  applicationRefusalOf,
  applicationRequestOf,
  applicationSummaryOf,
  type ApplicationField,
  type ApplicationFieldErrors,
  type ApplicationForm,
  type ApplicationRefusal,
  clearApplicationError,
  emptyApplicationForm,
  validateApplication,
} from '@cf/domain';

/** What the dialog closes with: whether the application was sent. */
export type ApplyToBeListedResult = boolean;

/**
 * The Apply to be listed dialog (L2-026; ADR 0000; mock `docs/mocks/dialogs/apply-to-be-listed/`), a
 * CDK Dialog that renders the library's `cf-dialog` shell around the library's form controls. It
 * opens empty on Role. Before sending, `validateApplication` names each field to fix and nothing is
 * sent (mock `invalid`). While the send is on its way the button reads "Sending…", the fields hold
 * still and Cancel is disabled; Close, Escape and the scrim do nothing (mock `busy`). A pending
 * application, any other refusal or no answer keeps the dialog and every value with the mock's
 * `refused` or `failed` message. Once sent it shows "Application sent" (mock `success`) and Done
 * closes it. It uses the `PROFESSIONAL_APPLICATIONS_SERVICE` of the screen that opened it.
 */
@Component({
  selector: 'cf-apply-to-be-listed-dialog',
  imports: [Alert, Button, Dialog, FormLayout, Select, Textarea, TextField],
  templateUrl: './apply-to-be-listed-dialog.html',
  styleUrl: './apply-to-be-listed-dialog.scss',
})
export class ApplyToBeListedDialog {
  private readonly applications = inject(PROFESSIONAL_APPLICATIONS_SERVICE);
  private readonly destroyRef = inject(DestroyRef);
  private readonly ref: DialogRef<ApplyToBeListedResult, ApplyToBeListedDialog> = inject(DialogRef);

  protected readonly categories = SERVICE_CATEGORIES.map((value) => ({ value, label: value }));
  protected readonly form = signal<ApplicationForm>(emptyApplicationForm());
  protected readonly sending = signal(false);
  protected readonly sent = signal(false);
  protected readonly fieldErrors = signal<ApplicationFieldErrors>({});
  protected readonly summary = computed(() => applicationSummaryOf(this.fieldErrors()));
  /** What the last answer refused, until the next send. */
  protected readonly refusal = signal<ApplicationRefusal | null>(null);
  protected readonly values = this.form.asReadonly();

  constructor() {
    // The dialog opens with `disableClose`, so Escape is the screen's to decide.
    this.ref.keydownEvents.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      this.dismiss();
    });
  }

  /** Keeps what the member typed in `field` and clears that field's error. */
  protected edit(field: ApplicationField, value: string): void {
    this.form.update((form) => ({ ...form, [field]: value }));
    this.fieldErrors.update((errors) => clearApplicationError(errors, field));
  }

  protected choose(value: string): void {
    const category = SERVICE_CATEGORIES.find((known) => known === value) as ServiceCategory;
    this.form.update((form) => ({ ...form, category }));
  }

  /** Leaves, unless a send is on its way. */
  protected dismiss(): void {
    if (!this.sending()) this.ref.close(this.sent());
  }

  protected send(event: Event): void {
    event.preventDefault();
    if (this.sending() || this.sent()) return;
    const form = this.values();
    const errors = validateApplication(form);
    this.fieldErrors.set(errors);
    this.refusal.set(null);
    if (Object.keys(errors).length > 0) return;
    this.sending.set(true);
    this.applications
      .submit(applicationRequestOf(form))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.sending.set(false);
          this.sent.set(true);
        },
        // The dialog stays as it was, so the member can try again.
        error: (error: unknown) => {
          this.sending.set(false);
          this.refusal.set(applicationRefusalOf(error));
        },
      });
  }
}

/**
 * Opens the Apply to be listed dialog with the CDK Dialog (ADR 0048). `injector` is the screen's, so
 * the dialog uses the screen's `PROFESSIONAL_APPLICATIONS_SERVICE`. The library's `cf-dialog` draws
 * the scrim, so there is no CDK backdrop; the CDK container is the `role="dialog"`, `aria-modal`
 * element named by the dialog's title, hides the rest of the page from assistive technology, traps
 * focus, starts it in Role and returns it to the opener. Escape and the scrim go through the
 * dialog's own `dismiss`, which ignores them while a send is on its way.
 */
export function openApplyToBeListedDialog(
  injector: Injector,
): DialogRef<ApplyToBeListedResult, ApplyToBeListedDialog> {
  return injector
    .get(CdkDialog)
    .open<ApplyToBeListedResult, undefined, ApplyToBeListedDialog>(ApplyToBeListedDialog, {
      injector,
      ariaLabelledBy: 'dlg-title',
      ariaDescribedBy: 'dlg-desc',
      ariaModal: true,
      width: '100%',
      height: '100%',
      maxWidth: '100%',
      autoFocus: '#f-role',
      restoreFocus: true,
      hasBackdrop: false,
      disableClose: true,
    });
}
