import { Component, input, output } from '@angular/core';

/**
 * The design system's `staff` block (docs/design-system/assets/components.css, "Staff sign-in";
 * mock `docs/mocks/pages/admin-sign-in/`): the white card on the dark chrome, with the seal,
 * "Christian Fitness" and the "Admin console" eyebrow, and in it, in the page's one `main`, a form
 * with its heading, lead, fields and submit button. The fields come through `[slot=fields]`, the
 * button through `[slot=submit]` and a form alert, when there is one, through `[slot=alert]` above
 * the fields. An optional `note` under the button, with a lock or a phone icon, says what comes
 * next or what to do ("Two-step verification required"). Submitting the form, by its button or by
 * Enter in a field, emits `submitted`; the page decides what that does.
 */
/** The icons a staff note can carry: a lock (sign in) or a phone (the code screen). */
export type StaffNoteIcon = 'lock' | 'smartphone';

@Component({
  selector: 'cf-staff-layout',
  templateUrl: './staff-layout.html',
  styleUrl: './staff-layout.scss',
})
export class StaffLayout {
  readonly heading = input.required<string>();
  readonly lead = input.required<string>();
  /** The note under the button; none when absent. */
  readonly note = input<string>();
  readonly noteIcon = input<StaffNoteIcon>('lock');

  /** The form was submitted; the browser's own submission is prevented. */
  readonly submitted = output<void>();

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.submitted.emit();
  }
}
