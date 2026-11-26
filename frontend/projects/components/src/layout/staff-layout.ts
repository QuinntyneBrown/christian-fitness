import {
  type AfterViewInit,
  booleanAttribute,
  Component,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import { Seal } from '../brand-lockup/seal';

/**
 * The design system's `staff` block (docs/design-system/assets/components.css, "Staff sign-in";
 * mock `docs/mocks/pages/admin-sign-in/`): the white card on the dark chrome, with the `cf-seal`,
 * "Christian Fitness" and the "Admin console" eyebrow, and in it, in the page's one `main`, a form
 * with its heading, lead, fields and submit button. The fields come through `[slot=fields]`, the
 * button through `[slot=submit]` and a form alert, when there is one, through `[slot=alert]` above
 * the fields. Staff sign in (ADR 0100) projects the end of its lead through `[slot=lead]` (the
 * domain in `strong`), a sign-in notice through `[slot=notice]` and its Google button through
 * `[slot=sso]` (`staff__sso`). An optional `note` under the button, with a lock or a shield icon,
 * says what comes next or what to do; the shield's note starts at the left (`staff__note--start`,
 * "Passwords and two-step verification are managed by Google Workspace."). Submitting the form, by its button or by
 * Enter in a field, emits `submitted`; the page decides what that does. A card with no fields (the
 * "Staff only" screen) takes no room for them, and `focusHeading` moves focus to the heading when
 * the card appears in place of another screen (L2-047 AC1).
 */
/** The icons a staff note can carry: a lock, a shield (Staff sign in) or none. */
export type StaffNoteIcon = 'lock' | 'shield' | 'none';

@Component({
  selector: 'cf-staff-layout',
  imports: [Seal],
  templateUrl: './staff-layout.html',
  styleUrl: './staff-layout.scss',
})
export class StaffLayout implements AfterViewInit {
  readonly heading = input.required<string>();
  /** The lead's text; more of it may be projected through `[slot=lead]`. */
  readonly lead = input('');
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
