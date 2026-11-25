import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, computed, DestroyRef, inject, type Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ADMIN_BYLINES_SERVICE, type BylineDto } from '@cf/api';
import {
  Alert,
  Button,
  Dialog as DialogShell,
  FileField,
  Textarea,
  TextField,
} from '@cf/components';
import {
  bylineDraftOf,
  type BylineEditorValues,
  bylineErrorHeading,
  bylineErrorItems,
  bylineErrorsOf,
  type BylineFieldErrors,
  type BylineFieldKey,
  bylineGone,
  bylineMissing,
  bylineNameTaken,
  bylineValuesOf,
} from '@cf/domain';

/** The id that names the dialog. */
const HEADING_ID = 'byline-editor-title';

/** The image types the picker offers. */
const IMAGE_TYPES = 'image/jpeg,image/png,image/webp';

/** The short bio's limit, which its counter counts down from (L2-077 AC3). */
const BIO_MAX_LENGTH = 200;

/** What the editor opens on: a byline to edit, or `null` to add one. */
export interface BylineEditorData {
  byline: BylineDto | null;
}

/**
 * How the editor ended: the byline as saved, or `gone` when it was not there any more, so the page
 * reads Bylines again. Closing otherwise gives nothing.
 */
export type BylineEditorResult = { saved: BylineDto } | { gone: true };

/**
 * The byline editor, "Add a byline" or "Edit byline" (mock docs/mocks/dialogs/byline-editor/;
 * L2-077 AC3 to AC5; ADR 0094): a CDK Dialog rendering the library's dialog with the name, the
 * short bio with its counter and an optional photo. Focus starts on Name. A missing name or bio is
 * named before anything is sent. A chosen photo is uploaded at once and saved with the byline by
 * its key. While a save is on its way the button reads "Saving…", the fields hold still and the
 * dialog stays open. A refusal that names fields shows each on its field (several also in a
 * summary that takes focus); any other failure shows one alert; both keep what was typed.
 */
@Component({
  selector: 'cf-byline-editor-dialog',
  imports: [Alert, Button, DialogShell, FileField, Textarea, TextField],
  templateUrl: './byline-editor-dialog.html',
  styleUrl: './byline-editor-dialog.scss',
})
export class BylineEditorDialog {
  private readonly api = inject(ADMIN_BYLINES_SERVICE);
  private readonly ref = inject<DialogRef<BylineEditorResult, BylineEditorDialog>>(DialogRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly byline = inject<BylineEditorData>(DIALOG_DATA).byline;

  protected readonly headingId = HEADING_ID;
  protected readonly heading = this.byline ? 'Edit byline' : 'Add a byline';
  protected readonly saveLabel = this.byline ? 'Save byline' : 'Add byline';
  protected readonly imageTypes = IMAGE_TYPES;
  protected readonly bioMaxLength = BIO_MAX_LENGTH;
  protected readonly values = signal<BylineEditorValues>(bylineValuesOf(this.byline));
  protected readonly saving = signal(false);
  protected readonly uploading = signal(false);
  protected readonly failed = signal(false);
  protected readonly errors = signal<BylineFieldErrors>({});
  /**
   * The summary lists the fields a check refused (mock `byline-editor/invalid`); a name another
   * byline has is named on its field alone (mock `byline-editor/refused`).
   */
  protected readonly errorItems = computed(() => bylineErrorItems(this.summarised()));
  protected readonly errorHeading = computed(() => bylineErrorHeading(this.errorItems().length));
  /** The photo field's file name: the one chosen now, or "Current image" for the one it has. */
  protected readonly photoName = computed(() => {
    const values = this.values();
    if (values.photoName !== null) return values.photoName;
    return values.photoKey === null ? null : 'Current image';
  });

  /** The errors the last save drew; the summary keeps its lines while fields are corrected. */
  private readonly summarised = signal<BylineFieldErrors>({});

  protected set(field: 'name' | 'bio', value: string): void {
    this.values.update((values) => ({ ...values, [field]: value }));
    this.clearError(field);
  }

  /** The photo field's file: uploaded at once, kept by its key until the byline is saved. */
  protected choosePhoto(file: File): void {
    this.uploading.set(true);
    this.clearError('photo');
    this.api
      .uploadPhoto(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ photoKey }) => {
          this.values.update((values) => ({ ...values, photoKey, photoName: file.name }));
          this.uploading.set(false);
        },
        error: (error: unknown) => {
          const photo =
            bylineErrorsOf(error, '')?.photo ?? 'Use a JPEG, PNG or WebP image up to 5 MB';
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
    this.failed.set(false);
    const missing = bylineMissing(this.values());
    if (missing) {
      this.refuse(missing);
      return;
    }
    this.saving.set(true);
    // Escape, Close and the scrim wait for the answer, so it is never lost.
    this.ref.disableClose = true;
    // Cleared first, so a refusal again draws a new summary, which takes focus.
    this.refuse({});
    const draft = bylineDraftOf(this.values());
    const saved = this.byline ? this.api.update(this.byline.id, draft) : this.api.create(draft);
    saved.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (byline) => this.ref.close({ saved: byline }),
      error: (error: unknown) => {
        if (bylineGone(error)) {
          this.ref.close({ gone: true });
          return;
        }
        const fields = bylineErrorsOf(error, draft.name);
        if (fields) this.refuse(fields, !bylineNameTaken(error));
        else this.failed.set(true);
        this.saving.set(false);
        this.ref.disableClose = false;
      },
    });
  }

  private refuse(errors: BylineFieldErrors, summary = true): void {
    this.errors.set(errors);
    this.summarised.set(summary ? errors : {});
  }

  private clearError(field: BylineFieldKey): void {
    if (!this.errors()[field]) return;
    this.errors.update((errors) => ({ ...errors, [field]: undefined }));
  }
}

/**
 * Opens the byline editor on `byline`, or blank for Add byline, with `injector` (the Bylines
 * page's, which binds {@link ADMIN_BYLINES_SERVICE}); it closes with the result, or nothing. The
 * page imports it on the first Add byline or Edit.
 */
export function openBylineEditor(
  injector: Injector,
  byline: BylineDto | null,
): DialogRef<BylineEditorResult, BylineEditorDialog> {
  return injector
    .get(Dialog)
    .open<BylineEditorResult, BylineEditorData, BylineEditorDialog>(BylineEditorDialog, {
      injector,
      data: { byline },
      ariaLabelledBy: HEADING_ID,
      ariaModal: true,
      autoFocus: '#f-name',
      restoreFocus: true,
      // The dialog draws its own scrim and panel, so the CDK adds no backdrop.
      hasBackdrop: false,
      width: '100%',
      maxWidth: '100%',
      height: '100%',
    });
}
