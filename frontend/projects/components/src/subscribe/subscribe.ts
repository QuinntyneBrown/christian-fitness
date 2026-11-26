import {
  afterNextRender,
  booleanAttribute,
  Component,
  ElementRef,
  inject,
  Injector,
  input,
  type OnChanges,
  output,
  type SimpleChanges,
} from '@angular/core';
import { Alert } from '../alert/alert';
import { Button } from '../button/button';
import { FormField } from '../form-field/form-field';

/**
 * What Subscribe's state area shows (L2-057, L2-058; ADR 0110): the form, a link being checked,
 * or a panel: "Check your inbox", "You're subscribed" or "You're unsubscribed".
 */
export type SubscribeView = 'form' | 'checking' | 'sent' | 'confirmed' | 'unsubscribed';

/**
 * An alert above the form (mocks `subscribe/error`, `limited`, `link-expired`): the server failed,
 * the network's sign-ups are limited, or a confirmation link has expired.
 */
export type SubscribeAlert = 'failed' | 'limited' | 'expired';

/**
 * Subscribe's main column (docs/mocks/pages/subscribe; design-system page newsletter-box, blocks
 * `subscribe`, `subscribe__panel`): The Abundant Weekly's name and what it holds, then the state
 * area. The form has the Email address field and "Subscribe free" in one row (stacked on a phone),
 * the field's error under them and the note; while `busy` the field is read-only and the button
 * reads "Subscribing…". A panel replaces the form and takes focus (`role="status"`). The email
 * typed is the page's: each keystroke emits `emailChange`, a submit emits `submitted`. Every
 * address is rendered as text.
 */
@Component({
  selector: 'cf-subscribe',
  imports: [Alert, Button, FormField],
  templateUrl: './subscribe.html',
  styleUrl: './subscribe.scss',
})
export class Subscribe implements OnChanges {
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly injector = inject(Injector);

  readonly view = input<SubscribeView>('form');
  /** The email in the field, and the address a panel names; none names "you". */
  readonly email = input<string | null>('');
  /** The field's error, `aria-invalid` with it. */
  readonly error = input<string | null>(null);
  readonly alert = input<SubscribeAlert | null>(null);
  readonly busy = input(false, { transform: booleanAttribute });
  /** When the first issue arrives, as words: "Saturday at 7 AM". */
  readonly firstIssue = input('Saturday at 7 AM');

  readonly emailChange = output<string>();
  readonly submitted = output<string>();
  /** "Use a different email" in "Check your inbox". */
  readonly differentEmail = output();
  /** "Subscribe again" in "You're unsubscribed". */
  readonly subscribeAgain = output();

  protected readonly fieldId = 'f-email';

  ngOnChanges(changes: SimpleChanges): void {
    const view = changes['view'];
    if (!view || view.firstChange) return;
    // A panel takes focus as it replaces the form; the form's field takes it back.
    const target = this.view() === 'form' ? `#${this.fieldId}` : '.subscribe__panel';
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(target)?.focus(), {
      injector: this.injector,
    });
  }

  protected edit(event: Event): void {
    this.emailChange.emit((event.target as HTMLInputElement).value);
  }

  protected send(event: Event): void {
    event.preventDefault();
    if (this.busy()) return;
    this.submitted.emit(this.email() ?? '');
  }
}
