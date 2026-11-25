import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { DOCUMENT } from '@angular/common';
import { Component, computed, DestroyRef, inject, Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { filter, type Subscription } from 'rxjs';
import {
  ADMIN_EVENTS_SERVICE,
  type AdminEventDetailDto,
  type AdminEventDto,
  type ApiError,
  type EventCategory,
  type EventHostDto,
} from '@cf/api';
import {
  Alert,
  Button,
  Drawer,
  FileField,
  FormLayout,
  PickCards,
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
  HOST_SEARCH_DELAY_MS,
  HOST_SEARCH_FAILED_TEXT,
  hostChoiceViewOf,
  type HostChoiceView,
  hostNoMatchesText,
  hostSearchTermOf,
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
type TextFieldKey = Exclude<
  keyof EventEditorValues,
  'category' | 'imageKey' | 'imageName' | 'hostListingId' | 'hostName'
>;

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
  imports: [Alert, Button, Drawer, FileField, FormLayout, PickCards, Select, Textarea, TextField],
  templateUrl: './event-editor-dialog.html',
  styleUrl: './event-editor-dialog.scss',
})
export class EventEditorDialog {
  private readonly events = inject(ADMIN_EVENTS_SERVICE);
  private readonly ref = inject<DialogRef<EventEditorResult, EventEditorDialog>>(DialogRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly data = inject<EventEditorData>(DIALOG_DATA);
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  /** The Host search waiting for the typing to stop, and the one on its way (ADR 0088). */
  private hostTimer: ReturnType<typeof setTimeout> | undefined;
  private hostSearch: Subscription | null = null;
  private hostMatches: readonly EventHostDto[] = [];

  protected readonly headingId = HEADING_ID;
  protected readonly imageTypes = IMAGE_TYPES;
  protected readonly categories = CATEGORY_OPTIONS;
  protected readonly editing = this.data.event !== undefined;
  /** A new event and a draft can be published; a published event only takes changes. */
  protected readonly canPublish = !this.data.event || this.data.event.status === 'draft';
  /** A published event can be cancelled, after a confirmation (ADR 0035). */
  protected readonly canCancel = this.data.event?.status === 'published';
  /** A published or cancelled event has registrations to read (ADR 0036). */
  protected readonly canViewRegistrations =
    this.data.event !== undefined && this.data.event.status !== 'draft';
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
    if (!this.editing) this.askDefaultHost();
    this.destroyRef.onDestroy(() => clearTimeout(this.hostTimer));
  }
  protected readonly values = signal<EventEditorValues>(this.data.values);
  protected readonly saving = signal(false);
  protected readonly publishing = signal(false);
  /** The save worked and the publish did not (ADR 0026). */
  protected readonly publishFailed = signal(false);
  protected readonly uploading = signal(false);
  protected readonly failed = signal(false);
  protected readonly errors = signal<EventFieldErrors>({});
  /** The matching hosts the picker offers, as pick cards. */
  protected readonly hostChoices = signal<readonly HostChoiceView[]>([]);
  /** The line under the Host field: no match, or a search that failed. */
  protected readonly hostStatus = signal('');

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

  /**
   * The Host field's text (ADR 0088): any edit clears the choice; from 2 characters, the matches
   * are asked for once the typing stops, and a new edit drops a search still on its way.
   */
  protected searchHost(text: string): void {
    this.values.update((values) => ({ ...values, hostName: text, hostListingId: null }));
    this.clearError('host');
    clearTimeout(this.hostTimer);
    this.hostSearch?.unsubscribe();
    this.hostChoices.set([]);
    this.hostStatus.set('');
    const term = hostSearchTermOf(text);
    if (term === null) return;
    this.hostTimer = setTimeout(() => {
      this.hostSearch = this.events
        .searchHosts(term)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: ({ hosts }) => {
            this.hostMatches = hosts;
            this.hostChoices.set(hosts.map(hostChoiceViewOf));
            if (hosts.length === 0) this.hostStatus.set(hostNoMatchesText(term));
          },
          error: () => this.hostStatus.set(HOST_SEARCH_FAILED_TEXT),
        });
    }, HOST_SEARCH_DELAY_MS);
  }

  /** Makes the chosen match the host, closes the list and returns to the field. */
  protected chooseHost(id: string): void {
    const host = this.hostMatches.find((match) => match.id === id);
    if (!host || this.working()) return;
    this.values.update((values) => ({ ...values, hostListingId: host.id, hostName: host.name }));
    this.clearError('host');
    this.hostChoices.set([]);
    this.document.getElementById('f-host')?.focus();
  }

  protected close(): void {
    if (this.working()) return;
    this.ref.close(this.saved ? { event: this.saved, outcome: this.savedOutcome() } : undefined);
  }

  /**
   * A new event's host starts as the team listing (ADR 0088), unless staff already typed in the
   * field; a failure leaves the field for them to search.
   */
  private askDefaultHost(): void {
    this.events
      .defaultHost()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (host) => {
          if (this.values().hostName !== '' || this.values().hostListingId !== null) return;
          this.values.update((values) => ({
            ...values,
            hostListingId: host.id,
            hostName: host.name,
          }));
        },
        error: () => undefined,
      });
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

  /** Closes the editor by its ref, then opens the event's registrations page (ADR 0036). */
  protected viewRegistrations(): void {
    const event = this.data.event;
    if (!event || this.working() || this.uploading()) return;
    this.ref.close(this.saved ? { event: this.saved, outcome: this.savedOutcome() } : undefined);
    void this.router.navigateByUrl(`/events/${encodeURIComponent(event.id)}/registrations`);
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
