import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, DestroyRef, inject, type Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ADMIN_EVENTS_SERVICE,
  type AdminEventDetailDto,
  type AdminEventDto,
  type ApiError,
  type EventCategory,
} from '@cf/api';
import {
  Alert,
  Button,
  Drawer,
  FileField,
  FormLayout,
  Select,
  type SelectOption,
  Textarea,
  TextField,
} from '@cf/components';
import {
  EMPTY_EVENT_EDITOR,
  EVENT_CATEGORIES,
  eventCategoryLabel,
  eventDraftOf,
  type EventEditorValues,
  eventEditorValuesOf,
  eventErrorHeading,
  eventErrorItems,
  type EventFieldErrors,
  eventFieldErrorsOf,
  type EventFieldKey,
} from '@cf/domain';

/** The drawer's title id, which names the dialog. */
const HEADING_ID = 'event-editor-title';

const CATEGORY_OPTIONS: readonly SelectOption[] = EVENT_CATEGORIES.map((category) => ({
  value: category,
  label: eventCategoryLabel(category),
}));

/** The image types the picker offers (L2-022 AC4). */
const IMAGE_TYPES = 'image/jpeg,image/png,image/webp';

/** The editor's fields typed as text. */
type TextFieldKey = Exclude<keyof EventEditorValues, 'category' | 'imageKey' | 'imageName'>;

/** What the editor opens with: the values, and for a saved event its id and the members going. */
export interface EventEditorData {
  values: EventEditorValues;
  event?: { id: string; going: number };
}

/**
 * The event editor, "New event" or "Edit event" (mock docs/mocks/dialogs/event-editor/, states
 * `default`, `saving`, `edit`, `edit-saving`, `invalid`, `failed`, `image-invalid`; L2-022 AC1,
 * AC7 to AC9): a CDK Dialog rendering the library's drawer, which draws its scrim and its panel at
 * the right edge, full height, up to 32 rem wide and full width on a phone, so the CDK adds no
 * backdrop (ADR 0017). Focus starts on Title and goes back to what opened it. Save draft (new) or
 * Save changes (edit) sends the fields; while it is on its way the button reads "Saving…", the
 * fields hold still and the drawer stays open. A saved event closes the dialog with it. A refusal
 * that names fields shows each on its field, marked invalid, with an error summary that takes
 * focus; any other failure shows one generic alert; both give the fields back as typed (ADR 0021,
 * ADR 0025). An image chosen is uploaded at once and its key is saved with the event. Publish comes
 * with slice 11.1.
 */
@Component({
  selector: 'cf-event-editor-dialog',
  imports: [Alert, Button, Drawer, FileField, FormLayout, Select, Textarea, TextField],
  templateUrl: './event-editor-dialog.html',
  styleUrl: './event-editor-dialog.scss',
})
export class EventEditorDialog {
  private readonly events = inject(ADMIN_EVENTS_SERVICE);
  private readonly ref = inject<DialogRef<AdminEventDto, EventEditorDialog>>(DialogRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly data = inject<EventEditorData>(DIALOG_DATA);

  protected readonly headingId = HEADING_ID;
  protected readonly imageTypes = IMAGE_TYPES;
  protected readonly categories = CATEGORY_OPTIONS;
  protected readonly editing = this.data.event !== undefined;
  protected readonly values = signal<EventEditorValues>(this.data.values);
  protected readonly saving = signal(false);
  protected readonly uploading = signal(false);
  protected readonly failed = signal(false);
  protected readonly errors = signal<EventFieldErrors>({});

  protected errorItems(): readonly { text: string; target: string }[] {
    return eventErrorItems(this.errors());
  }

  protected errorHeading(): string {
    return eventErrorHeading(this.errorItems().length);
  }

  protected set(field: TextFieldKey, value: string): void {
    this.values.update((values) => ({ ...values, [field]: value }));
    this.clearError(field);
  }

  protected setCategory(value: string): void {
    this.values.update((values) => ({ ...values, category: value as EventCategory }));
    this.clearError('category');
  }

  protected close(): void {
    if (!this.saving()) this.ref.close();
  }

  /** The image field's file: uploaded at once, kept by its key until the event is saved. */
  protected chooseImage(file: File): void {
    this.uploading.set(true);
    this.failed.set(false);
    this.events
      .uploadImage(file)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ imageKey }) => {
          this.values.update((values) => ({ ...values, imageKey, imageName: file.name }));
          this.clearError('image');
          this.uploading.set(false);
        },
        error: (error: ApiError) => {
          const refused = eventFieldErrorsOf(error, 0);
          if (refused?.image) this.errors.update((errors) => ({ ...errors, image: refused.image }));
          else this.failed.set(true);
          this.uploading.set(false);
        },
      });
  }

  protected removeImage(): void {
    this.values.update((values) => ({ ...values, imageKey: null, imageName: null }));
    this.clearError('image');
  }

  protected save(): void {
    if (this.saving() || this.uploading()) return;
    this.saving.set(true);
    this.failed.set(false);
    // Cleared first, so a refusal again draws a new summary, which takes focus.
    this.errors.set({});
    // Escape and the scrim wait for the answer, so it is never lost.
    this.ref.disableClose = true;
    const request = eventDraftOf(this.values());
    const saved = this.data.event
      ? this.events.update(this.data.event.id, request)
      : this.events.create(request);
    saved.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (event) => this.ref.close(event),
      error: (error: ApiError) => {
        const refused = eventFieldErrorsOf(error, this.data.event?.going ?? 0);
        if (refused) this.errors.set(refused);
        else this.failed.set(true);
        this.saving.set(false);
        this.ref.disableClose = false;
      },
    });
  }

  private clearError(field: EventFieldKey): void {
    if (!this.errors()[field]) return;
    this.errors.update((errors) => ({ ...errors, [field]: undefined }));
  }
}

/** The editor's options: the dialog's own data and where it opens. */
function open(
  injector: Injector,
  data: EventEditorData,
): DialogRef<AdminEventDto, EventEditorDialog> {
  return injector
    .get(Dialog)
    .open<AdminEventDto, EventEditorData, EventEditorDialog>(EventEditorDialog, {
      injector,
      data,
      ariaLabelledBy: HEADING_ID,
      ariaModal: true,
      autoFocus: '#f-title',
      restoreFocus: true,
      // The drawer draws its own scrim and fixed panel, so the CDK adds no backdrop; its pane
      // spans the viewport the scrim covers and adds the dialog role, the focus trap, Escape and
      // focus return.
      hasBackdrop: false,
      width: '100%',
      maxWidth: '100%',
      height: '100%',
    });
}

/**
 * Opens the event editor for a new event, with `injector` (the Events page's, which binds
 * {@link ADMIN_EVENTS_SERVICE}); it closes with the created draft, or nothing. The Events page
 * imports this file on the first New event or Edit, so CDK Dialog stays out of every bundle until
 * then.
 */
export function openEventEditor(injector: Injector): DialogRef<AdminEventDto, EventEditorDialog> {
  return open(injector, { values: EMPTY_EVENT_EDITOR });
}

/** Opens the editor on a saved event; it closes with the saved event, or nothing. */
export function openEventEditorFor(
  injector: Injector,
  event: AdminEventDetailDto,
): DialogRef<AdminEventDto, EventEditorDialog> {
  return open(injector, {
    values: eventEditorValuesOf(event),
    event: { id: event.id, going: event.going },
  });
}
