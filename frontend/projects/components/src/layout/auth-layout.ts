import { NgTemplateOutlet } from '@angular/common';
import {
  type AfterViewInit,
  booleanAttribute,
  Component,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import { BrandLockup } from '../brand-lockup/brand-lockup';
import { Seal } from '../brand-lockup/seal';

/**
 * The design system's `auth` block (docs/design-system/assets/components.css, "Auth"): the brand
 * panel (`auth__brand`: the light `cf-brand-lockup` back to the landing page and, on a wide screen,
 * the hero `cf-seal`, the claim and what members do together) and, in the page's one `main`, a form with its heading, lead, fields, submit button and
 * the line that offers the other way in. The fields come through `[slot=fields]`, the button
 * through `[slot=submit]`, a form alert, when there is one, through `[slot=alert]` above the
 * fields, and words the lead goes on with (such as a bold email) through `[slot=lead]`.
 * Submitting the form, by its button or by Enter in a field, emits `submitted`; the page decides
 * what that does.
 *
 * With `notice`, the same block is a message rather than a form (the mock's "Check your email"):
 * a `<div>` in place of the `<form>`, whose heading takes focus when it appears. The other way in
 * is a link to `altHref`, or, without one, a button that emits `altChosen` (such as "send it
 * again"); `altEnd` closes the line, and without `altLink` there is no line. A `busy` notice
 * (such as "Checking your link…") is `aria-busy` and announces its lead as a status. The slots are declared once, in one template both shapes show.
 */
@Component({
  selector: 'cf-auth-layout',
  imports: [BrandLockup, NgTemplateOutlet, Seal],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.scss',
})
export class AuthLayout implements AfterViewInit {
  /** What members do together, listed in the brand panel on a wide screen. */
  protected readonly points = [
    'Register for runs, workouts and retreats',
    'Chat with your event groups',
    'Book vetted Christian professionals',
  ];

  readonly heading = input.required<string>();
  readonly lead = input('');
  /** The words before the other way in, such as "Already a member?". */
  readonly altText = input('');
  /**
   * The other way in, such as "Sign in", and where it goes; without `altHref`, an action. Without
   * it the line is left out, as in a notice that has no other way ("Password saved").
   */
  readonly altLink = input('');
  readonly altHref = input<string>();
  /** The words after the other way in, such as the closing ".". */
  readonly altEnd = input('');
  /** A message, not a form: no submission, and the heading takes focus. */
  readonly notice = input(false, { transform: booleanAttribute });
  /** A notice still waiting for an answer: `aria-busy`, and its lead is a live status. */
  readonly busy = input(false, { transform: booleanAttribute });

  /** The form was submitted; the browser's own submission is prevented. */
  readonly submitted = output<void>();
  /** The other way in was chosen, when it is an action rather than a link. */
  readonly altChosen = output<void>();

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  ngAfterViewInit(): void {
    // A DOM lookup, not a view query: queries add about 8 kB to the initial bundle (slice 30.1).
    if (this.notice()) this.host.nativeElement.querySelector<HTMLElement>('.auth__title')?.focus();
  }

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.submitted.emit();
  }
}
