import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, computed, DestroyRef, inject, type Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DIRECTORY_SERVICE, type ListingProfileDto } from '@cf/api';
import {
  Alert,
  Button,
  Dialog as DialogShell,
  FileField,
  Textarea,
  TextField,
} from '@cf/components';
import {
  listingErrorHeading,
  type OwnListingEditorValues,
  ownListingErrorItems,
  ownListingErrorsOf,
  type OwnListingFieldErrors,
  type OwnListingFieldKey,
  ownListingUpdateOf,
  ownListingValuesOf,
} from '@cf/domain';

/** The ids that name and describe the dialog. */
const HEADING_ID = 'owner-listing-editor-title';
const DESCRIPTION_ID = 'owner-listing-editor-desc';

/** The image types the picker offers. */
const IMAGE_TYPES = 'image/jpeg,image/png,image/webp';

/** What the photo field says when an upload fails for any reason but a refused file. */
const PHOTO_REFUSED = 'Use a JPEG, PNG or WebP image up to 5 MB';

/** The editor fields typed as text. */
type TextKey = 'name' | 'about' | 'website' | 'focus' | 'contact';

/** How the editor ended: the listing as saved, or nothing when it was closed. */
export interface OwnerListingEditorResult {
  saved: ListingProfileDto;
}

/**
 * The owner's listing editor, "Edit your listing" (mock docs/mocks/dialogs/owner-listing-editor/;
 * L2-079; ADR 0094): a CDK Dialog rendering the library's dialog with the listing's name, about,
 * website, photo, focus tags (one comma field) and contact email. Focus starts on Name. A chosen
 * photo is uploaded at once and saved with the listing by its key. While a
 * save is on its way the button reads "Saving…", the fields hold still and the dialog stays open;
 * a save that goes through closes it with the listing as saved, unless a new name waits for staff:
 * then it stays open on an alert saying so, and closing it in any way gives the listing as saved
 * (L2-079 AC5). A refusal that names fields shows
 * each on its field with an error summary that takes focus; any other failure shows one alert
 * above the fields (L2-079 AC3, AC6); both keep what was typed. Every word the listing gives is
 * rendered as text.
 */
@Component({
  selector: 'cf-owner-listing-editor-dialog',
  imports: [Alert, Button, DialogShell, FileField, Textarea, TextField],
  templateUrl: './owner-listing-editor-dialog.html',
  styleUrl: './owner-listing-editor-dialog.scss',
})
export class OwnerListingEditorDialog {
  private readonly directory = inject(DIRECTORY_SERVICE);
  private readonly ref =
    inject<DialogRef<OwnerListingEditorResult, OwnerListingEditorDialog>>(DialogRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly listing = inject<ListingProfileDto>(DIALOG_DATA);

  protected readonly headingId = HEADING_ID;
  protected readonly descriptionId = DESCRIPTION_ID;
  protected readonly subtitle = `${this.listing.name} · Changes go live at once`;
  protected readonly imageTypes = IMAGE_TYPES;
  protected readonly values = signal<OwnListingEditorValues>(ownListingValuesOf(this.listing));
  protected readonly saving = signal(false);
  protected readonly uploading = signal(false);
  /** The listing as saved while the review alert shows, which closing the dialog hands back. */
  protected readonly reviewed = signal<ListingProfileDto | null>(null);
  protected readonly failed = signal(false);
  protected readonly errors = signal<OwnListingFieldErrors>({});
  protected readonly errorItems = computed(() => ownListingErrorItems(this.errors()));
  protected readonly errorHeading = computed(() => listingErrorHeading(this.errorItems().length));
  /** The photo field's file name: the one chosen now, or "Current photo" for the one it has. */
  protected readonly photoName = computed(() => {
    const values = this.values();
    if (values.photoName !== null) return values.photoName;
    return values.photoKey === null ? null : 'Current photo';
  });

  protected set(field: TextKey, value: string): void {
    this.values.update((values) => ({ ...values, [field]: value }));
    this.clearError(field);
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
          const photo = ownListingErrorsOf(error)?.photo ?? PHOTO_REFUSED;
          this.errors.update((errors) => ({ ...errors, photo }));
          this.uploading.set(false);
        },
      });
  }

  protected removePhoto(): void {
    this.values.update((values) => ({ ...values, photoKey: null, photoName: null }));
    this.clearError('photo');
  }

  constructor() {
    // While the review alert shows, Escape closes with the saved listing rather than nothing.
    this.ref.keydownEvents.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event.key !== 'Escape' || this.reviewed() === null || this.saving()) return;
      event.preventDefault();
      this.close();
    });
  }

  protected close(): void {
    if (this.saving()) return;
    const saved = this.reviewed();
    this.ref.close(saved === null ? undefined : { saved });
  }

  protected save(): void {
    if (this.saving() || this.uploading()) return;
    this.saving.set(true);
    // Escape, Close and the scrim wait for the answer, so it is never lost.
    this.ref.disableClose = true;
    this.failed.set(false);
    this.reviewed.set(null);
    // Cleared first, so a refusal again draws a new summary, which takes focus.
    this.errors.set({});
    this.directory
      .updateOwn(this.listing.id, ownListingUpdateOf(this.values()))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ listing, nameChangePending }) => {
          if (!nameChangePending) {
            this.ref.close({ saved: listing });
            return;
          }
          this.reviewed.set(listing);
          this.saving.set(false);
        },
        error: (error: unknown) => {
          const fields = ownListingErrorsOf(error);
          if (fields) this.errors.set(fields);
          else this.failed.set(true);
          this.saving.set(false);
          this.ref.disableClose = false;
        },
      });
  }

  private clearError(field: OwnListingFieldKey): void {
    if (!this.errors()[field]) return;
    this.errors.update((errors) => ({ ...errors, [field]: undefined }));
  }
}

/**
 * Opens the owner's editor on `listing`, with `injector` (the listing profile's, which binds
 * `DIRECTORY_SERVICE`); it closes with the result, or nothing. The page imports it on the first
 * Edit listing.
 */
export function openOwnerListingEditor(
  injector: Injector,
  listing: ListingProfileDto,
): DialogRef<OwnerListingEditorResult, OwnerListingEditorDialog> {
  return injector
    .get(Dialog)
    .open<OwnerListingEditorResult, ListingProfileDto, OwnerListingEditorDialog>(
      OwnerListingEditorDialog,
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
