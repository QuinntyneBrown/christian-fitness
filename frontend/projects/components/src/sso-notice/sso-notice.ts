import {
  type AfterViewInit,
  booleanAttribute,
  Component,
  ElementRef,
  inject,
  input,
} from '@angular/core';

/**
 * The design system's sign-in notice (docs/design-system/components/sso-notice.html), block
 * `sso-notice`: the Google account a person came back with could not be used, and why. It is an
 * alert (`role="alert"`) that takes focus when it appears (`tabindex="-1"`), so the refusal is read
 * first. An optional title (Staff sign in), the account Google returned, the projected text that
 * says what to do, and optional projected actions (`[slot=actions]`). `spaced` adds the gap it
 * needs under the staff lead. Words are rendered as text.
 */
@Component({
  selector: 'cf-sso-notice',
  templateUrl: './sso-notice.html',
  styleUrl: './sso-notice.scss',
})
export class SsoNotice implements AfterViewInit {
  /** The short title, on Staff sign in ("That's not a staff account"). */
  readonly heading = input<string>();
  /** The email of the Google account that could not be used. */
  readonly account = input.required<string>();
  /** Spaced under the staff lead (`sso-notice--spaced`). */
  readonly spaced = input(false, { transform: booleanAttribute });

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  ngAfterViewInit(): void {
    // A DOM lookup, not a view query, as the alert does (slice 30.1).
    this.host.nativeElement.querySelector<HTMLElement>('.sso-notice')?.focus();
  }
}
