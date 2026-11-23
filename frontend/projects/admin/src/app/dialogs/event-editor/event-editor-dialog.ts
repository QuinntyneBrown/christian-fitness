import { Dialog, DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { createGlobalPositionStrategy } from '@angular/cdk/overlay';
import { Component, DestroyRef, inject, type Injector, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ADMIN_EVENTS_SERVICE, type AdminEventDto, type EventCategory } from '@cf/api';
import {
  Button,
  Drawer,
  FormAlert,
  SelectField,
  type SelectOption,
  TextareaField,
  TextField,
} from '@cf/components';
import {
  EMPTY_EVENT_EDITOR,
  EVENT_CATEGORIES,
  eventCategoryLabel,
  eventDraftOf,
  type EventEditorValues,
} from '@cf/domain';

/** The drawer's heading id, which names the dialog. */
const HEADING_ID = 'event-editor-title';

const CATEGORY_OPTIONS: readonly SelectOption[] = EVENT_CATEGORIES.map((category) => ({
  value: category,
  label: eventCategoryLabel(category),
}));

/**
 * The event editor, "New event" (mock docs/mocks/dialogs/event-editor/, states `default` and
 * `saving`; L2-022 AC1): a CDK Dialog drawing the drawer at the right edge, full height, up to 32
 * rem wide and full width on a phone, over the `cf-scrim`. Focus starts on Title and goes back to
 * what opened it. Save draft sends the fields; while it is on its way the button reads "Saving…",
 * the fields hold still and the drawer stays open. A created draft closes the dialog with the
 * event. A refusal shows one generic alert and gives the fields back as typed (ADR 0017). Publish
 * comes with slice 11.1.
 */
@Component({
  selector: 'cf-event-editor-dialog',
  imports: [Button, Drawer, FormAlert, SelectField, TextareaField, TextField],
  templateUrl: './event-editor-dialog.html',
  styleUrl: './event-editor-dialog.scss',
})
export class EventEditorDialog {
  private readonly events = inject(ADMIN_EVENTS_SERVICE);
  private readonly ref = inject<DialogRef<AdminEventDto, EventEditorDialog>>(DialogRef);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly headingId = HEADING_ID;
  protected readonly categories = CATEGORY_OPTIONS;
  protected readonly values = signal<EventEditorValues>(inject<EventEditorValues>(DIALOG_DATA));
  protected readonly saving = signal(false);
  protected readonly failed = signal(false);

  protected set(field: Exclude<keyof EventEditorValues, 'category'>, value: string): void {
    this.values.update((values) => ({ ...values, [field]: value }));
  }

  protected setCategory(value: string): void {
    this.values.update((values) => ({ ...values, category: value as EventCategory }));
  }

  protected close(): void {
    if (!this.saving()) this.ref.close();
  }

  protected saveDraft(): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.failed.set(false);
    // Escape and the scrim wait for the answer, so it is never lost.
    this.ref.disableClose = true;
    this.events
      .create(eventDraftOf(this.values()))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => this.ref.close(created),
        error: () => {
          this.failed.set(true);
          this.saving.set(false);
          this.ref.disableClose = false;
        },
      });
  }
}

/**
 * Opens the event editor for a new event, with `injector` (the Events page's, which binds
 * {@link ADMIN_EVENTS_SERVICE}); it closes with the created draft, or nothing. The Events page
 * imports this file on the first New event, so CDK Dialog stays out of every bundle until then.
 */
export function openEventEditor(injector: Injector): DialogRef<AdminEventDto, EventEditorDialog> {
  return injector
    .get(Dialog)
    .open<AdminEventDto, EventEditorValues, EventEditorDialog>(EventEditorDialog, {
      injector,
      data: EMPTY_EVENT_EDITOR,
      ariaLabelledBy: HEADING_ID,
      ariaModal: true,
      autoFocus: '#f-title',
      restoreFocus: true,
      backdropClass: 'cf-scrim',
      width: '100%',
      maxWidth: 'var(--layout-dialog-max)',
      height: '100%',
      positionStrategy: createGlobalPositionStrategy(injector).right('0').top('0'),
    });
}
