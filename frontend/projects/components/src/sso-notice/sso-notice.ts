import {
  type AfterViewInit,
  booleanAttribute,
  Component,
  computed,
  ElementRef,
  inject,
  input,
} from '@angular/core';
import { GoogleMark } from '../google-button/google-mark';

/**
 * The design system's sign-in notice (docs/design-system/components/sso-notice.html), block
 * `sso-notice`: the Google account a person came back with could not be used, and why. It is an
 * alert (`role="alert"`) that takes focus when it appears (`tabindex="-1"`), so the refusal is read
 * first. An optional title (Staff sign in, or the day a deleting account is erased), the account
 * Google returned (with the Google mark unless `plain`), the projected text that
 * says what to do, and optional projected actions (`[slot=actions]`). `spaced` adds the gap it
 * needs under the staff lead. Words are rendered as text.
 */
@Component({
  selector: 'cf-sso-notice',
  imports: [GoogleMark],
  templateUrl: './sso-notice.html',
  styleUrl: './sso-notice.scss',
})
export class SsoNotice implements AfterViewInit {
  /** The short title, on Staff sign in ("That's not a staff account"). */
  readonly heading = input<string>();
  /** The email of the Google account that could not be used. */
  readonly account = input.required<string>();
  /**
   * The account named as text alone, with no Google mark, when the person did not come back from
   * Google, such as an account that is deleting (mock `sign-in/deleting`; ADR 0118).
   */
  readonly plain = input(false, { transform: booleanAttribute });
  /** Spaced under the staff lead (`sso-notice--spaced`). */
  readonly spaced = input(false, { transform: booleanAttribute });

  // One attribute binding, as the Google mark's: a class binding would add its runtime to `main`.
  protected readonly classes = computed(() =>
    this.spaced() ? 'sso-notice sso-notice--spaced' : 'sso-notice',
  );

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);

  ngAfterViewInit(): void {
    // A DOM lookup, not a view query, as the alert does (slice 30.1).
    this.host.nativeElement.querySelector<HTMLElement>('.sso-notice')?.focus();
  }
}
