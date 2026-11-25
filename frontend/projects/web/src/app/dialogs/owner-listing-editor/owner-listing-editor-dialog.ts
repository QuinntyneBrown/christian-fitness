import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, computed, DestroyRef, inject, type Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DIRECTORY_SERVICE, type ListingProfileDto } from '@cf/api';
import { Button, Dialog as DialogShell, FileField, Textarea, TextField } from '@cf/components';
import { type OwnListingEditorValues, ownListingUpdateOf, ownListingValuesOf } from '@cf/domain';

/** The ids that name and describe the dialog. */
const HEADING_ID = 'owner-listing-editor-title';
const DESCRIPTION_ID = 'owner-listing-editor-desc';

/** The image types the picker offers. */
const IMAGE_TYPES = 'image/jpeg,image/png,image/webp';

/** The editor fields typed as text. */
type TextKey = 'name' | 'about' | 'website' | 'focus' | 'contact';

/** How the editor ended: the listing as saved, or nothing when it was closed. */
export interface OwnerListingEditorResult {
  saved: ListingProfileDto;
}

/**
 * The owner's listing editor, "Edit your listing" (mock docs/mocks/dialogs/owner-listing-editor/;
 * L2-079; ADR 0093): a CDK Dialog rendering the library's dialog with the listing's name, about,
 * website, photo, focus tags (one comma field) and contact email. Focus starts on Name. While a
 * save is on its way the button reads "Saving…", the fields hold still and the dialog stays open;
 * a save that goes through closes it with the listing as saved. Every word the listing gives is
 * rendered as text.
 */
@Component({
  selector: 'cf-owner-listing-editor-dialog',
  imports: [Button, DialogShell, FileField, Textarea, TextField],
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
  /** The photo field's file name: the one chosen now, or "Current photo" for the one it has. */
  protected readonly photoName = computed(() => {
    const values = this.values();
    if (values.photoName !== null) return values.photoName;
    return values.photoKey === null ? null : 'Current photo';
  });

  protected set(field: TextKey, value: string): void {
    this.values.update((values) => ({ ...values, [field]: value }));
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
    this.directory
      .updateOwn(this.listing.id, ownListingUpdateOf(this.values()))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ listing }) => this.ref.close({ saved: listing }),
        error: () => {
          this.saving.set(false);
          this.ref.disableClose = false;
        },
      });
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
