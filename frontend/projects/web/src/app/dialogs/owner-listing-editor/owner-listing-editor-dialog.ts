import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, inject, type Injector, signal } from '@angular/core';
import type { ListingProfileDto } from '@cf/api';
import { Button, Dialog as DialogShell, FileField, Textarea, TextField } from '@cf/components';
import { type OwnListingEditorValues, ownListingValuesOf } from '@cf/domain';

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
 * website, photo, focus tags (one comma field) and contact email. Focus starts on Name. Every word
 * the listing gives is rendered as text.
 */
@Component({
  selector: 'cf-owner-listing-editor-dialog',
  imports: [Button, DialogShell, FileField, Textarea, TextField],
  templateUrl: './owner-listing-editor-dialog.html',
  styleUrl: './owner-listing-editor-dialog.scss',
})
export class OwnerListingEditorDialog {
  private readonly ref =
    inject<DialogRef<OwnerListingEditorResult, OwnerListingEditorDialog>>(DialogRef);
  private readonly listing = inject<ListingProfileDto>(DIALOG_DATA);

  protected readonly headingId = HEADING_ID;
  protected readonly descriptionId = DESCRIPTION_ID;
  protected readonly subtitle = `${this.listing.name} · Changes go live at once`;
  protected readonly imageTypes = IMAGE_TYPES;
  protected readonly values = signal<OwnListingEditorValues>(ownListingValuesOf(this.listing));

  protected set(field: TextKey, value: string): void {
    this.values.update((values) => ({ ...values, [field]: value }));
  }

  protected close(): void {
    this.ref.close();
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
