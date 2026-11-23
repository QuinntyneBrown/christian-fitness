import {
  type AfterViewInit,
  booleanAttribute,
  Component,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';

/**
 * The design system's `staff` block (docs/design-system/assets/components.css, "Staff sign-in";
 * mock `docs/mocks/pages/admin-sign-in/`): the white card on the dark chrome, with the seal,
 * "Christian Fitness" and the "Admin console" eyebrow, and in it, in the page's one `main`, a form
 * with its heading, lead, fields and submit button. The fields come through `[slot=fields]`, the
 * button through `[slot=submit]` and a form alert, when there is one, through `[slot=alert]` above
 * the fields. An optional `note` under the button, with a lock or a phone icon, says what comes
 * next or what to do ("Two-step verification required"). Submitting the form, by its button or by
 * Enter in a field, emits `submitted`; the page decides what that does. A card with no fields (the
 * "Staff only" screen) takes no room for them, and `focusHeading` moves focus to the heading when
 * the card appears in place of another screen (L2-047 AC1).
 */
/** The icons a staff note can carry: a lock (sign in), a phone (the code screen) or none. */
export type StaffNoteIcon = 'lock' | 'smartphone' | 'none';

@Component({
  selector: 'cf-staff-layout',
  templateUrl: './staff-layout.html',
  styleUrl: './staff-layout.scss',
})
export class StaffLayout implements AfterViewInit {
  readonly heading = input.required<string>();
  readonly lead = input.required<string>();
  /** The note under the button; none when absent. */
  readonly note = input<string>();
  readonly noteIcon = input<StaffNoteIcon>('lock');
  /** Moves focus to the heading when the card appears. */
  readonly focusHeading = input(false, { transform: booleanAttribute });

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  /** The form was submitted; the browser's own submission is prevented. */
  readonly submitted = output<void>();

  ngAfterViewInit(): void {
    // A DOM lookup, not a view query: queries add about 8 kB to the initial bundle (slice 30.1).
    if (this.focusHeading())
      this.host.nativeElement.querySelector<HTMLElement>('.staff__title')?.focus();
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.submitted.emit();
  }
}
