import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, computed, DestroyRef, inject, type Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ADMIN_DIRECTORY_SERVICE, type ListedListingDto, type ListingKind } from '@cf/api';
import {
  Alert,
  Button,
  Dialog as DialogShell,
  FileField,
  type SelectOption,
  Select,
  Textarea,
  TextField,
} from '@cf/components';
import {
  type DirectoryListingEditorValues,
  directoryListingErrorItems,
  directoryListingErrorsOf,
  type DirectoryListingFieldErrors,
  type DirectoryListingFieldKey,
  directoryListingGone,
  directoryListingUpdateOf,
  directoryListingValuesOf,
  kindLabel,
  LISTING_KINDS,
  listingErrorHeading,
} from '@cf/domain';

/** The ids that name and describe the dialog. */
const HEADING_ID = 'directory-listing-editor-title';
const DESCRIPTION_ID = 'directory-listing-editor-desc';

/** The image types the picker offers. */
const IMAGE_TYPES = 'image/jpeg,image/png,image/webp';

const KIND_OPTIONS: readonly SelectOption[] = LISTING_KINDS.map(({ kind }) => ({
  value: kind,
  label: kindLabel(kind),
}));

/** The editor fields typed as text. */
type TextKey = 'name' | 'area' | 'tagline' | 'about' | 'website' | 'focus' | 'contact';

/**
 * How the editor ended: the listing as saved, or `gone` when it was not there any more, so the page
 * shows Listed as it stands. Closing otherwise gives nothing.
 */
export type DirectoryListingEditorResult = { saved: ListedListingDto } | { gone: true };

/**
 * The staff listing editor, "Edit listing" (mock docs/mocks/dialogs/directory-listing-editor/;
 * L2-073 AC13; ADR 0090): a CDK Dialog rendering the library's dialog with the listing's name,
 * kind, area, tagline, about, website and photo, and no control for the Verified mark. Focus
 * starts on Name. A chosen photo is uploaded at once and saved with the listing by its key. While
 * a save is on its way the button reads "Saving…", the fields hold still and the dialog stays open.
 * A refusal that names fields shows each on its field with an error summary that takes focus; any
 * other failure shows one alert; both keep what was typed.
 */
@Component({
  selector: 'cf-directory-listing-editor-dialog',
  imports: [Alert, Button, DialogShell, FileField, Select, Textarea, TextField],
  templateUrl: './directory-listing-editor-dialog.html',
  styleUrl: './directory-listing-editor-dialog.scss',
})
export class DirectoryListingEditorDialog {
  private readonly directory = inject(ADMIN_DIRECTORY_SERVICE);
  private readonly ref =
    inject<DialogRef<DirectoryListingEditorResult, DirectoryListingEditorDialog>>(DialogRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly listing = inject<ListedListingDto>(DIALOG_DATA);

  protected readonly headingId = HEADING_ID;
  protected readonly descriptionId = DESCRIPTION_ID;
  protected readonly subtitle = `${this.listing.name} · changes show in the directory at once`;
  protected readonly kinds = KIND_OPTIONS;
  protected readonly imageTypes = IMAGE_TYPES;
  protected readonly values = signal<DirectoryListingEditorValues>(
    directoryListingValuesOf(this.listing),
  );
  protected readonly saving = signal(false);
  protected readonly uploading = signal(false);
  protected readonly failed = signal(false);
  protected readonly errors = signal<DirectoryListingFieldErrors>({});
  protected readonly errorItems = computed(() => directoryListingErrorItems(this.errors()));
  protected readonly errorHeading = computed(() => listingErrorHeading(this.errorItems().length));
  /** The photo field's file name: the one chosen now, or "Current image" for the one it has. */
  protected readonly photoName = computed(() => {
    const values = this.values();
    if (values.photoName !== null) return values.photoName;
    return values.photoKey === null ? null : 'Current image';
  });

  protected set(field: TextKey, value: string): void {
    this.values.update((values) => ({ ...values, [field]: value }));
    this.clearError(field);
  }

  protected setKind(value: string): void {
    this.values.update((values) => ({ ...values, kind: value as ListingKind }));
    this.clearError('kind');
  }

  /** The photo field's file: uploaded at once, kept by its key until the listing is saved. */
  protected choosePhoto(file: File): void {
    this.uploading.set(true);
    this.clearError('photo');
    this.directory
      .uploadPhoto(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ photoKey }) => {
          this.values.update((values) => ({ ...values, photoKey, photoName: file.name }));
          this.uploading.set(false);
        },
        error: (error: unknown) => {
          const photo =
            directoryListingErrorsOf(error)?.photo ?? 'Use a JPEG, PNG or WebP image up to 5 MB';
          this.errors.update((errors) => ({ ...errors, photo }));
          this.uploading.set(false);
        },
      });
  }

  protected removePhoto(): void {
    this.values.update((values) => ({ ...values, photoKey: null, photoName: null }));
    this.clearError('photo');
  }

  protected close(): void {
    if (this.saving()) return;
    this.ref.close();
  }

  protected save(): void {
    if (this.saving() || this.uploading()) return;
    this.saving.set(true);
    // Escape, Close and the scrim wait for the answer, so it is never lost.
    this.ref.disableClose = true;
    this.failed.set(false);
    // Cleared first, so a refusal again draws a new summary, which takes focus.
    this.errors.set({});
    this.directory
      .updateListing(this.listing.id, directoryListingUpdateOf(this.values()))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (saved) => this.ref.close({ saved }),
        error: (error: unknown) => {
          if (directoryListingGone(error)) {
            this.ref.close({ gone: true });
            return;
          }
          const fields = directoryListingErrorsOf(error);
          if (fields) this.errors.set(fields);
          else this.failed.set(true);
          this.saving.set(false);
          this.ref.disableClose = false;
        },
      });
  }

  private clearError(field: DirectoryListingFieldKey): void {
    if (!this.errors()[field]) return;
    this.errors.update((errors) => ({ ...errors, [field]: undefined }));
  }
}

/**
 * Opens the staff listing editor on `listing`, with `injector` (the Listings page's, which binds
 * {@link ADMIN_DIRECTORY_SERVICE}); it closes with the result, or nothing. The page imports it,
 * with the decline dialog, on the first Edit or Decline.
 */
export function openDirectoryListingEditor(
  injector: Injector,
  listing: ListedListingDto,
): DialogRef<DirectoryListingEditorResult, DirectoryListingEditorDialog> {
  return injector
    .get(Dialog)
    .open<DirectoryListingEditorResult, ListedListingDto, DirectoryListingEditorDialog>(
      DirectoryListingEditorDialog,
      {
        injector,
        data: listing,
        ariaLabelledBy: HEADING_ID,
        ariaDescribedBy: DESCRIPTION_ID,
        ariaModal: true,
        autoFocus: '#f-name',
        restoreFocus: true,
        // The dialog draws its own scrim and panel, so the CDK adds no backdrop.
        hasBackdrop: false,
        width: '100%',
        maxWidth: '100%',
        height: '100%',
      },
    );
}
