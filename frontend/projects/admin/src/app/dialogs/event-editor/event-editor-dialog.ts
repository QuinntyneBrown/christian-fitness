import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { Component, computed, DestroyRef, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
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
  goingDateOf,
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

/**
 * What the editor opens with: the values, and for a saved event its id, status and the members
 * going.
 */
export interface EventEditorData {
  values: EventEditorValues;
  event?: { id: string; going: number; status: AdminEventDto['status'] };
}

/** How an editor ended with a saved event: what the page says about it. */
export interface EventEditorResult {
  event: AdminEventDto;
  outcome: 'created' | 'updated' | 'published' | 'cancelled';
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
  private readonly ref = inject<DialogRef<EventEditorResult, EventEditorDialog>>(DialogRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly data = inject<EventEditorData>(DIALOG_DATA);
  private readonly injector = inject(Injector);

  protected readonly headingId = HEADING_ID;
  protected readonly imageTypes = IMAGE_TYPES;
  protected readonly categories = CATEGORY_OPTIONS;
  protected readonly editing = this.data.event !== undefined;
  /** A new event and a draft can be published; a published event only takes changes. */
  protected readonly canPublish = !this.data.event || this.data.event.status === 'draft';
  /** A published event can be cancelled, after a confirmation (ADR 0035). */
  protected readonly canCancel = this.data.event?.status === 'published';
  protected readonly working = computed(() => this.saving() || this.publishing());
  /** The event as last saved here, so a retry updates it and a close keeps it. */
  private saved: AdminEventDto | null = null;

  constructor() {
    // Escape is ours: it waits for a save and closes with the saved draft (ADR 0026).
    this.ref.disableClose = true;
    this.ref.keydownEvents
      .pipe(
        filter((event) => event.key === 'Escape'),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.close());
  }
  protected readonly values = signal<EventEditorValues>(this.data.values);
  protected readonly saving = signal(false);
  protected readonly publishing = signal(false);
  /** The save worked and the publish did not (ADR 0026). */
  protected readonly publishFailed = signal(false);
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
    if (this.working()) return;
    this.ref.close(this.saved ? { event: this.saved, outcome: this.savedOutcome() } : undefined);
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
    this.run(false);
  }

  protected publish(): void {
    this.run(true);
  }

  /** Asks staff to confirm; a cancelled event closes the editor with it (ADR 0035). */
  protected async cancelEvent(): Promise<void> {
    const event = this.data.event;
    if (!event || this.working() || this.uploading()) return;
    // The confirmation and its code load on first use.
    const { openCancelEventDialog } = await import('../cancel-event/cancel-event-dialog');
    const { title, date } = this.data.values;
    openCancelEventDialog(this.injector, {
      id: event.id,
      subtitle: `${title} · ${goingDateOf(`${date}T12:00:00Z`)}`,
      going: event.going,
    })
      .closed.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((cancelled) => {
        if (cancelled) this.ref.close({ event: cancelled, outcome: 'cancelled' });
      });
  }

  /** Saves the fields, then publishes when asked; a retry updates the draft already saved. */
  private run(publish: boolean): void {
    if (this.working() || this.uploading()) return;
    (publish ? this.publishing : this.saving).set(true);
    this.failed.set(false);
    this.publishFailed.set(false);
    // Cleared first, so a refusal again draws a new summary, which takes focus.
    this.errors.set({});
    const request = eventDraftOf(this.values());
    const id = this.saved?.id ?? this.data.event?.id;
    const saved$ = id ? this.events.update(id, request) : this.events.create(request);
    saved$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (event) => {
        this.saved = event;
        if (publish) this.publishSaved(event.id);
        else this.ref.close({ event, outcome: this.savedOutcome() });
      },
      error: (error: ApiError) => this.refused(error, false),
    });
  }

  private publishSaved(id: string): void {
    this.events
      .publish(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => this.ref.close({ event, outcome: 'published' }),
        error: (error: ApiError) => this.refused(error, true),
      });
  }

  private savedOutcome(): EventEditorResult['outcome'] {
    return this.data.event ? 'updated' : 'created';
  }

  /** Shows what a failed save or publish says: fields it names, else one generic alert. */
  private refused(error: ApiError, publishing: boolean): void {
    const fields = eventFieldErrorsOf(error, this.data.event?.going ?? 0);
    if (fields) this.errors.set(fields);
    else if (publishing) this.publishFailed.set(true);
    else this.failed.set(true);
    this.saving.set(false);
    this.publishing.set(false);
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
): DialogRef<EventEditorResult, EventEditorDialog> {
  return injector
    .get(Dialog)
    .open<EventEditorResult, EventEditorData, EventEditorDialog>(EventEditorDialog, {
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
export function openEventEditor(
  injector: Injector,
): DialogRef<EventEditorResult, EventEditorDialog> {
  return open(injector, { values: EMPTY_EVENT_EDITOR });
}

/** Opens the editor on a saved event; it closes with the saved event, or nothing. */
export function openEventEditorFor(
  injector: Injector,
  event: AdminEventDetailDto,
): DialogRef<EventEditorResult, EventEditorDialog> {
  return open(injector, {
    values: eventEditorValuesOf(event),
    event: { id: event.id, going: event.going, status: event.status },
  });
}
