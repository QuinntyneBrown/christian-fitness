import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, computed, DestroyRef, inject, type Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ADMIN_SERVICES_SERVICE,
  type AdminListingDto,
  type ApiError,
  SERVICE_CATEGORIES,
  type ServiceCategory,
} from '@cf/api';
import {
  Alert,
  Button,
  Drawer,
  FormLayout,
  Select,
  type SelectOption,
  Textarea,
  TextField,
} from '@cf/components';
import {
  type ListingEditorValues,
  listingEditorValuesOf,
  listingErrorHeading,
  listingErrorItems,
  type ListingFieldErrors,
  listingFieldErrorsOf,
  type ListingFieldKey,
  listingGone,
  listingUpdateOf,
} from '@cf/domain';

/** The drawer title id, which names the dialog. */
const HEADING_ID = 'listing-editor-title';

const CATEGORY_OPTIONS: readonly SelectOption[] = SERVICE_CATEGORIES.map((category) => ({
  value: category,
  label: category,
}));

/** The editor fields typed as text. */
type TextFieldKey = Exclude<ListingFieldKey, 'category'>;

/**
 * How the editor ended: the listing as saved, or `gone` when the listing was not there any more, so
 * the page shows the list as it stands. Closing otherwise gives nothing.
 */
export type ListingEditorResult = { saved: AdminListingDto } | { gone: true };

/**
 * The listing editor, "Edit listing" (mock docs/mocks/dialogs/listing-editor/, states `edit` and
 * `edit-invalid`; L2-027 AC1; ADR 0054): a CDK Dialog rendering the library drawer, which draws its
 * own scrim and its panel at the right edge, so the CDK adds no backdrop (ADR 0017). Focus starts on
 * Name and goes back to what opened it. Save changes sends every field; while it is on its way the
 * button reads "Saving…", the fields hold still and the drawer stays open. A saved listing closes the
 * dialog with it. A refusal that names fields shows each on its field, marked invalid, with an error
 * summary that takes focus; any other failure shows one generic alert; both give the fields back as
 * typed. A listing found gone closes the dialog so the page can show the list as it stands.
 */
@Component({
  selector: 'cf-listing-editor-dialog',
  imports: [Alert, Button, Drawer, FormLayout, Select, Textarea, TextField],
  templateUrl: './listing-editor-dialog.html',
  styleUrl: './listing-editor-dialog.scss',
})
export class ListingEditorDialog {
  private readonly services = inject(ADMIN_SERVICES_SERVICE);
  private readonly ref = inject<DialogRef<ListingEditorResult, ListingEditorDialog>>(DialogRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly listing = inject<AdminListingDto>(DIALOG_DATA);

  protected readonly headingId = HEADING_ID;
  protected readonly categories = CATEGORY_OPTIONS;
  protected readonly values = signal<ListingEditorValues>(listingEditorValuesOf(this.listing));
  protected readonly saving = signal(false);
  protected readonly failed = signal(false);
  protected readonly errors = signal<ListingFieldErrors>({});
  protected readonly errorItems = computed(() => listingErrorItems(this.errors()));
  protected readonly errorHeading = computed(() => listingErrorHeading(this.errorItems().length));

  protected set(field: TextFieldKey, value: string): void {
    this.values.update((values) => ({ ...values, [field]: value }));
    this.clearError(field);
  }

  protected setCategory(value: string): void {
    this.values.update((values) => ({ ...values, category: value as ServiceCategory }));
    this.clearError('category');
  }

  protected close(): void {
    if (this.saving()) return;
    this.ref.close();
  }

  protected save(): void {
    if (this.saving()) return;
    this.saving.set(true);
    // Escape, Close and the scrim wait for the answer, so it is never lost.
    this.ref.disableClose = true;
    this.failed.set(false);
    // Cleared first, so a refusal again draws a new summary, which takes focus.
    this.errors.set({});
    this.services
      .updateListing(this.listing.id, listingUpdateOf(this.values()))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (saved) => this.ref.close({ saved }),
        error: (error: ApiError) => {
          if (listingGone(error)) {
            this.ref.close({ gone: true });
            return;
          }
          const fields = listingFieldErrorsOf(error);
          if (fields) this.errors.set(fields);
          else this.failed.set(true);
          this.saving.set(false);
          this.ref.disableClose = false;
        },
      });
  }

  private clearError(field: ListingFieldKey): void {
    if (!this.errors()[field]) return;
    this.errors.update((errors) => ({ ...errors, [field]: undefined }));
  }
}

/**
 * Opens the listing editor on `listing`, with `injector` (the Services page, which binds
 * {@link ADMIN_SERVICES_SERVICE}); it closes with the result, or nothing. The page imports this file
 * on the first Edit, so CDK Dialog and the editor stay out of the page chunk until then.
 */
export function openListingEditor(
  injector: Injector,
  listing: AdminListingDto,
): DialogRef<ListingEditorResult, ListingEditorDialog> {
  return injector
    .get(Dialog)
    .open<ListingEditorResult, AdminListingDto, ListingEditorDialog>(ListingEditorDialog, {
      injector,
      data: listing,
      ariaLabelledBy: HEADING_ID,
      ariaModal: true,
      autoFocus: '#f-name',
      restoreFocus: true,
      // The drawer draws its own scrim and fixed panel, so the CDK adds no backdrop.
      hasBackdrop: false,
      width: '100%',
      maxWidth: '100%',
      height: '100%',
    });
}
